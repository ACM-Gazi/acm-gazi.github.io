// Live security-rule tests against the Supabase project.
// Run: npm run test:rls   (needs .env.test — see .env.test.example and docs/forum-supabase-setup.md)
import { test, describe, before, after, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_KEY;
const BODY = 'Bu bir test yazısıdır. '.repeat(5); // > 50 chars
const created = { posts: [], files: [] };

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`login ${email}: ${JSON.stringify(j)}`);
  return { token: j.access_token, id: j.user.id };
}

async function rest(path, { as, method = 'GET', body, prefer } = {}) {
  const headers = { apikey: KEY, 'content-type': 'application/json' };
  if (as) headers.Authorization = `Bearer ${as.token}`;
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${BASE}/rest/v1/${path}`, { method, headers, body: body && JSON.stringify(body) });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: r.status, ok: r.ok, data };
}

const rpc = (fn, args, as) => rest(`rpc/${fn}`, { as, method: 'POST', body: args });
const ret = 'return=representation';

const cover = (as) => `${as.id}/cover-rls-test.webp`;

async function newPost(as, extra = {}) {
  const r = await rest('posts', { as, method: 'POST', prefer: ret,
    body: { title: 'RLS test yazısı', body_md: BODY, cover_path: cover(as), ...extra } });
  assert.equal(r.status, 201, JSON.stringify(r.data));
  created.posts.push(r.data[0].id);
  return r.data[0];
}

/** Approves the version that is stored right now, like an admin who has just read it. */
async function approve(id) {
  const [p] = (await rest(`posts?id=eq.${id}&select=updated_at`, { as: admin })).data;
  return rpc('approve_post', { p_id: id, p_version: p.updated_at }, admin);
}

async function upload(as, bucket, path, type = 'image/png') {
  const png = Buffer.from('89504e470d0a1a0a0000000d4948445200000001000000010806000000' +
    '1f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a5a30000000049454e44ae426082', 'hex');
  const r = await fetch(`${BASE}/storage/v1/object/${bucket}/${path}`, {
    method: 'POST', headers: { apikey: KEY, Authorization: `Bearer ${as.token}`, 'content-type': type }, body: png,
  });
  if (r.ok) created.files.push([bucket, path, as]);
  return r.status;
}

let member, member2, admin;

before(async () => {
  for (const k of ['SUPABASE_URL', 'SUPABASE_KEY', 'MEMBER_EMAIL', 'MEMBER_PASSWORD', 'MEMBER2_EMAIL',
    'MEMBER2_PASSWORD', 'ADMIN_EMAIL', 'ADMIN_PASSWORD']) assert.ok(process.env[k], `${k} missing in .env.test`);
  [member, member2, admin] = await Promise.all([
    login(process.env.MEMBER_EMAIL, process.env.MEMBER_PASSWORD),
    login(process.env.MEMBER2_EMAIL, process.env.MEMBER2_PASSWORD),
    login(process.env.ADMIN_EMAIL, process.env.ADMIN_PASSWORD),
  ]);
});

after(async () => {
  for (const id of created.posts) await rest(`posts?id=eq.${id}`, { as: admin, method: 'DELETE' });
  for (const [bucket, path, as] of created.files) {
    await fetch(`${BASE}/storage/v1/object/${bucket}/${path}`, {
      method: 'DELETE', headers: { apikey: KEY, Authorization: `Bearer ${as.token}` } });
  }
});

describe('posts', () => {
  test('1. anon sees only approved posts', async () => {
    await newPost(member);
    const r = await rest('posts?select=status');
    assert.equal(r.status, 200);
    assert.ok(r.data.every((p) => p.status === 'approved'), JSON.stringify(r.data));
  });

  test('2. member cannot self-approve on insert', async () => {
    const r = await rest('posts', { as: member, method: 'POST', prefer: ret,
      body: { title: 'Kendini onaylama', body_md: BODY, cover_path: cover(member), status: 'approved' } });
    if (r.ok) { created.posts.push(r.data[0].id); assert.equal(r.data[0].status, 'pending'); }
    else assert.ok([400, 401, 403].includes(r.status), `unexpected ${r.status}`);
  });

  test('2b. member cannot post as someone else', async () => {
    const r = await rest('posts', { as: member, method: 'POST', prefer: ret,
      body: { title: 'Sahte yazar', body_md: BODY, cover_path: cover(member), author_id: member2.id } });
    if (r.ok) { created.posts.push(r.data[0].id); assert.equal(r.data[0].author_id, member.id); }
    else assert.ok([400, 401, 403].includes(r.status));
  });

  test('3. other member cannot read, update or delete a pending post', async () => {
    const p = await newPost(member);
    assert.deepEqual((await rest(`posts?id=eq.${p.id}`, { as: member2 })).data, []);
    const u = await rest(`posts?id=eq.${p.id}`, { as: member2, method: 'PATCH', prefer: ret, body: { title: 'Ele geçirildi' } });
    assert.deepEqual(u.data, []);
    const d = await rest(`posts?id=eq.${p.id}`, { as: member2, method: 'DELETE', prefer: ret });
    assert.deepEqual(d.data, []);
    assert.equal((await rest(`posts?id=eq.${p.id}&select=title`, { as: member })).data[0].title, 'RLS test yazısı');
  });

  test('4. editing an approved post sends it back to review', async () => {
    const p = await newPost(member);
    assert.ok((await approve(p.id)).ok);
    const u = await rest(`posts?id=eq.${p.id}`, { as: member, method: 'PATCH', prefer: ret, body: { title: 'Düzenlenmiş başlık' } });
    assert.equal(u.data[0].status, 'pending');
    assert.equal(u.data[0].approved_at, null);
  });

  test('6. member cannot call admin functions', async () => {
    const p = await newPost(member);
    for (const [fn, args] of [['approve_post', { p_id: p.id, p_version: p.updated_at }], ['reject_post', { p_id: p.id, p_reason: 'neden' }],
      ['admin_list_members', {}], ['set_member_role', { p_user: member.id, p_role: 'admin' }]]) {
      const r = await rpc(fn, args, member);
      assert.ok(!r.ok, `${fn} should fail`);
      assert.match(JSON.stringify(r.data), /forbidden/, fn);
    }
  });

  test('7. admin approves (anon then sees it); reject needs a reason', async () => {
    const p = await newPost(member);
    assert.ok((await approve(p.id)).ok);
    assert.equal((await rest(`posts?id=eq.${p.id}&select=id`)).data.length, 1);
    const bad = await rpc('reject_post', { p_id: p.id, p_reason: '  ' }, admin);
    assert.ok(!bad.ok);
    assert.ok((await rpc('reject_post', { p_id: p.id, p_reason: 'Konu uygun değil.' }, admin)).ok);
    assert.equal((await rest(`posts?id=eq.${p.id}&select=id`)).data.length, 0);
    const mine = await rest(`posts?id=eq.${p.id}&select=status,reject_reason`, { as: member });
    assert.deepEqual(mine.data[0], { status: 'rejected', reject_reason: 'Konu uygun değil.' });
  });

  test('approval is refused when the author changed the text after the admin read it', async () => {
    const p = await newPost(member);
    const read = (await rest(`posts?id=eq.${p.id}&select=updated_at`, { as: admin })).data[0].updated_at;
    await rest(`posts?id=eq.${p.id}`, { as: member, method: 'PATCH', body: { body_md: 'Gizlice değişen metin. '.repeat(5) } });
    const r = await rpc('approve_post', { p_id: p.id, p_version: read }, admin);
    assert.ok(!r.ok);
    assert.match(JSON.stringify(r.data), /version_changed/);
    assert.equal((await rest(`posts?id=eq.${p.id}&select=status`, { as: member })).data[0].status, 'pending');
    assert.ok((await approve(p.id)).ok);
  });

  test('the old approval without a version is gone', async () => {
    const p = await newPost(member);
    assert.ok(!(await rpc('approve_post', { p_id: p.id }, admin)).ok);
    assert.equal((await rest(`posts?id=eq.${p.id}&select=status`, { as: member })).data[0].status, 'pending');
  });

  test('odd cover names are refused', async () => {
    for (const c of [`${member.id}/a b.webp`, `${member.id}/x/../y.webp`, `${member.id}/%61.webp`, `${member.id}/`]) {
      const r = await rest('posts', { as: member, method: 'POST', prefer: ret, body: { title: 'Tuhaf kapak adı', body_md: BODY, cover_path: c } });
      if (r.ok) created.posts.push(r.data[0].id);
      assert.ok(!r.ok, c);
    }
  });

  test('cover image is required', async () => {
    const r = await rest('posts', { as: member, method: 'POST', prefer: ret, body: { title: 'Kapaksız yazı', body_md: BODY } });
    if (r.ok) created.posts.push(r.data[0].id); // never leave it behind when the rule is missing
    assert.ok(!r.ok, 'post without cover must be refused');
  });

  test('cover must be in the author folder', async () => {
    const r = await rest('posts', { as: member, method: 'POST',
      body: { title: 'Başkasının kapağı', body_md: BODY, cover_path: `${member2.id}/x.webp` } });
    assert.ok(!r.ok);
    const p = await newPost(member);
    const u = await rest(`posts?id=eq.${p.id}`, { as: member, method: 'PATCH', body: { cover_path: `${member2.id}/x.webp` } });
    assert.ok(!u.ok);
  });

  test('author can change own cover', async () => {
    const p = await newPost(member);
    const u = await rest(`posts?id=eq.${p.id}`, { as: member, method: 'PATCH', prefer: ret, body: { cover_path: `${member.id}/yeni-kapak.webp` } });
    assert.equal(u.status, 200, JSON.stringify(u.data));
    assert.equal(u.data[0].cover_path, `${member.id}/yeni-kapak.webp`);
  });

  test('admin sees member list with e-mails', async () => {
    const r = await rpc('admin_list_members', {}, admin);
    assert.equal(r.status, 200);
    assert.ok(r.data.some((m) => m.email === process.env.MEMBER_EMAIL.toLowerCase()));
  });
});

describe('profiles', () => {
  test('5. member cannot make themselves admin', async () => {
    const r = await rest(`profiles?id=eq.${member.id}`, { as: member, method: 'PATCH', prefer: ret, body: { role: 'admin' } });
    assert.ok(!r.ok);
    assert.equal((await rpc('my_profile', {}, member)).data[0].role, 'member');
  });

  test('member cannot change their own name', async () => {
    const r = await rest(`profiles?id=eq.${member.id}`, { as: member, method: 'PATCH', body: { full_name: 'Admin' } });
    assert.ok(!r.ok);
  });

  test('member can update class and second major', async () => {
    const r = await rest(`profiles?id=eq.${member.id}&select=id,year,major2`, { as: member, method: 'PATCH', prefer: ret,
      body: { year: '3', major2: 'Matematik' } });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data[0].major2, 'Matematik');
    await rest(`profiles?id=eq.${member.id}`, { as: member, method: 'PATCH', body: { year: '2', major2: null } });
  });

  test('member cannot edit another profile', async () => {
    const r = await rest(`profiles?id=eq.${member2.id}&select=id`, { as: member, method: 'PATCH', prefer: ret, body: { year: '4' } });
    assert.deepEqual(r.data, []);
  });

  test('avatar path outside own folder is rejected', async () => {
    const r = await rest(`profiles?id=eq.${member.id}`, { as: member, method: 'PATCH',
      body: { avatar_path: `${member2.id}/x.webp` } });
    assert.ok(!r.ok);
  });

  test('role and created_at are not readable through the table', async () => {
    for (const as of [undefined, member]) {
      for (const col of ['role', 'created_at']) {
        assert.ok(!(await rest(`profiles?select=${col}`, { as })).ok, `${col} must not be readable`);
      }
    }
  });

  test('my_profile returns only the caller, with the role', async () => {
    const r = await rpc('my_profile', {}, admin);
    assert.equal(r.data.length, 1);
    assert.equal(r.data[0].id, admin.id);
    assert.equal(r.data[0].role, 'admin');
    const anon = await rpc('my_profile', {});
    assert.ok(!anon.ok || anon.data.length === 0);
  });

  test('a member with nothing published is hidden from visitors, visible to self and admins', async () => {
    const q = `profiles?id=eq.${member2.id}&select=id`;
    assert.deepEqual((await rest(q)).data, []);
    assert.deepEqual((await rest(q, { as: member })).data, []);
    assert.equal((await rest(q, { as: member2 })).data.length, 1);
    assert.equal((await rest(q, { as: admin })).data.length, 1);
  });

  test('author becomes visible once an article is approved, and only then', async () => {
    const q = `profiles?id=eq.${member2.id}&select=full_name`;
    const p = await newPost(member2);
    assert.deepEqual((await rest(q)).data, [], 'pending must not reveal the author');
    assert.ok((await approve(p.id)).ok);
    const row = (await rest(`posts?id=eq.${p.id}&select=id,author:profiles!posts_author_id_fkey(full_name,major,year)`)).data[0];
    assert.ok(row.author?.full_name);
    await rest(`posts?id=eq.${p.id}`, { as: admin, method: 'DELETE' });
    assert.deepEqual((await rest(q)).data, []);
  });

  test('a commenter on an approved article is visible to readers', async () => {
    const p = await newPost(member);
    await approve(p.id);
    const c = await rest('comments', { as: member2, method: 'POST', prefer: ret, body: { post_id: p.id, body: 'Merhaba' } });
    assert.equal(c.status, 201, JSON.stringify(c.data));
    assert.equal((await rest(`profiles?id=eq.${member2.id}&select=id`)).data.length, 1);
    await rest(`posts?id=eq.${p.id}`, { as: admin, method: 'DELETE' });
  });

  test('8. e-mails and allowlist are not readable', async () => {
    assert.ok(!(await rest('profiles?select=email')).ok);
    const a = await rest('signup_allowlist?select=email');
    assert.ok(!a.ok || a.data.length === 0);
    const a2 = await rest('signup_allowlist?select=email', { as: member });
    assert.ok(!a2.ok || a2.data.length === 0);
  });
});

describe('comments', () => {
  let approved;
  before(async () => {
    approved = await newPost(member);
    await approve(approved.id);
  });

  test('9. cannot comment as someone else or on a pending post', async () => {
    const spoof = await rest('comments', { as: member, method: 'POST', prefer: ret,
      body: { post_id: approved.id, body: 'sahte', author_id: member2.id } });
    if (spoof.ok) assert.equal(spoof.data[0].author_id, member.id); else assert.ok(spoof.status >= 400);
    const pending = await newPost(member);
    const r = await rest('comments', { as: member, method: 'POST', body: { post_id: pending.id, body: 'erken yorum' } });
    assert.ok(!r.ok);
    assert.ok(!(await rest('comments', { method: 'POST', body: { post_id: approved.id, body: 'anonim' } })).ok);
  });

  test('10. only the author or an admin deletes a comment', async () => {
    const c = await rest('comments', { as: member, method: 'POST', prefer: ret, body: { post_id: approved.id, body: 'Güzel yazı!' } });
    assert.equal(c.status, 201, JSON.stringify(c.data));
    const id = c.data[0].id;
    assert.deepEqual((await rest(`comments?id=eq.${id}`, { as: member2, method: 'DELETE', prefer: ret })).data, []);
    assert.equal((await rest(`comments?id=eq.${id}`, { as: admin, method: 'DELETE', prefer: ret })).data.length, 1);
  });

  test('anon can read comments on approved posts', async () => {
    const r = await rest(`comments?post_id=eq.${approved.id}&select=id`);
    assert.equal(r.status, 200);
  });
});

describe('banning', () => {
  const REASON = 'Kurallara aykırı içerik.';
  let shown, own;

  before(async () => {
    shown = await newPost(member);
    await approve(shown.id);
    own = await newPost(member2);
    await approve(own.id);
  });
  afterEach(async () => { await rpc('unban_member', { p_user: member2.id }, admin); });

  test('members cannot ban or unban', async () => {
    for (const [fn, args] of [['ban_member', { p_user: member2.id, p_reason: REASON }], ['unban_member', { p_user: member2.id }]]) {
      const r = await rpc(fn, args, member);
      assert.ok(!r.ok);
      assert.match(JSON.stringify(r.data), /forbidden/);
      assert.ok(!(await rpc(fn, args)).ok, 'visitor');
    }
  });

  test('a reason is needed; no banning of oneself', async () => {
    assert.match(JSON.stringify((await rpc('ban_member', { p_user: member2.id, p_reason: ' a ' }, admin)).data), /reason_required/);
    assert.match(JSON.stringify((await rpc('ban_member', { p_user: admin.id, p_reason: REASON }, admin)).data), /cannot_ban_self/);
  });

  test('admins cannot be banned, banned members cannot become admin', async () => {
    assert.ok((await rpc('set_member_role', { p_user: member2.id, p_role: 'admin' }, admin)).ok);
    try {
      assert.match(JSON.stringify((await rpc('ban_member', { p_user: member2.id, p_reason: REASON }, admin)).data), /cannot_ban_admin/);
    } finally {
      assert.ok((await rpc('set_member_role', { p_user: member2.id, p_role: 'member' }, admin)).ok);
    }
    assert.ok((await rpc('ban_member', { p_user: member2.id, p_reason: REASON }, admin)).ok);
    assert.match(JSON.stringify((await rpc('set_member_role', { p_user: member2.id, p_role: 'admin' }, admin)).data), /member_banned/);
  });

  test('a banned member can read but not write anything', async () => {
    const c = (await rest('comments', { as: member2, method: 'POST', prefer: ret, body: { post_id: shown.id, body: 'önce' } })).data[0];
    const name = `${member2.id}/rls-ban-${Date.now()}.png`;
    assert.equal(await upload(member2, 'forum-images', name), 200);
    assert.ok((await rpc('ban_member', { p_user: member2.id, p_reason: REASON }, admin)).ok);
    const me = (await rpc('my_profile', {}, member2)).data[0];
    assert.equal(me.ban_reason, REASON);
    assert.ok(me.banned_at);
    assert.equal((await rest(`posts?id=eq.${shown.id}&select=id`, { as: member2 })).data.length, 1, 'reading works');
    assert.equal((await rest(`posts?id=eq.${own.id}&select=id`, { as: member2 })).data.length, 1, 'own article visible to self');
    assert.ok(!(await rest('posts', { as: member2, method: 'POST', body: { title: 'Engelli yazısı', body_md: BODY, cover_path: cover(member2) } })).ok);
    assert.deepEqual((await rest(`posts?id=eq.${own.id}`, { as: member2, method: 'PATCH', prefer: ret, body: { title: 'Değişti mi' } })).data, []);
    assert.deepEqual((await rest(`posts?id=eq.${own.id}`, { as: member2, method: 'DELETE', prefer: ret })).data, []);
    assert.ok(!(await rest('comments', { as: member2, method: 'POST', body: { post_id: shown.id, body: 'sonra' } })).ok);
    assert.deepEqual((await rest(`comments?id=eq.${c.id}`, { as: member2, method: 'DELETE', prefer: ret })).data, []);
    assert.deepEqual((await rest(`profiles?id=eq.${member2.id}&select=id`, { as: member2, method: 'PATCH', prefer: ret, body: { year: '4' } })).data, []);
    for (const b of ['forum-images', 'avatars']) assert.ok((await upload(member2, b, `${member2.id}/rls-ban2-${Date.now()}.png`)) >= 400, b);
    assert.ok(!(await rest(`profiles?id=eq.${member2.id}`, { as: member2, method: 'PATCH', body: { banned_at: null, ban_reason: null } })).ok);
    assert.ok((await rpc('my_profile', {}, member2)).data[0].banned_at, 'still banned');
    await rest(`comments?id=eq.${c.id}`, { as: admin, method: 'DELETE' });
  });

  test('articles and comments disappear for others and come back', async () => {
    const c = (await rest('comments', { as: member2, method: 'POST', prefer: ret, body: { post_id: shown.id, body: 'gizlenecek' } })).data[0];
    const sees = async (as) => [
      (await rest(`posts?id=eq.${own.id}&select=id`, { as })).data.length,
      (await rest(`comments?id=eq.${c.id}&select=id`, { as })).data.length,
      (await rest(`profiles?id=eq.${member2.id}&select=id`, { as })).data.length];
    assert.deepEqual(await sees(), [1, 1, 1]);
    assert.ok((await rpc('ban_member', { p_user: member2.id, p_reason: REASON }, admin)).ok);
    assert.deepEqual(await sees(), [0, 0, 0], 'visitor');
    assert.deepEqual(await sees(member), [0, 0, 0], 'member');
    assert.deepEqual(await sees(admin), [1, 1, 1], 'admin');
    assert.ok(!(await rest('comments', { as: member, method: 'POST', body: { post_id: own.id, body: 'gizli yazıya yorum' } })).ok);
    assert.equal((await rest(`posts?id=eq.${own.id}&select=author_banned`, { as: admin })).data[0].author_banned, true);
    assert.ok((await rpc('unban_member', { p_user: member2.id }, admin)).ok);
    assert.deepEqual(await sees(), [1, 1, 1], 'back again');
    await rest(`comments?id=eq.${c.id}`, { as: admin, method: 'DELETE' });
  });

  test('ban details are private', async () => {
    assert.ok((await rpc('ban_member', { p_user: member2.id, p_reason: REASON }, admin)).ok);
    for (const as of [undefined, member, member2]) for (const col of ['banned_at', 'ban_reason']) {
      assert.ok(!(await rest(`profiles?select=${col}`, { as })).ok, col);
    }
    const row = (await rpc('admin_list_members', {}, admin)).data.find((m) => m.id === member2.id);
    assert.equal(row.ban_reason, REASON);
  });

  test('an article of a banned author cannot be approved', async () => {
    const p = await newPost(member2);
    assert.ok((await rpc('ban_member', { p_user: member2.id, p_reason: REASON }, admin)).ok);
    const r = await approve(p.id);
    assert.ok(!r.ok);
    assert.match(JSON.stringify(r.data), /author_banned/);
  });

  test('an admin can remove a profile photo', async () => {
    const path = `${member2.id}/rls-photo-${Date.now()}.png`;
    assert.equal(await upload(member2, 'avatars', path), 200);
    assert.ok((await rest(`profiles?id=eq.${member2.id}`, { as: member2, method: 'PATCH', body: { avatar_path: path } })).ok);
    assert.deepEqual((await rest(`profiles?id=eq.${member2.id}&select=id`, { as: member, method: 'PATCH', prefer: ret, body: { avatar_path: null } })).data, []);
    assert.equal((await rest(`profiles?id=eq.${member2.id}&select=avatar_path`, { as: admin, method: 'PATCH', prefer: ret, body: { avatar_path: null } })).data[0].avatar_path, null);
    const r = await fetch(`${BASE}/storage/v1/object/avatars`, { method: 'DELETE',
      headers: { apikey: KEY, Authorization: `Bearer ${admin.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) });
    assert.equal((await r.json()).length, 1);
  });

  test('a + address cannot be used for a second account', async () => {
    // Without migration 005 this would create a real account and send a mail, so it only runs when 005 is installed.
    assert.ok('banned_at' in (await rpc('my_profile', {}, member)).data[0], 'migration 005 is missing');
    const r = await fetch(`${BASE}/auth/v1/signup`, { method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'forum-test-uye1+2@gazi.edu.tr', password: 'Test-12345678' }) });
    assert.ok(r.status >= 400);
    assert.match(JSON.stringify(await r.json()), /gazi\.edu\.tr/);
  });
});

describe('sign-up restriction', () => {
  for (const email of ['rls-test-x@gmail.com', 'rls-test@gazi.edu.tr.evil.com', 'rls-test@notgazi.edu.tr']) {
    test(`11. ${email} is refused`, async () => {
      const r = await fetch(`${BASE}/auth/v1/signup`, {
        method: 'POST', headers: { apikey: KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ email, password: 'Test-12345678' }),
      });
      const j = await r.json();
      assert.ok(r.status >= 400, `status ${r.status}`);
      assert.match(JSON.stringify(j), /gazi\.edu\.tr/);
    });
  }
});

describe('storage', () => {
  const del = async (as, path) => {
    const r = await fetch(`${BASE}/storage/v1/object/forum-images`, { method: 'DELETE',
      headers: { apikey: KEY, Authorization: `Bearer ${as.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) });
    return r.ok ? (await r.json()).length : 0;
  };

  test('a file used by an article cannot be deleted or replaced by its owner', async () => {
    const cov = `${member.id}/rls-cov-${Date.now()}.png`, img = `${member.id}/rls-img-${Date.now()}.png`;
    assert.equal(await upload(member, 'forum-images', cov), 200);
    assert.equal(await upload(member, 'forum-images', img), 200);
    const p = await newPost(member, { cover_path: cov, body_md: `${BODY} ![a](${BASE}/storage/v1/object/public/forum-images/${img})` });
    for (const f of [cov, img]) {
      assert.equal(await del(member, f), 0, 'pending: must stay');
      assert.ok((await upload(member, 'forum-images', f)) >= 400, 'must not be overwritten');
    }
    assert.ok((await approve(p.id)).ok);
    for (const f of [cov, img]) assert.equal(await del(member, f), 0, 'published: must stay');
    await rest(`posts?id=eq.${p.id}`, { as: member, method: 'DELETE' });
    for (const f of [cov, img]) assert.equal(await del(member, f), 1, 'unused: may go');
  });

  test('another member\'s article also protects the file', async () => {
    const img = `${member.id}/rls-shared-${Date.now()}.png`;
    assert.equal(await upload(member, 'forum-images', img), 200);
    const p = await newPost(member2, { body_md: `${BODY} ${BASE}/storage/v1/object/public/forum-images/${img}` });
    assert.equal(await del(member, img), 0);
    await rest(`posts?id=eq.${p.id}`, { as: admin, method: 'DELETE' });
    assert.equal(await del(member, img), 1);
  });

  test('admins may delete a used file; odd file names are refused', async () => {
    const img = `${member.id}/rls-adm-${Date.now()}.png`;
    assert.equal(await upload(member, 'forum-images', img), 200);
    const p = await newPost(member, { cover_path: img });
    assert.equal(await del(admin, img), 1);
    await rest(`posts?id=eq.${p.id}`, { as: admin, method: 'DELETE' });
    assert.ok((await upload(member, 'forum-images', `${member.id}/a%20b.png`)) >= 400);
    assert.ok((await upload(member, 'forum-images', `${member.id}/sub/a.png`)) >= 400);
  });

  test('12. uploads only into own folder, images only', async () => {
    assert.ok((await upload(member, 'forum-images', `${member2.id}/rls-${Date.now()}.png`)) >= 400);
    assert.equal(await upload(member, 'forum-images', `${member.id}/rls-${Date.now()}.png`), 200);
    assert.ok((await upload(member, 'forum-images', `${member.id}/rls-${Date.now()}.svg`, 'image/svg+xml')) >= 400);
    assert.equal(await upload(member, 'avatars', `${member.id}/rls-${Date.now()}.png`), 200);
    assert.ok((await upload(member, 'avatars', `${member2.id}/rls-${Date.now()}.png`)) >= 400);
  });
});

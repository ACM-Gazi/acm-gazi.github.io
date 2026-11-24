import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAllowedEmail, YEAR_OPTIONS, formatByline, validatePost, validateComment,
  validateSignup, validateImageFile, excerpt, firstImageUrl, getIdParam,
  formatDate, translateAuthError, storagePathsFromMarkdown, formatMajors, validateProfile,
  validateAvatarFile, safeNext, parseAuthHash, parseVerifyParams, charCount, draftKey, imageObjectPath, coverCropRect, validateCoverFile, summarizePosts, postStatusInfo, removablePostFiles,
} from '../../static/js/forum/lib.js';
import { renderMarkdown, PURIFY_CONFIG } from '../../static/js/forum/render.js';

const ALLOW = ['istisna@example.com'];

describe('isAllowedEmail', () => {
  test('accepts gazi.edu.tr', () => assert.equal(isAllowedEmail('a@gazi.edu.tr', []), true));
  test('accepts subdomain, trims, ignores case', () =>
    assert.equal(isAllowedEmail(' A@OGR.GAZI.EDU.TR ', []), true));
  test('rejects lookalike suffix domain', () =>
    assert.equal(isAllowedEmail('a@gazi.edu.tr.evil.com', []), false));
  test('rejects lookalike prefix domain', () =>
    assert.equal(isAllowedEmail('a@notgazi.edu.tr', []), false));
  test('rejects gmail not in allowlist', () => assert.equal(isAllowedEmail('x@gmail.com', ALLOW), false));
  test('accepts allowlisted address, any case', () =>
    assert.equal(isAllowedEmail('Istisna@Example.com', ALLOW), true));
  test('rejects garbage', () => {
    assert.equal(isAllowedEmail('', []), false);
    assert.equal(isAllowedEmail('gazi.edu.tr', []), false);
    assert.equal(isAllowedEmail('a@b@gazi.edu.tr', []), false);
    assert.equal(isAllowedEmail(null, []), false);
  });
});

describe('formatByline', () => {
  test('full byline', () => assert.equal(
    formatByline({ full_name: 'Ayşe Yılmaz', major: 'Bilgisayar Mühendisliği', year: '2' }),
    'Ayşe Yılmaz · Bilgisayar Mühendisliği · 2. sınıf'));
  test('skips missing major', () =>
    assert.equal(formatByline({ full_name: 'Ali Kaya', year: 'yuksek_lisans' }), 'Ali Kaya · Yüksek Lisans'));
  test('skips empty major and unknown year', () =>
    assert.equal(formatByline({ full_name: 'Ali Kaya', major: '  ', year: 'x' }), 'Ali Kaya'));
  test('null profile', () => assert.equal(formatByline(null), ''));
  test('year labels', () => {
    assert.deepEqual(YEAR_OPTIONS.map((o) => o.value),
      ['hazirlik', '1', '2', '3', '4', 'yuksek_lisans', 'doktora', 'mezun']);
    assert.deepEqual(YEAR_OPTIONS.map((o) => o.label),
      ['Hazırlık', '1. sınıf', '2. sınıf', '3. sınıf', '4. sınıf', 'Yüksek Lisans', 'Doktora', 'Mezun']);
  });
});

describe('validatePost', () => {
  const body = 'x'.repeat(50);
  test('valid', () => assert.deepEqual(validatePost({ title: 'Başlık', body }), { ok: true, errors: {} }));
  test('short title (trimmed)', () => {
    const r = validatePost({ title: '  abcd  ', body });
    assert.equal(r.ok, false); assert.ok(r.errors.title);
  });
  test('long title', () => assert.ok(validatePost({ title: 'a'.repeat(151), body }).errors.title));
  test('short body (trimmed)', () =>
    assert.ok(validatePost({ title: 'Başlık', body: ' '.repeat(10) + 'x'.repeat(49) }).errors.body));
  test('long body', () => assert.ok(validatePost({ title: 'Başlık', body: 'x'.repeat(50001) }).errors.body));
  test('missing fields', () => assert.equal(validatePost({}).ok, false));
});

describe('validateComment', () => {
  test('empty', () => assert.ok(validateComment('   ')));
  test('too long', () => assert.ok(validateComment('a'.repeat(2001))));
  test('ok', () => assert.equal(validateComment('Güzel yazı!'), null));
  test('max ok', () => assert.equal(validateComment('a'.repeat(2000)), null));
});

describe('validateSignup', () => {
  const good = { email: 'a@gazi.edu.tr', password: '12345678', password2: '12345678',
    full_name: 'Ayşe Yılmaz', major: 'Bilgisayar Mühendisliği', year: '2' };
  test('valid', () => assert.equal(validateSignup(good, ALLOW).ok, true));
  test('gmail rejected with Gazi message', () =>
    assert.match(validateSignup({ ...good, email: 'x@gmail.com' }, ALLOW).errors.email, /gazi\.edu\.tr/));
  test('empty e-mail asks for it', () =>
    assert.equal(validateSignup({ ...good, email: '  ' }, ALLOW).errors.email, 'E-posta adresini yaz.'));
  test('short password', () =>
    assert.ok(validateSignup({ ...good, password: '1234567', password2: '1234567' }, ALLOW).errors.password));
  test('mismatched passwords', () =>
    assert.ok(validateSignup({ ...good, password2: '87654321' }, ALLOW).errors.password2));
  test('short name', () => assert.ok(validateSignup({ ...good, full_name: 'Al' }, ALLOW).errors.full_name));
  test('short major', () => assert.ok(validateSignup({ ...good, major: 'B' }, ALLOW).errors.major));
  test('bad year', () => assert.ok(validateSignup({ ...good, year: '5' }, ALLOW).errors.year));
});

describe('validateImageFile', () => {
  test('svg rejected', () => assert.ok(validateImageFile({ type: 'image/svg+xml', size: 10 })));
  test('too big rejected', () => assert.ok(validateImageFile({ type: 'image/png', size: 5242881 })));
  test('max size ok', () => assert.equal(validateImageFile({ type: 'image/png', size: 5242880 }), null));
  test('all allowed types', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
      assert.equal(validateImageFile({ type: t, size: 1 }), null);
  });
});

describe('excerpt', () => {
  test('strips markdown', () =>
    assert.equal(excerpt('# Başlık\n![x](u.png) Merhaba [dünya](http://a)'), 'Başlık Merhaba dünya'));
  test('strips code fences and html', () =>
    assert.equal(excerpt('Önce\n```js\nalert(1)\n```\n<b>kalın</b> **yazı**'), 'Önce kalın yazı'));
  test('cuts on word boundary with ellipsis', () => {
    const r = excerpt('kelime '.repeat(100), 20);
    assert.ok(r.endsWith('…')); assert.ok(r.length <= 21); assert.ok(!r.includes('kelim…'));
  });
  test('no ellipsis when short', () => assert.equal(excerpt('kısa metin', 200), 'kısa metin'));
});

describe('firstImageUrl', () => {
  test('finds first', () => assert.equal(firstImageUrl('a ![x](https://a/1.png) ![y](https://a/2.png)'), 'https://a/1.png'));
  test('none', () => assert.equal(firstImageUrl('metin'), null));
  test('ignores javascript: urls', () => assert.equal(firstImageUrl('![x](javascript:alert(1))'), null));
});

describe('getIdParam', () => {
  test('valid uuid lowercased', () => assert.equal(
    getIdParam('?id=3F2504E0-4F89-11D3-9A0C-0305E82C3301'), '3f2504e0-4f89-11d3-9a0c-0305e82c3301'));
  test('injection', () => assert.equal(getIdParam('?id=1;drop'), null));
  test('empty', () => assert.equal(getIdParam(''), null));
  test('missing id', () => assert.equal(getIdParam('?x=1'), null));
});

describe('formatDate', () => {
  test('Turkish long date', () => assert.equal(formatDate('2026-11-23T10:00:00Z'), '23 Kasım 2026'));
  test('invalid', () => assert.equal(formatDate('nope'), ''));
});

describe('translateAuthError', () => {
  test('bad login', () => assert.equal(translateAuthError('Invalid login credentials'), 'E-posta veya şifre hatalı.'));
  test('not confirmed', () => assert.equal(translateAuthError('Email not confirmed'),
    'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.'));
  test('already registered', () => assert.equal(translateAuthError('User already registered'),
    'Bu e-posta ile zaten bir hesap var.'));
  test('hook message', () => assert.equal(
    translateAuthError('Sadece @gazi.edu.tr uzantılı adreslerle kayıt olunabilir.'),
    'Sadece @gazi.edu.tr uzantılı adreslerle kayıt olunabilir.'));
  test('rate limit', () => assert.equal(translateAuthError('email rate limit exceeded'),
    'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar dene.'));
  test('used or expired link', () => assert.match(translateAuthError('Email link is invalid or has expired'), /giriş yapmayı dene/));
  test('fallback', () => assert.equal(translateAuthError('weird'), 'Bir hata oluştu. Lütfen tekrar dene.'));
  test('undefined', () => assert.equal(translateAuthError(undefined), 'Bir hata oluştu. Lütfen tekrar dene.'));
});

describe('storagePathsFromMarkdown', () => {
  const P = 'https://x.supabase.co/storage/v1/object/public/forum-images/';
  test('extracts our paths only, deduped', () => assert.deepEqual(
    storagePathsFromMarkdown(`![a](${P}u1/a.png) ![b](https://other/c.png) ![a](${P}u1/a.png) ![d](${P}u1/d.webp)`, P),
    ['u1/a.png', 'u1/d.webp']));
  test('none', () => assert.deepEqual(storagePathsFromMarkdown('metin', P), []));
});

describe('formatMajors and double-major byline', () => {
  test('two majors', () => assert.equal(formatMajors('Bilgisayar Müh.', 'Elektrik-Elektronik Müh.'),
    'Bilgisayar Müh. & Elektrik-Elektronik Müh.'));
  test('one major', () => assert.equal(formatMajors('Bilgisayar Müh.', null), 'Bilgisayar Müh.'));
  test('blank second major ignored', () => assert.equal(formatMajors('A Bölümü', '  '), 'A Bölümü'));
  test('byline with double major', () => assert.equal(
    formatByline({ full_name: 'Ayşe Yılmaz', major: 'Bilgisayar Müh.', major2: 'Matematik', year: '3' }),
    'Ayşe Yılmaz · Bilgisayar Müh. & Matematik · 3. sınıf'));
});

describe('validateProfile', () => {
  test('valid without second major', () =>
    assert.equal(validateProfile({ major: 'Bilgisayar Müh.', major2: '', year: '2' }).ok, true));
  test('valid with second major', () =>
    assert.equal(validateProfile({ major: 'Bilgisayar Müh.', major2: 'Matematik', year: '2' }).ok, true));
  test('second major same as first', () =>
    assert.ok(validateProfile({ major: 'Matematik', major2: ' matematik ', year: '2' }).errors.major2));
  test('second major too short', () =>
    assert.ok(validateProfile({ major: 'Matematik', major2: 'M', year: '2' }).errors.major2));
  test('bad year', () => assert.ok(validateProfile({ major: 'Matematik', year: '9' }).errors.year));
  test('signup accepts optional major2', () => assert.equal(validateSignup({ email: 'a@gazi.edu.tr',
    password: '12345678', password2: '12345678', full_name: 'Ayşe Yılmaz', major: 'Matematik',
    major2: 'Fizik', year: '1' }, []).ok, true));
  test('signup rejects duplicate major2', () => assert.ok(validateSignup({ email: 'a@gazi.edu.tr',
    password: '12345678', password2: '12345678', full_name: 'Ayşe Yılmaz', major: 'Fizik',
    major2: 'Fizik', year: '1' }, []).errors.major2));
});

describe('validateAvatarFile', () => {
  test('gif rejected', () => assert.ok(validateAvatarFile({ type: 'image/gif', size: 10 })));
  test('jpeg ok', () => assert.equal(validateAvatarFile({ type: 'image/jpeg', size: 10 }), null));
  test('over 10 MB rejected', () => assert.ok(validateAvatarFile({ type: 'image/png', size: 10485761 })));
});

describe('code point lengths (match Postgres char_length)', () => {
  test('emoji counts as one character', () => {
    // 4 emoji = 4 code points but 8 UTF-16 units: must be rejected as too short (min 5).
    assert.ok(validatePost({ title: '🚀🚀🚀🚀', body: 'x'.repeat(50) }).errors.title);
  });
});

describe('renderMarkdown', () => {
  test('parses then sanitizes with config', () => {
    const calls = [];
    const marked = { parse: (md) => { calls.push(['parse', md]); return '<p>html</p>'; } };
    const DOMPurify = { sanitize: (html, cfg) => { calls.push(['sanitize', html, cfg]); return 'clean'; } };
    assert.equal(renderMarkdown('**a**', { marked, DOMPurify }), 'clean');
    assert.deepEqual(calls, [['parse', '**a**'], ['sanitize', '<p>html</p>', PURIFY_CONFIG]]);
  });
  test('config forbids dangerous tags and style', () => {
    for (const t of ['style', 'iframe', 'form', 'input']) assert.ok(PURIFY_CONFIG.FORBID_TAGS.includes(t));
    assert.ok(PURIFY_CONFIG.FORBID_ATTR.includes('style'));
  });
});

describe('safeNext (after-login redirect)', () => {
  test('protected forum page kept', () => assert.equal(safeNext('?next=%2Fforum%2Fyeni%2F%3Fid%3D1'), '/forum/yeni/?id=1'));
  test('missing → forum', () => assert.equal(safeNext(''), '/forum/'));
  test('external url → forum', () => assert.equal(safeNext('?next=https://evil.com'), '/forum/'));
  test('protocol-relative → forum', () => assert.equal(safeNext('?next=//evil.com/forum/'), '/forum/'));
  test('backslash trick → forum', () => assert.equal(safeNext('?next=/forum/\\evil.com'), '/forum/'));
  test('non-forum page → forum', () => assert.equal(safeNext('?next=/etkinlikler/'), '/forum/'));
  test('login page itself → forum', () => assert.equal(safeNext('?next=/forum/giris/'), '/forum/'));
  test('dot segments → forum', () => assert.equal(safeNext('?next=/forum/../admin'), '/forum/'));
});

describe('parseAuthHash (e-mail link result)', () => {
  test('recovery', () => assert.deepEqual(parseAuthHash('#access_token=a&type=recovery'), { type: 'recovery', error: null }));
  test('signup', () => assert.deepEqual(parseAuthHash('#access_token=a&type=signup'), { type: 'signup', error: null }));
  test('expired link', () => assert.deepEqual(
    parseAuthHash('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired'),
    { type: null, error: 'Bu bağlantı daha önce kullanılmış ya da süresi dolmuş. Hesabın zaten doğrulandıysa giriş yapmayı dene; değilse yeni bir bağlantı iste.' }));
  test('other error', () => assert.equal(parseAuthHash('#error=server_error').error, 'Bağlantı geçersiz. Lütfen tekrar dene.'));
  test('empty', () => assert.deepEqual(parseAuthHash(''), { type: null, error: null }));
});

describe('parseVerifyParams (e-mail link with token_hash)', () => {
  test('signup confirm', () => assert.deepEqual(parseVerifyParams('?token_hash=pkce_abc-123_X&type=email'),
    { token_hash: 'pkce_abc-123_X', type: 'email' }));
  test('legacy signup type maps to email', () => assert.deepEqual(parseVerifyParams('?token_hash=abc&type=signup'),
    { token_hash: 'abc', type: 'email' }));
  test('recovery', () => assert.deepEqual(parseVerifyParams('?token_hash=abc&type=recovery'), { token_hash: 'abc', type: 'recovery' }));
  test('unknown type ignored', () => assert.equal(parseVerifyParams('?token_hash=abc&type=magiclink2'), null));
  test('odd characters rejected', () => assert.equal(parseVerifyParams('?token_hash=a<b&type=email'), null));
  test('missing', () => assert.equal(parseVerifyParams('?next=/forum/'), null));
});

describe('parseAuthHash expired wording', () => {
  test('mentions already confirmed accounts', () =>
    assert.match(parseAuthHash('#error=access_denied&error_code=otp_expired').error, /giriş yapmayı dene/));
});

describe('charCount (editor counters, matches Postgres char_length)', () => {
  test('counts code points', () => assert.equal(charCount('🚀ab'), 3));
  test('Turkish letters count once', () => assert.equal(charCount('ğüşıöç'), 6));
  test('null', () => assert.equal(charCount(null), 0));
});

describe('draftKey (per account, so shared computers do not leak drafts)', () => {
  test('new post', () => assert.equal(draftKey('u1', null), 'acm-forum-draft:u1:new'));
  test('existing post', () => assert.equal(draftKey('u1', 'p1'), 'acm-forum-draft:u1:p1'));
  test('two members never share a key', () => assert.notEqual(draftKey('u1', null), draftKey('u2', null)));
});

describe('imageObjectPath', () => {
  test('user folder, uuid name, extension from type', () => {
    const p = imageObjectPath('u1', { type: 'image/jpeg', name: 'x.JPG' }, () => 'abc');
    assert.equal(p, 'u1/abc.jpg');
  });
  test('webp', () => assert.equal(imageObjectPath('u1', { type: 'image/webp' }, () => 'z'), 'u1/z.webp'));
});

describe('coverCropRect (centre crop to 16:9, max 1600px wide)', () => {
  test('wide photo is cropped at the sides', () =>
    assert.deepEqual(coverCropRect(4000, 1000), { sx: 1111, sy: 0, sw: 1778, sh: 1000, dw: 1600, dh: 900 }));
  test('tall phone photo is cropped top and bottom', () =>
    assert.deepEqual(coverCropRect(3000, 4000), { sx: 0, sy: 1156, sw: 3000, sh: 1688, dw: 1600, dh: 900 }));
  test('small image is not enlarged', () =>
    assert.deepEqual(coverCropRect(800, 450), { sx: 0, sy: 0, sw: 800, sh: 450, dw: 800, dh: 450 }));
});

describe('validateCoverFile', () => {
  test('jpeg ok', () => assert.equal(validateCoverFile({ type: 'image/jpeg', size: 9e6 }), null));
  test('gif refused', () => assert.match(validateCoverFile({ type: 'image/gif', size: 10 }), /Kapak/));
  test('over 10 MB refused', () => assert.ok(validateCoverFile({ type: 'image/png', size: 10485761 })));
  test('missing file', () => assert.equal(validateCoverFile(null), 'Kapak görseli ekle.'));
});

describe('summarizePosts', () => {
  const p = (status) => ({ status });
  test('counts and sentence', () => assert.deepEqual(
    summarizePosts([p('approved'), p('approved'), p('pending'), p('rejected')]),
    { all: 4, approved: 2, pending: 1, rejected: 1, text: '4 makale: 2 yayında · 1 beklemede · 1 reddedildi' }));
  test('leaves out zero groups', () => assert.equal(summarizePosts([p('pending')]).text, '1 makale: 1 beklemede'));
  test('empty', () => assert.equal(summarizePosts([]).text, 'Henüz yazın yok.'));
});

describe('postStatusInfo', () => {
  const base = { created_at: '2026-11-20T10:00:00Z', updated_at: '2026-11-21T10:00:00Z', approved_at: '2026-11-22T10:00:00Z' };
  test('pending', () => assert.deepEqual(postStatusInfo({ ...base, status: 'pending', approved_at: null }), { label: 'Beklemede', date: 'Gönderildi: 21 Kasım 2026' }));
  test('approved', () => assert.deepEqual(postStatusInfo({ ...base, status: 'approved' }), { label: 'Yayında', date: 'Yayınlandı: 22 Kasım 2026' }));
  test('rejected', () => assert.deepEqual(postStatusInfo({ ...base, status: 'rejected' }), { label: 'Reddedildi', date: 'Reddedildi: 21 Kasım 2026' }));
});

describe('removablePostFiles', () => {
  const P = 'https://x.supabase.co/storage/v1/object/public/forum-images/';
  const post = { id: 'p1', author_id: 'u1', cover_path: 'u1/c.webp', body_md: `![a](${P}u1/a.png) ![b](${P}u1/b.png)` };
  test('cover and own images', () => assert.deepEqual(removablePostFiles(post, [post], P).sort(), ['u1/a.png', 'u1/b.png', 'u1/c.webp']));
  test('never another member\'s file', () => assert.deepEqual(
    removablePostFiles({ ...post, body_md: `![x](${P}u2/secret.png) ![y](${P}u1/../u2/z.png)` }, [post], P), ['u1/c.webp']));
  test('keeps files another article still uses', () => assert.deepEqual(
    removablePostFiles(post, [post, { id: 'p2', author_id: 'u1', cover_path: 'u1/b.png', body_md: `![a](${P}u1/a.png)` }], P), ['u1/c.webp']));
  test('keeps a file another article shows through an HTML tag', () => assert.deepEqual(
    removablePostFiles(post, [post, { id: 'p2', author_id: 'u1', cover_path: 'u1/z.webp', body_md: `<img src="${P}u1/a.png">` }], P).sort(),
    ['u1/b.png', 'u1/c.webp']));
  test('placeholder cover is not a file', () => assert.deepEqual(removablePostFiles({ ...post, cover_path: 'u1/no-cover', body_md: '' }, [], P), []));
  test('broken percent code does not crash', () => assert.deepEqual(removablePostFiles({ ...post, body_md: `![a](${P}u1/%zz.png)` }, [post], P), ['u1/c.webp']));
});

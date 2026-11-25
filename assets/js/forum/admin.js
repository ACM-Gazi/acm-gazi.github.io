// /forum/admin/ — review queue, all articles and members. Every rule is enforced by the database; this page is only the UI.
import { getClient, requireAdmin, publicUrl, avatarEl, mountForumBar } from './client.js';
import { el, showLoading, showError, confirmDialog, inputDialog } from './render.js';
import { renderArticle, authorInfo } from './article.js';
import { deletePost } from './posts.js';
import { postStatusInfo, articleDate, adminError, filterMembers, validateRejectReason, validateName, formatByline, formatDate, memberActions, isOwnFile } from './lib.js';

mountForumBar();

const $ = (sel) => document.querySelector(sel);
const root = $('#admin-root');
const AUTHOR = 'full_name,major,major2,year,avatar_path';
const ROW = `id,title,status,reject_reason,cover_path,created_at,updated_at,approved_at,author_id,author_banned,author:profiles!posts_author_id_fkey(${AUTHOR})`;
const PAGE = 30;
const STATUSES = [['all', 'Tümü'], ['approved', 'Yayında'], ['pending', 'Beklemede'], ['rejected', 'Reddedildi']];

let me = null;
let tab = 'pending';
let status = 'all';
let query = '';
let loadId = 0; // ignores answers that arrive after the admin has switched tabs

function notice(text, kind = 'success') {
  const n = $('#admin-notice');
  n.className = `forum-notice forum-notice-${kind}`;
  n.textContent = text;
  n.hidden = !text;
}

async function rpc(name, args) {
  const { data, error } = await getClient().rpc(name, args);
  if (error) throw error;
  return data;
}

// ---------- Counts ----------
async function refreshPendingCount() {
  try {
    const { count, error } = await getClient().from('posts').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    if (!error) $('#tab-pending').textContent = `Onay bekleyenler ${count}`;
  } catch { /* the list itself shows any connection problem */ }
}

// ---------- Article rows ----------
function smallButton(text, label, onclick) {
  return el('button', { class: 'forum-btn forum-btn-ghost forum-btn-small', type: 'button', 'aria-label': `${text}: ${label}`, onclick, text });
}

function postRow(post) {
  const info = postStatusInfo(post);
  const img = el('img', { src: publicUrl('forum-images', post.cover_path), alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.remove());
  return el('li', { class: 'forum-row' },
    el('div', { class: 'forum-row-cover' }, img),
    el('div', { class: 'forum-row-main' },
      el('h2', { class: 'forum-row-title', text: post.title }),
      el('span', { class: `forum-badge forum-badge-${post.status}`, text: info.label }),
      el('p', { class: 'forum-hint', text: formatByline(post.author) }),
      el('p', { class: 'forum-hint', text: info.date }),
      post.author_banned ? el('p', { class: 'forum-reason', text: 'Yazar engelli: yazı şu an gizli.' }) : null,
      post.reject_reason ? el('p', { class: 'forum-reason' }, el('strong', { text: 'Sebep: ' }), post.reject_reason) : null),
    el('div', { class: 'forum-row-actions' },
      smallButton('İncele', post.title, () => review(post.id)),
      smallButton('Sil', post.title, () => removePost(post))));
}

async function removePost(post) {
  const yes = await confirmDialog({
    title: 'Yazıyı sil',
    text: `"${post.title}" yazısı ve yorumları kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
    confirmLabel: 'Sil',
  });
  if (!yes) return;
  try {
    await deletePost(post);
    await done('Yazı silindi.');
  } catch (err) {
    notice(adminError(err?.message), 'error');
  }
}

async function done(text) {
  notice(text);
  const current = await load();
  if (current === loadId) $('#admin-panel').focus({ preventScroll: true }); // not if another tab was opened meanwhile
}

// ---------- Review: the article exactly as readers see it ----------
function review(id) {
  const body = el('div', { class: 'forum-preview-body' });
  const error = el('p', { class: 'forum-form-error', role: 'alert', hidden: true });
  const close = el('button', { class: 'forum-btn forum-btn-ghost', type: 'button', text: 'Vazgeç' });
  const reject = el('button', { class: 'forum-btn forum-btn-danger', type: 'button', text: 'Reddet', disabled: true });
  const approve = el('button', { class: 'forum-btn forum-btn-primary', type: 'button', text: 'Onayla', disabled: true });
  const label = el('p', { class: 'forum-preview-label', text: 'İnceleme' });
  const dialog = el('dialog', { class: 'forum-preview', 'aria-label': 'Yazıyı incele' },
    el('div', { class: 'forum-preview-bar' }, label), body,
    el('div', { class: 'forum-review-foot' }, error, el('div', { class: 'forum-actions' }, close, reject, approve)));
  let post = null;
  let working = false;

  const showProblem = (text) => { error.textContent = text; error.hidden = !text; };
  const setReady = (ready) => {
    reject.disabled = !ready || post?.status === 'rejected';
    approve.disabled = !ready || !!post?.author_banned;
    approve.hidden = post?.status === 'approved';
  };

  async function loadPost() {
    setReady(false);
    showLoading(body);
    try {
      const { data, error: e } = await getClient().from('posts').select(`${ROW},body_md`).eq('id', id).maybeSingle();
      if (e) throw e;
      if (!data) { post = null; showError(body, 'Bu yazı artık yok.'); return; }
      post = data;
      label.textContent = `İnceleme · ${postStatusInfo(post).label}`;
      body.replaceChildren(renderArticle({
        title: post.title, body: post.body_md, coverUrl: publicUrl('forum-images', post.cover_path), date: articleDate(post), author: post.author,
      }));
      setReady(true);
    } catch {
      showError(body, 'Yazı yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', loadPost);
    }
  }

  async function act(fn, message) {
    if (working) return;
    working = true;
    showProblem('');
    setReady(false);
    try {
      await fn();
      dialog.close();
      await done(message);
    } catch (err) {
      showProblem(adminError(err?.message));
      if (/version_changed|not_found/.test(err?.message ?? '')) { await loadPost(); dialog.scrollTop = 0; } else setReady(true);
    } finally {
      working = false;
    }
  }

  approve.addEventListener('click', () => act(() => rpc('approve_post', { p_id: post.id, p_version: post.updated_at }), 'Yazı yayınlandı.'));
  reject.addEventListener('click', async () => {
    const reason = await inputDialog({
      title: post.status === 'approved' ? 'Yayından kaldır' : 'Yazıyı reddet',
      label: 'Sebep (yazar bunu görür)', confirmLabel: 'Reddet', multiline: true, validate: validateRejectReason,
    });
    if (reason) act(() => rpc('reject_post', { p_id: post.id, p_reason: reason }), 'Yazı reddedildi.');
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  $('.forum-wrap').append(dialog);
  dialog.showModal();
  close.focus();
  loadPost();
}

// ---------- Tabs ----------
const queryPending = () => getClient().from('posts').select(ROW).eq('status', 'pending').order('updated_at').limit(200).then((r) => r);
let early = null; // the first list, asked for together with the admin's profile

async function loadPending(panel, current) {
  const answer = early ?? queryPending();
  early = null;
  const { data, error } = await answer;
  if (error) throw error;
  if (current !== loadId) return;
  panel.replaceChildren(data.length ? el('ul', { class: 'forum-rows' }, data.map(postRow))
    : el('p', { class: 'forum-state', text: 'Onay bekleyen yazı yok.' }));
}

async function loadPosts(panel, current) {
  const seen = new Set();
  const list = el('ul', { class: 'forum-rows' });
  const more = el('button', { class: 'forum-btn forum-btn-ghost', type: 'button', text: 'Daha fazla göster' });
  const problem = el('p', { class: 'forum-form-error', role: 'alert', hidden: true });
  let offset = 0;

  async function page() {
    let q = getClient().from('posts').select(ROW).order('created_at', { ascending: false }).order('id').range(offset, offset + PAGE - 1);
    if (status !== 'all') q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw error;
    offset += data.length;
    const fresh = data.filter((p) => !seen.has(p.id));
    fresh.forEach((p) => seen.add(p.id));
    list.append(...fresh.map(postRow));
    more.hidden = data.length < PAGE;
  }

  await page();
  if (current !== loadId) return;
  more.addEventListener('click', async () => {
    more.disabled = true;
    problem.hidden = true;
    try { await page(); } catch (err) { problem.textContent = adminError(err?.message); problem.hidden = false; } finally { more.disabled = false; }
  });
  panel.replaceChildren(
    el('div', { class: 'forum-filters', role: 'group', 'aria-label': 'Duruma göre filtrele' }, STATUSES.map(([key, text]) => el('button', {
      class: 'forum-filter', type: 'button', 'data-filter': key, 'aria-pressed': String(status === key), text,
      onclick: async () => { status = key; await load(); $(`[data-filter="${key}"]`)?.focus(); },
    }))),
    list.childElementCount ? list : el('p', { class: 'forum-state', text: 'Bu durumda yazı yok.' }),
    el('div', { class: 'forum-more' }, problem, more));
}

const ACTIONS = {
  name: ['Adı düzelt', (m) => fixName(m)],
  photo: ['Fotoğrafı kaldır', (m) => removePhoto(m)],
  promote: ['Admin yap', (m) => changeRole(m)],
  demote: ['Adminlikten çıkar', (m) => changeRole(m)],
  ban: ['Engelle', (m) => ban(m)],
  unban: ['Engeli kaldır', (m) => unban(m)],
};

function memberRow(member) {
  const isAdmin = member.role === 'admin';
  return el('li', { class: 'forum-row forum-row-person' },
    el('div', { class: 'forum-row-avatar' }, avatarEl(member, 48)),
    el('div', { class: 'forum-row-main' },
      el('h2', { class: 'forum-row-name', text: member.full_name }),
      el('span', { class: 'forum-hint', text: member.email }),
      el('span', { class: 'forum-hint', text: authorInfo(member) }),
      el('span', { class: 'forum-hint', text: `${member.post_count} makale` }),
      el('span', { class: `forum-badge ${isAdmin ? 'forum-badge-admin' : member.banned_at ? 'forum-badge-rejected' : ''}`,
        text: isAdmin ? 'Admin' : member.banned_at ? 'Engelli' : 'Üye' }),
      member.banned_at ? el('p', { class: 'forum-reason' }, el('strong', { text: 'Sebep: ' }), member.ban_reason) : null,
      member.banned_at ? el('span', { class: 'forum-hint', text: formatDate(member.banned_at) }) : null),
    el('div', { class: 'forum-row-actions' },
      memberActions(member, me.id).map((key) => smallButton(ACTIONS[key][0], member.full_name, () => ACTIONS[key][1](member)))));
}

async function ban(member) {
  const reason = await inputDialog({
    title: `Engelle: ${member.full_name}`, label: 'Sebep (üye bunu görür)', confirmLabel: 'Engelle', multiline: true, validate: validateRejectReason,
  });
  if (!reason) return;
  try {
    await rpc('ban_member', { p_user: member.id, p_reason: reason });
    await done('Üye engellendi. Yazıları ve yorumları gizlendi.');
  } catch (err) {
    notice(adminError(err?.message), 'error');
  }
}

async function unban(member) {
  const yes = await confirmDialog({ title: 'Engeli kaldır', text: `${member.full_name} (${member.email}) tekrar yazabilecek. Yazıları ve yorumları yeniden görünecek.`, confirmLabel: 'Engeli kaldır' });
  if (!yes) return;
  try {
    await rpc('unban_member', { p_user: member.id });
    await done('Engel kaldırıldı.');
  } catch (err) {
    notice(adminError(err?.message), 'error');
  }
}

async function removePhoto(member) {
  const yes = await confirmDialog({ title: 'Fotoğrafı kaldır', text: `${member.full_name} adlı üyenin profil fotoğrafı kalıcı olarak silinecek.`, confirmLabel: 'Fotoğrafı kaldır' });
  if (!yes) return;
  try {
    const { data, error } = await getClient().from('profiles').update({ avatar_path: null }).eq('id', member.id).select('id');
    if (error) throw error;
    if (!data.length) throw new Error('not_found');
    if (isOwnFile(member.avatar_path, member.id)) {
      try { await getClient().storage.from('avatars').remove([member.avatar_path]); } catch { /* a leftover file is harmless */ }
    }
    await done('Fotoğraf kaldırıldı.');
  } catch (err) {
    notice(adminError(err?.message), 'error');
  }
}

async function fixName(member) {
  const name = await inputDialog({ title: 'Adı düzelt', label: 'Ad Soyad', value: member.full_name, confirmLabel: 'Kaydet', validate: validateName });
  if (!name || name === member.full_name) return;
  try {
    await rpc('admin_set_name', { p_user: member.id, p_name: name });
    await done('Ad düzeltildi.');
  } catch (err) {
    notice(adminError(err?.message), 'error');
  }
}

async function changeRole(member) {
  const remove = member.role === 'admin';
  const yes = await confirmDialog(remove
    ? { title: 'Adminlikten çıkar', text: `${member.full_name} (${member.email}) artık yazı onaylayamayacak ve üyeleri göremeyecek.`, confirmLabel: 'Adminlikten çıkar' }
    : { title: 'Admin yap', text: `${member.full_name} (${member.email}) tüm yazıları onaylayıp silebilecek, üyelerin e-postalarını görebilecek ve admin atayabilecek.`, confirmLabel: 'Admin yap' });
  if (!yes) return;
  try {
    await rpc('set_member_role', { p_user: member.id, p_role: remove ? 'member' : 'admin' });
    if (remove && member.id === me.id) { location.href = '/forum/'; return; }
    await done(remove ? 'Adminlikten çıkarıldı.' : 'Admin yapıldı.');
  } catch (err) {
    notice(adminError(err?.message), 'error');
  }
}

async function loadMembers(panel, current) {
  const members = await rpc('admin_list_members');
  if (current !== loadId) return;
  const list = el('ul', { class: 'forum-rows', id: 'member-list' });
  const search = el('input', { id: 'member-search', type: 'search', autocomplete: 'off', placeholder: 'Ad ya da e-posta' });
  search.value = query;
  const show = () => {
    const found = filterMembers(members, query);
    list.replaceChildren(...(found.length ? found.map(memberRow) : [el('li', { class: 'forum-state', text: 'Üye bulunamadı.' })]));
  };
  search.addEventListener('input', () => { query = search.value; show(); });
  panel.replaceChildren(
    el('div', { class: 'forum-field forum-admin-search' }, el('label', { for: 'member-search', text: `Ara (${members.length} üye)` }), search),
    list);
  show();
}

const LOADERS = { pending: loadPending, posts: loadPosts, members: loadMembers };

async function load() {
  const current = ++loadId;
  const panel = $('#admin-panel');
  document.querySelectorAll('[data-tab]').forEach((b) => {
    const on = b.dataset.tab === tab;
    b.setAttribute('aria-selected', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', `tab-${tab}`);
  showLoading(panel);
  refreshPendingCount();
  try {
    await LOADERS[tab](panel, current);
  } catch {
    if (current === loadId) showError(panel, 'Yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', load);
  }
  return current;
}

async function start() {
  early = queryPending();
  early.catch(() => {}); // a failure is shown when the list is drawn
  const { profile } = await requireAdmin();
  me = profile;
  root.replaceChildren($('#admin-template').content.cloneNode(true));
  const tabs = [...document.querySelectorAll('[data-tab]')];
  tabs.forEach((b, i) => {
    b.addEventListener('click', () => { tab = b.dataset.tab; notice(''); load(); });
    b.addEventListener('keydown', (e) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
      if (!step) return;
      const next = tabs[(i + step + tabs.length) % tabs.length];
      next.click();
      next.focus();
    });
  });
  await load();
}

start().catch(() => showError(root, 'Admin paneli yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', () => location.reload()));

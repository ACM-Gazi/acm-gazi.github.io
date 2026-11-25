// /forum/makalelerim/ — the member's own articles with their review status.
import { getClient, getSession, requireUser, publicUrl, writeProblem, mountForumBar } from './client.js';
import { deletePost } from './posts.js';
import { el, showLoading, showError, showEmpty, confirmDialog } from './render.js';
import { summarizePosts, postStatusInfo } from './lib.js';

mountForumBar();

const root = document.getElementById('my-posts');
const FILTERS = [['all', 'Tümü'], ['approved', 'Yayında'], ['pending', 'Beklemede'], ['rejected', 'Reddedildi']];
let posts = [];
let filter = 'all';
let userId = null;
let banned = false;

function notice(text, kind = 'success') {
  const n = document.getElementById('my-notice');
  n.className = `forum-notice forum-notice-${kind}`;
  n.textContent = text;
  n.hidden = !text;
}

function cover(post) {
  const box = el('div', { class: 'forum-row-cover' });
  const img = el('img', { src: publicUrl('forum-images', post.cover_path), alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.remove());
  box.append(img);
  return box;
}

function row(post) {
  const info = postStatusInfo(post);
  const del = el('button', { class: 'forum-btn forum-btn-ghost forum-btn-small', type: 'button', 'aria-label': `Sil: ${post.title}`, text: 'Sil' });
  del.addEventListener('click', () => remove(post, del));
  return el('li', { class: 'forum-row' },
    cover(post),
    el('div', { class: 'forum-row-main' },
      el('h2', { class: 'forum-row-title' }, el('a', { class: 'forum-plain-link', href: `/forum/yazi/?id=${post.id}`, text: post.title })),
      el('span', { class: `forum-badge forum-badge-${post.status}`, text: info.label }),
      el('p', { class: 'forum-hint', text: info.date }),
      post.status === 'rejected' && post.reject_reason
        ? el('p', { class: 'forum-reason' }, el('strong', { text: 'Sebep: ' }), post.reject_reason) : null),
    banned ? null : el('div', { class: 'forum-row-actions' },
      el('a', { class: 'forum-btn forum-btn-ghost forum-btn-small', href: `/forum/yeni/?id=${post.id}`, 'aria-label': `Düzenle: ${post.title}`, text: 'Düzenle' }),
      del));
}

function render() {
  const s = summarizePosts(posts);
  if (!s.all) {
    showEmpty(root, s.text, banned ? null : el('a', { class: 'forum-btn forum-btn-primary', href: '/forum/yeni/', text: 'Yazı yaz' }));
    return;
  }
  const shown = posts.filter((p) => filter === 'all' || p.status === filter);
  root.replaceChildren(
    el('p', { class: 'forum-summary', id: 'my-summary', tabindex: '-1', text: s.text }),
    el('div', { class: 'forum-filters', role: 'group', 'aria-label': 'Duruma göre filtrele' },
      FILTERS.map(([key, label]) => el('button', {
        class: 'forum-filter', type: 'button', 'data-filter': key, 'aria-pressed': String(filter === key),
        onclick: () => { filter = key; render(); root.querySelector(`[data-filter="${key}"]`).focus(); },
        text: `${label} ${s[key]}`,
      }))),
    shown.length ? el('ul', { class: 'forum-rows' }, shown.map(row))
      : el('p', { class: 'forum-state', text: 'Bu durumda yazın yok.' }));
}

async function remove(post, button) {
  const yes = await confirmDialog({
    title: 'Yazıyı sil',
    text: `"${post.title}" yazısı ve yorumları kalıcı olarak silinecek. Bu işlem geri alınamaz.`,
    confirmLabel: 'Sil',
  });
  if (!yes) { button.focus(); return; }
  notice('');
  button.disabled = true;
  button.textContent = 'Siliniyor…';
  try {
    await deletePost({ id: post.id, author_id: userId });
    posts = posts.filter((p) => p.id !== post.id);
    if (filter !== 'all' && !posts.some((p) => p.status === filter)) filter = 'all';
    render();
    notice('Yazı silindi.');
    document.getElementById('my-summary')?.focus();
  } catch {
    button.disabled = false;
    button.textContent = 'Sil';
    notice(await writeProblem('Yazı silinemedi. İnternet bağlantını kontrol edip tekrar dene.'), 'error');
  }
}

async function loadOwn() {
  const session = await getSession();
  if (!session) return null; // requireUser() is already leaving the page
  return getClient().from('posts')
    .select('id,title,status,reject_reason,cover_path,created_at,updated_at,approved_at')
    .eq('author_id', session.user.id).order('created_at', { ascending: false });
}

async function load() {
  showLoading(root);
  try {
    // Both questions at once: the database is far away, so asking one after the other is felt.
    const [{ session, profile }, answer] = await Promise.all([requireUser(), loadOwn()]);
    userId = session.user.id;
    banned = !!profile?.banned_at;
    document.querySelector('.forum-panel-head .forum-btn').hidden = banned;
    if (answer.error) throw answer.error;
    posts = answer.data;
    render();
  } catch {
    showError(root, 'Makalelerin yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', load);
  }
}

const sent = new URLSearchParams(location.search).get('gonderildi');
if (sent) {
  notice(sent === 'yayinda' ? 'Değişiklikler kaydedildi ve yayında.' : 'Yazın onaya gönderildi. Admin onayından sonra yayınlanacak.');
  history.replaceState(null, '', location.pathname);
}
load();

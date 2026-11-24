// /forum/makalelerim/ — the member's own articles with their review status.
import { getClient, requireUser, publicUrl, imagesPrefix } from './client.js';
import { el, showLoading, showError, showEmpty, confirmDialog } from './render.js';
import { summarizePosts, postStatusInfo, removablePostFiles } from './lib.js';

const root = document.getElementById('my-posts');
const FILTERS = [['all', 'Tümü'], ['approved', 'Yayında'], ['pending', 'Beklemede'], ['rejected', 'Reddedildi']];
let posts = [];
let filter = 'all';
let userId = null;

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
      el('h2', { class: 'forum-row-title', text: post.title }),
      el('span', { class: `forum-badge forum-badge-${post.status}`, text: info.label }),
      el('p', { class: 'forum-hint', text: info.date }),
      post.status === 'rejected' && post.reject_reason
        ? el('p', { class: 'forum-reason' }, el('strong', { text: 'Sebep: ' }), post.reject_reason) : null),
    el('div', { class: 'forum-row-actions' },
      el('a', { class: 'forum-btn forum-btn-ghost forum-btn-small', href: `/forum/yeni/?id=${post.id}`, 'aria-label': `Düzenle: ${post.title}`, text: 'Düzenle' }),
      del));
}

function render() {
  const s = summarizePosts(posts);
  if (!s.all) {
    showEmpty(root, s.text, el('a', { class: 'forum-btn forum-btn-primary', href: '/forum/yeni/', text: 'Yazı yaz' }));
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
  const client = getClient();
  try {
    const { data: full, error: readError } = await client.from('posts')
      .select('id,author_id,cover_path,body_md').eq('author_id', userId);
    if (readError) throw readError;
    const { data, error } = await client.from('posts').delete().eq('id', post.id).select('id');
    if (error) throw error;
    if (!data.length) throw new Error('not_deleted');
    // Files go after the article, so a failure can never leave an article with missing images.
    const target = full.find((p) => p.id === post.id);
    const files = target ? removablePostFiles(target, full, imagesPrefix()) : [];
    if (files.length) {
      try { await client.storage.from('forum-images').remove(files); } catch { /* a leftover file is harmless */ }
    }
    posts = posts.filter((p) => p.id !== post.id);
    if (filter !== 'all' && !posts.some((p) => p.status === filter)) filter = 'all';
    render();
    notice('Yazı silindi.');
    document.getElementById('my-summary')?.focus();
  } catch {
    button.disabled = false;
    button.textContent = 'Sil';
    notice('Yazı silinemedi. İnternet bağlantını kontrol edip tekrar dene.', 'error');
  }
}

async function load() {
  showLoading(root);
  try {
    userId ??= (await requireUser()).session.user.id;
    const { data, error } = await getClient().from('posts')
      .select('id,title,status,reject_reason,cover_path,created_at,updated_at,approved_at')
      .eq('author_id', userId).order('created_at', { ascending: false });
    if (error) throw error;
    posts = data;
    render();
  } catch {
    showError(root, 'Makalelerin yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', load);
  }
}

if (new URLSearchParams(location.search).get('gonderildi') === '1') {
  notice('Yazın onaya gönderildi. Admin onayından sonra yayınlanacak.');
  history.replaceState(null, '', location.pathname);
}
load();

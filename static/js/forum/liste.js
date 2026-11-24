// /forum/ — published articles, newest first. Readable without an account.
import { getClient, getSession, publicUrl, avatarEl } from './client.js';
import { el, showLoading, showError, showEmpty } from './render.js';
import { authorInfo } from './article.js';
import { excerpt, articleDate, olderThanFilter, takePage } from './lib.js';

const root = document.getElementById('forum-content');
const PAGE_SIZE = 10;
let last = null; // last article shown

async function fetchPage() {
  let query = getClient().from('posts')
    .select('id,title,body_md,cover_path,approved_at,created_at,author:profiles!posts_author_id_fkey(full_name,major,major2,year,avatar_path)')
    .eq('status', 'approved')
    .order('approved_at', { ascending: false }).order('id', { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (last) query = query.or(olderThanFilter(last));
  const { data, error } = await query;
  if (error) throw error;
  return takePage(data, PAGE_SIZE);
}

function card(post) {
  const img = el('img', { src: publicUrl('forum-images', post.cover_path), alt: '', loading: 'lazy' });
  img.addEventListener('error', () => img.remove());
  const info = authorInfo(post.author);
  return el('li', {},
    el('a', { class: 'forum-card glass-card', href: `/forum/yazi/?id=${post.id}`, 'aria-labelledby': `t-${post.id}` },
      el('div', { class: 'forum-card-cover' }, img),
      el('div', { class: 'forum-card-main' },
        el('h2', { class: 'forum-card-title', id: `t-${post.id}`, text: post.title }),
        el('p', { class: 'forum-card-excerpt', text: excerpt(post.body_md, 200) }),
        el('div', { class: 'forum-card-author' },
          avatarEl(post.author, 40),
          el('div', { class: 'forum-byline-text' },
            el('span', { class: 'forum-byline-name', text: post.author?.full_name ?? 'Üye' }),
            info ? el('span', { class: 'forum-hint', text: info }) : null,
            el('span', { class: 'forum-hint', text: articleDate(post) }))))));
}

async function renderEmpty() {
  const session = await getSession();
  showEmpty(root, 'Henüz yazı yok. İlk yazıyı sen yaz!',
    el('a', { class: 'forum-btn forum-btn-primary', href: session ? '/forum/yeni/' : '/forum/giris/', text: session ? 'Yazı yaz' : 'Giriş yap' }));
}

function moreArea(list) {
  const error = el('p', { class: 'forum-form-error', role: 'alert', hidden: true });
  const button = el('button', { class: 'forum-btn forum-btn-ghost', type: 'button', text: 'Daha fazla göster' });
  const area = el('div', { class: 'forum-more' }, error, button);
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Yükleniyor…';
    error.hidden = true;
    try {
      const { items, more } = await fetchPage();
      const cards = items.map(card);
      list.append(...cards);
      if (items.length) last = items[items.length - 1];
      if (!more) area.remove();
      cards[0]?.querySelector('a').focus();
    } catch {
      error.textContent = 'Yazılar yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.';
      error.hidden = false;
    } finally {
      button.disabled = false;
      button.textContent = 'Daha fazla göster';
    }
  });
  return area;
}

async function start() {
  showLoading(root);
  last = null;
  try {
    const { items, more } = await fetchPage();
    if (!items.length) { await renderEmpty(); return; }
    last = items[items.length - 1];
    const list = el('ul', { class: 'forum-cards' }, items.map(card));
    root.replaceChildren(list, ...(more ? [moreArea(list)] : []));
  } catch {
    showError(root, 'Yazılar yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', start);
  }
}

start();

// /forum/ — published articles, newest first. Readable without an account.
import { getClient, getSession } from './client.js';
import { el, showLoading, showError, showEmpty } from './render.js';
import { articleCard } from './card.js';
import { CARD_COLUMNS, olderThanFilter, takePage } from './lib.js';

const root = document.getElementById('forum-content');
const PAGE_SIZE = 10;
let last = null; // last article shown

async function fetchPage() {
  let query = getClient().from('posts')
    .select(CARD_COLUMNS)
    .eq('status', 'approved')
    .order('approved_at', { ascending: false }).order('id', { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (last) query = query.or(olderThanFilter(last));
  const { data, error } = await query;
  if (error) throw error;
  return takePage(data, PAGE_SIZE);
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
      const cards = items.map(articleCard);
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
    const list = el('ul', { class: 'forum-cards' }, items.map(articleCard));
    root.replaceChildren(list, ...(more ? [moreArea(list)] : []));
  } catch {
    showError(root, 'Yazılar yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', start);
  }
}

start();

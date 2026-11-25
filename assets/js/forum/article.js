// One renderer for an article, used by /forum/yazi/ and by the editor's full preview, so both always look the same.
import { avatarEl } from './client.js';
import { el, renderInto } from './render.js';
import { formatByline } from './lib.js';

/** Major(s) and class, without the name. */
export function authorInfo(author) {
  return formatByline({ ...author, full_name: '' });
}

function coverEl(coverUrl) {
  if (!coverUrl) return el('div', { class: 'forum-article-cover forum-article-cover-empty', text: 'Kapak görseli seçilmedi' });
  const img = el('img', { src: coverUrl, alt: '' });
  img.addEventListener('error', () => img.remove());
  return el('div', { class: 'forum-article-cover' }, img);
}

export function renderArticle({ title, body, coverUrl, date, author }) {
  const prose = el('div', { class: 'forum-prose' });
  renderInto(prose, body);
  return el('article', { class: 'forum-article glass-card' },
    coverEl(coverUrl),
    el('div', { class: 'forum-article-inner' },
      el('h1', { class: 'forum-article-title', text: title }),
      el('p', { class: 'forum-article-date', text: date }),
      prose,
      el('div', { class: 'forum-byline' },
        avatarEl(author, 56),
        el('div', { class: 'forum-byline-text' },
          el('span', { class: 'forum-byline-name', text: author?.full_name ?? '' }),
          el('span', { class: 'forum-byline-info', text: authorInfo(author) })))));
}

/** Full-screen preview over the editor. Nothing is sent or saved. */
export function openArticlePreview(article) {
  const close = el('button', { class: 'forum-btn forum-btn-primary', type: 'button', text: 'Düzenlemeye dön' });
  const dialog = el('dialog', { class: 'forum-preview', 'aria-label': 'Makale önizlemesi' },
    el('div', { class: 'forum-preview-bar' },
      el('p', { class: 'forum-preview-label', text: 'Önizleme · henüz gönderilmedi' }), close),
    el('div', { class: 'forum-preview-body' }, renderArticle(article)));
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => dialog.remove());
  document.querySelector('.forum-wrap').append(dialog);
  dialog.showModal();
  dialog.scrollTop = 0;
  close.focus();
}

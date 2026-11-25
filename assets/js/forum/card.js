// Article card, used on the forum main page and on the home page.
import { publicUrl, avatarEl } from './client.js';
import { el } from './render.js';
import { authorInfo } from './article.js';
import { excerpt, articleDate } from './lib.js';

export function articleCard(post) {
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

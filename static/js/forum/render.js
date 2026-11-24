// Markdown -> safe HTML, plus small shared DOM helpers.

export const PURIFY_CONFIG = {
  USE_PROFILE: { html: true },
  FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'textarea', 'button', 'select', 'object', 'embed'],
  FORBID_ATTR: ['style'],
};

let hookInstalled = false;

function installLinkHook(DOMPurify) {
  if (hookInstalled || typeof DOMPurify.addHook !== 'function') return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.tagName === 'IMG') node.setAttribute('loading', 'lazy');
  });
  hookInstalled = true;
}

export function renderMarkdown(md, { marked, DOMPurify } = globalThis) {
  installLinkHook(DOMPurify);
  return DOMPurify.sanitize(marked.parse(String(md ?? '')), PURIFY_CONFIG);
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) if (c != null && c !== false) node.append(c);
  return node;
}

export function showLoading(container, text = 'Yükleniyor…') {
  container.replaceChildren(el('div', { class: 'forum-state forum-loading', role: 'status' },
    el('span', { class: 'forum-spinner', 'aria-hidden': 'true' }), el('span', { text })));
}

export function showError(container, text, onRetry) {
  container.replaceChildren(el('div', { class: 'forum-state forum-error', role: 'alert' },
    el('p', { text }),
    onRetry ? el('button', { class: 'forum-btn forum-btn-ghost', type: 'button', onclick: onRetry, text: 'Tekrar dene' }) : null));
}

export function showEmpty(container, text, action) {
  container.replaceChildren(el('div', { class: 'forum-state forum-empty' }, el('p', { text }), action ?? null));
}

// Markdown -> safe HTML, plus small shared DOM helpers.
import { isUploadedImage } from './lib.js';

export const PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'textarea', 'button', 'select', 'object', 'embed', 'video', 'audio', 'dialog', 'picture', 'source'],
  // class/id/name: otherwise article text could borrow the site's own styles (e.g. a full-screen overlay).
  FORBID_ATTR: ['style', 'class', 'id', 'name', 'popover', 'popovertarget', 'background', 'autofocus', 'tabindex', 'srcset', 'sizes'],
};

let hookInstalled = false;

function installLinkHook(DOMPurify) {
  if (hookInstalled || typeof DOMPurify.addHook !== 'function') return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.tagName === 'IMG') {
      if (!isUploadedImage(node.getAttribute('src'), globalThis.FORUM_CONFIG?.url)) node.removeAttribute('src');
      node.setAttribute('loading', 'lazy');
    }
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

/** Styled yes/no question. Resolves to true only when the confirm button is pressed. */
export function confirmDialog({ title, text, confirmLabel, cancelLabel = 'Vazgeç' }) {
  return new Promise((resolve) => {
    const cancel = el('button', { class: 'forum-btn forum-btn-ghost', type: 'button', text: cancelLabel });
    const ok = el('button', { class: 'forum-btn forum-btn-danger', type: 'button', text: confirmLabel });
    const dialog = el('dialog', { class: 'forum-dialog', 'aria-labelledby': 'forum-dialog-title', 'aria-describedby': 'forum-dialog-text' },
      el('h2', { id: 'forum-dialog-title', class: 'forum-auth-title', text: title }),
      el('p', { id: 'forum-dialog-text', class: 'forum-muted', text }),
      el('div', { class: 'forum-actions' }, cancel, ok));
    let answer = false;
    cancel.addEventListener('click', () => dialog.close());
    ok.addEventListener('click', () => { answer = true; dialog.close(); });
    dialog.addEventListener('close', () => { dialog.remove(); resolve(answer); });
    document.querySelector('.forum-wrap').append(dialog);
    dialog.showModal();
    cancel.focus();
  });
}

/** Small form in a dialog. Resolves to the entered text, or null when cancelled. */
export function inputDialog({ title, label, value = '', confirmLabel, multiline = false, validate }) {
  return new Promise((resolve) => {
    const input = el(multiline ? 'textarea' : 'input', { id: 'forum-dialog-input', rows: multiline ? '4' : null });
    input.value = value;
    const error = el('p', { class: 'forum-field-error', role: 'alert' });
    const cancel = el('button', { class: 'forum-btn forum-btn-ghost', type: 'button', text: 'Vazgeç' });
    const form = el('form', { class: 'forum-form', novalidate: true },
      el('h2', { id: 'forum-dialog-title', class: 'forum-auth-title', text: title }),
      el('div', { class: 'forum-field' }, el('label', { for: 'forum-dialog-input', text: label }), input, error),
      el('div', { class: 'forum-actions' }, cancel, el('button', { class: 'forum-btn forum-btn-primary', type: 'submit', text: confirmLabel })));
    const dialog = el('dialog', { class: 'forum-dialog', 'aria-labelledby': 'forum-dialog-title' }, form);
    let answer = null;
    cancel.addEventListener('click', () => dialog.close());
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = input.value.trim();
      const problem = validate?.(text);
      error.textContent = problem ?? '';
      if (problem) { input.focus(); return; }
      answer = text;
      dialog.close();
    });
    dialog.addEventListener('close', () => { dialog.remove(); resolve(answer); });
    document.querySelector('.forum-wrap').append(dialog);
    dialog.showModal();
    input.focus();
  });
}

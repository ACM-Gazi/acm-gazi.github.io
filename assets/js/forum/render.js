// Markdown -> safe HTML, plus small shared DOM helpers.
import { isUploadedImage, takeMath, takeMathBlock, takeAlignMark, isTooComplex, definesCommands } from './lib.js';

export const PURIFY_CONFIG = {
  USE_PROFILES: { html: true },
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['style', 'iframe', 'form', 'input', 'textarea', 'button', 'select', 'object', 'embed', 'video', 'audio', 'dialog', 'picture', 'source'],
  // class/id/name: otherwise article text could borrow the site's own styles (e.g. a full-screen overlay).
  FORBID_ATTR: ['style', 'class', 'id', 'name', 'popover', 'popovertarget', 'background', 'autofocus', 'tabindex', 'srcset', 'sizes'],
};

let hookInstalled = false;
let source = ''; // the Markdown being shown

function installLinkHook(DOMPurify) {
  if (hookInstalled || typeof DOMPurify.addHook !== 'function') return;
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A' && node.getAttribute('href')) {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
    if (node.tagName === 'IMG') {
      // The file must be written out in the text: the database protects exactly those names from being replaced.
      const src = node.getAttribute('src') ?? '';
      if (!isUploadedImage(src, globalThis.FORUM_CONFIG?.url) || !source.includes(src.split('/').slice(-2).join('/'))) node.removeAttribute('src');
      node.setAttribute('loading', 'lazy');
    }
  });
  hookInstalled = true;
}

// ---------- Formulas ----------
// marked leaves a marker (two private-use characters around a number) for every formula. After sanitizing, the markers
// in the page's text become KaTeX output, so nothing the author writes ever skips the sanitizer.
const MARKER = /\uE000(\d+)\uE001/;
let formulas = [];
let mathInstalled = false;

function installMath(marked) {
  if (mathInstalled || typeof marked.use !== 'function') return;
  const mark = (token) => `\uE000${formulas.push(token) - 1}\uE001`;
  const tokenizer = (take, type) => (src) => {
    const found = take(src);
    return found && { type, ...found };
  };
  marked.use({ extensions: [
    { name: 'mathBlock', level: 'block', tokenizer: tokenizer(takeMathBlock, 'mathBlock'), renderer: (t) => `<div>${mark(t)}</div>\n`,
      start: (src) => { const m = /\n {0,3}\$\$/.exec(src); return m ? m.index + 1 : undefined; } },
    { name: 'math', level: 'inline', tokenizer: tokenizer(takeMath, 'math'), renderer: mark,
      start: (src) => { const i = src.indexOf('$'); return i < 0 ? undefined : i; } },
  ] });
  mathInstalled = true;
}

export function renderMarkdown(md, { marked, DOMPurify } = globalThis) {
  installLinkHook(DOMPurify);
  installMath(marked);
  formulas = [];
  source = String(md ?? '').replace(/[\uE000\uE001]/g, '');
  let html;
  try {
    html = isTooComplex(source) ? null : marked.parse(source);
  } catch {
    html = null; // nested too deeply for the parser
  }
  if (html === null) {
    formulas = [];
    html = `<pre>${source.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre>`;
  }
  return DOMPurify.sanitize(html, PURIFY_CONFIG);
}

const KATEX = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min';
let katexPromise = null;
let katex = null; // set once both the library and its stylesheet are there

/** Loaded only when an article has a formula. */
function loadKatex() {
  katexPromise ??= new Promise((resolve, reject) => {
    const add = (node) => new Promise((ok, fail) => { node.addEventListener('load', ok); node.addEventListener('error', fail); document.head.append(node); });
    Promise.all([
      add(el('link', { rel: 'stylesheet', href: `${KATEX}.css`, crossorigin: 'anonymous', integrity: 'sha384-nB0miv6/jRmo5UMMR1wu3Gz6NLsoTkbqJghGIsx//Rlm+ZU03BU6SQNC66uf4l5+' })),
      add(el('script', { src: `${KATEX}.js`, crossorigin: 'anonymous', integrity: 'sha384-7zkQWkzuo3B5mTepMUcHkMB5jZaolc2xDwL6VFqjFALcbeS9Ggm/Yr2r3Dy4lfFg' })),
    ]).then(() => { katex = globalThis.katex; resolve(); }, reject);
  }).catch((err) => { katexPromise = null; throw err; });
  return katexPromise;
}

function drawFormulas(spans) {
  const started = performance.now();
  for (const { node, tex, display } of spans) {
    if (definesCommands(tex) || performance.now() - started > 1500) continue; // the source stays visible
    try {
      katex.render(tex, node, { displayMode: display, throwOnError: false, errorColor: '#ff9d9d', strict: 'ignore', trust: false, maxSize: 20, maxExpand: 500 });
    } catch { /* the source stays visible */ }
  }
}

/** Turns {ortala}, {sağa} and {yasla} at the start of a block into its alignment. */
function alignBlocks(node) {
  for (const block of node.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li')) {
    let first = block.firstChild;
    while (first?.nodeType === Node.TEXT_NODE && !first.data.trim()) first = first.nextSibling;
    const mark = first?.nodeType === Node.TEXT_NODE ? takeAlignMark(first.data.trimStart()) : null;
    if (!mark) continue;
    first.data = mark.rest;
    block.classList.add(`forum-align-${mark.align}`);
  }
}

/** Puts an article text into an element: safe HTML, then alignment and formulas. */
export function renderInto(node, md) {
  node.innerHTML = renderMarkdown(md); // sanitized by DOMPurify
  alignBlocks(node);
  if (!formulas.length) return;
  const found = formulas;
  const texts = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) if (MARKER.test(walker.currentNode.data)) texts.push(walker.currentNode);
  const spans = [];
  for (const text of texts) {
    text.replaceWith(...text.data.split(MARKER).map((part, i) => {
      if (i % 2 === 0) return part;
      const formula = found[part];
      if (!formula) return ''; // a marker somebody typed
      found[part] = null;
      const { raw, tex, display } = formula;
      const span = el('span', { class: display ? 'forum-math forum-math-block' : 'forum-math', text: raw.trim() });
      spans.push({ node: span, tex, display });
      return span;
    }));
  }
  if (katex) drawFormulas(spans);
  else loadKatex().then(() => drawFormulas(spans), () => { /* offline: the source stays visible */ });
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

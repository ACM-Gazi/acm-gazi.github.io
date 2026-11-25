// /forum/yeni/ — write a new article or edit one of your own (?id=<uuid>).
import { getClient, requireUser, publicUrl } from './client.js';
import { renderMarkdown, showError } from './render.js';
import { openArticlePreview } from './article.js';
import { cropToBlob } from './image.js';
import {
  validatePost, validateImageFile, getIdParam, charCount, draftKey, imageObjectPath,
  translateAuthError, LIMITS, coverCropRect, validateCoverFile, formatDate, hasExternalImage,
} from './lib.js';

const $ = (sel, root = document) => root.querySelector(sel);
const root = $('#editor-root');
const postId = getIdParam(location.search);
const fmt = (n) => n.toLocaleString('tr-TR');

const storage = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* ignore */ } },
};

function waitForEasyMDE() {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    (function check() {
      if (window.EasyMDE) return resolve(window.EasyMDE);
      if (Date.now() - started > 15000) return reject(new Error('editor_load_failed'));
      setTimeout(check, 50);
    })();
  });
}

async function loadOwnPost(userId) {
  const { data, error } = await getClient().from('posts')
    .select('id,title,body_md,cover_path,status,author_id').eq('id', postId).maybeSingle();
  if (error) throw error;
  return data && data.author_id === userId ? data : null;
}

async function start() {
  const { session, profile } = await requireUser();
  const userId = session.user.id;
  if (profile?.banned_at) {
    showError(root, 'Hesabın engelli olduğu için yazı yazamazsın.');
    return;
  }

  let post = null;
  if (new URLSearchParams(location.search).has('id') && !postId) {
    showError(root, 'Yazı bulunamadı ya da bu yazıyı düzenleme iznin yok.');
    return;
  }
  if (postId) {
    post = await loadOwnPost(userId);
    if (!post) {
      showError(root, 'Yazı bulunamadı ya da bu yazıyı düzenleme iznin yok.');
      return;
    }
  }

  const EasyMDE = await waitForEasyMDE();
  root.replaceChildren($('#editor-template').content.cloneNode(true));

  const form = $('#post-form');
  const titleInput = $('#post-title');
  const formError = $('.forum-form-error', form);
  const key = draftKey(userId, postId);
  storage.remove('acm-forum-draft:new'); // old key, shared by every account
  let saved = { title: post?.title ?? '', body: post?.body_md ?? '', cover: post?.cover_path ?? null };
  let coverPath = saved.cover;
  const uploadedCovers = new Set(); // covers uploaded in this visit and not saved yet

  if (post) {
    $('#editor-title').textContent = 'Yazıyı düzenle';
    document.title = 'Yazıyı düzenle | ACM Gazi';
    $('#cancel-btn').href = '/forum/makalelerim/';
    $('#submit-btn').textContent = 'Değişiklikleri onaya gönder';
    if (post.status === 'approved') notice('Bu yazı yayında. Düzenleme sonrası yazı tekrar onaya gider ve onaylanana kadar yayından kalkar.', 'warning');
  }

  // ---------- Image upload (toolbar button, drag & drop, paste) ----------
  function uploadImage(file, onSuccess, onError) {
    $('#upload-status').textContent = '';
    const problem = validateImageFile(file);
    if (problem) return onError(problem);
    const path = imageObjectPath(userId, file);
    getClient().storage.from('forum-images')
      .upload(path, file, { contentType: file.type, cacheControl: '31536000', upsert: false })
      .then(({ error }) => {
        if (error) return onError('Görsel yüklenemedi. Lütfen tekrar dene.');
        onSuccess(getClient().storage.from('forum-images').getPublicUrl(path).data.publicUrl);
      })
      .catch(() => onError('Görsel yüklenemedi. İnternet bağlantını kontrol et.'));
  }

  const label = (icon, text) => `<span aria-hidden="true">${icon}</span><span class="tb-label">${text}</span>`;
  const editor = new EasyMDE({
    element: $('#post-body'),
    autoDownloadFontAwesome: false,
    spellChecker: false,
    nativeSpellcheck: true,
    minHeight: '320px',
    sideBySideFullscreen: false, // keep side-by-side inside the card (default is a white fullscreen view)
    maxHeight: '60vh',
    placeholder: 'Projeni ya da araştırmanı anlat… Biçimlendirme için üstteki butonları kullanabilirsin.',
    previewRender: (md) => renderMarkdown(md),
    previewClass: ['editor-preview', 'forum-prose'],
    initialValue: saved.body,
    status: ['upload-image'],
    uploadImage: true,
    imageMaxSize: LIMITS.imageMaxBytes,
    imageAccept: 'image/jpeg, image/png, image/webp, image/gif',
    imageUploadFunction: uploadImage,
    insertTexts: { link: ['[', '](https://)'], uploadedImage: ['![görsel](#url#)', ''] },
    imageTexts: {
      sbInit: 'Görsel eklemek için sürükleyip bırakabilir ya da yapıştırabilirsin.',
      sbOnDragEnter: 'Görseli buraya bırak…',
      sbOnDrop: 'Görsel yükleniyor…',
      sbProgress: 'Yükleniyor… %#progress#',
      sbOnUploaded: 'Görsel eklendi.',
      sizeUnits: ' B, KB, MB',
    },
    errorMessages: {
      noFileGiven: 'Görsel seçilmedi.',
      typeNotAllowed: 'Sadece JPG, PNG, WEBP veya GIF görsel yükleyebilirsin.',
      fileTooLarge: 'Görsel en fazla 5 MB olabilir.',
      importError: 'Görsel yüklenemedi. Lütfen tekrar dene.',
    },
    errorCallback: (msg) => { $('#upload-status').textContent = msg; },
    toolbar: [
      { name: 'bold', action: EasyMDE.toggleBold, icon: '<b aria-hidden="true">B</b>', title: 'Kalın' },
      { name: 'italic', action: EasyMDE.toggleItalic, icon: '<i aria-hidden="true">I</i>', title: 'İtalik' },
      { name: 'heading', action: EasyMDE.toggleHeadingSmaller, icon: '<span aria-hidden="true">H</span>', title: 'Başlık' },
      '|',
      { name: 'quote', action: EasyMDE.toggleBlockquote, icon: '<span aria-hidden="true">❝</span>', title: 'Alıntı' },
      { name: 'unordered-list', action: EasyMDE.toggleUnorderedList, icon: '<span aria-hidden="true">•</span>', title: 'Madde listesi' },
      { name: 'ordered-list', action: EasyMDE.toggleOrderedList, icon: '<span aria-hidden="true">1.</span>', title: 'Numaralı liste' },
      { name: 'link', action: EasyMDE.drawLink, icon: '<span aria-hidden="true">🔗</span>', title: 'Bağlantı ekle' },
      { name: 'code', action: EasyMDE.toggleCodeBlock, icon: '<span aria-hidden="true">&lt;/&gt;</span>', title: 'Kod' },
      '|',
      { name: 'upload-image', action: EasyMDE.drawUploadedImage, icon: label('🖼', 'Görsel ekle'), title: 'Görsel ekle' },
      { name: 'preview', action: EasyMDE.togglePreview, icon: label('👁', 'Önizle'), title: 'Önizle', noDisable: true },
      { name: 'side-by-side', action: EasyMDE.toggleSideBySide, icon: label('⇆', 'Yan yana'), title: 'Yan yana göster', noDisable: true, noMobile: true },
    ],
  });
  editor.codemirror.getInputField().setAttribute('aria-labelledby', 'post-body-label');
  titleInput.value = saved.title;

  // ---------- Cover image (required): centre-cropped to 16:9, max 1600px, uploaded as WEBP/JPEG ----------
  const coverInput = $('#cover-input');
  let coverBusy = false;
  const removeFiles = async (paths) => {
    if (!paths.length) return;
    try { await getClient().storage.from('forum-images').remove(paths); } catch { /* a leftover file is harmless */ }
  };

  function showCover(path) {
    const img = $('#cover-preview');
    img.hidden = !path;
    $('#cover-empty').hidden = !!path;
    $('#cover-change').hidden = !path;
    $('#cover-box').classList.toggle('has-cover', !!path);
    if (path) { img.src = publicUrl('forum-images', path); img.alt = 'Kapak görseli'; }
  }

  async function setCoverFromFile(file) {
    const status = $('#cover-status');
    status.textContent = '';
    clearFieldError($('#cover-field'));
    const problem = validateCoverFile(file);
    if (problem) { status.textContent = problem; return; }
    if (coverBusy) return;
    coverBusy = true;
    $('#cover-busy').hidden = false;
    try {
      const blob = await cropToBlob(file, coverCropRect);
      const path = imageObjectPath(userId, blob);
      const { error } = await getClient().storage.from('forum-images')
        .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      if (error) throw error;
      if (coverPath && uploadedCovers.has(coverPath)) { removeFiles([coverPath]); uploadedCovers.delete(coverPath); }
      uploadedCovers.add(path);
      coverPath = path;
      showCover(path);
      scheduleDraft();
    } catch {
      status.textContent = 'Kapak görseli yüklenemedi. Başka bir görsel dene ya da internet bağlantını kontrol et.';
    } finally {
      coverBusy = false;
      $('#cover-busy').hidden = true;
      coverInput.value = '';
    }
  }

  $('#cover-box').addEventListener('click', () => coverInput.click());
  $('#cover-change').addEventListener('click', () => coverInput.click());
  coverInput.addEventListener('change', () => coverInput.files[0] && setCoverFromFile(coverInput.files[0]));
  $('#cover-box').addEventListener('dragover', (e) => { e.preventDefault(); $('#cover-box').classList.add('drag'); });
  $('#cover-box').addEventListener('dragleave', () => $('#cover-box').classList.remove('drag'));
  $('#cover-box').addEventListener('drop', (e) => {
    e.preventDefault(); $('#cover-box').classList.remove('drag');
    const file = e.dataTransfer.files[0];
    if (file) setCoverFromFile(file);
  });
  showCover(coverPath);

  // ---------- Counters, draft autosave, unsaved-changes guard ----------
  const current = () => ({ title: titleInput.value, body: editor.value(), cover: coverPath });
  const isDirty = () => { const c = current(); return c.title !== saved.title || c.body !== saved.body || c.cover !== saved.cover; };

  function updateCounters() {
    const t = charCount(titleInput.value.trim());
    const b = charCount(editor.value().trim());
    const tc = $('#title-count'), bc = $('#body-count');
    tc.textContent = `${t} / ${LIMITS.titleMax}`;
    bc.textContent = `${fmt(b)} / ${fmt(LIMITS.bodyMax)} karakter${b < LIMITS.bodyMin ? ` · en az ${LIMITS.bodyMin}` : ''}`;
    tc.classList.toggle('forum-counter-over', t > LIMITS.titleMax);
    bc.classList.toggle('forum-counter-over', b > LIMITS.bodyMax);
  }

  let draftTimer = null;
  function scheduleDraft() {
    updateCounters();
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      if (!isDirty()) { storage.remove(key); $('#draft-status').textContent = ''; return; }
      const ok = storage.set(key, { ...current(), savedAt: Date.now() });
      $('#draft-status').textContent = ok ? 'Taslak kaydedildi ✓' : '';
    }, 800);
  }

  const draft = storage.get(key);
  if (draft && (draft.title !== saved.title || draft.body !== saved.body || (draft.cover ?? null) !== saved.cover)) {
    titleInput.value = draft.title ?? '';
    editor.value(draft.body ?? '');
    if (draft.cover && draft.cover.startsWith(userId + '/')) {
      coverPath = draft.cover; showCover(coverPath);
      if (coverPath !== saved.cover) uploadedCovers.add(coverPath);
    }
    const discard = document.createElement('button');
    discard.type = 'button'; discard.className = 'forum-link-btn'; discard.textContent = 'Taslağı sil';
    discard.addEventListener('click', () => {
      removeFiles([...uploadedCovers]); uploadedCovers.clear();
      titleInput.value = saved.title; editor.value(saved.body); coverPath = saved.cover; showCover(coverPath); storage.remove(key);
      notice(''); updateCounters();
    });
    notice('Kaydedilmemiş taslağın geri yüklendi. ', 'info', discard);
  }

  titleInput.addEventListener('input', scheduleDraft);
  editor.codemirror.on('change', scheduleDraft);
  updateCounters();

  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  // ---------- Full article preview (nothing is saved) ----------
  $('#preview-article').addEventListener('click', () => openArticlePreview({
    title: titleInput.value.trim() || 'Başlıksız yazı',
    body: editor.value(),
    coverUrl: coverPath ? publicUrl('forum-images', coverPath) : null,
    date: formatDate(new Date().toISOString()),
    author: profile,
  }));

  // ---------- Submit ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    form.querySelectorAll('.forum-field-error').forEach((n) => n.remove());
    titleInput.removeAttribute('aria-invalid');
    formError.hidden = true;

    const title = titleInput.value.trim();
    const body = editor.value().trim();
    const { errors } = validatePost({ title, body });
    if (!errors.body && hasExternalImage(body, window.FORUM_CONFIG.url)) {
      errors.body = 'Başka sitelerden bağlanan görseller gösterilmez. Görselleri "Görsel ekle" ile yükle.';
    }
    if (coverBusy) errors.cover = 'Kapak görseli yükleniyor. Bitmesini bekle.';
    else if (!coverPath) errors.cover = 'Kapak görseli ekle.';
    if (Object.keys(errors).length) {
      if (errors.cover) fieldError($('#cover-box'), errors.cover);
      if (errors.title) fieldError(titleInput, errors.title);
      if (errors.body) fieldError($('.EasyMDEContainer', form), errors.body);
      if (errors.cover) $('#cover-box').focus();
      else (errors.title ? titleInput : editor.codemirror).focus();
      return;
    }

    const btn = $('#submit-btn');
    const text = btn.textContent;
    btn.disabled = true; btn.textContent = 'Gönderiliyor…';
    try {
      const posts = getClient().from('posts');
      const { data, error } = post
        ? await posts.update({ title, body_md: body, cover_path: coverPath }).eq('id', post.id).select('id')
        : await posts.insert({ title, body_md: body, cover_path: coverPath }).select('id');
      if (error || !data?.length) throw error ?? new Error('not_saved');
      storage.remove(key);
      const replaced = saved.cover && saved.cover !== coverPath ? [saved.cover] : [];
      saved = { title: titleInput.value, body: editor.value(), cover: coverPath };
      await removeFiles(replaced); // awaited: leaving the page would cancel the request
      location.href = '/forum/makalelerim/?gonderildi=1';
    } catch (err) {
      formError.textContent = translateAuthError(err?.message);
      formError.hidden = false;
      btn.disabled = false; btn.textContent = text;
    }
  });
}

function notice(text, kind = 'info', extra = null) {
  const n = $('#editor-notice');
  n.className = `forum-notice forum-notice-${kind}`;
  n.replaceChildren(text);
  if (extra) n.append(extra);
  n.hidden = !text;
}

function clearFieldError(field) {
  field.querySelectorAll('.forum-field-error').forEach((n) => n.remove());
}

function fieldError(anchor, text) {
  const p = document.createElement('p');
  p.className = 'forum-field-error';
  p.textContent = text;
  anchor.closest('.forum-field').append(p);
  if (anchor.tagName === 'INPUT') anchor.setAttribute('aria-invalid', 'true');
}

start().catch(() => showError(root, 'Sayfa yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', () => location.reload()));

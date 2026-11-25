// /forum/yazi/?id=<uuid> — one article with its comments. Readable without an account.
import { getClient, getSession, getMyProfile, publicUrl, avatarEl, writeProblem, mountForumBar } from './client.js';
import { el, showLoading, showError, showEmpty, confirmDialog } from './render.js';
import { renderArticle, authorInfo } from './article.js';
import { getIdParam, articleBanner, articleDate, canDeleteComment, validateComment, charCount, formatDate, LIMITS } from './lib.js';

mountForumBar();

const root = document.getElementById('article-root');
const postId = getIdParam(location.search);
const AUTHOR = 'full_name,major,major2,year,avatar_path';
const MAX_COMMENTS = 500;
const fmt = (n) => n.toLocaleString('tr-TR');

let me = null; // { id, role, full_name, … } or null for visitors
let comments = [];
let total = 0;

function notFound() {
  showEmpty(root, 'Yazı bulunamadı.', el('a', { class: 'forum-btn forum-btn-ghost', href: '/forum/', text: 'Foruma dön' }));
}

async function loadMe() {
  const session = await getSession();
  if (!session) return null;
  try {
    const profile = await getMyProfile();
    if (profile) return profile;
  } catch { /* reading must work even if the profile cannot be loaded */ }
  return { id: session.user.id, role: 'member', full_name: session.user.user_metadata?.full_name || 'Üye' };
}

const loadPost = () => getClient().from('posts')
  .select(`id,title,body_md,cover_path,status,reject_reason,approved_at,created_at,author_id,author:profiles!posts_author_id_fkey(${AUTHOR})`)
  .eq('id', postId).maybeSingle();

const loadComments = () => getClient().from('comments')
  .select(`id,body,created_at,author_id,author:profiles!comments_author_id_fkey(${AUTHOR})`, { count: 'exact' })
  .eq('post_id', postId).order('created_at').order('id').limit(MAX_COMMENTS);

// ---------- Comments ----------
function commentEl(comment) {
  const info = authorInfo(comment.author);
  const del = canDeleteComment(comment, me)
    ? el('button', { class: 'forum-link-btn forum-comment-delete', type: 'button', 'aria-label': `Yorumu sil: ${comment.author?.full_name ?? ''}`, text: 'Sil' }) : null;
  del?.addEventListener('click', () => removeComment(comment, del));
  return el('li', { class: 'forum-comment' },
    avatarEl(comment.author, 40),
    el('div', { class: 'forum-comment-main' },
      el('div', { class: 'forum-comment-head' },
        el('span', { text: comment.author?.full_name ?? 'Üye' }),
        info ? el('span', { class: 'forum-hint', text: info }) : null,
        el('span', { class: 'forum-hint', text: formatDate(comment.created_at) })),
      el('p', { class: 'forum-comment-body', text: comment.body })),
    del);
}

function renderComments() {
  document.getElementById('comments-title').textContent = `Yorumlar (${fmt(total)})`;
  document.getElementById('comment-list').replaceChildren(
    ...comments.map(commentEl),
    ...(comments.length ? [] : [el('li', { class: 'forum-state', text: 'Henüz yorum yok.' })]),
    ...(total > comments.length ? [el('li', { class: 'forum-state', text: `İlk ${fmt(comments.length)} yorum gösteriliyor.` })] : []));
}

function commentError(text) {
  const p = document.getElementById('comment-error');
  p.textContent = text;
  p.hidden = !text;
}

async function removeComment(comment, button) {
  const yes = await confirmDialog({ title: 'Yorumu sil', text: 'Bu yorum kalıcı olarak silinecek.', confirmLabel: 'Sil' });
  if (!yes) { button.focus(); return; }
  button.disabled = true;
  try {
    const { data, error } = await getClient().from('comments').delete().eq('id', comment.id).select('id');
    if (error) throw error;
    if (!data.length) throw new Error('not_deleted');
    comments = comments.filter((c) => c.id !== comment.id);
    total -= 1;
    commentError('');
    renderComments();
    document.getElementById('comments-title').focus();
  } catch {
    button.disabled = false;
    commentError(await writeProblem('Yorum silinemedi. İnternet bağlantını kontrol edip tekrar dene.'));
  }
}

function commentForm() {
  const counter = el('span', { class: 'forum-counter', text: `0 / ${fmt(LIMITS.commentMax)}` });
  const box = el('textarea', { id: 'comment-body', rows: '3', placeholder: 'Yorumunu yaz…', 'aria-describedby': 'comment-error' });
  const send = el('button', { class: 'forum-btn forum-btn-primary', type: 'submit', text: 'Yorum yap' });
  const form = el('form', { class: 'forum-form forum-comment-form', novalidate: true },
    el('div', { class: 'forum-field' }, el('label', { for: 'comment-body', text: 'Yorumun' }), box),
    el('div', { class: 'forum-comment-foot' }, counter, send));
  box.addEventListener('input', () => {
    const n = charCount(box.value.trim());
    counter.textContent = `${fmt(n)} / ${fmt(LIMITS.commentMax)}`;
    counter.classList.toggle('forum-counter-over', n > LIMITS.commentMax);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = box.value.trim();
    const problem = validateComment(body);
    commentError(problem ?? '');
    if (problem) { box.focus(); return; }
    send.disabled = true;
    send.textContent = 'Gönderiliyor…';
    try {
      const { data, error } = await getClient().from('comments')
        .insert({ post_id: postId, body }).select('id,body,created_at,author_id').single();
      if (error) throw error;
      comments.push({ ...data, author: me });
      total += 1;
      box.value = '';
      box.dispatchEvent(new Event('input'));
      renderComments();
      document.getElementById('comment-list').lastElementChild.scrollIntoView({ block: 'nearest' });
    } catch {
      commentError(await writeProblem('Yorum gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.'));
    } finally {
      send.disabled = false;
      send.textContent = 'Yorum yap';
    }
  });
  return form;
}

function commentsSection() {
  return el('section', { class: 'forum-comments glass-card', 'aria-labelledby': 'comments-title' },
    el('h2', { class: 'forum-comments-title', id: 'comments-title', tabindex: '-1' }),
    me?.banned_at ? el('p', { class: 'forum-muted', text: 'Hesabın engelli olduğu için yorum yapamazsın.' }) : me ? commentForm()
      : el('a', { class: 'forum-btn forum-btn-ghost', href: '/forum/giris/', text: 'Yorum yapmak için giriş yap' }),
    el('p', { class: 'forum-form-error', id: 'comment-error', role: 'alert', hidden: true }),
    el('ul', { class: 'forum-comment-list', id: 'comment-list' }));
}

// ---------- Page ----------
async function start() {
  if (!postId) { notFound(); return; }
  showLoading(root);
  try {
    const [post, comm, viewer] = await Promise.all([loadPost(), loadComments(), loadMe()]);
    if (post.error) throw post.error;
    if (!post.data) { notFound(); return; }
    me = viewer;
    const p = post.data;
    document.title = `${p.title} | ACM Forum`;
    const banner = articleBanner(p);
    const parts = [renderArticle({
      title: p.title, body: p.body_md, coverUrl: publicUrl('forum-images', p.cover_path), date: articleDate(p), author: p.author,
    })];
    if (banner) parts.unshift(el('div', { class: `forum-notice forum-notice-${banner.kind} forum-article-banner`, role: 'status', text: banner.text }));
    else parts.push(commentsSection());
    root.replaceChildren(...parts);
    if (banner) return;
    if (comm.error) {
      showError(document.getElementById('comment-list'), 'Yorumlar yüklenemedi.', start);
      document.getElementById('comments-title').textContent = 'Yorumlar';
      return;
    }
    comments = comm.data;
    total = comm.count ?? comments.length;
    renderComments();
  } catch {
    showError(root, 'Yazı yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', start);
  }
}

start();

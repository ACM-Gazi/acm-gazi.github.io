// Supabase client, session helpers and the forum top bar.
import { el } from './render.js';
import { banMessage } from './lib.js';

let client = null;
let profilePromise = null;

export function getClient() {
  if (!client) {
    const { url, key } = window.FORUM_CONFIG;
    client = window.supabase.createClient(url, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

export async function getSession() {
  try {
    const { data, error } = await getClient().auth.getSession();
    return error ? null : data.session;
  } catch {
    return null;
  }
}

export function getMyProfile() {
  profilePromise ??= (async () => {
    const session = await getSession();
    if (!session) return null;
    const { data, error } = await getClient().rpc('my_profile').maybeSingle();
    if (error) throw error;
    return data;
  })();
  return profilePromise;
}

/** Reloads the cached profile and the top bar after a change. */
export async function refreshProfile() {
  profilePromise = null;
  await mountForumBar();
}

export function publicUrl(bucket, path) {
  return `${window.FORUM_CONFIG.url}/storage/v1/object/public/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export const imagesPrefix = () => `${window.FORUM_CONFIG.url}/storage/v1/object/public/forum-images/`;

export function avatarUrl(avatarPath) {
  return avatarPath ? publicUrl('avatars', avatarPath) : null;
}

/** Round avatar: photo when set, otherwise initials. */
export function avatarEl(profile, size = 32) {
  const url = avatarUrl(profile?.avatar_path);
  const node = el('span', { class: 'forum-avatar', 'aria-hidden': 'true', style: null });
  node.style.width = node.style.height = size + 'px';
  if (url) node.append(el('img', { src: url, alt: '', loading: 'lazy', width: size, height: size }));
  else node.textContent = initials(profile?.full_name);
  return node;
}

const never = () => new Promise(() => {});

export async function requireUser() {
  const session = await getSession();
  if (!session) {
    // Logged-out visitors of members-only pages go to the forum home (user decision).
    location.replace('/forum/');
    return never();
  }
  const profile = await getMyProfile();
  return { session, profile };
}

export async function requireAdmin() {
  const result = await requireUser();
  if (result.profile?.role !== 'admin') {
    location.replace('/forum/');
    return never();
  }
  return result;
}

export async function signOut() {
  try { await getClient().auth.signOut(); } finally { location.href = '/forum/'; }
}

function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean);
  const chars = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '?').slice(0, 2);
  return chars.toLocaleUpperCase('tr-TR');
}

function userMenu(profile, name, isAdmin) {
  const menuId = 'forum-user-menu';
  const button = el('button', {
    class: 'forum-btn forum-btn-ghost forum-user-btn', type: 'button',
    'aria-haspopup': 'true', 'aria-expanded': 'false', 'aria-controls': menuId,
  },
  avatarEl({ ...profile, full_name: name }, 32),
  el('span', { class: 'forum-user-name', text: name }),
  el('span', { class: 'forum-caret', 'aria-hidden': 'true', text: '▾' }));

  const menu = el('div', { id: menuId, class: 'forum-menu', role: 'menu', hidden: true },
    profile?.banned_at ? null : el('a', { href: '/forum/yeni/', role: 'menuitem', class: 'forum-menu-only-phone', text: '✎ Yazı yaz' }),
    el('a', { href: '/forum/makalelerim/', role: 'menuitem', text: 'Makalelerim' }),
    el('a', { href: '/forum/profilim/', role: 'menuitem', text: 'Profilim' }),
    isAdmin ? el('a', { href: '/forum/admin/', role: 'menuitem', text: 'Admin paneli' }) : null,
    el('button', { type: 'button', role: 'menuitem', onclick: signOut, text: 'Çıkış yap' }));

  const setOpen = (open) => {
    menu.hidden = !open;
    button.setAttribute('aria-expanded', String(open));
  };
  button.addEventListener('click', (e) => { e.stopPropagation(); setOpen(menu.hidden); });
  document.addEventListener('click', (e) => { if (!menu.contains(e.target)) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { setOpen(false); button.focus(); }
  });
  return el('div', { class: 'forum-user' }, button, menu);
}

export async function mountForumBar() {
  const slot = document.getElementById('forum-bar-user');
  if (!slot) return;
  const session = await getSession();
  if (!session) {
    // After logging in from the bar, users land on the forum home (/forum/).
    if (location.pathname.startsWith('/forum/giris')) slot.replaceChildren();
    else slot.replaceChildren(el('a', { class: 'forum-btn forum-btn-ghost', href: '/forum/giris/', text: 'Giriş yap' }));
    return;
  }
  let profile = null;
  try { profile = await getMyProfile(); } catch { /* show name from session below */ }
  const name = profile?.full_name || session.user.user_metadata?.full_name || session.user.email.split('@')[0];
  const banned = banMessage(profile);
  document.getElementById('forum-ban')?.remove();
  if (banned) document.getElementById('forum-bar').after(el('div', { id: 'forum-ban', class: 'forum-notice forum-notice-error', role: 'status', text: banned }));
  slot.replaceChildren(...(banned ? [] : [
    el('a', { class: 'forum-btn forum-btn-primary forum-write-btn', href: '/forum/yeni/', 'aria-label': 'Yazı yaz' },
      el('span', { class: 'forum-write-icon', 'aria-hidden': 'true', text: '✎' }),
      el('span', { class: 'forum-btn-label', text: 'Yazı yaz' }))]),
    userMenu(profile, name, profile?.role === 'admin'));
}

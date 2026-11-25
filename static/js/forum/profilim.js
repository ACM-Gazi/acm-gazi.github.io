// /forum/profilim/ — own photo, department, class and password.
import { getClient, requireUser, refreshProfile, avatarEl } from './client.js';
import { showError } from './render.js';
import { clearErrors, formError, showFieldErrors, busy, values, initPasswordToggles } from './forms.js';
import { cropToBlob } from './image.js';
import {
  YEAR_OPTIONS, validateProfile, validateAvatarFile, validatePasswordChange, avatarCropRect,
  imageObjectPath, isOwnFile, translateAuthError,
} from './lib.js';

const $ = (sel) => document.querySelector(sel);
const root = $('#profile-root');
const SAVE_FAILED = 'Kaydedilemedi. İnternet bağlantını kontrol edip tekrar dene.';

let profile = null;
let email = '';
let photoBusy = false;

function notice(text) {
  const n = $('#profile-notice');
  n.className = 'forum-notice forum-notice-success';
  n.textContent = text;
  n.hidden = !text;
  if (text) n.scrollIntoView({ block: 'center' });
}

async function saveProfile(changes) {
  const { data, error } = await getClient().from('profiles').update(changes).eq('id', profile.id).select('id');
  if (error) throw error;
  if (!data.length) throw new Error('not_saved');
  Object.assign(profile, changes);
  refreshProfile().catch(() => {}); // the top bar follows on its own
}

// ---------- Photo ----------
function showPhoto() {
  $('#profile-avatar').replaceChildren(avatarEl(profile, 120));
  if (profile.banned_at) return;
  $('#photo-change').textContent = profile.avatar_path ? 'Fotoğrafı değiştir' : 'Fotoğraf seç';
  $('#photo-remove').hidden = !profile.avatar_path;
}

async function removeFile(path) {
  if (!isOwnFile(path, profile.id)) return;
  try { await getClient().storage.from('avatars').remove([path]); } catch { /* a leftover file is harmless */ }
}

async function withPhotoBusy(fn) {
  if (photoBusy) return;
  photoBusy = true;
  $('#photo-error').textContent = '';
  notice('');
  $('#photo-busy').hidden = false;
  $('#photo-change').disabled = $('#photo-remove').disabled = true;
  try { await fn(); } finally {
    photoBusy = false;
    $('#photo-busy').hidden = true;
    $('#photo-change').disabled = $('#photo-remove').disabled = false;
  }
}

function setPhoto(file) {
  const problem = validateAvatarFile(file);
  if (problem) { $('#photo-error').textContent = problem; return; }
  withPhotoBusy(async () => {
    const old = profile.avatar_path;
    let path = null;
    try {
      const blob = await cropToBlob(file, avatarCropRect);
      path = imageObjectPath(profile.id, blob);
      const { error } = await getClient().storage.from('avatars')
        .upload(path, blob, { contentType: blob.type, cacheControl: '31536000', upsert: false });
      if (error) { path = null; throw error; }
      await saveProfile({ avatar_path: path });
      showPhoto();
      notice('Profil fotoğrafın güncellendi.');
      await removeFile(old);
    } catch {
      if (path && profile.avatar_path !== path) await removeFile(path);
      $('#photo-error').textContent = 'Fotoğraf yüklenemedi. Başka bir fotoğraf dene ya da internet bağlantını kontrol et.';
    }
  });
}

function clearPhoto() {
  withPhotoBusy(async () => {
    const old = profile.avatar_path;
    try {
      await saveProfile({ avatar_path: null });
      showPhoto();
      notice('Profil fotoğrafın kaldırıldı.');
      await removeFile(old);
    } catch {
      $('#photo-error').textContent = 'Fotoğraf kaldırılamadı. İnternet bağlantını kontrol edip tekrar dene.';
    }
  });
}

// ---------- Forms ----------
function submitInfo(e) {
  e.preventDefault();
  const form = e.currentTarget;
  clearErrors(form);
  notice('');
  const v = values(form);
  const { ok, errors } = validateProfile(v);
  if (!ok) { showFieldErrors(form, errors); return; }
  busy(form, async () => {
    try {
      await saveProfile({ major: v.major.trim(), major2: v.major2.trim() || null, year: v.year });
      notice('Bilgilerin kaydedildi.');
    } catch {
      formError(form, SAVE_FAILED);
    }
  });
}

function submitPassword(e) {
  e.preventDefault();
  const form = e.currentTarget;
  clearErrors(form);
  notice('');
  const v = values(form);
  const { ok, errors } = validatePasswordChange(v);
  if (!ok) { showFieldErrors(form, errors); return; }
  busy(form, async () => {
    const { auth } = getClient();
    try {
      const check = await auth.signInWithPassword({ email, password: v.current });
      if (check.error) {
        if (/invalid login credentials/i.test(check.error.message)) showFieldErrors(form, { current: 'Mevcut şifren yanlış.' });
        else formError(form, translateAuthError(check.error.message));
        return;
      }
      const { error } = await auth.updateUser({ password: v.password });
      if (error) { formError(form, translateAuthError(error.message)); return; }
      form.reset();
      $('#pw-user').value = email;
      try { await auth.signOut({ scope: 'others' }); } catch { /* the password itself is already changed */ }
      notice('Şifren değiştirildi.');
    } catch (err) {
      formError(form, translateAuthError(err?.message));
    }
  });
}

// ---------- Start ----------
async function start() {
  const { session, profile: loaded } = await requireUser();
  if (!loaded) throw new Error('no_profile');
  profile = { ...loaded };
  email = session.user.email;
  root.replaceChildren($('#profile-template').content.cloneNode(true));
  $('#profile-name').textContent = profile.full_name;
  $('#profile-email').textContent = email;
  $('#pw-user').value = email;
  for (const o of YEAR_OPTIONS) $('#pf-year').append(new Option(o.label, o.value));
  $('#pf-major').value = profile.major ?? '';
  $('#pf-major2').value = profile.major2 ?? '';
  $('#pf-year').value = profile.year ?? '';
  showPhoto();
  if (profile.banned_at) { // only the password can still be changed
    $('.forum-profile-photo-actions').remove();
    $('#info-form').closest('section').remove();
  }
  initPasswordToggles(root);

  $('#password-form').addEventListener('submit', submitPassword);
  if (profile.banned_at) return;
  const input = $('#photo-input');
  $('#photo-change').addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    const file = input.files[0];
    input.value = '';
    if (file) setPhoto(file);
  });
  $('#photo-remove').addEventListener('click', clearPhoto);
  $('#info-form').addEventListener('submit', submitInfo);
}

start().catch(() => showError(root, 'Profilin yüklenemedi. İnternet bağlantını kontrol edip tekrar dene.', () => location.reload()));

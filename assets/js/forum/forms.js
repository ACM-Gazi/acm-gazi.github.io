// Form helpers shared by the login and profile pages.

const $ = (sel, root = document) => root.querySelector(sel);

export function clearErrors(form) {
  form.querySelectorAll('.forum-field-error').forEach((e) => e.remove());
  form.querySelectorAll('[aria-invalid]').forEach((i) => { i.removeAttribute('aria-invalid'); i.removeAttribute('aria-errormessage'); });
  const fe = $('.forum-form-error', form);
  fe.hidden = true; fe.textContent = '';
}

export function fieldError(form, name, text) {
  const input = form.elements[name];
  if (!input) return;
  const id = `${input.id}-err`;
  const p = document.createElement('p');
  p.className = 'forum-field-error'; p.id = id; p.textContent = text;
  input.closest('.forum-field').append(p);
  input.setAttribute('aria-invalid', 'true');
  input.setAttribute('aria-errormessage', id);
}

export function formError(form, text) {
  const fe = $('.forum-form-error', form);
  fe.textContent = text; fe.hidden = false;
}

export function showFieldErrors(form, errors) {
  for (const [name, text] of Object.entries(errors)) fieldError(form, name, text);
  form.querySelector('[aria-invalid="true"]')?.focus();
}

export async function busy(form, fn) {
  const btn = form.querySelector('button[type="submit"]');
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = 'Lütfen bekle…';
  try {
    await fn();
  } catch {
    formError(form, 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip sayfayı yenile.');
  } finally {
    btn.disabled = false;
    btn.textContent = label;
  }
}

export const values = (form) => Object.fromEntries(new FormData(form).entries());

export function initPasswordToggles(root = document) {
  root.querySelectorAll('.forum-eye').forEach((btn) => btn.addEventListener('click', () => {
    const input = btn.previousElementSibling;
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.setAttribute('aria-pressed', String(!showing));
    btn.setAttribute('aria-label', showing ? 'Şifreyi göster' : 'Şifreyi gizle');
  }));
}

// /forum/giris/ — log in, sign up, forgot password, set new password.
import { getClient, getSession } from './client.js';
import { clearErrors, formError, showFieldErrors, busy, values, initPasswordToggles } from './forms.js';
import { YEAR_OPTIONS, validateSignup, translateAuthError, safeNext, parseAuthHash, parseVerifyParams, isAllowedEmail, LIMITS } from './lib.js';

const $ = (sel, root = document) => root.querySelector(sel);
const REDIRECT_TO = location.origin + '/forum/giris/';
const RESEND_COOLDOWN_S = 60;

const linkResult = parseAuthHash(window.__authHash ?? '');
const target = safeNext(window.__authSearch ?? '');
const verifyParams = parseVerifyParams(window.__authSearch ?? '');

const panels = {
  main: $('#auth-main'), forgot: $('#panel-forgot'), recovery: $('#panel-recovery'), sent: $('#panel-sent'), verify: $('#panel-verify'),
};

function show(name) {
  for (const [key, node] of Object.entries(panels)) node.hidden = key !== name;
  const first = panels[name].querySelector('input, button');
  if (name !== 'main') first?.focus();
}

function notice(text, kind = 'info') {
  const n = $('#auth-notice');
  n.textContent = text;
  n.className = `forum-notice forum-notice-${kind}`;
  n.hidden = !text;
}

// ---------- Tabs ----------
const tabs = [$('#tab-login'), $('#tab-signup')];
function selectTab(tab, focus = false) {
  for (const t of tabs) {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !on;
  }
  if (focus) tab.focus();
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => selectTab(t));
  t.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') selectTab(tabs[(i + 1) % 2], true);
  });
});

// ---------- Show / hide password ----------
initPasswordToggles();

// ---------- Year select ----------
const yearSelect = $('#su-year');
for (const o of YEAR_OPTIONS) yearSelect.append(new Option(o.label, o.value));

// ---------- Login ----------
$('#panel-login').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  clearErrors(form);
  const { email, password } = values(form);
  const errors = {};
  if (!email.trim()) errors.email = 'E-posta adresini yaz.';
  if (!password) errors.password = 'Şifreni yaz.';
  if (Object.keys(errors).length) return showFieldErrors(form, errors);
  busy(form, async () => {
    const { error } = await getClient().auth.signInWithPassword({ email: email.trim(), password });
    if (error) return formError(form, translateAuthError(error.message));
    location.replace(target);
  });
});

// ---------- Sign up ----------
let lastSignupEmail = '';
$('#panel-signup').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  clearErrors(form);
  const v = values(form);
  const email = v.email.trim().toLowerCase();
  // The domain rule is enforced by the database; here we only pre-check Gazi addresses,
  // so other (allowlisted) addresses still reach the server.
  const { errors } = validateSignup({ ...v, email }, isAllowedEmail(email, []) ? [] : [email]);
  if (Object.keys(errors).length) return showFieldErrors(form, errors);
  busy(form, async () => {
    const { error } = await getClient().auth.signUp({
      email, password: v.password,
      options: {
        emailRedirectTo: REDIRECT_TO,
        data: { full_name: v.full_name.trim(), major: v.major.trim(), major2: v.major2.trim() || null, year: v.year },
      },
    });
    if (error) {
      const msg = /sending|smtp/i.test(error.message)
        ? 'Doğrulama e-postası şu anda gönderilemedi. Lütfen biraz sonra tekrar dene.'
        : translateAuthError(error.message);
      if (/gazi\.edu\.tr/.test(msg)) return showFieldErrors(form, { email: msg });
      return formError(form, msg);
    }
    lastSignupEmail = email;
    showSent('Doğrulama e-postası gönderildi',
      `${email} adresine gelen bağlantıya tıklayarak hesabını doğrula. Doğruladıktan sonra giriş yapabilirsin.`, true);
    form.reset();
  });
});

// ---------- E-mail sent / resend ----------
let cooldownTimer = null;
function showSent(title, text, canResend) {
  $('#sent-title').textContent = title;
  $('#sent-text').textContent = text;
  const resend = $('#resend-btn');
  resend.hidden = !canResend;
  if (canResend) startCooldown();
  show('sent');
}

function startCooldown() {
  const btn = $('#resend-btn');
  let left = RESEND_COOLDOWN_S;
  clearInterval(cooldownTimer);
  btn.disabled = true;
  const tick = () => {
    btn.textContent = left > 0 ? `Tekrar gönder (${left} sn)` : 'Tekrar gönder';
    if (left-- <= 0) { clearInterval(cooldownTimer); btn.disabled = false; }
  };
  tick();
  cooldownTimer = setInterval(tick, 1000);
}

$('#resend-btn').addEventListener('click', async () => {
  const { error } = await getClient().auth.resend({ type: 'signup', email: lastSignupEmail, options: { emailRedirectTo: REDIRECT_TO } });
  notice(error ? translateAuthError(error.message) : 'E-posta tekrar gönderildi.', error ? 'error' : 'success');
  startCooldown();
});

// ---------- Forgot password ----------
$('#show-forgot').addEventListener('click', () => {
  $('#fg-email').value = $('#login-email').value;
  show('forgot');
});

$('#panel-forgot').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  clearErrors(form);
  const email = values(form).email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showFieldErrors(form, { email: 'Geçerli bir e-posta adresi yaz.' });
  busy(form, async () => {
    const { error } = await getClient().auth.resetPasswordForEmail(email, { redirectTo: REDIRECT_TO });
    // Supabase answers success for unknown addresses, so any error here is a real failure
    // (mail server down, rate limit, network) and must be shown.
    if (error) return formError(form, /sending|smtp/i.test(error.message)
      ? 'E-posta şu anda gönderilemedi. Lütfen biraz sonra tekrar dene.'
      : translateAuthError(error.message));
    // Same message whether or not the account exists (doesn't reveal who is registered).
    showSent('Bağlantı gönderildi', `${email} adresine kayıtlı bir hesap varsa, şifre yenileme bağlantısı gönderildi.`, false);
  });
});

document.querySelectorAll('[data-back]').forEach((b) => b.addEventListener('click', () => {
  notice('');
  show('main');
  selectTab(tabs[0]);
}));

// ---------- New password (after clicking the reset link) ----------
$('#panel-recovery').addEventListener('submit', (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  clearErrors(form);
  const { password, password2 } = values(form);
  const errors = {};
  if (password.length < LIMITS.passwordMin) errors.password = `Şifre en az ${LIMITS.passwordMin} karakter olmalı.`;
  else if (password !== password2) errors.password2 = 'Şifreler eşleşmiyor.';
  if (Object.keys(errors).length) return showFieldErrors(form, errors);
  busy(form, async () => {
    const { error } = await getClient().auth.updateUser({ password });
    if (error) return formError(form, translateAuthError(error.message));
    location.replace('/forum/');
  });
});

// ---------- Confirm link (token_hash) ----------
function setupVerify({ token_hash, type }) {
  const isRecovery = type === 'recovery';
  $('#verify-title').textContent = isRecovery ? 'Şifre yenileme' : 'E-postanı doğrula';
  $('#verify-text').textContent = isRecovery
    ? 'Yeni şifreni belirlemek için devam et.'
    : 'Hesabını etkinleştirmek için aşağıdaki butona bas.';
  const btn = $('#verify-btn');
  btn.textContent = isRecovery ? 'Devam et' : 'Hesabımı doğrula';
  const err = $('#panel-verify .forum-form-error');
  btn.addEventListener('click', async () => {
    const label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Lütfen bekle…'; err.hidden = true;
    const { error } = await getClient().auth.verifyOtp({ token_hash, type });
    btn.disabled = false; btn.textContent = label;
    if (error) { err.textContent = translateAuthError(error.message); err.hidden = false; return; }
    history.replaceState(null, '', location.pathname);
    if (isRecovery) show('recovery');
    else location.replace('/forum/');
  });
  show('verify');
}

// ---------- Start ----------
(async () => {
  if (verifyParams) return setupVerify(verifyParams);
  if (linkResult.error) {
    notice(linkResult.error, 'error');
    history.replaceState(null, '', location.pathname);
    return;
  }
  const session = await getSession();
  if (linkResult.type === 'recovery' && session) return show('recovery');
  if (session) location.replace(target); // already logged in (also right after the confirm link)
})();

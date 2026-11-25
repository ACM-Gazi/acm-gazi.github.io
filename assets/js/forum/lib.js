// Pure helpers for the ACM Forum. No DOM, no network — unit tested in tests/forum/lib.test.js.

export const YEAR_OPTIONS = [
  { value: 'hazirlik', label: 'Hazırlık' },
  { value: '1', label: '1. sınıf' },
  { value: '2', label: '2. sınıf' },
  { value: '3', label: '3. sınıf' },
  { value: '4', label: '4. sınıf' },
  { value: 'yuksek_lisans', label: 'Yüksek Lisans' },
  { value: 'doktora', label: 'Doktora' },
  { value: 'mezun', label: 'Mezun' },
];

export const LIMITS = {
  titleMin: 5, titleMax: 150, bodyMin: 50, bodyMax: 50000,
  commentMax: 2000, passwordMin: 8, nameMin: 3, nameMax: 100, majorMin: 2, majorMax: 100,
  imageMaxBytes: 5 * 1024 * 1024, avatarSourceMaxBytes: 10 * 1024 * 1024,
};

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const GAZI_DOMAIN = 'gazi.edu.tr';
const LINK_USED_MSG = 'Bu bağlantı daha önce kullanılmış ya da süresi dolmuş. Hesabın zaten doğrulandıysa giriş yapmayı dene; değilse yeni bir bağlantı iste.';
const GAZI_ONLY_MSG = 'Sadece @gazi.edu.tr uzantılı adreslerle kayıt olunabilir.';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Count Unicode code points (same as Postgres char_length), not UTF-16 units.
const len = (s) => [...String(s ?? '').trim()].length;

export function isAllowedEmail(email, allowlist = []) {
  if (typeof email !== 'string') return false;
  const e = email.trim().toLowerCase();
  const parts = e.split('@');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
  if (allowlist.some((a) => a.trim().toLowerCase() === e)) return true;
  const domain = parts[1];
  return domain === GAZI_DOMAIN || domain.endsWith('.' + GAZI_DOMAIN);
}

export function yearLabel(value) {
  return YEAR_OPTIONS.find((o) => o.value === value)?.label ?? '';
}

export function formatMajors(major, major2) {
  return [major, major2].map((m) => String(m ?? '').trim()).filter(Boolean).join(' & ');
}

export function formatByline(profile) {
  if (!profile) return '';
  return [profile.full_name, formatMajors(profile.major, profile.major2), yearLabel(profile.year)]
    .map((p) => String(p ?? '').trim())
    .filter(Boolean)
    .join(' · ');
}

export function validatePost({ title, body } = {}) {
  const errors = {};
  const t = len(title), b = len(body);
  if (t < LIMITS.titleMin) errors.title = `Başlık en az ${LIMITS.titleMin} karakter olmalı.`;
  else if (t > LIMITS.titleMax) errors.title = `Başlık en fazla ${LIMITS.titleMax} karakter olabilir.`;
  if (b < LIMITS.bodyMin) errors.body = `Yazı en az ${LIMITS.bodyMin} karakter olmalı.`;
  else if (b > LIMITS.bodyMax) errors.body = `Yazı en fazla ${LIMITS.bodyMax} karakter olabilir.`;
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateComment(body) {
  const n = len(body);
  if (n < 1) return 'Yorum boş olamaz.';
  if (n > LIMITS.commentMax) return `Yorum en fazla ${LIMITS.commentMax} karakter olabilir.`;
  return null;
}

export function validateProfile({ major, major2, year } = {}) {
  const errors = {};
  if (len(major) < LIMITS.majorMin) errors.major = 'Bölümünü yaz.';
  else if (len(major) > LIMITS.majorMax) errors.major = `Bölüm en fazla ${LIMITS.majorMax} karakter olabilir.`;
  if (len(major2) > 0) {
    if (len(major2) < LIMITS.majorMin) errors.major2 = 'İkinci bölümü tam yaz ya da boş bırak.';
    else if (len(major2) > LIMITS.majorMax) errors.major2 = `Bölüm en fazla ${LIMITS.majorMax} karakter olabilir.`;
    else if (String(major2).trim().toLocaleLowerCase('tr-TR') === String(major ?? '').trim().toLocaleLowerCase('tr-TR'))
      errors.major2 = 'İkinci bölüm, ilk bölümle aynı olamaz.';
  }
  if (!YEAR_OPTIONS.some((o) => o.value === year)) errors.year = 'Sınıfını seç.';
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateSignup({ email, password, password2, full_name, major, major2, year } = {}, allowlist = []) {
  const errors = {};
  if (!String(email ?? '').trim()) errors.email = 'E-posta adresini yaz.';
  else if (!isAllowedEmail(email, allowlist)) errors.email = GAZI_ONLY_MSG;
  if (String(password ?? '').length < LIMITS.passwordMin) errors.password = `Şifre en az ${LIMITS.passwordMin} karakter olmalı.`;
  if (password2 !== undefined && password2 !== password) errors.password2 = 'Şifreler eşleşmiyor.';
  if (len(full_name) < LIMITS.nameMin) errors.full_name = 'Adını ve soyadını yaz.';
  else if (len(full_name) > LIMITS.nameMax) errors.full_name = `Ad soyad en fazla ${LIMITS.nameMax} karakter olabilir.`;
  Object.assign(errors, validateProfile({ major, major2, year }).errors);
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateAvatarFile({ type, size } = {}) {
  if (!AVATAR_TYPES.includes(type)) return 'Profil fotoğrafı JPG, PNG veya WEBP olmalı.';
  if (!(size <= LIMITS.avatarSourceMaxBytes)) return 'Fotoğraf en fazla 10 MB olabilir.';
  return null;
}

export function validateImageFile({ type, size } = {}) {
  if (!IMAGE_TYPES.includes(type)) return 'Sadece JPG, PNG, WEBP veya GIF görsel yükleyebilirsin.';
  if (!(size <= LIMITS.imageMaxBytes)) return 'Görsel en fazla 5 MB olabilir.';
  return null;
}

const MATH_MAX = 5000;

/** A formula at the start of the text: $$…$$ (own line) or $…$ (inside a sentence). Prices like "$5 ve $10" are not formulas. */
export function takeMath(src) {
  if (src.startsWith('$$')) {
    const end = src.indexOf('$$', 2);
    const tex = end < 0 || end > MATH_MAX ? '' : src.slice(2, end).trim();
    if (!tex || /\n[ \t\r]*\n/.test(tex)) return undefined;
    return { raw: src.slice(0, end + 2), tex, display: true };
  }
  const m = /^\$(?![\s$])((?:\\[^\n]|[^\\$\n`]){1,1000})\$(?!\d)/.exec(src);
  return m && !/\s$/.test(m[1]) ? { raw: m[0], tex: m[1], display: false } : undefined;
}

/** A $$…$$ formula that fills its own line(s). */
export function takeMathBlock(src) {
  const indent = /^ {0,3}(?=\$\$)/.exec(src)?.[0];
  if (indent === undefined) return undefined;
  const math = takeMath(src.slice(indent.length));
  if (!math) return undefined;
  const rest = /^[ \t]*(?:\r?\n|$)/.exec(src.slice(indent.length + math.raw.length));
  return rest ? { ...math, raw: indent + math.raw + rest[0] } : undefined;
}

export function excerpt(markdown, max = 200) {
  const text = String(markdown ?? '')
    .replace(/```[\s\S]*?```/g, ' ')          // code fences
    .replace(/\$\$[^$]{1,5000}\$\$/g, ' [formül] ') // formulas
    .replace(/(^|[^\\$])(\$(?![\s$])(?:\\[^\n]|[^\\$\n`]){1,1000}\$)(?!\d)/g, (all, before, math) => (takeMath(math) ? `${before}[formül]` : all))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')      // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')    // links -> text
    .replace(/<[^>]*>/g, ' ')                   // html tags
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')         // heading marks
    .replace(/^\s{0,3}>\s?/gm, '')              // quotes
    .replace(/[*_~`]+/g, '')                    // emphasis, inline code
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd() + '…';
}

export function firstImageUrl(markdown) {
  const re = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  for (const m of String(markdown ?? '').matchAll(re)) {
    if (/^https?:\/\//i.test(m[1])) return m[1];
  }
  return null;
}

export function getIdParam(search) {
  const id = new URLSearchParams(search ?? '').get('id');
  return id && UUID_RE.test(id) ? id.toLowerCase() : null;
}

export function formatDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' }).format(d);
}

export function translateAuthError(message) {
  const m = String(message ?? '');
  const l = m.toLowerCase();
  if (l.includes('expired') || (l.includes('invalid') && l.includes('link'))) return LINK_USED_MSG;
  if (l.includes('invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (l.includes('email not confirmed')) return 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.';
  if (l.includes('already registered') || l.includes('already been registered')) return 'Bu e-posta ile zaten bir hesap var.';
  if (l.includes('gazi.edu.tr')) return GAZI_ONLY_MSG;
  if (l.includes('rate limit') || l.includes('too many')) return 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar dene.';
  if (l.includes('password should be at least') || l.includes('weak password')) return `Şifre en az ${LIMITS.passwordMin} karakter olmalı.`;
  if (l.includes('same password') || l.includes('different from the old')) return 'Yeni şifre eskisinden farklı olmalı.';
  if (l.includes('failed to fetch') || l.includes('network')) return 'Sunucuya ulaşılamadı. İnternet bağlantını kontrol edip tekrar dene.';
  return 'Bir hata oluştu. Lütfen tekrar dene.';
}

export function storagePathsFromMarkdown(markdown, bucketPublicPrefix) {
  const out = new Set();
  const re = /!\[[^\]]*\]\(\s*<?([^)\s>]+)>?/g;
  for (const m of String(markdown ?? '').matchAll(re)) {
    if (!m[1].startsWith(bucketPublicPrefix)) continue;
    try { out.add(decodeURIComponent(m[1].slice(bucketPublicPrefix.length))); } catch { /* not a valid path */ }
  }
  return [...out];
}

/** Where to go after login: only same-site forum pages, otherwise the forum home. */
export function safeNext(search) {
  const next = new URLSearchParams(search ?? '').get('next') ?? '';
  const ok = next.startsWith('/forum/') && !next.startsWith('/forum/giris')
    && !next.includes('//') && !next.includes('\\') && !/(^|\/)\.\.?(\/|$|\?)/.test(next);
  return ok ? next : '/forum/';
}

/** Reads the result Supabase appends to e-mail links (#type=… or #error=…). */
export function parseAuthHash(hash) {
  const p = new URLSearchParams(String(hash ?? '').replace(/^#/, ''));
  if (p.get('error') || p.get('error_code')) {
    const expired = p.get('error_code') === 'otp_expired' || /expired/i.test(p.get('error_description') ?? '');
    return { type: null, error: expired
      ? LINK_USED_MSG
      : 'Bağlantı geçersiz. Lütfen tekrar dene.' };
  }
  return { type: p.get('type'), error: null };
}

const VERIFY_TYPES = { email: 'email', signup: 'email', recovery: 'recovery', email_change: 'email_change' };

/** E-mail links point to /forum/giris/?token_hash=…&type=… ; verification happens only on a button press. */
export function parseVerifyParams(search) {
  const p = new URLSearchParams(search ?? '');
  const tokenHash = p.get('token_hash');
  const type = VERIFY_TYPES[p.get('type')];
  if (!tokenHash || !type || !/^[A-Za-z0-9_-]{1,512}$/.test(tokenHash)) return null;
  return { token_hash: tokenHash, type };
}

/** Character count as Postgres counts it (code points). */
export function charCount(s) {
  return [...String(s ?? '')].length;
}

/** Per account, so members sharing a computer never see each other's draft. */
export function draftKey(userId, postId) {
  return `acm-forum-draft:${userId}:${postId ?? 'new'}`;
}

const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/** Storage path for an uploaded image: "<user id>/<random uuid>.<ext>". */
export function imageObjectPath(userId, file, uuid = () => crypto.randomUUID()) {
  return `${userId}/${uuid()}.${EXT_BY_TYPE[file.type] ?? 'bin'}`;
}

const COVER_RATIO = 16 / 9;
const COVER_MAX_WIDTH = 1600;

/** Centre crop of a w×h image to 16:9, and the output size (never enlarged, max 1600px wide). */
export function coverCropRect(w, h) {
  let sw = w, sh = h;
  if (w / h > COVER_RATIO) sw = Math.round(h * COVER_RATIO);
  else sh = Math.round(w / COVER_RATIO);
  const dw = Math.min(COVER_MAX_WIDTH, sw);
  return { sx: Math.round((w - sw) / 2), sy: Math.round((h - sh) / 2), sw, sh, dw, dh: Math.round(dw / COVER_RATIO) };
}

export function validateCoverFile(file) {
  if (!file) return 'Kapak görseli ekle.';
  if (!AVATAR_TYPES.includes(file.type)) return 'Kapak görseli JPG, PNG veya WEBP olmalı.';
  if (!(file.size <= LIMITS.avatarSourceMaxBytes)) return 'Kapak görseli en fazla 10 MB olabilir.';
  return null;
}

export const STATUS_LABELS = { approved: 'Yayında', pending: 'Beklemede', rejected: 'Reddedildi' };

export function summarizePosts(posts) {
  const count = (status) => posts.filter((p) => p.status === status).length;
  const r = { all: posts.length, approved: count('approved'), pending: count('pending'), rejected: count('rejected') };
  const groups = ['approved', 'pending', 'rejected'].filter((k) => r[k])
    .map((k) => `${r[k]} ${STATUS_LABELS[k].toLocaleLowerCase('tr-TR')}`);
  r.text = r.all ? `${r.all} makale: ${groups.join(' · ')}` : 'Henüz yazın yok.';
  return r;
}

export function postStatusInfo(post) {
  const [verb, iso] = {
    approved: ['Yayınlandı', post.approved_at],
    rejected: ['Reddedildi', post.updated_at],
  }[post.status] ?? ['Gönderildi', post.updated_at];
  return { label: STATUS_LABELS[post.status] ?? '', date: `${verb}: ${formatDate(iso)}` };
}

/**
 * Storage files that may be deleted together with an article: only files directly in the
 * author's own folder, and only if none of the author's other articles uses them.
 */
export function removablePostFiles(post, authorPosts, bucketPublicPrefix) {
  const others = authorPosts.filter((p) => p.id !== post.id);
  const stillUsed = (path) => others.some((p) => p.cover_path === path || String(p.body_md ?? '').includes(path));
  return [...new Set([post.cover_path, ...storagePathsFromMarkdown(post.body_md, bucketPublicPrefix)])].filter((path) => {
    return isOwnFile(path, post.author_id) && !path.endsWith('/no-cover') && !stillUsed(path);
  });
}

/** Banner above an unpublished article (the database shows those only to the author and admins). */
export function articleBanner(post) {
  if (post.status === 'pending') return { kind: 'warning', text: 'Bu yazı onay bekliyor. Şu an sadece yazarı ve adminler görebilir.' };
  if (post.status === 'rejected') return { kind: 'error', text: `Bu yazı reddedildi. Sebep: ${post.reject_reason ?? ''}`.trim() };
  return null;
}

export function canDeleteComment(comment, me) {
  return !!me && !me.banned_at && (me.role === 'admin' || me.id === comment.author_id);
}

export function articleDate(post) {
  return formatDate(post.approved_at ?? post.created_at);
}

/** PostgREST filter: articles published before the given one (same date: lower id). */
export function olderThanFilter({ approved_at, id }) {
  return `approved_at.lt."${approved_at}",and(approved_at.eq."${approved_at}",id.lt."${id}")`;
}

/** Splits a result fetched with one extra row into the page and whether more rows exist. */
export function takePage(rows, size) {
  return { items: rows.slice(0, size), more: rows.length > size };
}

/** True for "<userId>/<file>" only. */
export function isOwnFile(path, userId) {
  const parts = String(path ?? '').split('/');
  return parts.length === 2 && parts[0] === userId && parts[1] !== '';
}

const AVATAR_SIZE = 256;

/** Centre square of a w×h photo and its output size (never enlarged). */
export function avatarCropRect(w, h) {
  const side = Math.min(w, h);
  const size = Math.min(AVATAR_SIZE, side);
  return { sx: Math.round((w - side) / 2), sy: Math.round((h - side) / 2), sw: side, sh: side, dw: size, dh: size };
}

export function validatePasswordChange({ current, password, password2 } = {}) {
  const errors = {};
  if (!current) errors.current = 'Mevcut şifreni yaz.';
  if (String(password ?? '').length < LIMITS.passwordMin) errors.password = `Şifre en az ${LIMITS.passwordMin} karakter olmalı.`;
  else if (password === current) errors.password = 'Yeni şifre eskisinden farklı olmalı.';
  else if (password !== password2) errors.password2 = 'Şifreler eşleşmiyor.';
  return { ok: Object.keys(errors).length === 0, errors };
}

const UPLOADED_PATH = /^\/storage\/v1\/object\/public\/forum-images\/[0-9a-f-]{36}\/[A-Za-z0-9._-]{1,120}$/;

/** Articles show only pictures from our own storage: anything else could be swapped after approval. */
export function isUploadedImage(src, baseUrl) {
  const s = String(src ?? '');
  return !!baseUrl && s.startsWith(`${baseUrl}/`) && UPLOADED_PATH.test(s.slice(baseUrl.length));
}

export function hasExternalImage(markdown, baseUrl) {
  const text = String(markdown ?? '').replace(/```[\s\S]*?(```|$)/g, ' ').replace(/`[^`\n]*`/g, ' ');
  const urls = [
    ...[...text.matchAll(/!\[[^\]]*\]\(\s*<?([^)\s>]+)/g)].map((m) => m[1]),
    ...[...text.matchAll(/<img\b[^>]*?\bsrc\s*=\s*["']?([^"'\s>]+)/gi)].map((m) => m[1]),
  ];
  return urls.some((u) => !isUploadedImage(u, baseUrl));
}

export function adminError(message) {
  const m = String(message ?? '');
  if (m.includes('version_changed')) return 'Yazı sen incelerken değişti. Güncel hali yüklendi, lütfen tekrar incele.';
  if (m.includes('last_admin')) return 'Son admin adminlikten çıkarılamaz.';
  if (m.includes('cannot_ban_admin')) return 'Adminler engellenemez. Önce adminlikten çıkar.';
  if (m.includes('cannot_ban_self')) return 'Kendini engelleyemezsin.';
  if (m.includes('member_banned')) return 'Engelli bir üye admin yapılamaz. Önce engelini kaldır.';
  if (m.includes('author_banned')) return 'Bu yazının yazarı engelli. Önce engelini kaldır.';
  if (m.includes('reason_required')) return 'Sebep 3 ile 500 karakter arasında olmalı.';
  if (m.includes('forbidden')) return 'Bu işlem için admin yetkin yok.';
  if (m.includes('not_found')) return 'Bu kayıt artık yok.';
  return 'İşlem tamamlanamadı. İnternet bağlantını kontrol edip tekrar dene.';
}

const fold = (s) => String(s ?? '').trim().toLocaleLowerCase('tr-TR');

export function filterMembers(members, query) {
  const name = fold(query);
  const mail = String(query ?? '').trim().toLowerCase();
  if (!name) return members;
  return members.filter((m) => fold(m.full_name).includes(name) || String(m.email ?? '').toLowerCase().includes(mail));
}

export function validateRejectReason(reason) {
  const n = len(reason);
  return n < 3 || n > 500 ? 'Sebep 3 ile 500 karakter arasında olmalı.' : null;
}

export function validateName(name) {
  const n = len(name);
  return n < LIMITS.nameMin || n > LIMITS.nameMax ? `Ad soyad ${LIMITS.nameMin} ile ${LIMITS.nameMax} karakter arasında olmalı.` : null;
}

/** Columns an article card needs. */
export const CARD_COLUMNS = 'id,title,body_md,cover_path,approved_at,created_at,author:profiles!posts_author_id_fkey(full_name,major,major2,year,avatar_path)';

/** Address of the newest published articles (the home page asks without the Supabase library). */
export function latestPostsUrl(baseUrl, count) {
  const q = new URLSearchParams({ select: CARD_COLUMNS, status: 'eq.approved', order: 'approved_at.desc,id.desc', limit: String(count) });
  return `${baseUrl}/rest/v1/posts?${q}`;
}

/** Text shown to a banned member, or null. */
export function banMessage(profile) {
  return profile?.banned_at ? `Hesabın engellendi. Sebep: ${profile.ban_reason ?? ''}`.trim() : null;
}

/** Which buttons an admin sees for a member. */
export function memberActions(member, myId) {
  if (member.role === 'admin') return ['name', ...(member.avatar_path && member.id !== myId ? ['photo'] : []), 'demote'];
  return ['name', ...(member.avatar_path ? ['photo'] : []), ...(member.banned_at ? ['unban'] : ['promote', 'ban'])];
}

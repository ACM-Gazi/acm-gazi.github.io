# ACM Forum — Design

Date: 2026-11-22 · Owner: ACM Gazi president (site maintainer)

## Intent

acmgazi.org is the community's static Hugo site (GitHub Pages). Members — Gazi University students — have no place on it to publish their own work. The ACM Forum lets them write articles about their projects and research, lets others comment, and gives admins a review step so nothing dangerous or unethical gets published under the ACM Gazi name.

## Goals

- "ACM Forum" link in the top navigation (desktop list and mobile menu) → `/forum`.
- Forum list page showing **approved** articles, newest first.
- Accounts restricted to `@gazi.edu.tr` addresses, with e-mail verification. One exception: the president's personal address (allowlisted) for testing and admin work.
- Article editor: title, text with formatting, inline images.
- Article page: content, then a byline with **name surname · major · year** (e.g. "Ayşe Yılmaz · Bilgisayar Mühendisliği · 2. sınıf"). **No e-mail shown anywhere public.**
- Comments under each article.
- Admin panel: every article must be approved before it is public; admins can reject with a reason.
- Home page: the current "Haberler" block becomes two blocks, **"Son Yazılar"** (latest approved forum articles) and **"Haberler"**.

## Non-goals

- Search-engine indexing of forum articles (content is loaded client-side; accepted trade-off).
- Likes/votes, tags/categories, search, notifications, private messages, comment editing.
- Replacing Sveltia CMS at `/admin` — it stays as-is for Haberler/Etkinlikler/etc.

## Anti-goals (failure even if it "works")

- Any unapproved article reachable by the public (including via direct API calls).
- A user able to make themselves admin, or edit/delete someone else's content.
- Script injection through article or comment content (stored XSS).
- Any change to the existing site's look, or any public exposure of members' e-mails.

## Constraints

- Hosting stays GitHub Pages; the site stays static Hugo (theme vendored in `themes/ananke`, Hugo 0.135 in CI).
- Free tiers only.
- UI language: Turkish.
- Reuse the existing theme: CSS variables in `themes/ananke/assets/ananke/css/_styles.css` (`--foreground-primary`, `--background-primary`, `.glass-card`, etc.), existing nav/header/footer. Only the editor, login/sign-up and admin screens are new designs, built from the same tokens.

## Approaches considered

1. **Everything in Supabase, rendered in the browser (chosen).** Hugo serves the page shells in the site theme; JS loads/writes data via Supabase (auth, Postgres with row-level security, storage). Approval is instant. Cost: forum content isn't in static HTML, so weak SEO.
2. **Supabase + approved posts committed to the repo as Markdown by a GitHub Action.** Best SEO, but each approval waits 1–2 min for a rebuild and adds a GitHub token and second workflow to maintain. Rejected: more moving parts for little benefit to a student audience.
3. **Git-only (Sveltia CMS + giscus comments).** Rejected: requires every student to have a GitHub account and can't enforce `@gazi.edu.tr`.

Backend: **Supabase** over Firebase — Firebase needs the paid plan for Storage on new projects and for blocking sign-ups by e-mail domain; Supabase does both free.

## Design

### Pages (Hugo content files + layouts in `themes/ananke/layouts/forum/`)

| URL | Purpose | Access |
|---|---|---|
| `/forum/` | List of approved articles (title, excerpt, cover/first image, byline, date), paginated client-side | Public |
| `/forum/yazi/?id=<uuid>` | Single article + byline + comments | Public (approved only; author/admin can also view own pending/rejected) |
| `/forum/giris/` | Log in / sign up (tabs), password reset | Public |
| `/forum/yeni/` and `/forum/yeni/?id=<uuid>` | Create / edit article | Logged-in, verified |
| `/forum/makalelerim/` | My articles with count and status (Beklemede / Yayında / Reddedildi + reason); edit / delete | Logged-in |
| `/forum/profilim/` | Personal info (name, majors, class, e-mail, photo); change photo, class, major, second major (Çift Anadal), password. Name is not self-editable (anti-impersonation; admins fix typos). | Logged-in |
| `/forum/admin/` | Pending queue with preview, approve / reject-with-reason, delete any article or comment, manage admins | Admins only (enforced in DB, page just hides UI) |

Query-string IDs are used because GitHub Pages can't serve dynamic routes.

Forum pages show a small "Giriş yap" / user-name element near the forum header (not in the global nav, to keep the existing nav unchanged apart from the new link).

### Data model (Supabase Postgres)

- `profiles` — `id` (= `auth.users.id`), `full_name`, `major`, `major2` (optional second major, Çift Anadal), `avatar_path` (optional, in `avatars` bucket), `year` (enum: `1`, `2`, `3`, `4`, `hazirlik`, `yuksek_lisans`, `doktora`, `mezun`), `role` (`member` | `admin`, default `member`), `created_at`. Created by trigger from sign-up metadata.
- `posts` — `id`, `author_id`, `title`, `body_md`, `status` (`pending` | `approved` | `rejected`), `reject_reason`, `created_at`, `updated_at`, `approved_at`, `approved_by`.
- `comments` — `id`, `post_id`, `author_id`, `body` (plain text), `created_at`.
- `signup_allowlist` — `email`; seeded with the president's address.
- Storage bucket `forum-images`: public read; authenticated users may upload only under `<their uid>/…`; images only (jpeg/png/webp/gif), max 5 MB. File names are random UUIDs, so an image in a pending article can't be found without its link; rejecting or deleting an article deletes its images. *(Builder's call: avoids signed-URL complexity.)*

### Rules (row-level security — the real enforcement)

- Sign-up: a Supabase "before user created" auth hook (fallback: trigger on `auth.users`) rejects any e-mail whose domain is not `gazi.edu.tr` or a subdomain of it (e.g. `ogr.gazi.edu.tr`) and that is not in `signup_allowlist`. *(Builder's call: subdomains accepted so a student-specific domain isn't locked out.)* Supabase "Confirm email" is on — unverified users can't log in.
- `posts`: anyone reads `approved`; author reads own; admins read all. Authors insert with `status = pending` only. Authors may update own posts; any author update forces `status = pending` (trigger), so an edited approved article goes back to review and is hidden (with its comments) until re-approved. *(Builder's call: keeps the schema simple; edits after publishing are expected to be rare.)* Only admins change status. Author or admin may delete.
- `comments`: anyone reads comments on approved posts; logged-in users insert as themselves; author or admin deletes.
- `profiles`: public read of `full_name`, `major`, `year` only (e-mail lives in `auth.users`, never exposed). Users update own name/major/year; `role` changeable only by admins (trigger guard).

### Editor

Markdown editor with a formatting toolbar and live preview (EasyMDE, loaded from a pinned CDN version), styled to the site theme. "Görsel ekle" uploads to `forum-images` and inserts the image into the text. Same Markdown flavour the rest of the site uses, so it fits the existing content.

Rendering everywhere: `marked` → `DOMPurify` before inserting into the page (blocks XSS). Comments are rendered as plain text.

### Comments

Decided: only logged-in members can comment; comments publish instantly (no approval queue); admins and the comment's author can delete. Public visitors can read.

### Admins and e-mails

Decided: admins can see members' e-mail addresses in the admin panel (to promote the right person and to contact authors of harmful content). This goes through a database function that only admins can call; e-mails are never exposed to members or the public. The admin panel's member list shows name, major, year, e-mail and role, with promote/demote buttons.

### Home page

In `themes/ananke/layouts/index.html`, the "Haberler" section becomes two blocks: "Son Yazılar" (latest 3 approved articles, fetched client-side, with a "Tümü" link to `/forum/`) and "Haberler" (unchanged Hugo content). Side by side on wide screens, stacked under 1000px (the site's existing breakpoint). If Supabase is unreachable, "Son Yazılar" hides itself.

### Config & secrets

- `hugo.toml` `[params.forum]`: `supabaseUrl`, `supabaseAnonKey` (the anon key is public by design; security comes from row-level security).
- SQL schema, policies, triggers and the seed are committed as `supabase/schema.sql` so the database can be recreated.
- Supabase Auth: Site URL `https://acmgazi.org`, redirect URLs include `http://localhost:1313/**`. Turkish e-mail templates.
- Before launch: custom SMTP (e.g. Resend free tier) — the built-in sender allows only a few mails per hour.
- Free-tier note: the project pauses after 7 days of zero activity; resume from dashboard.

### Deploy

No change to the GitHub Pages workflow. Database setup is a one-time manual step in the Supabase dashboard (create project, run `schema.sql`, set auth settings, promote the first admin).

Decided: the president creates and owns the Supabase project and shares the project URL and anon key; the builder supplies a step-by-step setup guide (`docs/forum-supabase-setup.md`) and tests the live rules (anon / member / admin) against that project during development. The service-role key is never shared or committed.

## Left to the builder

- Exact visual design of the editor, login and admin screens (within the theme's tokens).
- JS organization (plain ES modules in `static/js/forum/` vs a Hugo partial), pagination size, excerpt length.
- Pinned versions of `@supabase/supabase-js`, EasyMDE, marked, DOMPurify.
- Testing approach (local Hugo server against the Supabase project; RLS checks via direct API calls as anon / member / admin).

## Additions (2026-11-23, from page reviews)

- User menu: Makalelerim, Profilim, Admin paneli (admins only), Çıkış yap; phone also has "Yazı yaz" at the top.
- Byline with a second major: `Ad Soyad · Bölüm 1 & Bölüm 2 · Sınıf`; profile photo shown next to the byline and in the top bar.
- Storage bucket `avatars`: public read, owner-folder writes, jpeg/png/webp, max 2 MB; client crops to a 256×256 WEBP before upload.

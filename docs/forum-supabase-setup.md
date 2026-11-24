# ACM Forum — Supabase setup guide

Project: `https://jcwxsrilqydhvljlvesj.supabase.co` (organization **ACM Gazi**).
Never share or commit the **secret / service_role** key or the database password.

## Already done (2026-11-22)

- Project created (Free plan; region appears to be ap-northeast-1, Tokyo), Data API on, RLS-on-new-tables on.
- Authentication → Sign In / Providers → Email: **Confirm email** on.
- Authentication → URL Configuration: Site URL `https://acmgazi.org`; Redirect URLs `https://acmgazi.org/**`, `http://localhost:1313/**`.

## 1. Database (run once; safe to re-run after updates)

1. Dashboard → **SQL Editor** → **New query**.
2. Paste the whole content of `supabase/schema.sql` → **Run**.
3. Expected: "Success. No rows returned".

## 2. Gazi-only sign-up hook

1. **Authentication → Auth Hooks** → **Add hook** → **Before User Created**.
2. Hook type: **Postgres**. Schema: `public`. Function: `hook_before_user_created`.
3. **Create / Save** and make sure it is **enabled**.

## 3. Password length

**Authentication → Sign In / Providers → Email** → *Minimum password length*: **8** → Save.

## 4. Test accounts (for automatic security tests)

1. **Authentication → Users → Add user → Create new user**, three times, each with **Auto Confirm User** ticked:
   - `forum-test-uye1@gazi.edu.tr`
   - `forum-test-uye2@gazi.edu.tr`
   - `forum-test-admin@gazi.edu.tr`
   Use a different strong password for each (no e-mail is sent to these addresses).
2. SQL Editor → run `supabase/test-setup.sql`. Expected: 3 rows, `Test Admin` has role `admin`.
3. In the repo folder copy `.env.test.example` to `.env.test` and fill in the three passwords.
   `.env.test` is git-ignored — never commit it or paste it into chat.
4. Run `npm run test:rls` — every test must pass.

## 5. Your own admin account

1. Sign up on the site with `istisna@example.com` (or your Gazi address) and confirm the e-mail.
2. SQL Editor:
   ```sql
   update public.profiles set role = 'admin'
    where id = (select id from auth.users where email = 'istisna@example.com');
   ```

## 6. E-mail templates (Turkish, scanner-safe links)

Gmail/Outlook open links in incoming mail to scan them, which used up Supabase's default one-time links
("link expired" on the real click). Our links open `/forum/giris/` and verify only when the user presses a button.

**Authentication → Emails → Templates**:
- **Confirm signup** — Subject: `ACM Forum hesabını doğrula` — Body: content of `supabase/email-templates/confirm-signup.html`.
- **Reset password** — Subject: `ACM Forum şifre yenileme` — Body: content of `supabase/email-templates/reset-password.html`.

## Later (before launch)

- Custom SMTP (the built-in sender only allows a few mails per hour).

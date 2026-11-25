# ACM Forum — Supabase setup guide

Project: `https://eyjnvkkcafmykcgihseq.supabase.co` (organization **ACM Gazi**).
Never share or commit the **secret / service_role** key or the database password.

## Project settings (moved from Tokyo to Frankfurt on 2026-11-25)

- Free plan, region **Central EU (Frankfurt)**, `eu-central-1`. Data API on, "Automatically expose new tables" off, RLS on new tables on.
- Authentication → Sign In / Providers → Email: **Confirm email** on.
- Authentication → URL Configuration: Site URL `https://acmgazi.org`; Redirect URLs `https://acmgazi.org/**`, `http://localhost:1313/**`.
- Authentication → Emails → SMTP Settings: host `smtp.gmail.com`, port `465`, the club's Gmail address as user name and sender, sender name `ACM Gazi`, a Google App Password without spaces.
- Authentication → Rate Limits: 100 e-mails per hour.
- The site reads the project URL and publishable key from `hugo.toml` (`[params.forum]`); the tests read them from `.env.test`.

## 1. Database (run once; safe to re-run after updates)

1. Dashboard → **SQL Editor** → **New query**.
2. Paste the whole content of `supabase/schema.sql` → **Run**.
3. Expected: "Success. No rows returned".
4. Allow a non-Gazi address if needed: `insert into public.signup_allowlist (email) values ('istisna@example.com') on conflict do nothing;`

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
4. SQL Editor → run `supabase/checks/005-check.sql`. Every row must say OK.
5. Check that the sign-up hook is enabled, then run `npm run test:rls` — every test must pass.

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

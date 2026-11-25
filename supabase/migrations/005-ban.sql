-- =====================================================================
-- ACM Forum — 005: banning members.
--   A banned member can log in and read, but cannot write, edit, delete,
--   comment, upload or change the profile. Their articles and comments are
--   hidden from everyone except themselves and admins until the ban is lifted.
--   Also closes two ways around it: "+" addresses and changing the e-mail.
-- Run in Supabase → SQL Editor (safe to run again).
-- =====================================================================

alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists ban_reason text;
alter table public.profiles drop constraint if exists profiles_ban_check;
alter table public.profiles add constraint profiles_ban_check check (
  (banned_at is null and ban_reason is null)
  or (banned_at is not null and role = 'member' and char_length(btrim(ban_reason)) between 3 and 500));

-- ---------- Helpers ----------
create or replace function public.is_banned(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = p_user and banned_at is not null);
$$;
grant execute on function public.is_banned(uuid) to anon, authenticated;

-- Lets the admin panel show that a published article is hidden: select=...,author_banned
create or replace function public.author_banned(p public.posts)
returns boolean language sql stable set search_path = '' as $$
  select public.is_banned(p.author_id);
$$;
revoke execute on function public.author_banned(public.posts) from public, anon;
grant execute on function public.author_banned(public.posts) to authenticated;

create or replace function public.is_allowed_email(p_email text)
returns boolean language sql stable security definer set search_path = '' as $$
  select e.mail like '%_@_%'
     and position('@' in split_part(e.mail, '@', 2) || split_part(e.mail, '@', 3)) = 0
     and split_part(e.mail, '@', 3) = ''
     and (exists (select 1 from public.signup_allowlist a where a.email = e.mail)
          or (position('+' in e.mail) = 0
              and (split_part(e.mail, '@', 2) = 'gazi.edu.tr' or split_part(e.mail, '@', 2) like '%.gazi.edu.tr')))
    from (select lower(btrim(coalesce(p_email, ''))) as mail) e;
$$;
revoke execute on function public.is_allowed_email(text) from public, anon, authenticated;

-- ---------- Sign-up and e-mail change ----------
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if public.is_allowed_email(event->'user'->>'email') then return '{}'::jsonb; end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Sadece @gazi.edu.tr uzantılı adreslerle kayıt olunabilir.'));
end $$;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;

create or replace function public.guard_email_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if lower(coalesce(new.email, '')) is distinct from lower(coalesce(old.email, ''))
     and (public.is_banned(new.id) or not public.is_allowed_email(new.email)) then
    raise exception 'email_not_allowed' using errcode = '22023';
  end if;
  return new;
end $$;
revoke execute on function public.guard_email_change() from public, anon, authenticated;

drop trigger if exists guard_email_change on auth.users;
create trigger guard_email_change before update of email on auth.users
  for each row execute function public.guard_email_change();

-- ---------- Profile guard: nobody changes a ban through the table ----------
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if public.is_api_request() and not public.is_admin() then
    new.role := old.role;
    new.full_name := old.full_name;
    new.banned_at := old.banned_at;
    new.ban_reason := old.ban_reason;
  end if;
  if new.avatar_path is not null and new.avatar_path not like new.id::text || '/%' then
    raise exception 'invalid_avatar_path' using errcode = '22023';
  end if;
  return new;
end $$;

-- ---------- Row level security ----------
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using ((id = auth.uid() and not public.is_banned(auth.uid())) or public.is_admin())
  with check ((id = auth.uid() and not public.is_banned(auth.uid())) or public.is_admin());

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select
  using (author_id = auth.uid() or public.is_admin()
         or (status = 'approved' and not public.is_banned(author_id)));

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending' and not public.is_banned(auth.uid()));

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated
  using ((author_id = auth.uid() and not public.is_banned(auth.uid())) or public.is_admin())
  with check ((author_id = auth.uid() and not public.is_banned(auth.uid())) or public.is_admin());

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using ((author_id = auth.uid() and not public.is_banned(auth.uid())) or public.is_admin());

-- The articles seen inside these rules already follow posts_read.
drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select
  using (public.is_admin()
         or ((author_id = auth.uid() or not public.is_banned(author_id))
             and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved')));

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and not public.is_banned(auth.uid())
              and exists (select 1 from public.posts p where p.id = post_id and p.status = 'approved'));

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using ((author_id = auth.uid() and not public.is_banned(auth.uid())) or public.is_admin());

-- ---------- Storage ----------
drop policy if exists forum_storage_insert on storage.objects;
create policy forum_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('forum-images', 'avatars')
              and not public.is_banned(auth.uid())
              and (storage.foldername(name))[1] = auth.uid()::text
              and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$');

drop policy if exists forum_storage_delete on storage.objects;
create policy forum_storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('forum-images', 'avatars')
         and (public.is_admin()
              or (not public.is_banned(auth.uid())
                  and (storage.foldername(name))[1] = auth.uid()::text
                  and (bucket_id = 'avatars' or not public.is_image_in_use(name)))));

-- ---------- Own profile, with the ban ----------
drop function if exists public.my_profile();
create function public.my_profile()
returns table (id uuid, full_name text, major text, major2 text, year public.year_level,
               avatar_path text, role public.user_role, banned_at timestamptz, ban_reason text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.major, p.major2, p.year, p.avatar_path, p.role, p.banned_at, p.ban_reason
    from public.profiles p where p.id = auth.uid();
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ---------- Admin functions ----------
create or replace function public.approve_post(p_id uuid, p_version timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if exists (select 1 from public.posts x where x.id = p_id and public.is_banned(x.author_id)) then
    raise exception 'author_banned' using errcode = '22023';
  end if;
  update public.posts
     set status = 'approved', reject_reason = null, approved_at = now(), approved_by = auth.uid()
   where id = p_id and updated_at = p_version;
  if not found then
    if exists (select 1 from public.posts where id = p_id) then
      raise exception 'version_changed' using errcode = '22023';
    end if;
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end $$;

drop function if exists public.admin_list_members();
create function public.admin_list_members()
returns table (id uuid, full_name text, major text, major2 text, year public.year_level,
               avatar_path text, role public.user_role, email text, created_at timestamptz,
               post_count bigint, banned_at timestamptz, ban_reason text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, p.major, p.major2, p.year, p.avatar_path, p.role,
           u.email::text, p.created_at,
           (select count(*) from public.posts x where x.author_id = p.id),
           p.banned_at, p.ban_reason
      from public.profiles p join auth.users u on u.id = p.id
     order by p.created_at desc;
end $$;
revoke execute on function public.admin_list_members() from public, anon;
grant execute on function public.admin_list_members() to authenticated;

create or replace function public.set_member_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role = 'admin' and public.is_banned(p_user) then
    raise exception 'member_banned' using errcode = '22023';
  end if;
  if p_role = 'member'
     and (select role from public.profiles where id = p_user) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'last_admin' using errcode = '22023';
  end if;
  update public.profiles set role = p_role where id = p_user;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

create or replace function public.ban_member(p_user uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'cannot_ban_self' using errcode = '22023'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  update public.profiles
     set banned_at = coalesce(banned_at, now()), ban_reason = btrim(p_reason)
   where id = p_user and role = 'member';
  if not found then
    if exists (select 1 from public.profiles where id = p_user) then
      raise exception 'cannot_ban_admin' using errcode = '22023';
    end if;
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end $$;

create or replace function public.unban_member(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  update public.profiles set banned_at = null, ban_reason = null where id = p_user;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

revoke execute on function public.ban_member(uuid, text), public.unban_member(uuid) from public, anon;
grant execute on function public.ban_member(uuid, text), public.unban_member(uuid) to authenticated;

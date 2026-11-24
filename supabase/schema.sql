-- =====================================================================
-- ACM Forum — database schema, security rules and storage.
-- Run the whole file in Supabase → SQL Editor. Safe to run again.
-- =====================================================================

-- ---------- Types ----------
do $$ begin
  create type public.year_level as enum ('hazirlik','1','2','3','4','yuksek_lisans','doktora','mezun');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('member','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.post_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

-- ---------- Tables ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null check (char_length(btrim(full_name)) between 1 and 100),
  major       text not null default '' check (char_length(major) <= 100),
  major2      text check (major2 is null or char_length(btrim(major2)) between 2 and 100),
  year        public.year_level,
  avatar_path text check (avatar_path is null or char_length(avatar_path) <= 200),
  role        public.user_role not null default 'member',
  created_at  timestamptz not null default now()
);

create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  author_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  title         text not null check (char_length(btrim(title, E' \t\r\n')) between 5 and 150),
  body_md       text not null check (char_length(btrim(body_md, E' \t\r\n')) between 50 and 50000),
  status        public.post_status not null default 'pending',
  reject_reason text check (reject_reason is null or char_length(btrim(reject_reason)) between 3 and 500),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  approved_at   timestamptz,
  approved_by   uuid references public.profiles(id) on delete set null
);
alter table public.posts add column if not exists cover_path text;  -- see migrations/002-cover-image.sql
update public.posts set cover_path = author_id::text || '/no-cover' where cover_path is null;
alter table public.posts alter column cover_path set not null;
alter table public.posts drop constraint if exists posts_cover_in_author_folder;
alter table public.posts add constraint posts_cover_in_author_folder
  check (cover_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
         and split_part(cover_path, '/', 1) = author_id::text);
create index if not exists posts_status_approved_idx on public.posts (status, approved_at desc);
create index if not exists posts_author_idx on public.posts (author_id, created_at desc);

create table if not exists public.comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  author_id  uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body       text not null check (char_length(btrim(body, E' \t\r\n')) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);
create index if not exists comments_author_idx on public.comments (author_id);

create table if not exists public.signup_allowlist (
  email text primary key check (email = lower(btrim(email)))
);
-- Non-Gazi exceptions are added by hand in the SQL Editor, never in this (public) file:
--   insert into public.signup_allowlist (email) values ('name@example.com') on conflict do nothing;

-- ---------- Helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- True for requests coming through the website/API (not the dashboard SQL editor).
create or replace function public.is_api_request()
returns boolean language sql stable as $$
  select session_user = 'authenticator';
$$;

-- ---------- New user → profile ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m  jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  y  text  := m->>'year';
  m2 text  := nullif(btrim(coalesce(m->>'major2', '')), '');
begin
  insert into public.profiles (id, full_name, major, major2, year)
  values (
    new.id,
    left(coalesce(nullif(btrim(m->>'full_name'), ''), 'Üye'), 100),
    left(btrim(coalesce(m->>'major', '')), 100),
    case when char_length(m2) between 2 and 100 then m2 end,
    case when y in ('hazirlik','1','2','3','4','yuksek_lisans','doktora','mezun') then y::public.year_level end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Profiles for users that existed before this script.
insert into public.profiles (id, full_name)
select u.id, 'Üye' from auth.users u
on conflict (id) do nothing;

-- ---------- Guards ----------
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  if public.is_api_request() and not public.is_admin() then
    new.role := old.role;
    new.full_name := old.full_name;
  end if;
  if new.avatar_path is not null and new.avatar_path not like new.id::text || '/%' then
    raise exception 'invalid_avatar_path' using errcode = '22023';
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.profiles_guard();

create or replace function public.posts_insert_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_api_request() then
    new.author_id := auth.uid();
    new.status := 'pending';
    new.reject_reason := null;
    new.approved_at := null;
    new.approved_by := null;
    new.created_at := now();
    new.updated_at := now();
  end if;
  return new;
end $$;

drop trigger if exists posts_insert_guard on public.posts;
create trigger posts_insert_guard before insert on public.posts
  for each row execute function public.posts_insert_guard();

create or replace function public.posts_update_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id;
  new.author_id := old.author_id;
  new.created_at := old.created_at;
  if public.is_api_request() and not public.is_admin() then
    -- Any edit by the author sends the post back to review.
    new.status := 'pending';
    new.reject_reason := null;
    new.approved_at := null;
    new.approved_by := null;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists posts_update_guard on public.posts;
create trigger posts_update_guard before update on public.posts
  for each row execute function public.posts_update_guard();

create or replace function public.comments_insert_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_api_request() then
    new.author_id := auth.uid();
    new.created_at := now();
  end if;
  return new;
end $$;

drop trigger if exists comments_insert_guard on public.comments;
create trigger comments_insert_guard before insert on public.comments
  for each row execute function public.comments_insert_guard();

-- ---------- Row level security ----------
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.signup_allowlist enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.posts p
              where p.author_id = profiles.id and p.status = 'approved')
  or exists (select 1 from public.comments c join public.posts p on p.id = c.post_id
              where c.author_id = profiles.id and p.status = 'approved'));

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select
  using (status = 'approved' or author_id = auth.uid() or public.is_admin());

drop policy if exists posts_insert on public.posts;
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending');

drop policy if exists posts_update on public.posts;
create policy posts_update on public.posts for update to authenticated
  using (author_id = auth.uid() or public.is_admin())
  with check (author_id = auth.uid() or public.is_admin());

drop policy if exists posts_delete on public.posts;
create policy posts_delete on public.posts for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

drop policy if exists comments_read on public.comments;
create policy comments_read on public.comments for select
  using (public.is_admin() or exists (
    select 1 from public.posts p where p.id = post_id and p.status = 'approved'));

drop policy if exists comments_insert on public.comments;
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and exists (
    select 1 from public.posts p where p.id = post_id and p.status = 'approved'));

drop policy if exists comments_delete on public.comments;
create policy comments_delete on public.comments for delete to authenticated
  using (author_id = auth.uid() or public.is_admin());

-- signup_allowlist: no policies → nobody can read it through the API.

-- ---------- Table privileges (what the website may touch) ----------
grant usage on schema public to anon, authenticated;
revoke all on public.profiles, public.posts, public.comments, public.signup_allowlist from anon, authenticated;

grant select (id, full_name, major, major2, year, avatar_path) on public.profiles to anon, authenticated;
grant update (major, major2, year, avatar_path) on public.profiles to authenticated;

grant select on public.posts to anon, authenticated;
grant insert (title, body_md, cover_path) on public.posts to authenticated;
grant update (title, body_md, cover_path) on public.posts to authenticated;
grant delete on public.posts to authenticated;

grant select on public.comments to anon, authenticated;
grant insert (post_id, body) on public.comments to authenticated;
grant delete on public.comments to authenticated;

-- The caller's own profile, including the role (role is not readable through the table).
create or replace function public.my_profile()
returns table (id uuid, full_name text, major text, major2 text, year public.year_level,
               avatar_path text, role public.user_role)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.major, p.major2, p.year, p.avatar_path, p.role
    from public.profiles p where p.id = auth.uid();
$$;
revoke execute on function public.my_profile() from public, anon;
grant execute on function public.my_profile() to authenticated;

-- ---------- Admin functions ----------
drop function if exists public.approve_post(uuid);

create or replace function public.approve_post(p_id uuid, p_version timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
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

create or replace function public.reject_post(p_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  update public.posts
     set status = 'rejected', reject_reason = btrim(p_reason), approved_at = null, approved_by = null
   where id = p_id;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

drop function if exists public.admin_list_members();
create function public.admin_list_members()
returns table (id uuid, full_name text, major text, major2 text, year public.year_level,
               avatar_path text, role public.user_role, email text, created_at timestamptz, post_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  return query
    select p.id, p.full_name, p.major, p.major2, p.year, p.avatar_path, p.role,
           u.email::text, p.created_at,
           (select count(*) from public.posts x where x.author_id = p.id)
      from public.profiles p join auth.users u on u.id = p.id
     order by p.created_at desc;
end $$;

create or replace function public.set_member_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_role = 'member'
     and (select role from public.profiles where id = p_user) = 'admin'
     and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception 'last_admin' using errcode = '22023';
  end if;
  update public.profiles set role = p_role where id = p_user;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

-- Only fix a member's name (typos) — admin only.
create or replace function public.admin_set_name(p_user uuid, p_name text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 3 and 100 then
    raise exception 'invalid_name' using errcode = '22023';
  end if;
  update public.profiles set full_name = btrim(p_name) where id = p_user;
  if not found then raise exception 'not_found' using errcode = 'P0002'; end if;
end $$;

revoke execute on function public.approve_post(uuid, timestamptz), public.reject_post(uuid, text),
  public.admin_list_members(), public.set_member_role(uuid, public.user_role),
  public.admin_set_name(uuid, text) from public, anon;
grant execute on function public.approve_post(uuid, timestamptz), public.reject_post(uuid, text),
  public.admin_list_members(), public.set_member_role(uuid, public.user_role),
  public.admin_set_name(uuid, text) to authenticated;
grant execute on function public.is_admin(), public.is_api_request() to anon, authenticated;

-- ---------- Sign-up restriction (Auth Hook: "Before User Created") ----------
create or replace function public.hook_before_user_created(event jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  e text := lower(btrim(coalesce(event->'user'->>'email', '')));
  d text := split_part(e, '@', 2);
begin
  if e like '%_@_%' and position('@' in d) = 0
     and (d = 'gazi.edu.tr' or d like '%.gazi.edu.tr'
          or exists (select 1 from public.signup_allowlist where email = e)) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object(
    'http_code', 403,
    'message', 'Sadece @gazi.edu.tr uzantılı adreslerle kayıt olunabilir.'));
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from public, anon, authenticated;

-- ---------- Storage: article images and profile photos ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('forum-images', 'forum-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('avatars',      'avatars',      true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_image_in_use(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.posts p
                  where p.cover_path = p_name or position(p_name in p.body_md) > 0);
$$;
revoke execute on function public.is_image_in_use(text) from public, anon;
grant execute on function public.is_image_in_use(text) to authenticated;

drop policy if exists forum_storage_insert on storage.objects;
create policy forum_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('forum-images', 'avatars')
              and (storage.foldername(name))[1] = auth.uid()::text
              and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$');

drop policy if exists forum_storage_select on storage.objects;
create policy forum_storage_select on storage.objects for select to authenticated
  using (bucket_id in ('forum-images', 'avatars')
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

drop policy if exists forum_storage_delete on storage.objects;
create policy forum_storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('forum-images', 'avatars')
         and (public.is_admin()
              or ((storage.foldername(name))[1] = auth.uid()::text
                  and (bucket_id = 'avatars' or not public.is_image_in_use(name)))));

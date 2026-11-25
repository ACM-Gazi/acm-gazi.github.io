-- 006: fixes from the review before launch. Run once in Supabase → SQL Editor (safe to run again).
-- 1. is_image_in_use answers only about the caller's own files (it could be used to guess other people's unpublished text).
-- 2. A file name that an article already uses cannot be uploaded (again), so a picture cannot change after approval.
-- 3. Rejecting checks the version the admin read, like approving.
-- 4. Two admins demoting each other at the same moment cannot leave the forum without an admin.
-- 5. Limits per member: 100 MB of images, 50 articles that are not published, 30 comments in 10 minutes.

create or replace function public.is_image_in_use(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_name ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
     and split_part(p_name, '/', 1) = auth.uid()::text
     and exists (select 1 from public.posts p
                  where p.cover_path = p_name or position(p_name in p.body_md) > 0);
$$;
revoke execute on function public.is_image_in_use(text) from public, anon;
grant execute on function public.is_image_in_use(text) to authenticated;

create or replace function public.has_storage_room()
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or coalesce((select sum((o.metadata->>'size')::bigint) from storage.objects o
                    where o.bucket_id in ('forum-images', 'avatars')
                      and (storage.foldername(o.name))[1] = auth.uid()::text), 0) < 100 * 1024 * 1024;
$$;
revoke execute on function public.has_storage_room() from public, anon;
grant execute on function public.has_storage_room() to authenticated;

drop policy if exists forum_storage_insert on storage.objects;
create policy forum_storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('forum-images', 'avatars')
              and not public.is_banned(auth.uid())
              and (storage.foldername(name))[1] = auth.uid()::text
              and name ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
              and (bucket_id = 'avatars' or not public.is_image_in_use(name))
              and public.has_storage_room());

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
    if not public.is_admin()
       and (select count(*) from public.posts where author_id = new.author_id and status <> 'approved') >= 50 then
      raise exception 'too_many_posts' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

create or replace function public.comments_insert_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_api_request() then
    new.author_id := auth.uid();
    new.created_at := now();
    if not public.is_admin()
       and (select count(*) from public.comments
             where author_id = new.author_id and created_at > now() - interval '10 minutes') >= 30 then
      raise exception 'too_many_comments' using errcode = '22023';
    end if;
  end if;
  return new;
end $$;

drop function if exists public.reject_post(uuid, text);
create or replace function public.reject_post(p_id uuid, p_reason text, p_version timestamptz)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  if char_length(btrim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  update public.posts
     set status = 'rejected', reject_reason = btrim(p_reason), approved_at = null, approved_by = null
   where id = p_id and updated_at = p_version;
  if not found then
    if exists (select 1 from public.posts where id = p_id) then
      raise exception 'version_changed' using errcode = '22023';
    end if;
    raise exception 'not_found' using errcode = 'P0002';
  end if;
end $$;
revoke execute on function public.reject_post(uuid, text, timestamptz) from public, anon;
grant execute on function public.reject_post(uuid, text, timestamptz) to authenticated;

create or replace function public.set_member_role(p_user uuid, p_role public.user_role)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('forum_admin_roles'));
  if not public.is_admin() then raise exception 'forbidden' using errcode = '42501'; end if; -- demoted while waiting
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

-- A stable order, so that the member list can be read in pages.
create or replace function public.admin_list_members()
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
     order by p.created_at desc, p.id;
end $$;

notify pgrst, 'reload schema';

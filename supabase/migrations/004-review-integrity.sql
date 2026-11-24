-- =====================================================================
-- ACM Forum — 004: what an admin approves is exactly what readers see.
--   1. Approval works only on the version the admin read.
--   2. Image files used by an article cannot be deleted (and so not swapped)
--      by members while the article uses them.
--   3. File names are limited to plain characters.
-- Run in Supabase → SQL Editor (safe to run again).
-- =====================================================================

-- ---------- 1. Approve a specific version ----------
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

revoke execute on function public.approve_post(uuid, timestamptz) from public, anon;
grant execute on function public.approve_post(uuid, timestamptz) to authenticated;

-- ---------- 2 + 3. Image files ----------
alter table public.posts drop constraint if exists posts_cover_in_author_folder;
alter table public.posts add constraint posts_cover_in_author_folder
  check (cover_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9._-]{1,120}$'
         and split_part(cover_path, '/', 1) = author_id::text);

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

drop policy if exists forum_storage_delete on storage.objects;
create policy forum_storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('forum-images', 'avatars')
         and (public.is_admin()
              or ((storage.foldername(name))[1] = auth.uid()::text
                  and (bucket_id = 'avatars' or not public.is_image_in_use(name)))));

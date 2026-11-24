-- =====================================================================
-- ACM Forum — 002: required cover image for every article.
-- Run once in Supabase → SQL Editor (safe to run again).
-- =====================================================================

alter table public.posts add column if not exists cover_path text;

-- Articles written before this change (if any) get a placeholder so the column can be required.
update public.posts set cover_path = author_id::text || '/no-cover' where cover_path is null;

alter table public.posts alter column cover_path set not null;

-- The cover must live in the author's own folder of the forum-images bucket.
alter table public.posts drop constraint if exists posts_cover_in_author_folder;
alter table public.posts add constraint posts_cover_in_author_folder
  check (char_length(cover_path) <= 200 and split_part(cover_path, '/', 1) = author_id::text);

grant insert (title, body_md, cover_path) on public.posts to authenticated;
grant update (title, body_md, cover_path) on public.posts to authenticated;

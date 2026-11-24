-- =====================================================================
-- ACM Forum — 003: profile privacy.
-- Visitors see a profile only if that member has an approved article or a
-- comment on one. role and created_at are no longer readable. E-mail parts
-- are never used as a display name.
-- Run in Supabase → SQL Editor (safe to run again).
-- =====================================================================

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.posts p
              where p.author_id = profiles.id and p.status = 'approved')
  or exists (select 1 from public.comments c join public.posts p on p.id = c.post_id
              where c.author_id = profiles.id and p.status = 'approved'));

revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, major, major2, year, avatar_path) on public.profiles to anon, authenticated;

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

-- Names that came from the part of the e-mail before "@".
update public.profiles p set full_name = 'Üye'
  from auth.users u
 where u.id = p.id and p.full_name = left(split_part(u.email, '@', 1), 100);

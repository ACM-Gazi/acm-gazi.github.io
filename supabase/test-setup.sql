-- Gives the three test accounts a full profile and makes one of them admin.
-- Run in SQL Editor AFTER creating the users in Authentication → Users.
update public.profiles p
   set full_name = v.full_name, major = 'Bilgisayar Mühendisliği', year = '2'
  from (values
          ('forum-test-uye1@gazi.edu.tr',  'Test Üye Bir'),
          ('forum-test-uye2@gazi.edu.tr',  'Test Üye İki'),
          ('forum-test-admin@gazi.edu.tr', 'Test Admin')
       ) as v(email, full_name)
  join auth.users u on lower(u.email) = v.email
 where p.id = u.id;

update public.profiles set role = 'admin'
 where id = (select id from auth.users where lower(email) = 'forum-test-admin@gazi.edu.tr');

-- Check: should list the three accounts, one with role = admin.
select u.email, p.full_name, p.role
  from public.profiles p join auth.users u on u.id = p.id
 where u.email like 'forum-test-%'
 order by u.email;

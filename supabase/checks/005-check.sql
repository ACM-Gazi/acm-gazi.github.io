-- Checks the e-mail rules of migration 005. Nothing is changed: every try is undone, even if a rule is missing.
-- Run in Supabase → SQL Editor. Every row must say OK.
drop table if exists pg_temp.check_result;
create temp table check_result (test text, result text);

insert into check_result
select 'address "' || coalesce(mail, 'null') || '"', case when public.is_allowed_email(mail) = expected then 'OK' else 'FAILED' end
  from (values ('a@gazi.edu.tr', true), (' A@OGR.GAZI.EDU.TR ', true), ('a+1@gazi.edu.tr', false),
               ('a+1@ogr.gazi.edu.tr', false), ('x@gmail.com', false), ('a@gazi.edu.tr.evil.com', false),
               ('a@notgazi.edu.tr', false), ('a@b@gazi.edu.tr', false), ('@gazi.edu.tr', false),
               ('', false), (null, false)) as v(mail, expected);

do $$
declare
  u uuid := (select id from auth.users where lower(email) = 'forum-test-uye1@gazi.edu.tr');
  new_mail text;
begin
  if u is null then
    insert into check_result values ('e-mail change', 'SKIPPED: test account missing');
    return;
  end if;
  foreach new_mail in array array['forum-check@example.com', 'forum-test-uye1+1@gazi.edu.tr'] loop
    begin
      update auth.users set email = new_mail where id = u;
      raise exception 'rule_missing';  -- undoes the change above
    exception when others then
      insert into check_result values ('change to ' || new_mail || ' is refused',
        case when sqlerrm = 'email_not_allowed' then 'OK' else 'FAILED: ' || sqlerrm end);
    end;
  end loop;
  begin
    update auth.users set email = email where id = u;
    insert into check_result values ('normal account update still works', 'OK');
  exception when others then
    insert into check_result values ('normal account update still works', 'FAILED: ' || sqlerrm);
  end;
end $$;

select * from check_result;

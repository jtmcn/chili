begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
update public.event set status = 'setup', reveal_at = null, entries_open = true;

insert into public.chilis (name, cook, owner_device_id) values ('TEST PgPhoto', 'Pat', 'test-dev-1');

select lives_ok($$select public.set_chili_photo('test-dev-1', (select id from public.chilis where name = 'TEST PgPhoto'), 'x/1.jpg')$$, 'owner sets photo');
select is((select photo_path from public.get_chilis() where name = 'TEST PgPhoto'), 'x/1.jpg', 'get_chilis shows photo_path');
select is((select cook from public.get_chilis() where name = 'TEST PgPhoto'), null, 'cook hidden before reveal');
select throws_ok($$select public.set_chili_photo('test-dev-2', (select id from public.chilis where name = 'TEST PgPhoto'), 'x/2.jpg')$$, 'not_owner');
select lives_ok($$select public.set_chili_photo('test-dev-1', (select id from public.chilis where name = 'TEST PgPhoto'), null)$$, 'null clears');
select is((select photo_path from public.chilis where name = 'TEST PgPhoto'), null, 'photo cleared');

update public.event set reveal_at = now() - interval '1 minute' where id = 1;
select throws_ok($$select public.set_chili_photo('test-dev-1', (select id from public.chilis where name = 'TEST PgPhoto'), 'x/3.jpg')$$, 'entries_closed');

set local role anon;
select throws_ok($$select public.set_chili_photo('a', null, null)$$, '42501');
select throws_ok($$select public.admin_set_chili_photo(null, null)$$, '42501');
reset role;

select ok(has_function_privilege('service_role', 'public.set_chili_photo(text, uuid, text)', 'execute')
  and has_function_privilege('service_role', 'public.admin_set_chili_photo(uuid, text)', 'execute'), 'service_role can execute photo fns');
select ok((select public from storage.buckets where id = 'chili-photos'), 'bucket exists and is public');

select * from finish();
rollback;

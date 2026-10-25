begin;
create extension if not exists pgtap with schema extensions;
select plan(4);

set local role anon;
select throws_ok($$select public.admin_update_chili(null, null, null, null, null, null)$$, '42501');
select throws_ok($$select public.admin_delete_chili(null)$$, '42501');
select throws_ok($$select public.admin_reveal_now()$$, '42501');
reset role;

insert into public.chilis (name, owner_device_id) values ('TEST Adm', 'test-dev-1');
select lives_ok($$select public.admin_update_chili((select id from public.chilis where name = 'TEST Adm'), 'TEST Adm2', null, null, '{}', null)$$, 'update as owner role');

select * from finish();
rollback;

begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
update public.event set status = 'voting', reveal_at = now() + interval '1 hour', entries_open = true;

insert into public.chilis (name, owner_device_id) values ('TEST Tagged', 'test-dev-1');
create temp table c as select id from public.chilis where name = 'TEST Tagged';

select public.set_tag((select id from c), 'spicy', 'test-dev-1', true);
select public.set_tag((select id from c), 'spicy', 'test-dev-1', true);
select is((select count from public.get_tag_counts() where chili_id = (select id from c) and tag_id = 'spicy'), 1, 'repeat on is idempotent');

select public.set_tag((select id from c), 'spicy', 'test-dev-2', true);
select is((select count from public.get_tag_counts() where chili_id = (select id from c) and tag_id = 'spicy'), 2, 'second device counts');

select public.set_tag((select id from c), 'spicy', 'test-dev-2', false);
select is((select count from public.get_tag_counts() where chili_id = (select id from c) and tag_id = 'spicy'), 1, 'off removes');
select lives_ok($$select public.set_tag((select id from c), 'mild', 'test-dev-9', false)$$, 'off when absent is a no-op');

update public.event set status = 'setup', reveal_at = null;
select throws_ok($$select public.set_tag((select id from c), 'spicy', 'test-dev-3', true)$$, 'voting_closed');

set local role anon;
select throws_ok($$select public.set_tag('00000000-0000-0000-0000-000000000000', 'spicy', 'test-dev-3', true)$$, '42501');
reset role;

select * from finish();
rollback;

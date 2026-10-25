begin;
create extension if not exists pgtap with schema extensions;
select plan(6);
update public.event set status = 'voting', reveal_at = now() + interval '1 hour', entries_open = true;

insert into public.chilis (name, owner_device_id) values
  ('TEST A', 'test-dev-1'), ('TEST B', 'test-dev-1'), ('TEST C', 'test-dev-1');
create temp table c as select name, id from public.chilis where name like 'TEST _';

select public.submit_ballot('test-ballot-1', (select id from c where name = 'TEST A'), (select id from c where name = 'TEST B'), (select id from c where name = 'TEST C'));
select public.submit_ballot('test-ballot-1', (select id from c where name = 'TEST C'), (select id from c where name = 'TEST B'), (select id from c where name = 'TEST A'));
select is(public.ballot_count(), 1, 'same device twice is one ballot');
select is((select first_id from public.ballots where device_id = 'test-ballot-1'), (select id from c where name = 'TEST C'), 'second picks stored');

delete from public.chilis where id = (select id from c where name = 'TEST B');
select is((select second_id from public.ballots where device_id = 'test-ballot-1'), null, 'deleted chili nulls its slot');
select is((select first_id from public.ballots where device_id = 'test-ballot-1'), (select id from c where name = 'TEST C'), 'other picks intact');

update public.event set status = 'setup', reveal_at = null;
select throws_ok($$select public.submit_ballot('test-ballot-2', (select id from c where name = 'TEST A'), (select id from c where name = 'TEST C'), null)$$, 'voting_closed');

set local role anon;
select throws_ok($$select public.submit_ballot('x', null, null, null)$$, '42501');
reset role;

select * from finish();
rollback;

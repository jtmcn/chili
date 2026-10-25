begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

set local role anon;
select is((select count(*)::int from public.tags), 10, 'anon sees 10 tags');
select is((select count(*)::int from public.allergens), 10, 'anon sees 10 allergens');
select is((select count(*)::int from public.event), 1, 'anon sees the event');
select throws_ok('select * from public.ballots', '42501');
select throws_ok('select * from public.chilis', '42501');
select throws_ok('select * from public.chili_tags', '42501');
reset role;

insert into public.chilis (name, cook, owner_device_id) values ('Test Chili', 'Ann', 'dev-1');

set local role anon;
select is(
  (select to_jsonb(c) ? 'owner_device_id' from public.get_chilis() c limit 1),
  false, 'get_chilis exposes no owner_device_id');
reset role;

-- reveal_at null
select is(public.voting_open(), false, 'voting closed without reveal_at');
select is((select count(*)::int from public.get_results()), 0, 'no results without reveal_at');

-- voting, reveal in the future
update public.event set status = 'voting', reveal_at = now() + interval '1 hour';
select is(public.voting_open(), true, 'voting open before reveal');
select is((select count(*)::int from public.get_results()), 0, 'no results before reveal');
select is((select cook from public.get_chilis() limit 1), null, 'cook hidden before reveal');

-- revealed
update public.event set reveal_at = now() - interval '1 minute';
select is(public.voting_open(), false, 'voting closed after reveal');
select is((select count(*)::int from public.get_results()), 1, 'results after reveal');
select is((select cook from public.get_results() limit 1), 'Ann', 'cook shown in results');
select is((select cook from public.get_chilis() limit 1), 'Ann', 'cook shown after reveal');

-- ballots_distinct
select throws_ok(
  format($q$insert into public.ballots (device_id, first_id, second_id) select 'd', id, id from public.chilis$q$),
  '23514');

-- default privileges cover later functions
create function public._probe() returns void language sql as 'select 1';
select function_privs_are('public', '_probe', array[]::text[], 'anon', array[]::text[],
  'new functions are not executable by anon');

select * from finish();
rollback;

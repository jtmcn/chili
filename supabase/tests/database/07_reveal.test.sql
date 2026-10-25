begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

insert into public.chilis (name, owner_device_id) values
  ('TEST A', 'd'), ('TEST B', 'd'), ('TEST C', 'd'), ('TEST D', 'd');
create temp table c as select name, id from public.chilis where name like 'TEST _';

create function pg_temp.b(dev text, f text, s text, t text) returns void language sql as $$
  insert into public.ballots (device_id, first_id, second_id, third_id) values (dev,
    (select id from c where name = 'TEST ' || f), (select id from c where name = 'TEST ' || s),
    (select id from c where name = 'TEST ' || t));
$$;
select pg_temp.b('v1', 'A', 'B', 'C');
select pg_temp.b('v2', 'B', 'A', 'D');
select pg_temp.b('v3', 'A', 'C', 'B');
select pg_temp.b('v4', 'C', 'A', 'B');
select pg_temp.b('v5', 'B', 'C', 'A');

update public.event set status = 'voting', reveal_at = now() - interval '1 second';

select results_eq($$select name, points, firsts, rank from public.get_results() where name ~ '^TEST [A-D]$' order by rank$$,
  $$values ('TEST A', 11, 2, 1), ('TEST B', 10, 2, 2), ('TEST C', 8, 1, 3), ('TEST D', 1, 0, 4)$$,
  'hand-counted points, firsts and rank');

-- hidden before reveal
update public.event set reveal_at = now() + interval '1 hour';
select is((select count(*) from public.get_results())::int, 0, 'no rows before reveal');

-- ties
delete from public.chilis where name like 'TEST _';
insert into public.chilis (name, owner_device_id) values
  ('TEST P', 'd'), ('TEST Q', 'd'), ('TEST X', 'd'), ('TEST Y', 'd');
delete from c;
insert into c select name, id from public.chilis where name like 'TEST _';
select pg_temp.b('t1', 'P', 'X', 'Q');
select pg_temp.b('t2', 'Y', 'Q', 'X');
update public.event set reveal_at = now() - interval '1 second';

select results_eq($$select name, points, firsts, seconds, rank from public.get_results() where name in ('TEST P', 'TEST Y') order by name$$,
  $$values ('TEST P', 3, 1, 0, 1), ('TEST Y', 3, 1, 0, 1)$$, 'P and Y tie at rank 1');
select results_eq($$select name, points, firsts, seconds, rank from public.get_results() where name in ('TEST Q', 'TEST X') order by name$$,
  $$values ('TEST Q', 3, 0, 1, 3), ('TEST X', 3, 0, 1, 3)$$, 'Q and X tie at rank 3');

-- hard cutoff
select throws_ok($$select public.create_chili('late', 'TEST Late', null, null, '{}')$$, 'entries_closed');
select throws_ok($$select public.set_tag((select id from c limit 1), 'spicy', 'late', true)$$, 'voting_closed');
select throws_ok($$select public.submit_ballot('late', (select id from c where name = 'TEST P'), (select id from c where name = 'TEST X'), (select id from c where name = 'TEST Q'))$$, 'voting_closed');
select is((select count(*) from public.ballots where device_id = 'late')::int, 0, 'no late ballot stored');

select * from finish();
rollback;

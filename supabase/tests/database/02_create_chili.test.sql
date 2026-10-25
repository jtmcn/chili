begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
update public.event set status = 'setup', reveal_at = null, entries_open = true;

-- sequences aren't rolled back, so compare relatively
create temp table pots as select public.create_chili('d1', 'Red Hot', 'Ann', null, array['milk','soy']) as a;
select cmp_ok(public.create_chili('d1', 'Second', null, null, '{}'), '>', (select a from pots), 'pot numbers increase');
select is((select count(*)::int from public.chili_allergens ca join public.chilis c on c.id = ca.chili_id where c.name = 'Red Hot'), 2, 'allergens inserted');
select lives_ok($$select public.create_chili('d1', 'Third', null, null, '{}')$$, '3rd from a device ok');
select throws_ok($$select public.create_chili('d1', 'Fourth', null, null, '{}')$$, 'device_limit');
select throws_ok($$select public.create_chili('d2', 'red hot', null, null, '{}')$$, '23505');

update public.event set entries_open = false;
select throws_ok($$select public.create_chili('d2', 'Closed', null, null, '{}')$$, 'entries_closed');
select lives_ok($$select public.create_chili('d1', 'Admin One', null, null, '{}', true)$$, 'admin bypasses limit and closed entries');

update public.event set entries_open = true, status = 'voting', reveal_at = now() - interval '1 minute';
select throws_ok($$select public.create_chili('d3', 'Late', null, null, '{}')$$, 'entries_closed');

set local role anon;
select throws_ok($$select public.create_chili('d9', 'Anon', null, null, '{}')$$, '42501');
reset role;
select is(public.entries_ok(), false, 'entries_ok false after reveal');

select * from finish();
rollback;

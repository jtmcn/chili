begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
update public.event set status = 'voting', reveal_at = now() + interval '1 hour', entries_open = false;

create temp table c as select public.create_chili('owner', 'Mine', 'Ann', null, array['milk'], true) as pot;
create temp table ids as select id from public.chilis where name = 'Mine';
select public.create_chili('other', 'Theirs', 'Bo', null, '{}', true);

-- owner edits even with entries closed; allergens replaced, pot unchanged
select is(public.update_chili('owner', (select id from ids), 'Mine v2', 'Ann B', 'Hot', array['soy','eggs']),
  (select pot from c), 'owner update returns the same pot');
select is((select row(name, cook, description)::text from public.chilis where id = (select id from ids)),
  row('Mine v2', 'Ann B', 'Hot')::text, 'fields updated');
select is(array(select allergen_id from public.chili_allergens where chili_id = (select id from ids) order by 1),
  array['eggs','soy'], 'allergen set replaced');
select lives_ok(format($$select public.update_chili('owner', %L, 'Mine v2', 'Ann B', null, '{}')$$, (select id from ids)), 'empty allergens clears');
select is((select count(*)::int from public.chili_allergens where chili_id = (select id from ids)), 0, 'no allergens left');

select throws_ok(format($$select public.update_chili('other', %L, 'Hijack', 'X', null, '{}')$$, (select id from ids)), 'not_owner');
select throws_ok(format($$select public.update_chili('owner', %L, 'theirs', 'Ann', null, '{}')$$, (select id from ids)), '23505');

update public.event set reveal_at = now() - interval '1 minute';
select throws_ok(format($$select public.update_chili('owner', %L, 'Late', 'Ann', null, '{}')$$, (select id from ids)), 'entries_closed');

set local role anon;
select throws_ok($$select public.update_chili('owner', gen_random_uuid(), 'Anon', 'Ann', null, '{}')$$, '42501');
select throws_ok($$select public.reset_event()$$, '42501');
reset role;

select public.reset_event('Next Year Cook-Off', p_force => true);
select is((select row(name, status, reveal_at, entries_open)::text from public.event where id = 1),
  row('Next Year Cook-Off', 'setup', null::timestamptz, false)::text, 'event back to setup');
select is(public.create_chili('new', 'Fresh', 'Cy', null, '{}', true), 1, 'pot numbers restart at 1');

select * from finish();
rollback;

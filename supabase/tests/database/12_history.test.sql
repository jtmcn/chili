begin;
create extension if not exists pgtap with schema extensions;
select plan(20);
select public.reset_event(p_force => true);
update public.event set name = 'Test Cook-Off', status = 'voting', reveal_at = now() + interval '1 hour', entries_open = true;

select public.create_chili('d1', 'Alpha', 'Ann', null, array['soy','milk'], true);
select public.create_chili('d2', 'Bravo', null, 'Smoky', '{}', true);
select public.create_chili('d3', 'Charlie', 'Cy', null, '{}', true);
create temp table ids as select name, id from public.chilis;
select public.admin_set_chili_photo((select id from ids where name = 'Alpha'), 'a/p.jpg');
insert into public.ballots (device_id, first_id, second_id, third_id) values
  ('v1', (select id from ids where name = 'Alpha'), (select id from ids where name = 'Bravo'), (select id from ids where name = 'Charlie')),
  ('v2', (select id from ids where name = 'Bravo'), (select id from ids where name = 'Alpha'), (select id from ids where name = 'Charlie'));
insert into public.chili_tags (chili_id, tag_id, device_id) values
  ((select id from ids where name = 'Alpha'), 'spicy', 'v1'),
  ((select id from ids where name = 'Alpha'), 'spicy', 'v2');

select throws_ok($$select public.archive_event(2099, '2099-10-25')$$, 'not_revealed');
select is((select count(*)::int from public.past_events), 0, 'nothing written before reveal');

update public.event set reveal_at = now() - interval '1 minute';
select is(public.archive_event(2099, '2099-10-25'), 3, 'archives every chili');
select set_eq(
  $$select pot_number, points, firsts, rank from public.past_chilis where year = 2099$$,
  $$select pot_number, points, firsts, rank from public.get_results()$$,
  'points and ranks match get_results');
select is((select tag_counts from public.past_chilis where name = 'Alpha'), '{"spicy": 2}'::jsonb, 'tag counts archived');
select is((select tag_counts from public.past_chilis where name = 'Bravo'), '{}'::jsonb, 'untagged chili has empty counts');
select is((select allergen_ids from public.past_chilis where name = 'Alpha'), array['milk','soy'], 'allergens sorted');
select is((select photo_path from public.past_chilis where name = 'Alpha'), '2099/a/p.jpg', 'photo path under the year');
select is((select photo_path from public.past_chilis where name = 'Bravo'), null, 'no photo stays null');
select is((select row(name, held_on, ballot_count)::text from public.past_events where year = 2099),
  row('Test Cook-Off'::text, '2099-10-25'::date, 2)::text, 'event row archived');
select is((select archived_year from public.event), 2099, 'event marked archived');
select throws_ok($$select public.archive_event(2099, '2099-10-25')$$, 'already_archived');
select throws_ok($$select public.archive_event(2100, '2100-10-25')$$, 'already_archived');

-- zero ballots: everyone ties at rank 1
select public.reset_event();
update public.event set status = 'voting', reveal_at = now() - interval '1 minute';
select public.create_chili('d1', 'Delta', 'Di', null, '{}', true);
select public.create_chili('d2', 'Echo', 'Ed', null, '{}', true);
select public.archive_event(2098, '2098-10-25');
select is(array(select row(points, rank)::text from public.past_chilis where year = 2098),
  array[row(0, 1)::text, row(0, 1)::text], 'zero-ballot year archives all tied at 1');

-- reset guard
select public.reset_event();
select public.create_chili('d1', 'Foxtrot', 'Fo', null, '{}', true);
select throws_ok($$select public.reset_event()$$, 'not_archived');
select lives_ok($$select public.reset_event(p_force => true)$$, 'force resets an unarchived event');
select is((select archived_year from public.event), null, 'reset clears archived_year');

set local role anon;
select results_eq($$select count(*)::int from public.past_events where year = 2099$$, array[1], 'anon reads history');
select throws_ok($$insert into public.past_chilis (year, pot_number, name) values (2099, 99, 'x')$$, '42501');
select throws_ok($$select public.archive_event(2097, '2097-10-25')$$, '42501');
reset role;

select * from finish();
rollback;

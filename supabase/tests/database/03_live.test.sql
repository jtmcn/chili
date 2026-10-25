begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select has_trigger('public', 'event', 'live_event', 'event has live trigger');
select has_trigger('public', 'chilis', 'live_chilis', 'chilis has live trigger');
select has_trigger('public', 'chili_allergens', 'live_chili_allergens', 'chili_allergens has live trigger');
select has_trigger('public', 'chili_tags', 'live_chili_tags', 'chili_tags has live trigger');
select has_trigger('public', 'ballots', 'live_ballots', 'ballots has live trigger');

-- triggers must not break writes
select lives_ok(
  $$insert into public.chilis (name, cook, owner_device_id) values ('Live', 'Bo', 'dev-live')$$,
  'insert fires notify_live without error');

select * from finish();
rollback;

-- Broadcast-from-database: clients refetch via RLS-safe RPCs on a ping.
create function public.notify_live()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(jsonb_build_object('table', TG_ARGV[0]), 'changed', 'live', false);
  return null;
end;
$$;

revoke execute on function public.notify_live() from public, anon, authenticated;

create trigger live_event after insert or update or delete on public.event
  for each statement execute function public.notify_live('event');
create trigger live_chilis after insert or update or delete on public.chilis
  for each statement execute function public.notify_live('chilis');
create trigger live_chili_allergens after insert or update or delete on public.chili_allergens
  for each statement execute function public.notify_live('chilis');
create trigger live_chili_tags after insert or update or delete on public.chili_tags
  for each statement execute function public.notify_live('chili_tags');
create trigger live_ballots after insert or update or delete on public.ballots
  for each statement execute function public.notify_live('ballots');

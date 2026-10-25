create function public.submit_ballot(p_device_id text, p_first uuid, p_second uuid, p_third uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.voting_open() then
    raise exception 'voting_closed';
  end if;
  insert into public.ballots (device_id, first_id, second_id, third_id)
  values (p_device_id, p_first, p_second, p_third)
  on conflict (device_id) do update
    set first_id = excluded.first_id, second_id = excluded.second_id,
        third_id = excluded.third_id, updated_at = now();
end;
$$;

revoke execute on function public.submit_ballot(text, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.submit_ballot(text, uuid, uuid, uuid) to service_role;

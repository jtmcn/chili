create function public.set_tag(p_chili_id uuid, p_tag_id text, p_device_id text, p_on boolean)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.voting_open() then
    raise exception 'voting_closed';
  end if;
  if p_on then
    insert into public.chili_tags (chili_id, tag_id, device_id)
    values (p_chili_id, p_tag_id, p_device_id)
    on conflict do nothing;
  else
    delete from public.chili_tags
    where chili_id = p_chili_id and tag_id = p_tag_id and device_id = p_device_id;
  end if;
end;
$$;

revoke execute on function public.set_tag(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.set_tag(uuid, text, text, boolean) to service_role;

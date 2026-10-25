create function public.entries_ok()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(e.entries_open and (e.reveal_at is null or now() < e.reveal_at), false)
  from public.event e where e.id = 1;
$$;

create function public.create_chili(
  p_device_id text, p_name text, p_cook text, p_description text,
  p_allergens text[], p_as_admin boolean default false)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_pot int;
begin
  if not p_as_admin then
    if not public.entries_ok() then
      raise exception 'entries_closed';
    end if;
    -- serialize per device so the limit can't be raced
    perform pg_advisory_xact_lock(hashtext('create_chili:' || p_device_id));
    if (select count(*) from public.chilis where owner_device_id = p_device_id) >= 3 then
      raise exception 'device_limit';
    end if;
  end if;

  insert into public.chilis (name, cook, description, owner_device_id)
  values (p_name, p_cook, p_description, p_device_id)
  returning id, pot_number into v_id, v_pot;

  insert into public.chili_allergens (chili_id, allergen_id)
  select v_id, a from unnest(p_allergens) as a;

  return v_pot;
end;
$$;

revoke execute on function public.entries_ok() from public, anon, authenticated;
grant execute on function public.entries_ok() to service_role;
revoke execute on function public.create_chili(text, text, text, text, text[], boolean) from public, anon, authenticated;
grant execute on function public.create_chili(text, text, text, text, text[], boolean) to service_role;

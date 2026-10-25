create function public.admin_update_chili(
  p_chili_id uuid, p_name text, p_cook text, p_description text,
  p_allergens text[], p_pot_number int)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.chilis set
    name = coalesce(p_name, name),
    -- '' clears, null leaves unchanged
    cook = case when p_cook is null then cook else nullif(p_cook, '') end,
    description = case when p_description is null then description else nullif(p_description, '') end,
    pot_number = coalesce(p_pot_number, pot_number),
    updated_at = now()
  where id = p_chili_id;
  if not found then
    raise exception 'invalid' using errcode = '23514';
  end if;
  if p_allergens is not null then
    delete from public.chili_allergens where chili_id = p_chili_id;
    insert into public.chili_allergens (chili_id, allergen_id)
    select distinct p_chili_id, a from unnest(p_allergens) as a;
  end if;
end;
$$;

create function public.admin_delete_chili(p_chili_id uuid)
returns void
language sql security definer set search_path = ''
as $$
  delete from public.chilis where id = p_chili_id;
$$;

create function public.admin_reveal_now()
returns void
language sql security definer set search_path = ''
as $$
  update public.event set reveal_at = now() where id = 1;
$$;

revoke execute on function public.admin_update_chili(uuid, text, text, text, text[], int) from public, anon, authenticated;
revoke execute on function public.admin_delete_chili(uuid) from public, anon, authenticated;
revoke execute on function public.admin_reveal_now() from public, anon, authenticated;
grant execute on function public.admin_update_chili(uuid, text, text, text, text[], int) to service_role;
grant execute on function public.admin_delete_chili(uuid) to service_role;
grant execute on function public.admin_reveal_now() to service_role;

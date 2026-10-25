alter table public.chilis add column photo_path text;

-- Public reads; no objects policies, so only service_role can write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('chili-photos', 'chili-photos', true, 1048576, array['image/jpeg'])
on conflict (id) do nothing;

drop function public.get_chilis();
create function public.get_chilis()
returns table (id uuid, pot_number int, name text, description text, cook text, allergen_ids text[], photo_path text)
language sql stable security definer set search_path = ''
as $$
  select c.id, c.pot_number, c.name, c.description,
    case when e.reveal_at <= now() then c.cook end,
    coalesce(array(
      select ca.allergen_id from public.chili_allergens ca
      where ca.chili_id = c.id order by ca.allergen_id), '{}'),
    c.photo_path
  from public.chilis c cross join public.event e
  where e.id = 1
  order by c.pot_number;
$$;
grant execute on function public.get_chilis() to anon, authenticated, service_role;

create function public.set_chili_photo(p_device_id text, p_chili_id uuid, p_path text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.chilis
    where id = p_chili_id and owner_device_id = p_device_id) then
    raise exception 'not_owner';
  end if;
  if exists (select 1 from public.event e
    where e.id = 1 and e.reveal_at is not null and now() >= e.reveal_at) then
    raise exception 'entries_closed';
  end if;
  update public.chilis set photo_path = p_path, updated_at = now() where id = p_chili_id;
end;
$$;

create function public.admin_set_chili_photo(p_chili_id uuid, p_path text)
returns void
language sql security definer set search_path = ''
as $$
  update public.chilis set photo_path = p_path, updated_at = now() where id = p_chili_id;
$$;

revoke execute on function public.set_chili_photo(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.admin_set_chili_photo(uuid, text) from public, anon, authenticated;
grant execute on function public.set_chili_photo(text, uuid, text) to service_role;
grant execute on function public.admin_set_chili_photo(uuid, text) to service_role;

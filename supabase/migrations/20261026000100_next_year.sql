-- Prod's default ACL for postgres-owned functions omits service_role (local grants it), which broke prod on 2026-10-25.
alter default privileges for role postgres in schema public grant execute on functions to service_role;

create function public.update_chili(
  p_device_id text, p_chili_id uuid, p_name text, p_cook text, p_description text, p_allergens text[])
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_pot int;
begin
  if not exists (select 1 from public.chilis
    where id = p_chili_id and owner_device_id = p_device_id) then
    raise exception 'not_owner';
  end if;
  if exists (select 1 from public.event e
    where e.id = 1 and e.reveal_at is not null and now() >= e.reveal_at) then
    raise exception 'entries_closed';
  end if;

  update public.chilis set name = p_name, cook = p_cook, description = p_description, updated_at = now()
  where id = p_chili_id
  returning pot_number into v_pot;

  delete from public.chili_allergens where chili_id = p_chili_id;
  insert into public.chili_allergens (chili_id, allergen_id)
  select distinct p_chili_id, a from unnest(p_allergens) as a;

  return v_pot;
end;
$$;

-- Wipes one event's entries and votes; photos live in Storage and are removed by scripts/event.ts.
create function public.reset_event(p_name text default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  truncate public.ballots, public.chili_tags, public.chili_allergens, public.chilis restart identity;
  update public.event set
    name = coalesce(p_name, name), status = 'setup', reveal_at = null, entries_open = false
  where id = 1;
end;
$$;

-- Objects service_role can't use; run against prod by `npm run event:check`, since local hides gaps.
create function public.grant_gaps()
returns table (kind text, name text)
language sql stable set search_path = ''
as $$
  select 'table', c.relname::text from pg_catalog.pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
    and not has_table_privilege('service_role', c.oid, 'select,insert,update,delete')
  union all
  select 'function', p.oid::regprocedure::text from pg_catalog.pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prorettype <> 'trigger'::regtype
    and not exists (select 1 from pg_catalog.pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and not has_function_privilege('service_role', p.oid, 'execute')
  order by 1, 2;
$$;

revoke execute on function public.update_chili(text, uuid, text, text, text, text[]) from public, anon, authenticated;
revoke execute on function public.reset_event(text) from public, anon, authenticated;
revoke execute on function public.grant_gaps() from public, anon, authenticated;
grant execute on function public.update_chili(text, uuid, text, text, text, text[]) to service_role;
grant execute on function public.reset_event(text) to service_role;
grant execute on function public.grant_gaps() to service_role;

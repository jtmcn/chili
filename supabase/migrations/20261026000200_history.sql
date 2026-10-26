create table public.past_events (
  year int primary key,
  name text not null,
  held_on date not null,
  ballot_count int not null,
  archived_at timestamptz not null default now()
);

create table public.past_chilis (
  year int not null references public.past_events on delete cascade,
  pot_number int not null,
  name text not null,
  cook text,
  description text,
  allergen_ids text[] not null default '{}',
  photo_path text,
  points int not null default 0,
  firsts int not null default 0,
  seconds int not null default 0,
  thirds int not null default 0,
  rank int not null default 1,
  tag_counts jsonb not null default '{}',
  primary key (year, pot_number)
);

alter table public.past_events enable row level security;
alter table public.past_chilis enable row level security;
grant select on public.past_events, public.past_chilis to anon;
create policy past_events_read on public.past_events for select to anon using (true);
create policy past_chilis_read on public.past_chilis for select to anon using (true);

alter table public.event add column archived_year int;

create function public.archive_event(p_year int, p_held_on date)
returns int
language plpgsql security definer set search_path = ''
as $$
declare
  v_count int;
begin
  if not exists (select 1 from public.event e
    where e.id = 1 and e.reveal_at is not null and now() >= e.reveal_at) then
    raise exception 'not_revealed';
  end if;
  -- also blocks re-archiving the same live event under another year
  if exists (select 1 from public.past_events where year = p_year)
    or (select archived_year from public.event where id = 1) is not null then
    raise exception 'already_archived';
  end if;

  insert into public.past_events (year, name, held_on, ballot_count)
  select p_year, e.name, p_held_on, public.ballot_count() from public.event e where e.id = 1;

  insert into public.past_chilis (year, pot_number, name, cook, description, allergen_ids,
    photo_path, points, firsts, seconds, thirds, rank, tag_counts)
  select p_year, r.pot_number, r.name, r.cook, c.description,
    array(select ca.allergen_id from public.chili_allergens ca where ca.chili_id = c.id order by 1),
    p_year || '/' || c.photo_path,
    r.points, r.firsts, r.seconds, r.thirds, r.rank,
    coalesce((select jsonb_object_agg(t.tag_id, t.n) from
      (select ct.tag_id, count(*)::int as n from public.chili_tags ct
       where ct.chili_id = c.id group by ct.tag_id) t), '{}')
  from public.get_results() r join public.chilis c on c.id = r.chili_id;
  get diagnostics v_count = row_count;

  update public.event set archived_year = p_year where id = 1;
  return v_count;
end;
$$;

drop function public.reset_event(text);
-- Refuses to drop an unarchived event's entries unless forced (e.g. wiping test data).
create function public.reset_event(p_name text default null, p_force boolean default false)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not p_force
    and exists (select 1 from public.chilis)
    and (select archived_year from public.event where id = 1) is null then
    raise exception 'not_archived';
  end if;
  truncate public.ballots, public.chili_tags, public.chili_allergens, public.chilis restart identity;
  update public.event set
    name = coalesce(p_name, name), status = 'setup', reveal_at = null, entries_open = false,
    archived_year = null
  where id = 1;
end;
$$;

revoke execute on function public.archive_event(int, date) from public, anon, authenticated;
revoke execute on function public.reset_event(text, boolean) from public, anon, authenticated;
grant execute on function public.archive_event(int, date) to service_role;
grant execute on function public.reset_event(text, boolean) to service_role;

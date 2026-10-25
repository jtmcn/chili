-- Server routes call the read functions with the service key; prod doesn't grant it by default.
grant execute on function public.get_event(), public.ballot_count(), public.get_chilis(), public.get_results(), public.get_tag_counts(), public.voting_open() to service_role;

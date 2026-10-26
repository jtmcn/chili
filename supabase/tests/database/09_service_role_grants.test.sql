begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

-- Generic, so new tables and functions are covered without editing this file.
select is(array(select kind || ' ' || name from public.grant_gaps()), '{}'::text[], 'service_role can use every public table and function');
select ok(has_function_privilege('service_role', 'public.grant_gaps()', 'execute'), 'service_role can run the prod check');
select ok(not has_table_privilege('anon', 'public.ballots', 'select'), 'anon cannot select ballots');

select * from finish();
rollback;

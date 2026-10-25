begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select ok(has_table_privilege('service_role', 'public.event', 'select,insert,update,delete'), 'service_role has DML on event');
select ok(has_table_privilege('service_role', 'public.chilis', 'select,insert,update,delete'), 'service_role has DML on chilis');
select ok(has_table_privilege('service_role', 'public.allergens', 'select,insert,update,delete'), 'service_role has DML on allergens');
select ok(has_table_privilege('service_role', 'public.chili_allergens', 'select,insert,update,delete'), 'service_role has DML on chili_allergens');
select ok(has_table_privilege('service_role', 'public.tags', 'select,insert,update,delete'), 'service_role has DML on tags');
select ok(has_table_privilege('service_role', 'public.chili_tags', 'select,insert,update,delete'), 'service_role has DML on chili_tags');
select ok(has_table_privilege('service_role', 'public.ballots', 'select,insert,update,delete'), 'service_role has DML on ballots');
select ok(not has_table_privilege('anon', 'public.ballots', 'select'), 'anon cannot select ballots');

select * from finish();
rollback;

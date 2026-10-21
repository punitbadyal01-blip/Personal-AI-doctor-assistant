-- Run once in Supabase SQL Editor. Reports are opt-in; original files are not stored.
begin;
create table public.reports (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
 name text not null check (char_length(name) between 1 and 200),
 text text not null check (char_length(text) between 1 and 30000),
 language text not null check (language in ('en','hi','te')),
 created_at timestamptz not null default now()
);
create index reports_owner_created on public.reports(owner_id,created_at desc);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;
grant select,insert,delete on public.reports to authenticated;
create policy own_reports_select on public.reports for select to authenticated using ((select auth.uid())=owner_id);
create policy own_reports_insert on public.reports for insert to authenticated with check ((select auth.uid())=owner_id);
create policy own_reports_delete on public.reports for delete to authenticated using ((select auth.uid())=owner_id);
commit;

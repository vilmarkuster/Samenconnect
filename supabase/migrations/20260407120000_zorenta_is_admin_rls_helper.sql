-- Fix RLS recursion: policies on public.profiles that subquery public.profiles re-enter RLS and break reads.
-- Helper reads profiles with row_security off; only checks auth.uid()'s row for role = 'admin'.

create or replace function public.zorenta_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

comment on function public.zorenta_is_admin() is
  'True when the current auth user has profiles.role = admin. Used by RLS policies to avoid recursive SELECT on profiles.';

grant execute on function public.zorenta_is_admin() to anon;
grant execute on function public.zorenta_is_admin() to authenticated;
grant execute on function public.zorenta_is_admin() to service_role;

-- profiles: billing admin read
drop policy if exists "Admin can read all profiles" on public.profiles;
create policy "Admin can read all profiles"
  on public.profiles for select
  using (public.zorenta_is_admin());

-- Admin read-all policies (same semantics, no recursive profiles scan from policy expression)
drop policy if exists "Admin can read all job_applications" on public.job_applications;
create policy "Admin can read all job_applications"
  on public.job_applications for select
  using (public.zorenta_is_admin());

drop policy if exists "Admin can read all conversations" on public.conversations;
create policy "Admin can read all conversations"
  on public.conversations for select
  using (public.zorenta_is_admin());

drop policy if exists "Admin can read all messages" on public.messages;
create policy "Admin can read all messages"
  on public.messages for select
  using (public.zorenta_is_admin());

drop policy if exists "Admin can read all notifications" on public.notifications;
create policy "Admin can read all notifications"
  on public.notifications for select
  using (public.zorenta_is_admin());

drop policy if exists "Admin can read all caregiver_profiles" on public.caregiver_profiles;
create policy "Admin can read all caregiver_profiles"
  on public.caregiver_profiles for select
  using (public.zorenta_is_admin());

drop policy if exists "Admin can read all client_profiles" on public.client_profiles;
create policy "Admin can read all client_profiles"
  on public.client_profiles for select
  using (public.zorenta_is_admin());

drop policy if exists "Admin can read all organization_profiles" on public.organization_profiles;
create policy "Admin can read all organization_profiles"
  on public.organization_profiles for select
  using (public.zorenta_is_admin());

-- Zorenta admin: read-only RLS policies so role=admin can view all data for backoffice.
-- No write policies; admin actions go through API placeholders or future safe flows.

-- Helper: admin check (reused in policies)
-- In Postgres RLS we inline: exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')

-- job_applications: admin can read all
drop policy if exists "Admin can read all job_applications" on public.job_applications;
create policy "Admin can read all job_applications"
  on public.job_applications for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- conversations: admin can read all
drop policy if exists "Admin can read all conversations" on public.conversations;
create policy "Admin can read all conversations"
  on public.conversations for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- messages: admin can read all (for support visibility)
drop policy if exists "Admin can read all messages" on public.messages;
create policy "Admin can read all messages"
  on public.messages for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- notifications: admin can read all
drop policy if exists "Admin can read all notifications" on public.notifications;
create policy "Admin can read all notifications"
  on public.notifications for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- caregiver_profiles: admin can read all
drop policy if exists "Admin can read all caregiver_profiles" on public.caregiver_profiles;
create policy "Admin can read all caregiver_profiles"
  on public.caregiver_profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- client_profiles: admin can read all
drop policy if exists "Admin can read all client_profiles" on public.client_profiles;
create policy "Admin can read all client_profiles"
  on public.client_profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- organization_profiles: admin can read all
drop policy if exists "Admin can read all organization_profiles" on public.organization_profiles;
create policy "Admin can read all organization_profiles"
  on public.organization_profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

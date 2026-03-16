-- Zorenta demo seed (optional). Run AFTER migrations.
-- Creates demo users must be created via Supabase Auth (Dashboard or API); this script only documents the flow.
-- To create demo data manually:
-- 1. Register 3 users via /zorenta/register: one caregiver, one client, one organization.
-- 2. Create one care job as client or organization.
-- 3. Apply to the job as caregiver.
-- 4. Optionally create a conversation and send a message via the UI.

-- If you have existing auth.users and want to seed profiles + one job (replace UUIDs with real auth user ids):
/*
insert into public.profiles (id, display_name, role)
values
  ('00000000-0000-0000-0000-000000000001', 'Demo Zorgverlener', 'caregiver'),
  ('00000000-0000-0000-0000-000000000002', 'Demo Client', 'client'),
  ('00000000-0000-0000-0000-000000000003', 'Demo Organisatie', 'organization')
on conflict (id) do nothing;

insert into public.caregiver_profiles (profile_id, headline, bio, city, skills)
values ('00000000-0000-0000-0000-000000000001', 'Ervaren verzorgende', 'Thuiszorg en verpleeghuis.', 'Amsterdam', array['Dementie', 'Medicatie'])
on conflict (profile_id) do nothing;

insert into public.client_profiles (profile_id, care_needs, city)
values ('00000000-0000-0000-0000-000000000002', 'Lichte huishoudelijke hulp en gezelschap', 'Amsterdam')
on conflict (profile_id) do nothing;

insert into public.organization_profiles (profile_id, name, org_type, city)
values ('00000000-0000-0000-0000-000000000003', 'Zorg Thuis BV', 'agency', 'Amsterdam')
on conflict (profile_id) do nothing;

insert into public.care_jobs (poster_id, poster_type, title, description, city, care_type, status)
values ('00000000-0000-0000-0000-000000000002', 'client', 'Verzorgende gezocht', 'Wij zoeken een vaste verzorgende voor thuiszorg.', 'Amsterdam', 'Thuiszorg', 'open');
*/

-- No automatic seed; use Supabase Dashboard to create test users and then use the app.

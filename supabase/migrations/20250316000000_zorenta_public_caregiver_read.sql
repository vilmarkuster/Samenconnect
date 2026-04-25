-- Allow public read of caregiver_profiles and profiles for marketplace (viewing caregiver profiles and search).
-- Does not expose sensitive data; only allows SELECT.

drop policy if exists "Public can read caregiver_profiles" on public.caregiver_profiles;
create policy "Public can read caregiver_profiles"
  on public.caregiver_profiles for select
  using (true);

drop policy if exists "Public can read profiles for display" on public.profiles;
create policy "Public can read profiles for display"
  on public.profiles for select
  using (true);

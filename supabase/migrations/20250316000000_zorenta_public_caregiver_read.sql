-- Allow public read of caregiver_profiles and profiles for marketplace (viewing caregiver profiles and search).
-- Does not expose sensitive data; only allows SELECT.

create policy "Public can read caregiver_profiles"
  on public.caregiver_profiles for select
  using (true);

create policy "Public can read profiles for display"
  on public.profiles for select
  using (true);

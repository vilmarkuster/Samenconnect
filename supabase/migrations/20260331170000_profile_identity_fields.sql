alter table public.client_profiles
  add column if not exists headline text,
  add column if not exists phone text,
  add column if not exists postcode text;

alter table public.caregiver_profiles
  add column if not exists headline text,
  add column if not exists phone text;

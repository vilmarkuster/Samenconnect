-- Marketplace caregivers table for /zorenta/matches
-- Public read so logged-in users can fetch candidate caregivers for matching.

create extension if not exists pgcrypto;

create table if not exists public.caregivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,

  -- Location string (e.g. city name) used by the matches UI's distance estimator.
  location text not null,

  -- Arrays drive the existing frontend predicate pipeline (tags/skills/certifications).
  zorgtype text[] default '{}'::text[],
  specialisaties text[] default '{}'::text[],
  vaardigheden text[] default '{}'::text[],

  certificaten text[] default '{}'::text[],
  registraties text[] default '{}'::text[],

  -- Availability strings should match the UI options:
  -- Overdag | Avond | Weekend | Flexibel | Nacht | Direct beschikbaar
  beschikbaarheid text[] default '{}'::text[],

  prijs numeric,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_caregivers_location on public.caregivers(location);

-- enable row level security
alter table public.caregivers enable row level security;

-- public read for marketplace matching
drop policy if exists "Public can read caregivers" on public.caregivers;
create policy "Public can read caregivers"
  on public.caregivers
  for select
  using (true);

grant select on public.caregivers to anon, authenticated;


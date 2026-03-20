-- Zorenta: link marketplace caregivers to real platform profiles (optional).
-- Adds an optional profile_id FK from public.caregivers -> public.profiles(id).

alter table public.caregivers
  add column if not exists profile_id uuid references public.profiles(id);

create index if not exists idx_caregivers_profile_id
  on public.caregivers(profile_id);


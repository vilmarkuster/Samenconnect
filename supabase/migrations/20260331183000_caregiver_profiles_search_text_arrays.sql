-- Denormalized lowercase search blobs for skills/care_types (free-text q in caregiver search).
-- Plain text columns; backfilled below. Do NOT use generated columns.

alter table public.caregiver_profiles
  add column if not exists skills_search text;

alter table public.caregiver_profiles
  add column if not exists care_types_search text;

update public.caregiver_profiles
set
  skills_search = lower(coalesce(array_to_string(skills, ', '), '')),
  care_types_search = lower(coalesce(array_to_string(care_types, ', '), ''))
where
  skills_search is distinct from lower(coalesce(array_to_string(skills, ', '), ''))
  or care_types_search is distinct from lower(coalesce(array_to_string(care_types, ', '), ''));

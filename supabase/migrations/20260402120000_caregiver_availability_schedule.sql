-- Per-day availability (ochtend/middag/avond/nacht) for caregiver_profiles.
-- Nullable: existing rows keep working; legacy availability_days / availability_times remain derived on write.

alter table public.caregiver_profiles
  add column if not exists availability_schedule jsonb;

comment on column public.caregiver_profiles.availability_schedule is
  'Optional per-day time slots: { "ma"|"di"|...: ["ochtend"|"middag"|"avond"|"nacht"][] }. Empty day = not available.';

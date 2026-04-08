-- Extend client/caregiver profiles with structured matching fields.
-- Backward compatible: existing rows remain valid; new fields are nullable or default to empty arrays.

alter table if exists public.client_profiles
  add column if not exists care_types text[] not null default '{}',
  add column if not exists frequency text,
  add column if not exists hours_per_week int,
  add column if not exists preferred_days text[] not null default '{}',
  add column if not exists preferred_times text[] not null default '{}',
  add column if not exists start_date date,
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists caregiver_preferences text[] not null default '{}',
  add column if not exists urgency text,
  add column if not exists extra_notes text;

alter table if exists public.caregiver_profiles
  add column if not exists care_types text[] not null default '{}',
  add column if not exists availability_days text[] not null default '{}',
  add column if not exists availability_times text[] not null default '{}',
  add column if not exists travel_distance_km int,
  add column if not exists has_driver_license boolean not null default false,
  add column if not exists languages text[] not null default '{}',
  add column if not exists min_rate numeric;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'caregiver_profiles'
      and column_name = 'certifications'
      and data_type = 'text'
  ) then
    alter table public.caregiver_profiles
      alter column certifications type text[]
      using (
        case
          when certifications is null or btrim(certifications) = '' then '{}'
          else regexp_split_to_array(certifications, '\s*[,;\n]\s*')
        end
      );
  end if;
end $$;

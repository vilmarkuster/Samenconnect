-- caregiver_profiles: availability_days / availability_times as nullable text[]
-- Idempotent: safe if columns already exist from an older migration (may relax NOT NULL / default).

alter table public.caregiver_profiles
  add column if not exists availability_days text[];

alter table public.caregiver_profiles
  add column if not exists availability_times text[];

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'caregiver_profiles'
      and column_name = 'availability_days'
      and is_nullable = 'NO'
  ) then
    alter table public.caregiver_profiles alter column availability_days drop default;
    alter table public.caregiver_profiles alter column availability_days drop not null;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'caregiver_profiles'
      and column_name = 'availability_times'
      and is_nullable = 'NO'
  ) then
    alter table public.caregiver_profiles alter column availability_times drop default;
    alter table public.caregiver_profiles alter column availability_times drop not null;
  end if;
end $$;

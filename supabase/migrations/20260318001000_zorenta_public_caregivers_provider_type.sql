-- Add provider_type so /zorenta/matches can separate organizations
-- and so "type inzet" filtering can work deterministically.

alter table public.caregivers
  add column if not exists provider_type text not null default 'zzp';

-- Update provider_type based on caregiver role expectations in the UI.
update public.caregivers
set provider_type = 'zzp'
where name = 'Sanne de Vries';

update public.caregivers
set provider_type = 'zzp'
where name = 'Mohammed El Amrani';

update public.caregivers
set provider_type = 'vrijwilliger'
where name = 'Lisa Jansen';

update public.caregivers
set provider_type = 'organisatie'
where name = 'Stichting Zorg aan Huis';


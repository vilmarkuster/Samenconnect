-- Shared taxonomy (stable values in app layer; stored as text arrays)
alter table public.care_intakes add column if not exists financiering_regeling text[];
alter table public.care_intakes add column if not exists soort_hulp_zorg text[];
alter table public.care_intakes add column if not exists zorgniveau text[];
alter table public.care_intakes add column if not exists type_inzet text[];
alter table public.care_intakes add column if not exists vaardigheden_ervaring text[];
alter table public.care_intakes add column if not exists target_group text[];

comment on column public.care_intakes.financiering_regeling is 'Taxonomy values: pgb, wlz, …';
comment on column public.care_intakes.soort_hulp_zorg is 'Taxonomy values for soort hulp / zorg';
comment on column public.care_intakes.zorgniveau is 'Taxonomy values for zorgniveau';
comment on column public.care_intakes.type_inzet is 'Taxonomy values for type inzet (mantelzorg, zzp, …)';
comment on column public.care_intakes.vaardigheden_ervaring is 'Taxonomy values for vaardigheden / ervaring';
comment on column public.care_intakes.target_group is 'Doelgroep (intake only)';

alter table public.care_jobs add column if not exists financiering_regeling text[];
alter table public.care_jobs add column if not exists soort_hulp_zorg text[];
alter table public.care_jobs add column if not exists zorgniveau text[];
alter table public.care_jobs add column if not exists type_inzet text[];
alter table public.care_jobs add column if not exists vaardigheden_ervaring text[];

comment on column public.care_jobs.financiering_regeling is 'Taxonomy values; shared with zorgvraag intake';
comment on column public.care_jobs.soort_hulp_zorg is 'Taxonomy values; aligns with intake soort hulp / zorg';
comment on column public.care_jobs.zorgniveau is 'Taxonomy values';
comment on column public.care_jobs.type_inzet is 'Taxonomy values (mantelzorg, zzp-opdracht, …)';
comment on column public.care_jobs.vaardigheden_ervaring is 'Taxonomy values for gewenste vaardigheden';

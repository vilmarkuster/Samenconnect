-- Structured intake for matching: zorgcontext, rol, ervaring/eisen (separate from legacy care_type)
alter table public.care_jobs add column if not exists care_context text;
alter table public.care_jobs add column if not exists role_sought text;
alter table public.care_jobs add column if not exists experience_requirements text;
alter table public.care_jobs add column if not exists certificates_requirements text;

comment on column public.care_jobs.care_context is 'Zorgcontext (thuiszorg, GGZ, …); used for matching; legacy care_type may mirror.';
comment on column public.care_jobs.role_sought is 'Gezochte rol (verpleegkundige, helpende, …).';
comment on column public.care_jobs.experience_requirements is 'Gewenste ervaring (vrije tekst).';
comment on column public.care_jobs.certificates_requirements is 'Certificaten of extra eisen (vrije tekst).';

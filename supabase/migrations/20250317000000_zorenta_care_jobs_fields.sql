-- Add hourly_rate and availability to care_jobs (job posting system)
alter table public.care_jobs
  add column if not exists hourly_rate numeric,
  add column if not exists availability text;

comment on column public.care_jobs.hourly_rate is 'Optional fixed hourly rate in EUR; use budget_min/budget_max for range.';
comment on column public.care_jobs.availability is 'When care is needed (e.g. Fulltime, Parttime, Flexibel).';

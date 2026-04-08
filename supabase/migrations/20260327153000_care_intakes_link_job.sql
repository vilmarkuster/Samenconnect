alter table public.care_intakes
  add column if not exists job_id uuid references public.care_jobs(id) on delete set null;

create index if not exists idx_care_intakes_job_id on public.care_intakes(job_id);

comment on column public.care_intakes.job_id is 'Linked care job created/updated from this intake.';

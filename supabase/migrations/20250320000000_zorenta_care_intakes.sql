create table if not exists public.care_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  who_needs_care text,
  age_group text,
  care_type text,
  care_frequency text,
  preferred_schedule text,
  preferred_city text,
  preferred_region text,
  preferred_country text,
  urgency text,
  skills_required text[],
  language_preference text,
  budget_min numeric,
  budget_max numeric,
  notes text,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_care_intakes_user_id on public.care_intakes(user_id);
create index if not exists idx_care_intakes_status on public.care_intakes(status);

alter table public.care_intakes enable row level security;

drop policy if exists "Users can manage own intakes" on public.care_intakes;
create policy "Users can manage own intakes"
  on public.care_intakes for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Favorites for job listings (care_jobs)
-- Stores per-user favorites for `public.care_jobs`.

create extension if not exists pgcrypto;

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.care_jobs(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Enforce uniqueness: one favorite per user per job.
create unique index if not exists idx_favorites_user_job_unique
  on public.favorites(user_id, job_id);

-- RLS
alter table public.favorites enable row level security;

create policy "Users can read own favorites"
  on public.favorites for select
  using (user_id = auth.uid());

create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (user_id = auth.uid());

create policy "Users can delete own favorites"
  on public.favorites for delete
  using (user_id = auth.uid());


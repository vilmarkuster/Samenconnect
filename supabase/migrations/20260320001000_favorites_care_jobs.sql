-- Favorites for job listings (care_jobs)
-- Stores per-user favorites for `public.care_jobs`.

create extension if not exists pgcrypto;

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.care_jobs(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Remove duplicate (user_id, job_id) rows so unique index can apply (keep oldest).
do $dedupe_favorites$
begin
  if to_regclass('public.favorites') is null then
    return;
  end if;
  delete from public.favorites a
  using public.favorites b
  where a.user_id = b.user_id
    and a.job_id = b.job_id
    and (a.created_at, a.id) > (b.created_at, b.id);
end
$dedupe_favorites$;

-- Enforce uniqueness: one favorite per user per job.
create unique index if not exists idx_favorites_user_job_unique
  on public.favorites(user_id, job_id);

-- RLS
alter table public.favorites enable row level security;

drop policy if exists "Users can read own favorites" on public.favorites;
create policy "Users can read own favorites"
  on public.favorites for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own favorites" on public.favorites;
create policy "Users can insert own favorites"
  on public.favorites for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own favorites" on public.favorites;
create policy "Users can delete own favorites"
  on public.favorites for delete
  using (user_id = auth.uid());


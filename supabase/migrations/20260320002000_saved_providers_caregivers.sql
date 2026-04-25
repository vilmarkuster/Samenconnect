-- Saved providers (zorgverleners / organisaties) for /zorenta/matches "Opslaan"
-- Stores per-user favorites for marketplace caregivers in `public.caregivers`.

create extension if not exists pgcrypto;

create table if not exists public.saved_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid not null references public.caregivers(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Remove duplicate (user_id, provider_id) rows (keep oldest).
do $dedupe_saved_providers_legacy$
begin
  if to_regclass('public.saved_providers') is null then
    return;
  end if;
  delete from public.saved_providers a
  using public.saved_providers b
  where a.user_id = b.user_id
    and a.provider_id = b.provider_id
    and (a.created_at, a.id) > (b.created_at, b.id);
end
$dedupe_saved_providers_legacy$;

create unique index if not exists idx_saved_providers_user_provider_unique
  on public.saved_providers(user_id, provider_id);

-- RLS
alter table public.saved_providers enable row level security;

drop policy if exists "Users can read own saved providers" on public.saved_providers;
create policy "Users can read own saved providers"
  on public.saved_providers for select
  using (user_id = auth.uid());

drop policy if exists "Users can insert own saved providers" on public.saved_providers;
create policy "Users can insert own saved providers"
  on public.saved_providers for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own saved providers" on public.saved_providers;
create policy "Users can delete own saved providers"
  on public.saved_providers for delete
  using (user_id = auth.uid());


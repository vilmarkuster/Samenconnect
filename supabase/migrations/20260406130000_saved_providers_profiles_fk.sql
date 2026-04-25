-- Saved providers: per-user bookmarks for caregiver/org profile ids (public.profiles.id).
-- Used by /opgeslagen, matches "Opslaan", and POST /api/zorenta/saved-providers/toggle.
-- provider_id references profiles (not legacy public.caregivers): matches UI passes m.caregiver.id = profile id.

begin;

create extension if not exists pgcrypto;

create table if not exists public.saved_providers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Remove duplicate (user_id, provider_id) rows (keep oldest) before unique index.
do $dedupe_saved_providers_profiles$
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
$dedupe_saved_providers_profiles$;

create unique index if not exists saved_providers_user_id_provider_id_key
  on public.saved_providers (user_id, provider_id);

create index if not exists idx_saved_providers_user_id_created_at
  on public.saved_providers (user_id, created_at desc);

alter table public.saved_providers enable row level security;

grant select, insert, delete on table public.saved_providers to authenticated;
grant all on table public.saved_providers to service_role;

drop policy if exists "Users can read own saved providers" on public.saved_providers;
drop policy if exists "saved_providers_select_own" on public.saved_providers;
create policy "saved_providers_select_own"
  on public.saved_providers
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own saved providers" on public.saved_providers;
drop policy if exists "saved_providers_insert_own" on public.saved_providers;
create policy "saved_providers_insert_own"
  on public.saved_providers
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can delete own saved providers" on public.saved_providers;
drop policy if exists "saved_providers_delete_own" on public.saved_providers;
create policy "saved_providers_delete_own"
  on public.saved_providers
  for delete
  to authenticated
  using (user_id = auth.uid());

commit;

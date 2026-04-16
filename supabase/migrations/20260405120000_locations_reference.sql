-- Reference table for Dutch places (woonplaatsen / gemeenten) used by autocomplete.
-- Seed via: npm run seed:locations (requires DATABASE_URL or DIRECT_URL).

begin;

create table if not exists public.locations (
  id bigserial primary key,
  name text not null,
  municipality text,
  province text,
  normalized_name text not null,
  is_active boolean not null default true
);

create index if not exists locations_normalized_name_idx
  on public.locations (normalized_name);

create index if not exists locations_name_prefix
  on public.locations (lower(name) text_pattern_ops);

comment on table public.locations is 'Statisch geseede NL plaatsen; alleen-lezen voor clients via RLS.';

alter table public.locations enable row level security;

drop policy if exists "locations_select_public_active" on public.locations;
create policy "locations_select_public_active"
  on public.locations
  for select
  to anon, authenticated
  using (is_active = true);

-- Service role bypasses RLS for seed script.

commit;

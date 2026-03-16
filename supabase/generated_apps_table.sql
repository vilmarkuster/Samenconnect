-- App registry for AI App Builder. Run once in Supabase SQL Editor.
create table if not exists generated_apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_generated_apps_slug on generated_apps(slug);

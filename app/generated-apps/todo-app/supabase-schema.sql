-- Generated from app plan. Run in Supabase SQL Editor if not applied automatically.

create table if not exists "todos" (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  title text,
  description text,
  priority text,
  is_completed boolean,
  completed_at timestamptz
);

create or replace function set_updated_at_todos() returns trigger as $$ begin new.updated_at = now(); return new; end; $$ language plpgsql;
drop trigger if exists trigger_updated_at_todos on "todos";
create trigger trigger_updated_at_todos before update on "todos" for each row execute function set_updated_at_todos();
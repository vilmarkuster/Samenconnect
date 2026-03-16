-- Klanten CRM: companies, contacts, deals, tasks, activities. Run in Supabase SQL Editor.

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid references companies(id) on delete set null,
  name text not null,
  email text,
  phone text,
  role text
);

create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  title text not null,
  value numeric,
  status text default 'open'
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  title text not null,
  description text,
  status text default 'open',
  due_date timestamptz,
  deal_id uuid references deals(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null
);

create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text,
  description text,
  company_id uuid references companies(id) on delete set null,
  contact_id uuid references contacts(id) on delete set null,
  deal_id uuid references deals(id) on delete set null
);

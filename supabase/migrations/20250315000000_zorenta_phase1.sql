-- Zorenta Phase 1: profiles + caregiver/client/organization profiles
-- Convention: profiles.id is PK and references auth.users(id) (id = auth user id)
-- Run in Supabase SQL Editor or via Supabase CLI (supabase db push)

-- Profiles: id = auth user id (PK and FK to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null check (role in ('caregiver', 'client', 'organization', 'admin')),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);

-- Caregiver profiles
create table if not exists public.caregiver_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  skills text[] default '{}',
  experience_years int,
  availability text,
  city text,
  region text,
  country text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_caregiver_profiles_profile_id on public.caregiver_profiles(profile_id);
create index if not exists idx_caregiver_profiles_city on public.caregiver_profiles(city);

-- Client profiles
create table if not exists public.client_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  care_needs text,
  preferred_location text,
  city text,
  region text,
  country text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_profiles_profile_id on public.client_profiles(profile_id);

-- Organization profiles
create table if not exists public.organization_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null,
  org_type text,
  description text,
  city text,
  region text,
  country text,
  latitude numeric,
  longitude numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organization_profiles_profile_id on public.organization_profiles(profile_id);

-- RLS: enable on all tables
alter table public.profiles enable row level security;
alter table public.caregiver_profiles enable row level security;
alter table public.client_profiles enable row level security;
alter table public.organization_profiles enable row level security;

-- Profiles: id = auth.uid()
create policy "Users can read own profile"
  on public.profiles for select using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update using (id = auth.uid());

create policy "Users can insert own profile"
  on public.profiles for insert with check (id = auth.uid());

-- Caregiver profiles: profile_id = auth.uid()
create policy "Users can read own caregiver profile"
  on public.caregiver_profiles for select using (profile_id = auth.uid());

create policy "Users can insert own caregiver profile"
  on public.caregiver_profiles for insert with check (profile_id = auth.uid());

create policy "Users can update own caregiver profile"
  on public.caregiver_profiles for update using (profile_id = auth.uid());

-- Client profiles
create policy "Users can read own client profile"
  on public.client_profiles for select using (profile_id = auth.uid());

create policy "Users can insert own client profile"
  on public.client_profiles for insert with check (profile_id = auth.uid());

create policy "Users can update own client profile"
  on public.client_profiles for update using (profile_id = auth.uid());

-- Organization profiles
create policy "Users can read own organization profile"
  on public.organization_profiles for select using (profile_id = auth.uid());

create policy "Users can insert own organization profile"
  on public.organization_profiles for insert with check (profile_id = auth.uid());

create policy "Users can update own organization profile"
  on public.organization_profiles for update using (profile_id = auth.uid());

-- Publieke early-access aanmeldingen (SamenConnect landing). Alleen server-side (service role) schrijft hierheen.

create table if not exists public.early_access_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  applicant_type text not null
    constraint early_access_signups_applicant_type_check
      check (applicant_type in ('caregiver', 'client', 'pgb_holder', 'organization')),
  region text not null,
  message text not null,
  consent_privacy boolean not null,
  source text not null default 'landing',
  status text not null default 'new'
    constraint early_access_signups_status_check
      check (status in ('new', 'reviewed', 'archived')),
  team_email_sent_at timestamptz
);

comment on table public.early_access_signups is 'Early access / Claim je plek aanmeldingen via publieke SamenConnect landing.';

create index if not exists early_access_signups_created_at_idx
  on public.early_access_signups (created_at desc);

create index if not exists early_access_signups_email_idx
  on public.early_access_signups (lower(email));

alter table public.early_access_signups enable row level security;

-- Geen policies voor anon/authenticated: geen directe client-toegang. Schrijven via API met service role.

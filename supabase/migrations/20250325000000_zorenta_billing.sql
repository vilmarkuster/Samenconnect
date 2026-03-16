-- Zorenta billing foundation: minimal schema for plans, Stripe reference, and featured flags.
-- Safe: additive only, no removal of existing columns. Test/sandbox ready.

-- Profiles: billing and plan (one row per user)
alter table public.profiles
  add column if not exists stripe_customer_id text,
  add column if not exists plan_slug text default 'free',
  add column if not exists subscription_status text,
  add column if not exists stripe_subscription_id text;

comment on column public.profiles.stripe_customer_id is 'Stripe Customer ID (test mode only until launch)';
comment on column public.profiles.plan_slug is 'Current plan: free, pro, team, featured';
comment on column public.profiles.subscription_status is 'Stripe subscription status if applicable';
comment on column public.profiles.stripe_subscription_id is 'Stripe Subscription ID if applicable';

-- Care jobs: optional featured boost (future)
alter table public.care_jobs
  add column if not exists featured_until timestamptz;

comment on column public.care_jobs.featured_until is 'If set, job is featured until this time (future paid feature)';

-- Caregiver profiles: optional featured boost (future)
alter table public.caregiver_profiles
  add column if not exists featured_until timestamptz;

comment on column public.caregiver_profiles.featured_until is 'If set, profile is featured until this time (future paid feature)';

-- Index for admin lookups (optional)
create index if not exists idx_profiles_stripe_customer_id on public.profiles(stripe_customer_id) where stripe_customer_id is not null;
create index if not exists idx_profiles_plan_slug on public.profiles(plan_slug);
create index if not exists idx_care_jobs_featured_until on public.care_jobs(featured_until) where featured_until is not null;
create index if not exists idx_caregiver_profiles_featured_until on public.caregiver_profiles(featured_until) where featured_until is not null;

-- Allow admin users to read all profiles (for future admin panel billing visibility)
create policy "Admin can read all profiles"
  on public.profiles for select
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

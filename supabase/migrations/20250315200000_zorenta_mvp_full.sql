-- Zorenta MVP: care_jobs, job_applications, conversations, messages, reviews, notifications
-- Plus profile extensions. Run after 20250315000000_zorenta_phase1.sql (or 20250315100000 fix).

-- Extend caregiver_profiles (certifications, rate)
alter table public.caregiver_profiles
  add column if not exists certifications text,
  add column if not exists hourly_rate numeric;

-- Extend client_profiles (preferred care type)
alter table public.client_profiles
  add column if not exists preferred_care_type text;

-- Extend organization_profiles (contact person)
alter table public.organization_profiles
  add column if not exists contact_person text;

-- Care jobs (posted by client or organization)
create table if not exists public.care_jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid not null references public.profiles(id) on delete cascade,
  poster_type text not null check (poster_type in ('client', 'organization')),
  title text not null,
  description text,
  city text,
  region text,
  country text,
  care_type text,
  budget_min numeric,
  budget_max numeric,
  schedule text,
  status text not null default 'open' check (status in ('open', 'closed', 'filled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_care_jobs_poster_id on public.care_jobs(poster_id);
create index if not exists idx_care_jobs_status on public.care_jobs(status);
create index if not exists idx_care_jobs_city on public.care_jobs(city);
create index if not exists idx_care_jobs_created_at on public.care_jobs(created_at desc);

-- Job applications (caregiver applies to job)
create table if not exists public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.care_jobs(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'shortlisted', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, applicant_id)
);

create index if not exists idx_job_applications_job_id on public.job_applications(job_id);
create index if not exists idx_job_applications_applicant_id on public.job_applications(applicant_id);

-- Conversations: one per job + applicant pair (poster <-> applicant)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.care_jobs(id) on delete set null,
  participant_1 uuid not null references public.profiles(id) on delete cascade,
  participant_2 uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conv_ordered check (participant_1 < participant_2)
);

-- Merge duplicate (participant_1, participant_2) rows before unique index (idempotent).
-- Canonical: oldest created_at, then smallest id. Repoint messages; merge participant activity; delete dup rows only.
do $merge_conversations$
declare
  p1 uuid;
  p2 uuid;
  keep_id uuid;
  rid uuid;
begin
  if to_regclass('public.conversations') is null then
    return;
  end if;

  loop
    select c.participant_1, c.participant_2
    into p1, p2
    from public.conversations c
    group by c.participant_1, c.participant_2
    having count(*) > 1
    limit 1;

    exit when not found;

    select c.id
    into keep_id
    from public.conversations c
    where c.participant_1 = p1
      and c.participant_2 = p2
    order by c.created_at asc nulls first, c.id asc
    limit 1;

    for rid in
      select c.id
      from public.conversations c
      where c.participant_1 = p1
        and c.participant_2 = p2
        and c.id <> keep_id
      order by c.created_at asc nulls first, c.id asc
    loop
      if to_regclass('public.messages') is not null then
        update public.messages m
        set conversation_id = keep_id
        where m.conversation_id = rid;
      end if;

      if to_regclass('public.conversation_participant_activity') is not null then
        insert into public.conversation_participant_activity (conversation_id, profile_id, last_seen_at)
        select keep_id, a.profile_id, a.last_seen_at
        from public.conversation_participant_activity a
        where a.conversation_id = rid
        on conflict (conversation_id, profile_id) do update
        set last_seen_at = greatest(
          conversation_participant_activity.last_seen_at,
          excluded.last_seen_at
        );
        delete from public.conversation_participant_activity a
        where a.conversation_id = rid;
      end if;

      delete from public.conversations c where c.id = rid;
    end loop;
  end loop;
end
$merge_conversations$;

create unique index if not exists idx_conversations_pair on public.conversations(participant_1, participant_2);
create index if not exists idx_conversations_job_id on public.conversations(job_id);

-- Messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation_id on public.messages(conversation_id);
create index if not exists idx_messages_created_at on public.messages(created_at desc);

-- Reviews (reviewer = client/org, reviewee = caregiver)
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid references public.care_jobs(id) on delete set null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now(),
  unique(reviewer_id, reviewee_id, job_id)
);

create index if not exists idx_reviews_reviewee_id on public.reviews(reviewee_id);
create index if not exists idx_reviews_reviewer_id on public.reviews(reviewer_id);

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read_at on public.notifications(read_at);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- RLS: care_jobs
alter table public.care_jobs enable row level security;

drop policy if exists "Anyone can read open care_jobs" on public.care_jobs;
create policy "Anyone can read open care_jobs"
  on public.care_jobs for select
  using (true);

drop policy if exists "Poster can manage own care_jobs" on public.care_jobs;
create policy "Poster can manage own care_jobs"
  on public.care_jobs for all
  using (poster_id = auth.uid())
  with check (poster_id = auth.uid());

-- RLS: job_applications
alter table public.job_applications enable row level security;

drop policy if exists "Applicant can read own applications" on public.job_applications;
create policy "Applicant can read own applications"
  on public.job_applications for select
  using (applicant_id = auth.uid());

drop policy if exists "Job poster can read applications to their jobs" on public.job_applications;
create policy "Job poster can read applications to their jobs"
  on public.job_applications for select
  using (exists (
    select 1 from public.care_jobs j where j.id = job_applications.job_id and j.poster_id = auth.uid()
  ));

drop policy if exists "Caregiver can insert own application" on public.job_applications;
create policy "Caregiver can insert own application"
  on public.job_applications for insert
  with check (applicant_id = auth.uid());

drop policy if exists "Applicant can update own application (withdraw)" on public.job_applications;
create policy "Applicant can update own application (withdraw)"
  on public.job_applications for update
  using (applicant_id = auth.uid());

drop policy if exists "Job poster can update application status" on public.job_applications;
create policy "Job poster can update application status"
  on public.job_applications for update
  using (exists (
    select 1 from public.care_jobs j where j.id = job_applications.job_id and j.poster_id = auth.uid()
  ));

-- RLS: conversations
alter table public.conversations enable row level security;

drop policy if exists "Participants can read conversation" on public.conversations;
create policy "Participants can read conversation"
  on public.conversations for select
  using (participant_1 = auth.uid() or participant_2 = auth.uid());

drop policy if exists "Participants can insert conversation" on public.conversations;
create policy "Participants can insert conversation"
  on public.conversations for insert
  with check (participant_1 = auth.uid() or participant_2 = auth.uid());

-- RLS: messages
alter table public.messages enable row level security;

drop policy if exists "Conversation participants can read messages" on public.messages;
create policy "Conversation participants can read messages"
  on public.messages for select
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
  ));

drop policy if exists "Conversation participants can insert messages" on public.messages;
create policy "Conversation participants can insert messages"
  on public.messages for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

-- RLS: reviews
alter table public.reviews enable row level security;

drop policy if exists "Anyone can read reviews" on public.reviews;
create policy "Anyone can read reviews"
  on public.reviews for select using (true);

drop policy if exists "Reviewer can insert own review" on public.reviews;
create policy "Reviewer can insert own review"
  on public.reviews for insert
  with check (reviewer_id = auth.uid());

-- RLS: notifications
alter table public.notifications enable row level security;

drop policy if exists "User can read own notifications" on public.notifications;
create policy "User can read own notifications"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "User can update own notifications (mark read)" on public.notifications;
create policy "User can update own notifications (mark read)"
  on public.notifications for update
  using (user_id = auth.uid());

-- Service role or triggers can insert; for MVP allow user to create notification for self (e.g. from API)
-- Notifications: allow insert only for self (API creates via trigger or service role)
-- Trigger: notify job poster when someone applies
create or replace function public.notify_job_application()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select j.poster_id, 'new_application', 'Nieuwe sollicitatie', 'Er is een nieuwe sollicitatie op je vacature.', '/zorenta/applications'
  from public.care_jobs j where j.id = new.job_id;
  return new;
end;
$$;

drop trigger if exists job_application_notify on public.job_applications;
create trigger job_application_notify
  after insert on public.job_applications
  for each row execute function public.notify_job_application();

-- Trigger: notify applicant when application status changes to accepted/rejected
create or replace function public.notify_application_status()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.status is distinct from new.status and new.status in ('accepted', 'rejected') then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.applicant_id,
      'application_' || new.status,
      case new.status when 'accepted' then 'Sollicitatie geaccepteerd' else 'Sollicitatie afgewezen' end,
      case new.status when 'accepted' then 'Je sollicitatie is geaccepteerd.' else 'Je sollicitatie is afgewezen.' end,
      '/zorenta/applications'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists application_status_notify on public.job_applications;
create trigger application_status_notify
  after update on public.job_applications
  for each row execute function public.notify_application_status();

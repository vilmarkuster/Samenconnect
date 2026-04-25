-- Per-conversation last_seen for presence ("Laatst gezien" is conversation-specific, not global).
create table if not exists public.conversation_participant_activity (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create index if not exists idx_conversation_participant_activity_profile
  on public.conversation_participant_activity (profile_id);

alter table public.conversation_participant_activity enable row level security;

drop policy if exists "conversation participants can read activity" on public.conversation_participant_activity;
create policy "conversation participants can read activity"
  on public.conversation_participant_activity for select
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_participant_activity.conversation_id
      and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
  ));

drop policy if exists "conversation participants upsert own activity" on public.conversation_participant_activity;
create policy "conversation participants upsert own activity"
  on public.conversation_participant_activity for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_participant_activity.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

drop policy if exists "conversation participants update own activity" on public.conversation_participant_activity;
create policy "conversation participants update own activity"
  on public.conversation_participant_activity for update
  using (
    profile_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_participant_activity.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  )
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_participant_activity.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
  );

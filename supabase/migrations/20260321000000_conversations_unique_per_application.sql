-- Allow multiple conversations between the same two users when they are tied to
-- different job applications. Previously idx_conversations_pair forced one row
-- per participant pair, so "Bericht sturen" from sollicitatie A overwrote/reused
-- the same row as sollicitatie B.

drop index if exists public.idx_conversations_pair;

-- At most one legacy conversation per pair (no application link)
create unique index if not exists idx_conversations_pair_no_application
  on public.conversations(participant_1, participant_2)
  where application_id is null;

-- At most one conversation per job application
create unique index if not exists idx_conversations_unique_application_id
  on public.conversations(application_id)
  where application_id is not null;

-- idx_conversations_application_id (non-unique) from 20260320003000 is superseded
-- by the unique index above for application lookups
drop index if exists public.idx_conversations_application_id;

-- Allow multiple conversations between the same two users when they are tied to
-- different job applications. Previously idx_conversations_pair forced one row
-- per participant pair, so "Bericht sturen" from sollicitatie A overwrote/reused
-- the same row as sollicitatie B.

drop index if exists public.idx_conversations_pair;

-- Resolve duplicates so partial unique indexes can be created (idempotent; preserves messages).
-- Canonical conversation per group: oldest created_at, then smallest id.
do $dedupe_conversations_for_application_indexes$
declare
  aid uuid;
  p1 uuid;
  p2 uuid;
  keep_id uuid;
  rid uuid;
begin
  if to_regclass('public.conversations') is null then
    return;
  end if;

  -- A) Same application_id on more than one conversation row
  loop
    select c.application_id into aid
    from public.conversations c
    where c.application_id is not null
    group by c.application_id
    having count(*) > 1
    limit 1;

    exit when not found;

    select c.id
    into keep_id
    from public.conversations c
    where c.application_id = aid
    order by c.created_at asc nulls first, c.id asc
    limit 1;

    for rid in
      select c.id
      from public.conversations c
      where c.application_id = aid
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

  -- B) Same (participant_1, participant_2) with application_id is null
  loop
    select c.participant_1, c.participant_2
    into p1, p2
    from public.conversations c
    where c.application_id is null
    group by c.participant_1, c.participant_2
    having count(*) > 1
    limit 1;

    exit when not found;

    select c.id
    into keep_id
    from public.conversations c
    where c.participant_1 = p1
      and c.participant_2 = p2
      and c.application_id is null
    order by c.created_at asc nulls first, c.id asc
    limit 1;

    for rid in
      select c.id
      from public.conversations c
      where c.participant_1 = p1
        and c.participant_2 = p2
        and c.application_id is null
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
$dedupe_conversations_for_application_indexes$;

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

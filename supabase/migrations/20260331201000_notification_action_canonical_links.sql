-- SamenConnect canonical routes (no /zorenta/* app prefix). Fixes "Bekijken" 404s from DB triggers and backfills rows.

UPDATE public.notifications
SET link = replace(link, '/zorenta/messages', '/berichten')
WHERE link IS NOT NULL AND link LIKE '/zorenta/messages%';

UPDATE public.notifications
SET link = replace(link, '/zorenta/applications', '/applications')
WHERE link IS NOT NULL AND link LIKE '/zorenta/applications%';

UPDATE public.notifications
SET link = replace(link, '/zorenta/profile', '/profile')
WHERE link IS NOT NULL AND link LIKE '/zorenta/profile%';

-- new_message: inbox
create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  other_id uuid;
begin
  select case
    when c.participant_1 = new.sender_id then c.participant_2
    else c.participant_1
  end into other_id
  from public.conversations c where c.id = new.conversation_id;
  if other_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (other_id, 'new_message', 'Nieuw bericht', 'Je hebt een nieuw bericht ontvangen.', '/berichten');
  end if;
  return new;
end;
$$;

-- new_application / application status → matches list (canonical label "Matches" in nav)
create or replace function public.notify_job_application()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  select j.poster_id, 'new_application', 'Nieuwe sollicitatie', 'Er is een nieuwe sollicitatie op je vacature.', '/applications'
  from public.care_jobs j where j.id = new.job_id;
  return new;
end;
$$;

create or replace function public.notify_application_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.status is distinct from new.status and new.status in ('accepted', 'rejected') then
    insert into public.notifications (user_id, type, title, body, link)
    values (
      new.applicant_id,
      'application_' || new.status,
      case new.status when 'accepted' then 'Sollicitatie geaccepteerd' else 'Sollicitatie afgewezen' end,
      case new.status when 'accepted' then 'Je sollicitatie is geaccepteerd.' else 'Je sollicitatie is afgewezen.' end,
      '/applications'
    );
  end if;
  return new;
end;
$$;

-- new_review
create or replace function public.notify_new_review()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.reviewee_id,
    'new_review',
    'Nieuwe beoordeling',
    'Je hebt een nieuwe beoordeling ontvangen.',
    '/profile'
  );
  return new;
end;
$$;

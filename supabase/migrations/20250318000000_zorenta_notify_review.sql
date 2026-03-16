-- Notify caregiver (reviewee) when they receive a new review
create or replace function public.notify_new_review()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (
    new.reviewee_id,
    'new_review',
    'Nieuwe beoordeling',
    'Je hebt een nieuwe beoordeling ontvangen.',
    '/zorenta/profile'
  );
  return new;
end;
$$;

create trigger review_notify
  after insert on public.reviews
  for each row execute function public.notify_new_review();

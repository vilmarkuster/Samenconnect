-- Notify the other participant when a new message is sent
create or replace function public.notify_new_message()
returns trigger language plpgsql security definer set search_path = public
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
    values (other_id, 'new_message', 'Nieuw bericht', 'Je hebt een nieuw bericht ontvangen.', '/zorenta/messages');
  end if;
  return new;
end;
$$;

create trigger message_notify
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- Allow conversation participants to mark *incoming* messages as read (read_at).
-- INSERT policy only allows sender_id = auth.uid(); there was no UPDATE policy, so
-- mark-as-read from the API was blocked by RLS.

drop policy if exists "Recipients can update read_at on incoming messages" on public.messages;
create policy "Recipients can update read_at on incoming messages"
  on public.messages for update
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
    and sender_id <> auth.uid()
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and (c.participant_1 = auth.uid() or c.participant_2 = auth.uid())
    )
    and sender_id <> auth.uid()
  );

-- Prevent changing body/metadata when marking read; only read_at may differ.
create or replace function public.messages_enforce_read_at_only_for_recipient()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if old.sender_id is distinct from auth.uid() then
    if new.body is distinct from old.body
       or new.conversation_id is distinct from old.conversation_id
       or new.sender_id is distinct from old.sender_id
       or new.created_at is distinct from old.created_at
       or new.id is distinct from old.id
    then
      raise exception 'Only read_at can be updated on received messages';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_enforce_read_at_only_for_recipient on public.messages;
create trigger messages_enforce_read_at_only_for_recipient
  before update on public.messages
  for each row
  execute function public.messages_enforce_read_at_only_for_recipient();

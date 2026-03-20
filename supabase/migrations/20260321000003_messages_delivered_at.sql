-- Delivery receipt: set when recipient loads the thread (before read_at in API flow).
alter table public.messages
  add column if not exists delivered_at timestamptz;

create index if not exists idx_messages_conversation_delivered_pending
  on public.messages (conversation_id)
  where delivered_at is null;

-- Messaging metadata polish:
-- 1) Track per-message read timestamp
-- 2) Optionally link conversations to a job application

alter table public.messages
  add column if not exists read_at timestamptz;

alter table public.conversations
  add column if not exists application_id uuid references public.job_applications(id) on delete set null;

create index if not exists idx_messages_conversation_unread
  on public.messages(conversation_id, read_at);

create index if not exists idx_conversations_application_id
  on public.conversations(application_id);


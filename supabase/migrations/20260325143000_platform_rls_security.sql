-- Platform security hardening: enable RLS + minimal policies
-- Tables affected (per Supabase Security Advisor):
--   public.agents, public.workflows, public.tasks, public.runs, public.prompts, public.app_plans, public.admin_users
-- Function warning:
--   public.notify_new_* (fix explicit search_path)

begin;

-- =========================
-- RLS enable (agents)
-- =========================
alter table public.agents enable row level security;
alter table public.agents force row level security;

-- End-user (authenticated) can CRUD via protected UI/API.
-- NOTE: Current API routes use the anon client; after deploying these migrations,
-- update the API routes to run with the logged-in user's JWT, otherwise RLS will deny.

-- Restrict any existing policies: only authenticated users may operate on this table.
drop policy if exists "platform_agents_auth_required_restrictive" on public.agents;
create policy "platform_agents_auth_required_restrictive"
  on public.agents as restrictive
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Explicitly deny UPDATE (not used by current API routes).
drop policy if exists "platform_agents_deny_update_as_restrictive" on public.agents;
create policy "platform_agents_deny_update_as_restrictive"
  on public.agents as restrictive
  for update
  using (false)
  with check (false);

drop policy if exists "platform_agents_authenticated_select" on public.agents;
create policy "platform_agents_authenticated_select"
  on public.agents for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "platform_agents_authenticated_insert" on public.agents;
create policy "platform_agents_authenticated_insert"
  on public.agents for insert
  to authenticated
  with check (auth.uid() is not null);

drop policy if exists "platform_agents_authenticated_delete" on public.agents;
create policy "platform_agents_authenticated_delete"
  on public.agents for delete
  to authenticated
  using (auth.uid() is not null);

-- =========================
-- RLS enable (workflows)
-- =========================
alter table public.workflows enable row level security;
alter table public.workflows force row level security;

drop policy if exists "platform_workflows_auth_required_restrictive" on public.workflows;
create policy "platform_workflows_auth_required_restrictive"
  on public.workflows as restrictive
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "platform_workflows_deny_update_as_restrictive" on public.workflows;
create policy "platform_workflows_deny_update_as_restrictive"
  on public.workflows as restrictive
  for update
  using (false)
  with check (false);

drop policy if exists "platform_workflows_deny_delete_as_restrictive" on public.workflows;
create policy "platform_workflows_deny_delete_as_restrictive"
  on public.workflows as restrictive
  for delete
  using (false);

drop policy if exists "platform_workflows_authenticated_select" on public.workflows;
create policy "platform_workflows_authenticated_select"
  on public.workflows for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "platform_workflows_authenticated_insert" on public.workflows;
create policy "platform_workflows_authenticated_insert"
  on public.workflows for insert
  to authenticated
  with check (auth.uid() is not null);

-- =========================
-- RLS enable (tasks)
-- =========================
alter table public.tasks enable row level security;
alter table public.tasks force row level security;

-- Current UI uses mock tasks and does not read/write public.tasks.
-- Deny direct client access by default (system/internal only).
drop policy if exists "platform_tasks_deny_all_as_restrictive" on public.tasks;
create policy "platform_tasks_deny_all_as_restrictive"
  on public.tasks as restrictive
  for all
  using (false)
  with check (false);

-- =========================
-- RLS enable (runs)
-- =========================
alter table public.runs enable row level security;
alter table public.runs force row level security;

-- Current code writes runs via POST /api/agents/run.
-- No frontend reads runs (yet), but allow insert so agent runs can persist.

drop policy if exists "platform_runs_auth_required_restrictive" on public.runs;
create policy "platform_runs_auth_required_restrictive"
  on public.runs as restrictive
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "platform_runs_deny_update_as_restrictive" on public.runs;
create policy "platform_runs_deny_update_as_restrictive"
  on public.runs as restrictive
  for update
  using (false)
  with check (false);

drop policy if exists "platform_runs_deny_delete_as_restrictive" on public.runs;
create policy "platform_runs_deny_delete_as_restrictive"
  on public.runs as restrictive
  for delete
  using (false);

drop policy if exists "platform_runs_authenticated_insert" on public.runs;
create policy "platform_runs_authenticated_insert"
  on public.runs for insert
  to authenticated
  with check (auth.uid() is not null);

-- (Optional/defensive) keep reads restricted until app needs it.
-- If you want /api/runs GET working, add a SELECT policy for authenticated.
drop policy if exists "platform_runs_deny_select_as_restrictive" on public.runs;
create policy "platform_runs_deny_select_as_restrictive"
  on public.runs as restrictive
  for select
  using (false);

-- =========================
-- RLS enable (prompts)
-- =========================
alter table public.prompts enable row level security;
alter table public.prompts force row level security;

-- Prompts are currently mock-only in the UI; deny direct client access.
drop policy if exists "platform_prompts_deny_all_as_restrictive" on public.prompts;
create policy "platform_prompts_deny_all_as_restrictive"
  on public.prompts as restrictive
  for all
  using (false)
  with check (false);

-- =========================
-- RLS enable (app_plans)
-- =========================
alter table public.app_plans enable row level security;
alter table public.app_plans force row level security;

drop policy if exists "platform_app_plans_auth_required_restrictive" on public.app_plans;
create policy "platform_app_plans_auth_required_restrictive"
  on public.app_plans as restrictive
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists "platform_app_plans_deny_update_as_restrictive" on public.app_plans;
create policy "platform_app_plans_deny_update_as_restrictive"
  on public.app_plans as restrictive
  for update
  using (false)
  with check (false);

drop policy if exists "platform_app_plans_deny_delete_as_restrictive" on public.app_plans;
create policy "platform_app_plans_deny_delete_as_restrictive"
  on public.app_plans as restrictive
  for delete
  using (false);

drop policy if exists "platform_app_plans_authenticated_select" on public.app_plans;
create policy "platform_app_plans_authenticated_select"
  on public.app_plans for select
  to authenticated
  using (auth.uid() is not null);

drop policy if exists "platform_app_plans_authenticated_insert" on public.app_plans;
create policy "platform_app_plans_authenticated_insert"
  on public.app_plans for insert
  to authenticated
  with check (auth.uid() is not null);

-- =========================
-- RLS enable (admin_users)
-- =========================
alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;

-- admin_users is not referenced by the app's client/API routes today.
-- Deny direct client access by default (server-only admin usage).
drop policy if exists "platform_admin_users_deny_all_as_restrictive" on public.admin_users;
create policy "platform_admin_users_deny_all_as_restrictive"
  on public.admin_users as restrictive
  for all
  using (false)
  with check (false);

-- =========================
-- Fix function search_path warning
-- =========================
-- Supabase Security Advisor flags "Function Search Path Mutable" when search_path
-- isn't pinned sufficiently for security definer functions.
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
    values (other_id, 'new_message', 'Nieuw bericht', 'Je hebt een nieuw bericht ontvangen.', '/zorenta/messages');
  end if;
  return new;
end;
$$;

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
    '/zorenta/profile'
  );
  return new;
end;
$$;

commit;


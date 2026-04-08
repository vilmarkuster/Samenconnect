-- Store AI agent match results for care_jobs.
begin;

create table if not exists public.agent_match_results (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.agents(id) on delete cascade,
  job_id uuid not null references public.care_jobs(id) on delete cascade,
  output text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_match_results_agent_id_created_at
  on public.agent_match_results(agent_id, created_at desc);

create index if not exists idx_agent_match_results_job_id_created_at
  on public.agent_match_results(job_id, created_at desc);

alter table public.agent_match_results enable row level security;
alter table public.agent_match_results force row level security;

create policy "platform_agent_match_results_auth_required_restrictive"
  on public.agent_match_results as restrictive
  for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

create policy "platform_agent_match_results_authenticated_select"
  on public.agent_match_results for select
  to authenticated
  using (auth.uid() is not null);

create policy "platform_agent_match_results_authenticated_insert"
  on public.agent_match_results for insert
  to authenticated
  with check (auth.uid() is not null);

create policy "platform_agent_match_results_deny_update_as_restrictive"
  on public.agent_match_results as restrictive
  for update
  using (false)
  with check (false);

create policy "platform_agent_match_results_deny_delete_as_restrictive"
  on public.agent_match_results as restrictive
  for delete
  using (false);

commit;


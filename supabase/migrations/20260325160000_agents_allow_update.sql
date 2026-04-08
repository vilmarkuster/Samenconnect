-- Allow authenticated users to update agents (edit form in /agents/[id]).
begin;

drop policy if exists "platform_agents_deny_update_as_restrictive" on public.agents;

create policy "platform_agents_authenticated_update"
  on public.agents for update
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

commit;

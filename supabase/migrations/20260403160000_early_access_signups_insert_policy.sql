-- Publieke early-access inserts via server (anon key) als fallback wanneer service role niet beschikbaar is.
-- Geen SELECT/UPDATE policies: alleen insert; lezen blijft via service role / dashboard.

drop policy if exists early_access_signups_insert_public on public.early_access_signups;
create policy early_access_signups_insert_public
  on public.early_access_signups
  for insert
  to anon, authenticated
  with check (true);

-- Full row replication for UPDATE so Realtime `postgres_changes` includes complete `new` rows
-- (delivered_at, read_at, etc.) for clients patching message state live.
alter table public.messages replica identity full;

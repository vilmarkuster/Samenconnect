-- Blocks INSERT into auth.users when registration is closed (toggle via singleton table).
-- Login and existing users are unaffected. Re-open self-service signup:
--   update public.app_registration_control set registration_open = true where id = 1;
-- Admin-created users: set registration_open true temporarily, or insert via SQL as postgres.

create table if not exists public.app_registration_control (
  id int primary key check (id = 1),
  registration_open boolean not null default false
);

insert into public.app_registration_control (id, registration_open)
values (1, false)
on conflict (id) do nothing;

comment on table public.app_registration_control is
  'Singleton id=1. registration_open=false blocks new rows in auth.users (email/OAuth/magic-link signups).';

create or replace function public.auth_before_insert_check_registration_open()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_open boolean;
begin
  select registration_open into is_open
  from public.app_registration_control
  where id = 1;

  if coalesce(is_open, false) then
    return new;
  end if;

  raise exception 'Registration is closed'
    using errcode = 'P0001',
      hint = 'update public.app_registration_control set registration_open = true where id = 1';
end;
$$;

drop trigger if exists auth_users_before_insert_registration_gate on auth.users;

create trigger auth_users_before_insert_registration_gate
  before insert on auth.users
  for each row
  execute function public.auth_before_insert_check_registration_open();

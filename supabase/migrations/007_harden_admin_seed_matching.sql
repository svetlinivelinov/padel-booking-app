-- ======================================================================
-- Migration 007: Harden admin seeding with normalized identity matching
-- ======================================================================

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'organizer', 'admin')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create or replace function public.normalize_identity(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '', 'g')
$$;

create or replace function public.ensure_named_admin_role(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text;
  v_username text;
  v_display_name text;
  v_meta_username text;
  v_meta_display_name text;
begin
  if p_user_id is null then
    return;
  end if;

  select
    lower(coalesce(u.email, '')),
    lower(coalesce(u.raw_user_meta_data ->> 'username', '')),
    lower(coalesce(u.raw_user_meta_data ->> 'display_name', ''))
  into
    v_email,
    v_meta_username,
    v_meta_display_name
  from auth.users u
  where u.id = p_user_id;

  select
    lower(coalesce(up.username, '')),
    lower(coalesce(up.display_name, ''))
  into
    v_username,
    v_display_name
  from public.user_profiles up
  where up.id = p_user_id;

  if v_email = 'svetlin.ivelinov@gmail.com'
     or public.normalize_identity(v_username) = 'svetivan'
     or public.normalize_identity(v_display_name) = 'svetivan'
     or public.normalize_identity(v_meta_username) = 'svetivan'
     or public.normalize_identity(v_meta_display_name) = 'svetivan' then
    insert into public.user_roles (user_id, role)
    values (p_user_id, 'admin')
    on conflict (user_id)
    do update set role = 'admin', updated_at = now();
  end if;
end;
$$;

-- Backfill existing users using profile and auth metadata fields.
insert into public.user_roles (user_id, role)
select distinct u.id, 'admin'
from auth.users u
left join public.user_profiles up on up.id = u.id
where lower(coalesce(u.email, '')) = 'svetlin.ivelinov@gmail.com'
   or public.normalize_identity(up.username) = 'svetivan'
   or public.normalize_identity(up.display_name) = 'svetivan'
   or public.normalize_identity(u.raw_user_meta_data ->> 'username') = 'svetivan'
   or public.normalize_identity(u.raw_user_meta_data ->> 'display_name') = 'svetivan'
on conflict (user_id)
do update set role = 'admin', updated_at = now();

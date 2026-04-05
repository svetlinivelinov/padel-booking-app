-- ============================================================
-- Migration 006: User roles + admin seed for known identities
-- ============================================================

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player', 'organizer', 'admin')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create or replace function public.set_user_roles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_user_roles_updated_at on public.user_roles;
create trigger trg_user_roles_updated_at
before update on public.user_roles
for each row
execute procedure public.set_user_roles_updated_at();

alter table public.user_roles enable row level security;

drop policy if exists "user_roles_select_self" on public.user_roles;
create policy "user_roles_select_self" on public.user_roles
  for select
  using (auth.uid() = user_id);

-- Function consumed by public/assets/js/auth.js
create or replace function public.get_user_role(p_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  if p_user_id is null then
    return 'player';
  end if;

  select ur.role
    into v_role
  from public.user_roles ur
  where ur.user_id = p_user_id;

  return coalesce(v_role, 'player');
end;
$$;

grant execute on function public.get_user_role(uuid) to authenticated;

-- Upsert admin role for identities matched by username, display_name or email.
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
begin
  if p_user_id is null then
    return;
  end if;

  select lower(coalesce(u.email, ''))
    into v_email
  from auth.users u
  where u.id = p_user_id;

  select lower(coalesce(up.username, '')), lower(coalesce(up.display_name, ''))
    into v_username, v_display_name
  from public.user_profiles up
  where up.id = p_user_id;

  if v_email = 'svetlin.ivelinov@gmail.com'
     or v_username = 'svetivan'
     or v_display_name = 'svetivan' then
    insert into public.user_roles (user_id, role)
    values (p_user_id, 'admin')
    on conflict (user_id)
    do update set role = 'admin', updated_at = now();
  end if;
end;
$$;

-- Auto-apply admin role whenever profile data changes.
create or replace function public.trg_ensure_named_admin_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_named_admin_role(new.id);
  return new;
end;
$$;

drop trigger if exists on_user_profile_admin_sync on public.user_profiles;
create trigger on_user_profile_admin_sync
after insert or update of username, display_name
on public.user_profiles
for each row
execute procedure public.trg_ensure_named_admin_role();

-- Backfill existing users immediately.
insert into public.user_roles (user_id, role)
select distinct u.id, 'admin'
from auth.users u
left join public.user_profiles up on up.id = u.id
where lower(coalesce(u.email, '')) = 'svetlin.ivelinov@gmail.com'
   or lower(coalesce(up.username, '')) = 'svetivan'
   or lower(coalesce(up.display_name, '')) = 'svetivan'
on conflict (user_id)
do update set role = 'admin', updated_at = now();

-- ======================================================================
-- Migration 009: Fix admin RPC return type mismatches with explicit casts
-- ======================================================================

create or replace function public.admin_list_groups()
returns table (
  id uuid,
  name text,
  description text,
  owner_id uuid,
  invite_token uuid,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  return query
  select
    g.id::uuid,
    g.name::text,
    g.description::text,
    g.owner_id::uuid,
    g.invite_token::uuid,
    g.created_at::timestamp with time zone
  from public.groups g
  order by g.created_at desc;
end;
$$;

grant execute on function public.admin_list_groups() to authenticated;

create or replace function public.admin_list_group_members(p_group_id uuid)
returns table (
  id uuid,
  group_id uuid,
  user_id uuid,
  role member_role,
  created_at timestamp with time zone,
  display_name text,
  username text,
  email text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  return query
  select
    gm.id::uuid,
    gm.group_id::uuid,
    gm.user_id::uuid,
    gm.role::member_role,
    gm.created_at::timestamp with time zone,
    up.display_name::text,
    up.username::text,
    au.email::text
  from public.group_members gm
  left join public.user_profiles up on up.id = gm.user_id
  left join auth.users au on au.id = gm.user_id
  where gm.group_id = p_group_id
  order by gm.created_at asc;
end;
$$;

grant execute on function public.admin_list_group_members(uuid) to authenticated;

create or replace function public.admin_list_group_events(p_group_id uuid)
returns table (
  id uuid,
  group_id uuid,
  created_by uuid,
  date_time timestamp with time zone,
  max_participants integer,
  description text,
  type event_type,
  created_at timestamp with time zone,
  game_status text,
  is_closed boolean,
  points_per_match integer,
  total_rounds integer,
  current_round integer,
  location text,
  notes text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  return query
  select
    e.id::uuid,
    e.group_id::uuid,
    e.created_by::uuid,
    e.date_time::timestamp with time zone,
    e.max_participants::integer,
    e.description::text,
    e.type::event_type,
    e.created_at::timestamp with time zone,
    e.game_status::text,
    e.is_closed::boolean,
    e.points_per_match::integer,
    e.total_rounds::integer,
    e.current_round::integer,
    e.location::text,
    e.notes::text
  from public.events e
  where e.group_id = p_group_id
  order by e.date_time desc;
end;
$$;

grant execute on function public.admin_list_group_events(uuid) to authenticated;

create or replace function public.admin_list_event_participants(p_event_id uuid)
returns table (
  id uuid,
  event_id uuid,
  user_id uuid,
  status participant_status,
  slot_type slot_type,
  partner_name text,
  joined_at timestamp with time zone,
  display_name text,
  username text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  return query
  select
    ep.id::uuid,
    ep.event_id::uuid,
    ep.user_id::uuid,
    ep.status::participant_status,
    ep.slot_type::slot_type,
    ep.partner_name::text,
    ep.joined_at::timestamp with time zone,
    up.display_name::text,
    up.username::text
  from public.event_participants ep
  left join public.user_profiles up on up.id = ep.user_id
  where ep.event_id = p_event_id
  order by ep.joined_at asc;
end;
$$;

grant execute on function public.admin_list_event_participants(uuid) to authenticated;

create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  username text,
  role text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  return query
  select
    au.id::uuid,
    au.email::text,
    up.display_name::text,
    up.username::text,
    coalesce(ur.role, 'player')::text,
    au.created_at::timestamp with time zone
  from auth.users au
  left join public.user_profiles up on up.id = au.id
  left join public.user_roles ur on ur.user_id = au.id
  order by au.created_at desc;
end;
$$;

grant execute on function public.admin_list_users() to authenticated;

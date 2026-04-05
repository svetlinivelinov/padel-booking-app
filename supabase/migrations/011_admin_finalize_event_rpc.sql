-- ============================================================
-- Migration 011: Admin finalize event RPC
-- ============================================================

create or replace function public.admin_finalize_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  update public.events e
  set game_status = 'finished',
      is_closed = true
  where e.id = p_event_id;

  return found;
end;
$$;

grant execute on function public.admin_finalize_event(uuid) to authenticated;

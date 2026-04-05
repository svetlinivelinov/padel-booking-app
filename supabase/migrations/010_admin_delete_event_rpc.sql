-- ============================================================
-- Migration 010: Admin event deletion RPC
-- ============================================================

create or replace function public.admin_delete_event(p_event_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if public.get_user_role(auth.uid()) <> 'admin' then
    raise exception 'Access denied: admin only';
  end if;

  delete from public.events e
  where e.id = p_event_id;

  return found;
end;
$$;

grant execute on function public.admin_delete_event(uuid) to authenticated;

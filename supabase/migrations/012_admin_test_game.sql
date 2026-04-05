-- ============================================================
-- Migration 012: Admin test game simulation RPCs
-- ============================================================

-- ── admin_add_participant ─────────────────────────────────────────────────────
-- Adds any user as a confirmed participant to any event (admin only).
-- Uses WHERE NOT EXISTS so it is safe to call even if the user already joined.
create or replace function public.admin_add_participant(
  p_event_id uuid,
  p_user_id  uuid
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if get_user_role(auth.uid()) <> 'admin' then
    raise exception 'admin only';
  end if;

  insert into public.event_participants (event_id, user_id, status, slot_type, joined_at)
  select p_event_id, p_user_id, 'confirmed', 'individual', now()
  where not exists (
    select 1 from public.event_participants
    where event_id = p_event_id and user_id = p_user_id
  );

  return true;
end;
$$;

grant execute on function public.admin_add_participant(uuid, uuid) to authenticated;

-- ── admin_simulate_game ───────────────────────────────────────────────────────
-- Generates all rounds with randomly shuffled teams and random scores,
-- then marks the event as finished.  Clears any prior round/match data first
-- so the function can safely be called multiple times on the same event.
create or replace function public.admin_simulate_game(
  p_event_id uuid
) returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event    record;
  v_players  uuid[];
  v_shuffled uuid[];
  v_n        integer;
  v_courts   integer;
  v_total    integer;
  v_pts      integer;
  v_round    integer;
  v_round_id uuid;
  v_score_a  integer;
  i          integer;
begin
  if get_user_role(auth.uid()) <> 'admin' then
    raise exception 'admin only';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if not found then raise exception 'Event not found'; end if;

  -- Collect confirmed participants
  select array_agg(user_id)
  into v_players
  from public.event_participants
  where event_id = p_event_id and status = 'confirmed';

  v_n := coalesce(array_length(v_players, 1), 0);
  if v_n < 4 then
    raise exception 'Need at least 4 confirmed participants (have %)', v_n;
  end if;

  v_courts := v_n / 4;
  v_total  := coalesce(nullif(v_event.total_rounds, 0), 6);
  v_pts    := coalesce(nullif(v_event.points_per_match, 0), 16);

  -- Clear any prior simulation data so this is idempotent
  delete from public.matches where event_id = p_event_id;
  delete from public.rounds  where event_id = p_event_id;

  -- Mark event active
  update public.events
  set game_status      = 'active',
      points_per_match = v_pts,
      total_rounds     = v_total,
      current_round    = 1
  where id = p_event_id;

  for v_round in 1..v_total loop
    -- Shuffle players independently for each round
    select array_agg(pid order by random())
    into v_shuffled
    from unnest(v_players) as t(pid);

    -- Insert round (already completed — we don't need the UI to step through it)
    insert into public.rounds (event_id, round_number, status)
    values (p_event_id, v_round, 'completed')
    returning id into v_round_id;

    -- Create one match per court with random but balanced scores
    for i in 0..v_courts - 1 loop
      v_score_a := floor(random() * (v_pts + 1))::integer;
      insert into public.matches (
        event_id, round_id, round_number, court_number,
        team_a_p1, team_a_p2, team_b_p1, team_b_p2,
        score_a, score_b, status
      ) values (
        p_event_id, v_round_id, v_round, i + 1,
        v_shuffled[i * 4 + 1], v_shuffled[i * 4 + 2],
        v_shuffled[i * 4 + 3], v_shuffled[i * 4 + 4],
        v_score_a, v_pts - v_score_a, 'completed'
      );
    end loop;
  end loop;

  -- Finalize event
  update public.events
  set game_status = 'finished', is_closed = true
  where id = p_event_id;

  return format('%s rounds × %s courts = %s matches simulated',
    v_total, v_courts, v_total * v_courts);
end;
$$;

grant execute on function public.admin_simulate_game(uuid) to authenticated;

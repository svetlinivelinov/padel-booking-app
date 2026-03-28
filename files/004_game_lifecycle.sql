-- ============================================================
-- Migration 004: Game lifecycle, rounds, matches, event flags
-- ============================================================

-- ── 1. Extend events table ────────────────────────────────────────────────────
alter table public.events
  add column if not exists game_status text default 'pending'
    check (game_status in ('pending', 'active', 'finished')),
  add column if not exists is_closed boolean default false,
  add column if not exists points_per_match integer default 16,
  add column if not exists total_rounds integer default 6,
  add column if not exists current_round integer default 0;

-- ── 2. Rounds table ───────────────────────────────────────────────────────────
create table if not exists public.rounds (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade,
  round_number integer not null,
  status text default 'active' check (status in ('active', 'completed')),
  created_at timestamp with time zone default now(),
  unique (event_id, round_number)
);

-- ── 3. Matches table ──────────────────────────────────────────────────────────
create table if not exists public.matches (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references public.events(id) on delete cascade,
  round_id uuid references public.rounds(id) on delete cascade,
  round_number integer not null,
  court_number integer not null,
  team_a_p1 uuid references auth.users(id),
  team_a_p2 uuid references auth.users(id),
  team_b_p1 uuid references auth.users(id),
  team_b_p2 uuid references auth.users(id),
  score_a integer,
  score_b integer,
  status text default 'pending' check (status in ('pending', 'completed')),
  created_at timestamp with time zone default now()
);

-- ── 4. RLS for rounds ─────────────────────────────────────────────────────────
alter table public.rounds enable row level security;

create policy "rounds_select_group_member" on public.rounds
  for select using (
    exists (
      select 1 from public.events e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = event_id and gm.user_id = auth.uid()
    )
  );

create policy "rounds_insert_event_creator" on public.rounds
  for insert with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = auth.uid()
    )
  );

create policy "rounds_update_event_creator" on public.rounds
  for update using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = auth.uid()
    )
  );

-- ── 5. RLS for matches ────────────────────────────────────────────────────────
alter table public.matches enable row level security;

create policy "matches_select_group_member" on public.matches
  for select using (
    exists (
      select 1 from public.events e
      join public.group_members gm on gm.group_id = e.group_id
      where e.id = event_id and gm.user_id = auth.uid()
    )
  );

create policy "matches_insert_event_creator" on public.matches
  for insert with check (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = auth.uid()
    )
  );

create policy "matches_update_event_creator" on public.matches
  for update using (
    exists (
      select 1 from public.events e
      where e.id = event_id and e.created_by = auth.uid()
    )
  );

-- ── 6. Update RLS on events to allow creator to update game fields ─────────────
-- (events_update_creator already exists from 002 – no change needed)

-- ── 7. Index for performance ──────────────────────────────────────────────────
create index if not exists idx_matches_event_round on public.matches(event_id, round_number);
create index if not exists idx_rounds_event on public.rounds(event_id);

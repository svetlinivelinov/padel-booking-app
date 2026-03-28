-- ── 005: Add location and notes to events ────────────────────────────────────
alter table public.events
  add column if not exists location text,
  add column if not exists notes    text;

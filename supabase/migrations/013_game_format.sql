-- Add game_format column to events table
-- Stores the match-generation format: 'americano' (default) or 'mexicano'

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS game_format text NOT NULL DEFAULT 'americano';

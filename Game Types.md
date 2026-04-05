# Game Types

## Event Types

The `events.type` column controls how participants register and how teams are formed.

| Value | Description |
|-------|-------------|
| `individual` | Each player registers alone. Teams are shuffled every round. |
| `couples` | Players register as a pair (`player + partner_name`). The pair plays together as a fixed team. |

---

## Formats

### Americano (implemented)

- Players (or couples) are shuffled into random court assignments each round.
- No fixed partners between rounds (individual mode) — every round you get a new partner and new opponents.
- Scores are cumulative per player/couple across all rounds.
- At the end, the leaderboard ranks by total points → W → T → L.
- **Works for both `individual` and `couples` event types.**

#### How rounds are generated
- `total_rounds` and `points_per_match` are set at game start.
- `generateAmericanoRounds(playerIds, totalRounds, courts)` in `americano.js` builds all round fixtures, avoiding repeated partnerships where possible.
- Each match: `score_a + score_b = points_per_match`.

---

### Mexicano (implemented)

- Like Americano, but pairings are **skill-based**: after each round, the top half of the leaderboard plays each other and the bottom half plays each other.
- Partners within a match are also balanced (1st with 4th, 2nd with 3rd on the same court).
- Produces more competitive and balanced games as the event progresses.
- Round 1 is random (no scores yet); from Round 2 onward pairings are based on live standings.
- **Works for both `individual` and `couples` event types.**

#### How rounds are generated
- Round 1: random (uses `generateAmericanoRounds` with 1 round).
- Round 2+: `generateMexicanoNextRound(rankedPlayerIds, courts)` in `mexicano.js` — players sorted by score descending, grouped into blocks of 4 per court.
  - **Team A**: rank 1 + rank 4 (top + bottom of the group)
  - **Team B**: rank 2 + rank 3 (middle pair)
- Players with 0 points (unranked) are appended after ranked players.

---

## Current DB Schema (relevant columns)

```sql
-- events table
type             event_type   -- enum: 'individual' | 'couples'
game_format      text         -- 'americano' (default) | 'mexicano'
points_per_match integer
total_rounds     integer
current_round    integer
game_status      text         -- 'pending' | 'active' | 'finished'

-- event_participants table
slot_type     text         -- 'individual' | 'couple'
partner_name  text         -- free-text partner name (couples only)

-- matches table
team_a_p1, team_a_p2  uuid  -- player user_ids
team_b_p1, team_b_p2  uuid
score_a, score_b      integer
```

---

## Backlog

- **Step 10 (optional):** Update `admin_simulate_game` RPC to simulate Mexicano-style pairings for rounds 2+ when `game_format = 'mexicano'`. Currently the admin simulation always uses random pairings regardless of format. Requires a new migration.

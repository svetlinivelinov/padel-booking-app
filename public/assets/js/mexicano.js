// ── Mexicano round generation ─────────────────────────────────────────────────
// Generates ONE round based on current standings.
// Players ranked by score descending; top players are grouped on the same courts.
// Within each court group of 4 (ranks 1-4):
//   Team A: rank 1 + rank 4 (top + bottom)
//   Team B: rank 2 + rank 3 (middle pair)
// This balances each match while keeping the best players competing together.

export function generateMexicanoNextRound(rankedPlayerIds, courts) {
  const players = [...rankedPlayerIds]; // already sorted descending by score
  const round = [];

  for (let c = 0; c < courts; c++) {
    const base = c * 4;
    if (base + 3 >= players.length) break;

    const p1 = players[base];     // rank 1 in this court group
    const p2 = players[base + 1]; // rank 2
    const p3 = players[base + 2]; // rank 3
    const p4 = players[base + 3]; // rank 4

    round.push({
      team_a: [p1, p4], // top + bottom
      team_b: [p2, p3], // middle pair
    });
  }

  return round;
}

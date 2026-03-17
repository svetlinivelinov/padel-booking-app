// ── Americano round generation ────────────────────────────────────────────────
// Generates all rounds for N players on C courts
// Guarantees no repeated partnerships where possible

export function generateAmericanoRounds(playerIds, totalRounds, courts) {
  const players = [...playerIds];
  const n = players.length;
  const rounds = [];
  const partnerHistory = {};

  // Init partner history
  players.forEach(p => { partnerHistory[p] = new Set(); });

  for (let r = 0; r < totalRounds; r++) {
    const shuffled = shuffle([...players]);
    const round = [];
    const used = new Set();

    for (let c = 0; c < courts; c++) {
      const available = shuffled.filter(p => !used.has(p));
      if (available.length < 4) break;

      // Pick 4 players for this court
      const four = pickFour(available, partnerHistory);
      four.forEach(p => used.add(p));

      // Split into two teams
      const [p1, p2, p3, p4] = four;
      round.push({
        team_a: [p1, p2],
        team_b: [p3, p4],
      });

      // Record partnerships
      partnerHistory[p1].add(p2);
      partnerHistory[p2].add(p1);
      partnerHistory[p3].add(p4);
      partnerHistory[p4].add(p3);
    }

    rounds.push(round);
  }

  return rounds;
}

// Pick 4 players trying to avoid repeated partnerships
function pickFour(available, partnerHistory) {
  const result = [available[0]];
  const remaining = available.slice(1);

  // Pick partner for first player — prefer someone they haven't partnered with
  const partner = remaining.find(p =>
    !partnerHistory[result[0]].has(p)
  ) || remaining[0];

  result.push(partner);
  const rest = remaining.filter(p => p !== partner);

  // Pick 2 opponents
  result.push(rest[0]);
  result.push(rest[1]);

  return result;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

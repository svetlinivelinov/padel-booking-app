// ══════════════════════════════════════════════════════════════════════════════
// ДОБАВИ ТЕЗИ ФУНКЦИИ В database.js
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Финализира събитие:
 * - Сменя game_status на 'finished'
 * - Слага is_closed = true
 *
 * Изисква: events таблицата да има колони game_status и is_closed
 * (добавени с миграция 004_game_lifecycle.sql)
 */
export async function finalizeEvent(eventId) {
  const { error } = await supabase
    .from("events")
    .update({
      game_status: "finished",
      is_closed: true,
    })
    .eq("id", eventId);

  if (error) throw error;
}

/**
 * startGame — обновена версия, която записва и game_status = 'active'
 * Замени съществуващата startGame функция с тази.
 */
export async function startGame(eventId, pointsPerMatch, totalRounds) {
  const { error } = await supabase
    .from("events")
    .update({
      game_status: "active",
      points_per_match: pointsPerMatch,
      total_rounds: totalRounds,
      current_round: 1,
    })
    .eq("id", eventId);

  if (error) throw error;
}

/**
 * getCurrentRound — чете текущия активен round от rounds таблицата.
 * Замени съществуващата getCurrentRound функция с тази.
 */
export async function getCurrentRound(eventId) {
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "active")
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * generateRound — записва нов round и всички matches за него.
 * matches е масив от обекти: [{ court_number, team_a_p1, team_a_p2, team_b_p1, team_b_p2 }]
 *
 * Замени съществуващата generateRound функция с тази.
 */
export async function generateRound(eventId, roundNumber, matches) {
  // 1. Маркирай предишния round като completed (ако съществува)
  await supabase
    .from("rounds")
    .update({ status: "completed" })
    .eq("event_id", eventId)
    .eq("status", "active");

  // 2. Създай новия round
  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .upsert({
      event_id: eventId,
      round_number: roundNumber,
      status: "active",
    }, { onConflict: "event_id,round_number" })
    .select()
    .single();

  if (roundErr) throw roundErr;

  // 3. Запиши matches за този round
  const matchRows = matches.map((m, i) => ({
    event_id: eventId,
    round_id: round.id,
    round_number: roundNumber,
    court_number: i + 1,
    team_a_p1: m.team_a_p1,
    team_a_p2: m.team_a_p2,
    team_b_p1: m.team_b_p1,
    team_b_p2: m.team_b_p2,
    status: "pending",
  }));

  const { error: matchErr } = await supabase
    .from("matches")
    .insert(matchRows);

  if (matchErr) throw matchErr;
}

/**
 * getMatches — всички matches за дадено събитие и рунд.
 * Замени съществуващата getMatches функция с тази.
 */
export async function getMatches(eventId, roundNumber) {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", eventId)
    .eq("round_number", roundNumber)
    .order("court_number", { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * submitScore — записва резултата на един мач и го маркира като completed.
 * Замени съществуващата submitScore функция с тази.
 */
export async function submitScore(matchId, scoreA, scoreB) {
  const { error } = await supabase
    .from("matches")
    .update({
      score_a: scoreA,
      score_b: scoreB,
      status: "completed",
    })
    .eq("id", matchId);

  if (error) throw error;
}

/**
 * getLeaderboard — изчислява точки на всички играчи за дадено събитие.
 * Връща: { userId: { points: number, played: number } }
 *
 * Замени съществуващата getLeaderboard функция с тази.
 */
export async function getLeaderboard(eventId) {
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "completed");

  if (error) throw error;
  if (!matches || matches.length === 0) return {};

  const scores = {};

  const addPoints = (userId, pts) => {
    if (!userId) return;
    if (!scores[userId]) scores[userId] = { points: 0, played: 0 };
    scores[userId].points += pts;
    scores[userId].played += 1;
  };

  for (const m of matches) {
    addPoints(m.team_a_p1, m.score_a ?? 0);
    addPoints(m.team_a_p2, m.score_a ?? 0);
    addPoints(m.team_b_p1, m.score_b ?? 0);
    addPoints(m.team_b_p2, m.score_b ?? 0);
  }

  return scores;
}

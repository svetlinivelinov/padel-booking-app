import { supabase } from "./config.js";

/**
 * Финализира събитие:
 * - Сменя game_status на 'finished'
 * - Слага is_closed = true
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

// ── Court / match functions ───────────────────────────────────────────────────

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

export async function generateRound(eventId, roundNumber, matches) {
  // 1. Маркирай предишния round като completed (ако съществува)
  await supabase
    .from("rounds")
    .update({ status: "completed" })
    .eq("event_id", eventId)
    .eq("status", "active");

  // 2. Створай новия round (delete+insert to avoid upsert conflict issues)
  await supabase
    .from("rounds")
    .delete()
    .eq("event_id", eventId)
    .eq("round_number", roundNumber);

  const { data: round, error: roundErr } = await supabase
    .from("rounds")
    .insert({
      event_id: eventId,
      round_number: roundNumber,
      status: "active",
    })
    .select()
    .single();
  if (roundErr) throw roundErr;

  // 3. Запиши matches за този round
  const matchRows = matches.map((m, i) => ({
    event_id: eventId,
    round_id: round.id,
    round_number: roundNumber,
    court_number: i + 1,
    team_a_p1: m.team_a?.[0] ?? m.team_a_p1,
    team_a_p2: m.team_a?.[1] ?? m.team_a_p2,
    team_b_p1: m.team_b?.[0] ?? m.team_b_p1,
    team_b_p2: m.team_b?.[1] ?? m.team_b_p2,
    status: "pending",
  }));
  const { error: matchErr } = await supabase
    .from("matches")
    .insert(matchRows);
  if (matchErr) throw matchErr;
}

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
// Get all participants for an event
export async function getEventParticipants(eventId) {
  const { data, error } = await supabase
    .from("event_participants")
    .select(`
      id,
      status,
      slot_type,
      partner_name,
      joined_at,
      user_id
    `)
    .eq("event_id", eventId)
    .order("joined_at", { ascending: true });

  if (error) throw error;

  // Fetch display names from user_profiles separately
  const userIds = [...new Set(data.map(p => p.user_id))];
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, display_name, username")
    .in("id", userIds);

  // Attach profile to each participant
  return data.map(p => ({
    ...p,
    user: profiles?.find(pr => pr.id === p.user_id) || { display_name: null, username: p.user_id?.slice(0, 8) }
  }));
}

// Get current user's participation in an event
export async function getMyParticipation(eventId, userId) {
  const { data, error } = await supabase
    .from("event_participants")
    .select("id, status, slot_type, partner_name")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

// Leave an event and promote waitlisted if needed
export async function leaveEvent(eventId, userId) {
  const { error } = await supabase
    .from("event_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
}
// Regenerate invite token for a group (owner only)
export async function regenerateInviteToken(groupId) {
  // Generate a new UUID (client-side, for demo; in production, use a secure backend function)
  const newToken = crypto.randomUUID();
  const { data, error } = await supabase
    .from("groups")
    .update({ invite_token: newToken })
    .eq("id", groupId)
    .select("*");
  if (error) throw error;
  return data && data.length ? data[0] : null;
}
export async function updateEvent(eventId, updates) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please sign in");

  const current = await getEvent(eventId);
  if (!current) throw new Error("Event not found");
  if (current.created_by !== userId) {
    throw new Error("Only the organizer can update this event");
  }

  const { data, error } = await supabase
    .from("events")
    .update(updates)
    .eq("id", eventId)
    .select("*");
  if (error) {
    throw error;
  }
  return data && data.length ? data[0] : null;
}

export async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser();
  return data?.user?.id || null;
}

export async function getProfile(userId) {
  return supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
}

export async function upsertProfile(profile) {
  return supabase
    .from("user_profiles")
    .upsert(profile, { onConflict: "id" });
}

export async function createGroup({ name, description }) {
  const ownerId = await getCurrentUserId();
  if (!ownerId) throw new Error("Please sign in");

  const { data, error } = await supabase
    .from("groups")
    .insert({ name, description, owner_id: ownerId })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function addGroupMember(groupId, userId, role = "member") {
  return supabase
    .from("group_members")
    .insert({ group_id: groupId, user_id: userId, role });
}

export async function joinGroupByToken(token, userId) {
  // Find group by token
  const { data: group, error } = await supabase
    .from("groups")
    .select("id, name")  // also grab name for better UX
    .eq("invite_token", token)
    .maybeSingle();

  if (error || !group) {
    throw new Error("Invalid or expired invite link.");
  }

  // Check if already a member — avoid duplicate insert
  const { data: existing } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Already a member — not an error, just return the group
    return group;
  }

  await addGroupMember(group.id, userId, "member");
  return group;
}

export async function listMyGroups(userId) {
  const { data, error } = await supabase
    .from("group_members")
    .select("group:groups(id,name,invite_token,owner_id)")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return data.map((row) => row.group);
}

export async function createEvent(event) {
  const { data, error } = await supabase
    .from("events")
    .insert(event)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listGroupEvents(groupId) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("group_id", groupId)
    .order("date_time", { ascending: false });

  if (error) {
    throw error;
  }

  return data;
}

export async function listOwnedGroups(userId) {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

export async function updateGroup(groupId, updates) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please sign in");

  const { data: current, error: currentError } = await supabase
    .from("groups")
    .select("id, owner_id")
    .eq("id", groupId)
    .maybeSingle();

  if (currentError) throw currentError;
  if (!current) throw new Error("Group not found");
  if (current.owner_id !== userId) {
    throw new Error("Only the group owner can update this group");
  }

  const { data, error } = await supabase
    .from("groups")
    .update(updates)
    .eq("id", groupId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function listGroupMembers(groupId) {
  const { data, error } = await supabase
    .from("group_members")
    .select("id, group_id, user_id, role, created_at")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  const rows = data || [];
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((m) => m.user_id).filter(Boolean))];
  const { data: profiles, error: profilesError } = await supabase
    .from("user_profiles")
    .select("id, display_name, username")
    .in("id", userIds);

  if (profilesError) {
    throw profilesError;
  }

  return rows.map((m) => ({
    ...m,
    user:
      profiles?.find((p) => p.id === m.user_id) ||
      { display_name: null, username: m.user_id?.slice(0, 8) || "member" },
  }));
}

export async function removeGroupMember(groupId, memberUserId) {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberUserId);

  if (error) throw error;
}

export async function deleteGroup(groupId) {
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (error) throw error;
}

export async function deleteEvent(eventId) {
  const { error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId);

  if (error) throw error;
}

export async function getEvent(eventId) {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function joinEvent(eventId, slotType, partnerName) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Please sign in to join events");

  // Check not already joined
  const existing = await getMyParticipation(eventId, userId);
  if (existing) throw new Error("You have already joined this event");

  const event = await getEvent(eventId);
  if (!event) throw new Error("Event not found");

  // Atomic count check
  const { count } = await supabase
    .from("event_participants")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "confirmed");

  const status = count < event.max_participants ? "confirmed" : "waitlisted";

  const { error } = await supabase
    .from("event_participants")
    .insert({
      event_id: eventId,
      user_id: userId,
      status,
      slot_type: slotType,
      partner_name: partnerName || null,
      joined_at: new Date().toISOString()
    });

  if (error) {
    if (error.code === "23505") throw new Error("You have already joined this event");
    throw error;
  }

  return status;
}


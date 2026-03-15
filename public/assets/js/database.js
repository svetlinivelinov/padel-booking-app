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
import { supabase } from "./config.js";

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
  const { data, error } = await supabase
    .from("groups")
    .insert({ name, description })
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
  const { data: group, error } = await supabase
    .from("groups")
    .select("id")
    .eq("invite_token", token)
    .maybeSingle();

  if (error || !group) {
    throw new Error("Invalid invite token");
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
    .order("date_time", { ascending: true });

  if (error) {
    throw error;
  }

  return data;
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
  if (!userId) {
    throw new Error("Please sign in to join events");
  }

  const event = await getEvent(eventId);
  if (!event) {
    throw new Error("Event not found");
  }

  const { count } = await supabase
    .from("event_participants")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("status", "confirmed");

  const status = count < event.max_participants ? "confirmed" : "waitlisted";
  const payload = {
    event_id: eventId,
    user_id: userId,
    status,
    slot_type: slotType,
    partner_name: partnerName || null
  };

  const { error } = await supabase
    .from("event_participants")
    .insert(payload);

  if (error) {
    throw error;
  }

  return status;
}


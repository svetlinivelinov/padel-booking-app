import { requireAuth } from "./auth.js";

// Auto-refresh every 10 seconds
setInterval(() => {
  if (!document.hidden) refreshEvents();
}, 30000);

import {
  createEvent,
  listMyGroups,
  listGroupEvents,
  joinEvent,
  leaveEvent,
  getEvent,
  updateEvent,
  getEventParticipants,
  getCurrentUserId,
} from "./database.js";

const form        = document.querySelector("#event-create-form");
const list        = document.querySelector("#event-list");
const status      = document.querySelector("#event-status");
const groupSelect = document.querySelector("#event-group");

// ── Helpers ───────────────────────────────────────────────────────────────────
const setStatus = (msg) => { if (status) status.textContent = msg; };

function formatDate(dateStr) {
  try {
    const d    = new Date(dateStr);
    const day  = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: true })
                  .replace(/^0/, "").toUpperCase();
    return { day, time };
  } catch {
    return { day: "", time: dateStr };
  }
}

function toLocalDatetimeString(isoString) {
  try {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return "";
  }
}

function initials(name) {
  if (!name) return "?";
  return name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

// ── Auto-select group from URL ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const params  = new URLSearchParams(window.location.search);
  const groupId = params.get("group");
  if (groupId && groupSelect) {
    groupSelect.value = groupId;
    refreshEvents();
  }
});

let editingEventId = null;
let refreshVersion = 0;
let focusedSharedEvent = false;
window.refreshEvents = refreshEvents;

function formatEventInviteDetails(event) {
  const label = event.description || "Padel event";
  let when = "";
  try {
    const d = new Date(event.date_time);
    when = d.toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).toUpperCase();
  } catch {
    when = "";
  }

  const lines = ["Join this event in my group:", label];
  if (when) lines.push(when);
  if (event.location) lines.push(`📍 ${event.location}`);
  return lines.join("\n");
}

function buildEventInviteLink(inviteToken, eventId) {
  return `${window.location.origin}/group.html?invite=${inviteToken}&event=${encodeURIComponent(eventId)}`;
}

// ── Render a single event card ────────────────────────────────────────────────
async function renderEventCard(event, userId, groupInviteToken) {
  const participants    = await getEventParticipants(event.id);
  const confirmed       = participants.filter(p => p.status === "confirmed");
  const waitlisted      = participants.filter(p => p.status === "waitlisted");
  const myParticipation = participants.find(p => p.user_id === userId);

  const { day, time } = formatDate(event.date_time);
  const remaining     = event.max_participants - confirmed.length;
  const isFull        = remaining <= 0;
  const isCouples     = event.type === "couples";

  // Availability chip
  const chipClass = isFull ? "chip chip-red" : "chip chip-lime";
  const chipText  = isFull
    ? `Full · ${waitlisted.length} waiting`
    : `${remaining} spot${remaining !== 1 ? "s" : ""} left`;

  // Status chip (You're in / Waitlisted)
  let statusChipHTML = "";
  if (myParticipation) {
    statusChipHTML = myParticipation.status === "confirmed"
      ? `<span class="chip chip-blue">You're in</span>`
      : `<span class="chip chip-muted">Waitlisted</span>`;
  }

  // Confirmed player rows
  const confirmedHTML = confirmed.length === 0
    ? `<p class="text-muted" style="font-size:0.85rem;margin:0.25rem 0;">No players yet</p>`
    : confirmed.map(p => {
        const name    = p.user?.display_name || p.user?.username || "Player";
        const partner = p.partner_name
          ? ` <span style="font-size:0.78rem;opacity:0.6;">& ${p.partner_name}</span>`
          : "";
        return `<div class="player-row">
          <div class="avatar">${initials(name)}</div>
          <span class="player-name">${name}${partner}</span>
        </div>`;
      }).join("");

  // Open slot placeholders (show up to 4 open slots)
  const openCount = Math.min(Math.max(0, event.max_participants - confirmed.length), 4);
  const openHTML  = Array.from({ length: openCount }, () =>
    `<div class="slot-item">
      <div class="avatar-empty">+</div>
      <span class="slot-label">Open</span>
    </div>`
  ).join("");

  // Waitlist section
  const waitlistHTML = waitlisted.length > 0 ? `
    <div class="event-divider"></div>
    <div class="event-label">Waitlist (${waitlisted.length})</div>
    <div style="display:flex;flex-direction:column;gap:0.4rem;">
      ${waitlisted.map(p => {
        const name = p.user?.display_name || p.user?.username || "Player";
        return `<div class="player-row" style="opacity:0.5;">
          <div class="avatar">${initials(name)}</div>
          <span class="player-name">${name}</span>
        </div>`;
      }).join("")}
    </div>` : "";

  const isOrganizer = event.created_by === userId;
  const hasEventInvite = Boolean(groupInviteToken);

  // Action buttons — join or leave
  const actionsHTML = myParticipation ? `
    <button class="btn btn-ghost btn-sm" data-leave-id="${event.id}">Leave</button>
    ${isOrganizer ? `<button class="btn btn-ghost btn-sm" data-edit-id="${event.id}">Edit</button>` : ""}
  ` : `
    ${isCouples ? `<input type="text" class="form-control" id="partner-${event.id}" placeholder="Partner name" style="max-width:180px;">` : ""}
    <button class="btn btn-sun" data-join-id="${event.id}">${isFull ? "Join waitlist" : "Join"}</button>
    ${isOrganizer ? `<button class="btn btn-ghost btn-sm" data-edit-id="${event.id}">Edit</button>` : ""}
  `;

  const inviteActionsHTML = hasEventInvite ? `
    <button class="btn btn-sm btn-outline-secondary" data-copy-event-invite>Copy event invite</button>
    <button class="btn btn-sm btn-outline-secondary" data-share-event-whatsapp>Share event</button>
  ` : "";

  // ── Assemble card ──
  const item = document.createElement("div");
  item.className = "list-card event-card mb-3";
  item.id = `event-card-${event.id}`;
  item.innerHTML = `
    <div class="event-header">
      <div>
        <div class="event-label">${event.description || "Event"}</div>
        <div class="event-time">${time}</div>
        <div class="event-meta">${day} · max ${event.max_participants}</div>
        ${event.location ? `<div class="event-meta" style="margin-top:0.2rem;">📍 ${event.location}</div>` : ""}
      </div>
      <span class="${chipClass}">${chipText}</span>
    </div>
    ${event.notes ? `<div class="text-muted" style="font-size:0.82rem;margin-bottom:0.5rem;">📝 ${event.notes}</div>` : ""}

    ${statusChipHTML ? `<div style="margin-bottom:0.75rem;">${statusChipHTML}</div>` : ""}

    <div class="event-divider"></div>

    <div class="event-label">Confirmed (${confirmed.length}/${event.max_participants})</div>
    <div style="display:flex;flex-direction:column;gap:0.25rem;margin-bottom:${openCount > 0 ? "0.75rem" : "0"};">
      ${confirmedHTML}
    </div>

    ${openCount > 0 ? `<div class="player-slots">${openHTML}</div>` : ""}

    ${waitlistHTML}

    <div class="event-divider"></div>
    <div class="event-actions" id="actions-${event.id}">
      ${actionsHTML}
    </div>
    ${inviteActionsHTML ? `<div class="event-actions mt-2">${inviteActionsHTML}</div>` : ""}
  `;

  if (hasEventInvite) {
    const eventInviteUrl = buildEventInviteLink(groupInviteToken, event.id);
    const inviteMessage = `${formatEventInviteDetails(event)}\nInvite link: ${eventInviteUrl}`;

    item.querySelector("[data-copy-event-invite]")?.addEventListener("click", async (e) => {
      await navigator.clipboard.writeText(inviteMessage);
      const btn = e.currentTarget;
      if (btn) {
        btn.textContent = "Copied!";
        setTimeout(() => {
          if (btn) btn.textContent = "Copy event invite";
        }, 1500);
      }
    });

    item.querySelector("[data-share-event-whatsapp]")?.addEventListener("click", () => {
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`;
      window.open(whatsappUrl, "_blank", "noopener");
    });
  }

  // Wire join
  item.querySelector("[data-join-id]")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Joining...";
    try {
      const partnerName = isCouples
        ? document.querySelector(`#partner-${event.id}`)?.value.trim()
        : null;
      if (isCouples && !partnerName) {
        alert("Please enter your partner's name");
        btn.disabled = false;
        btn.textContent = isFull ? "Join waitlist" : "Join";
        return;
      }
      const result = await joinEvent(event.id, isCouples ? "couple" : "individual", partnerName);
      setStatus(result === "confirmed" ? "You're in!" : "Added to waitlist");
      await refreshEvents();
    } catch (err) {
      setStatus(err.message);
      btn.disabled = false;
      btn.textContent = isFull ? "Join waitlist" : "Join";
    }
  });

  // Wire leave
  item.querySelector("[data-leave-id]")?.addEventListener("click", async (e) => {
    if (!confirm("Leave this event?")) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = "Leaving...";
    try {
      await leaveEvent(event.id, userId);
      await new Promise(r => setTimeout(r, 500));
      await refreshEvents();
    } catch (err) {
      setStatus(err.message);
      btn.disabled = false;
      btn.textContent = "Leave";
    }
  });

  // Wire edit
  item.querySelector("[data-edit-id]")?.addEventListener("click", () => {
    editingEventId        = event.id;
    groupSelect.value     = event.group_id;
    form.querySelector("#event-date").value = toLocalDatetimeString(event.date_time);
    form.querySelector("#event-max").value  = event.max_participants;
    form.querySelector("#event-desc").value = event.description || "";
    form.querySelector("#event-type").value = event.type;
    if (form.querySelector("#event-location")) form.querySelector("#event-location").value = event.location || "";
    if (form.querySelector("#event-notes")) form.querySelector("#event-notes").value = event.notes || "";
    setStatus("Editing event — make changes and save.");
    form.querySelector("button[type='submit']").textContent = "Update event";
    // Open the details/toggle if collapsed
    const toggle = form.closest("details");
    if (toggle) toggle.open = true;
    form.scrollIntoView({ behavior: "smooth" });
  });

  return item;
}

// ── Refresh ───────────────────────────────────────────────────────────────────
export async function refreshEvents() {
  const currentVersion = ++refreshVersion;
  if (!list || !groupSelect || !groupSelect.value) return;

  const userId = await getCurrentUserId();
  if (currentVersion !== refreshVersion) return;

  const [events, groups] = await Promise.all([
    listGroupEvents(groupSelect.value),
    listMyGroups(userId),
  ]);
  if (currentVersion !== refreshVersion) return;

  const selectedGroup = groups.find((g) => g.id === groupSelect.value);
  const groupInviteToken = selectedGroup?.invite_token || null;
  const requestedEventId = new URLSearchParams(window.location.search).get("event");

  list.innerHTML = "";

  if (events.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No events yet</div>
        <div class="empty-state-desc">Create one using the form.</div>
      </div>`;
    return;
  }

  const now = Date.now();
  const upcoming = events.filter(e => new Date(e.date_time).getTime() >= now);
  const past     = events.filter(e => new Date(e.date_time).getTime() <  now);

  // Render upcoming events
  for (const event of upcoming) {
    if (currentVersion !== refreshVersion) return;
    const card = await renderEventCard(event, userId, groupInviteToken);
    if (currentVersion !== refreshVersion) return;
    list.appendChild(card);
  }

  if (upcoming.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.innerHTML = `<div class="empty-state-title">No upcoming events</div>
      <div class="empty-state-desc">Create one using the form above.</div>`;
    list.appendChild(empty);
  }

  // Render past events in a collapsed section
  if (past.length > 0) {
    const pastSection = document.createElement("details");
    pastSection.className = "past-events-section mt-3";
    pastSection.innerHTML = `<summary class="past-events-summary">Past events (${past.length})</summary>`;

    for (const event of past) {
      if (currentVersion !== refreshVersion) return;
      const card = await renderEventCard(event, userId, groupInviteToken);
      card.classList.add("past-event-card");
      if (currentVersion !== refreshVersion) return;
      pastSection.appendChild(card);
    }
    list.appendChild(pastSection);
  }

  if (requestedEventId && !focusedSharedEvent) {
    const target = document.querySelector(`#event-card-${requestedEventId}`);
    if (target) {
      target.classList.add("event-card-focus");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      focusedSharedEvent = true;
      setStatus("Shared event opened.");
    }
  }
}

// ── Create / update ───────────────────────────────────────────────────────────
async function handleCreate(e) {
  e.preventDefault();
  const user = await requireAuth();
  if (!user) return;

  const btn = form.querySelector("button[type='submit']");
  btn.disabled = true;

  let dateValue = form.querySelector("#event-date").value;
  if (dateValue && dateValue.length === 16) dateValue += ":00";

  const eventType       = form.querySelector("#event-type").value;
  const maxParticipants = Number(form.querySelector("#event-max").value);
  const eventDate       = new Date(dateValue);
  // Convert local time to UTC ISO string so Supabase stores the correct moment
  if (!Number.isNaN(eventDate.getTime())) dateValue = eventDate.toISOString();

  if (!Number.isInteger(maxParticipants) || maxParticipants < 2) {
    setStatus("Max participants must be at least 2."); btn.disabled = false; return;
  }
  if (eventType === "couples" && maxParticipants % 2 !== 0) {
    setStatus("Couples events require an even number."); btn.disabled = false; return;
  }
  if (!dateValue || Number.isNaN(eventDate.getTime())) {
    setStatus("Please provide a valid date and time."); btn.disabled = false; return;
  }
  if (!editingEventId && eventDate <= new Date()) {
    setStatus("Event date must be in the future."); btn.disabled = false; return;
  }

  const payload = {
    group_id:         groupSelect.value,
    date_time:        dateValue,
    max_participants: maxParticipants,
    description:      form.querySelector("#event-desc").value.trim(),
    type:             eventType,
    location:         form.querySelector("#event-location")?.value.trim() || null,
    notes:            form.querySelector("#event-notes")?.value.trim() || null,
  };

  try {
    if (editingEventId) {
      await updateEvent(editingEventId, payload);
      setStatus("Event updated.");
      editingEventId = null;
      form.querySelector("button[type='submit']").textContent = "Create event";
    } else {
      await createEvent({ ...payload, created_by: user.id });
      setStatus("Event created.");
    }
    const savedGroup = groupSelect.value;
    form.reset();
    groupSelect.value = savedGroup;
    await refreshEvents();
  } catch (err) {
    setStatus(err.message);
  } finally {
    btn.disabled = false;
  }
}

form?.addEventListener("submit", handleCreate);
groupSelect?.addEventListener("change", refreshEvents);
refreshEvents();

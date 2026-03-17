import { requireAuth } from "./auth.js";

// Auto-refresh events every 10 seconds
setInterval(() => {
  if (!document.hidden) refreshEvents();
}, 10000);
import {
  createEvent,
  listGroupEvents,
  joinEvent,
  leaveEvent,
  getEvent,
  updateEvent,
  getEventParticipants,
  getCurrentUserId,
} from "./database.js";

const form = document.querySelector("#event-create-form");
const list = document.querySelector("#event-list");
const status = document.querySelector("#event-status");
const groupSelect = document.querySelector("#event-group");

// ── Safe status helper ────────────────────────────────────────────────────────
const setStatus = (msg) => { if (status) status.textContent = msg; };

// ── Auto-select group from URL ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");
  if (groupId && groupSelect) {
    groupSelect.value = groupId;
    refreshEvents();
  }
});

let editingEventId = null;
let refreshVersion = 0;
window.refreshEvents = refreshEvents;

// ── Render a single event card ────────────────────────────────────────────────
async function renderEventCard(event, userId) {
  const participants = await getEventParticipants(event.id);
  const confirmed = participants.filter(p => p.status === "confirmed");
  const waitlisted = participants.filter(p => p.status === "waitlisted");
  const myParticipation = participants.find(p => p.user_id === userId);

  // Format date
  let displayDate = event.date_time;
  try {
    displayDate = new Date(displayDate).toLocaleString();
  } catch (e) {}

  const item = document.createElement("div");
  item.className = "list-card mb-3";

  // ── Header ──
  const remaining = event.max_participants - confirmed.length;
  const spotsText = remaining > 0
    ? `${confirmed.length}/${event.max_participants} — ${remaining} spots left`
    : `Full — ${waitlisted.length} on waitlist`;

  item.innerHTML = `
    <div class="fw-semibold mb-1">${event.description || "Event"}</div>
    <div class="text-muted small mb-1">${displayDate}</div>
    <div class="small mb-2">${spotsText}</div>

    <div id="join-section-${event.id}" class="mb-2"></div>

    <div class="mb-2">
      <div class="small fw-semibold">
        Confirmed (${confirmed.length}/${event.max_participants})
      </div>
      <ul class="list-unstyled mb-0 small">
        ${confirmed.length === 0
          ? `<li class="text-muted">No players yet</li>`
          : confirmed.map((p, i) => `
              <li class="py-1 border-bottom">
                ${i + 1}. ${p.user?.display_name || p.user?.username || "Unknown"}
                ${p.partner_name
                  ? `<span class="text-muted">& ${p.partner_name}</span>`
                  : ""}
              </li>
            `).join("")
        }
      </ul>
    </div>

    ${waitlisted.length > 0 ? `
      <div class="mb-2">
        <div class="small fw-semibold text-warning">
          Waitlist (${waitlisted.length})
        </div>
        <ul class="list-unstyled mb-0 small">
          ${waitlisted.map((p, i) => `
            <li class="py-1 border-bottom text-muted">
              ${i + 1}. ${p.user?.display_name || p.user?.username || "Unknown"}
              ${p.partner_name ? `& ${p.partner_name}` : ""}
            </li>
          `).join("")}
        </ul>
      </div>
    ` : ""}

    <button
      class="btn btn-sm btn-outline-secondary mt-1"
      data-edit-id="${event.id}">
      Edit
    </button>
  `;

  // ── Join section ──
  const joinSection = item.querySelector(`#join-section-${event.id}`);
  const isCouples = event.type === "couples";

  if (myParticipation) {
    // Already joined — show badge + leave button
    const badge = myParticipation.status === "confirmed"
      ? `<span class="badge bg-success">You're in</span>`
      : `<span class="badge bg-warning text-dark">You're on the waitlist</span>`;

    joinSection.innerHTML = `
      <div class="d-flex align-items-center gap-2">
        ${badge}
        <button class="btn btn-sm btn-outline-danger" data-leave-id="${event.id}">
          Leave
        </button>
      </div>
    `;

    joinSection.querySelector(`[data-leave-id]`)
      .addEventListener("click", async (e) => {
        if (!confirm("Leave this event?")) return;
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = "Leaving...";
        try {
          await leaveEvent(event.id, userId);
          // Small delay to let Supabase complete the promotion update
          await new Promise(resolve => setTimeout(resolve, 500));
          await refreshEvents(); // re-render everything
        } catch (err) {
          setStatus(err.message);
          btn.disabled = false;
          btn.textContent = "Leave";
        }
      });

  } else {
    // Not joined yet
    const isFull = confirmed.length >= event.max_participants;

    joinSection.innerHTML = `
      <div class="d-flex align-items-center gap-2 flex-wrap">
        ${isCouples ? `
          <input
            type="text"
            class="form-control form-control-sm"
            id="partner-${event.id}"
            placeholder="Partner name"
            style="max-width:200px"
          />
        ` : ""}
        <button class="btn btn-sm btn-sun" data-join-id="${event.id}">
          ${isFull ? "Join waitlist" : "Join"}
        </button>
      </div>
    `;

    joinSection.querySelector(`[data-join-id]`)
      .addEventListener("click", async (e) => {
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

          const result = await joinEvent(
            event.id,
            isCouples ? "couple" : "individual",
            partnerName
          );

          setStatus(result === "confirmed"
            ? "You're in!"
            : "Added to waitlist"
          );

          await refreshEvents(); // re-render — this is the key fix

        } catch (err) {
          setStatus(err.message);
          btn.disabled = false;
          btn.textContent = isFull ? "Join waitlist" : "Join";
        }
      });
  }

  // ── Edit button ──
  item.querySelector("[data-edit-id]")
    .addEventListener("click", async () => {
      const eventData = await getEvent(event.id);
      if (!eventData) return;
      editingEventId = event.id;
      groupSelect.value = eventData.group_id;
      form.querySelector("#event-date").value = eventData.date_time.slice(0, 16);
      form.querySelector("#event-max").value = eventData.max_participants;
      form.querySelector("#event-desc").value = eventData.description;
      form.querySelector("#event-type").value = eventData.type;
      setStatus("Editing event...");
      form.querySelector("button[type='submit']").textContent = "Update event";
    });

  return item;
}

// ── Refresh event list ────────────────────────────────────────────────────────
export async function refreshEvents() {
  const currentVersion = ++refreshVersion;
  if (!list || !groupSelect || !groupSelect.value) return;

  const userId = await getCurrentUserId();
  if (currentVersion !== refreshVersion) return;

  const events = await listGroupEvents(groupSelect.value);
  if (currentVersion !== refreshVersion) return;

  list.innerHTML = "";

  if (events.length === 0) {
    list.innerHTML = `<p class="text-muted">No events yet. Create one!</p>`;
    return;
  }

  for (const event of events) {
    if (currentVersion !== refreshVersion) return;
    const card = await renderEventCard(event, userId);
    if (currentVersion !== refreshVersion) return;
    list.appendChild(card);
  }
}

// ── Create / update event ─────────────────────────────────────────────────────
async function handleCreate(e) {
  e.preventDefault();
  const user = await requireAuth();
  if (!user) return;

  const btn = form.querySelector("button[type='submit']");
  btn.disabled = true;

  let dateValue = form.querySelector("#event-date").value;
  if (dateValue && dateValue.length === 16) dateValue += ":00";

   const eventType = form.querySelector("#event-type").value;
   const maxParticipants = Number(form.querySelector("#event-max").value);
   const eventDate = new Date(dateValue);

   if (!Number.isInteger(maxParticipants) || maxParticipants < 2) {
    setStatus("Max participants must be at least 2.");
    btn.disabled = false;
    return;
  }

  if (eventType === "couples" && maxParticipants % 2 !== 0) {
    setStatus("Couples events require an even number of participants.");
    btn.disabled = false;
    return;
  }

  if (!dateValue || Number.isNaN(eventDate.getTime())) {
    setStatus("Please provide a valid event date and time.");
    btn.disabled = false;
    return;
  }

  if (eventDate <= new Date()) {
    setStatus("Event date must be in the future.");
    btn.disabled = false;
    return;
  }

  const updatePayload = {
    group_id: groupSelect.value,
    date_time: dateValue,
    max_participants: maxParticipants,
    description: form.querySelector("#event-desc").value.trim(),
    type: eventType,
  };

  try {
    if (editingEventId) {
      await updateEvent(editingEventId, updatePayload);
      setStatus("Event updated");
      editingEventId = null;
      form.querySelector("button[type='submit']").textContent = "Create event";
    } else {
      await createEvent({ ...updatePayload, created_by: user.id });
      setStatus("Event created");
    }
    form.reset();
    await refreshEvents();
  } catch (err) {
    setStatus(err.message);
  } finally {
    btn.disabled = false;
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
form?.addEventListener("submit", handleCreate);
groupSelect?.addEventListener("change", refreshEvents);

// ── Init ──────────────────────────────────────────────────────────────────────
refreshEvents();
import { requireAuth } from "./auth.js";
import { listMyGroups, listGroupEvents } from "./database.js";

const select = document.querySelector("#group-select");
const list   = document.querySelector("#event-feed");

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Render a compact event card for the dashboard feed ────────────────────────
function renderFeedCard(event, selectedGroupId) {
  const { day, time } = formatDate(event.date_time);
  const max           = event.max_participants;

  const card = document.createElement("div");
  card.className = "list-card event-card mb-3";
  card.style.cursor = "pointer";

  card.innerHTML = `
    <div class="event-header">
      <div>
        <div class="event-label">${event.description || "Event"}</div>
        <div class="event-time">${time}</div>
        <div class="event-meta">${day} · max ${max}</div>
      </div>
      <span class="chip chip-lime" style="align-self:flex-start;">View</span>
    </div>
  `;

  // Click anywhere on the card to go to events page for this group
  card.addEventListener("click", () => {
    window.location.href = `/event.html?group=${selectedGroupId || event.group_id}`;
  });

  return card;
}

// ── Load groups ───────────────────────────────────────────────────────────────
async function loadGroups() {
  const user = await requireAuth();
  if (!user || !select) return;

  const groups = await listMyGroups(user.id);
  select.innerHTML = "";

  if (groups.length === 0) {
    select.innerHTML = `<option disabled>No groups yet</option>`;
    if (list) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">No groups yet</div>
          <div class="empty-state-desc">Join or create a group to see upcoming events.</div>
          <a href="/group.html" class="btn btn-sun btn-sm" style="margin-top:0.5rem;">Go to Groups</a>
        </div>`;
    }
    return;
  }

  groups.forEach((group) => {
    const option       = document.createElement("option");
    option.value       = group.id;
    option.textContent = group.name;
    select.appendChild(option);
  });

  await loadEvents(groups[0].id);
}

// ── Load events for selected group ───────────────────────────────────────────
async function loadEvents(groupId) {
  if (!list) return;

  const events = await listGroupEvents(groupId);
  list.innerHTML = "";

  if (events.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No upcoming events</div>
        <div class="empty-state-desc">Create one from the Events page.</div>
        <a href="/event.html?group=${groupId}" class="btn btn-sun btn-sm" style="margin-top:0.5rem;">Create event</a>
      </div>`;
    return;
  }

  events.forEach((event) => {
    list.appendChild(renderFeedCard(event, groupId));
  });
}

// ── Listeners ─────────────────────────────────────────────────────────────────
if (select) {
  select.addEventListener("change", (e) => loadEvents(e.target.value));
}

loadGroups();

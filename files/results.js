import { requireAuth } from "./auth.js";
import {
  listMyGroups,
  listGroupEvents,
  getEventParticipants,
  getLeaderboard,
} from "./database.js";

// ── Elements ──────────────────────────────────────────────────────────────────
const groupSelect     = document.querySelector("#results-group-select");
const searchInput     = document.querySelector("#results-search");
const resultsList     = document.querySelector("#results-list");
const refreshBtn      = document.querySelector("#results-refresh-btn");

let currentUser = null;
let allGroups = [];
// Cache: { groupId: { events: [], leaderboards: {} } }
let dataCache = {};

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  allGroups = await listMyGroups(currentUser.id);

  // Populate group filter
  groupSelect.innerHTML = `<option value="">All groups</option>`;
  allGroups.forEach(g => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = g.name;
    groupSelect.appendChild(opt);
  });

  await loadResults();
}

// ── Load + render all finished event results ──────────────────────────────────
async function loadResults() {
  resultsList.innerHTML = `
    <div class="list-card frosted-card text-center py-4 text-muted">
      <div class="spinner-border spinner-border-sm me-2"></div> Loading...
    </div>`;

  const selectedGroup = groupSelect.value;
  const searchTerm    = searchInput.value.trim().toLowerCase();

  const groupsToLoad = selectedGroup
    ? allGroups.filter(g => g.id === selectedGroup)
    : allGroups;

  const sections = [];

  for (const group of groupsToLoad) {
    let events;

    // Use cache if available
    if (!dataCache[group.id]) {
      const allEvents = await listGroupEvents(group.id);
      // Only finished events
      const finished = allEvents.filter(e =>
        e.game_status === "finished" || e.is_closed === true
      );
      dataCache[group.id] = { events: finished, leaderboards: {} };
    }

    events = dataCache[group.id].events;

    if (events.length === 0) continue;

    const eventBlocks = [];

    for (const event of events) {
      // Build leaderboard for this event
      if (!dataCache[group.id].leaderboards[event.id]) {
        const participants = await getEventParticipants(event.id);
        const profiles = {};
        participants.filter(p => p.status === "confirmed").forEach(p => {
          profiles[p.user_id] = p.user?.display_name || p.user?.username || "Player";
        });

        const scores = await getLeaderboard(event.id);
        const sorted = Object.entries(scores)
          .sort((a, b) => b[1].points - a[1].points)
          .map(([userId, data]) => ({
            userId,
            name: profiles[userId] || "Player",
            ...data,
          }));

        dataCache[group.id].leaderboards[event.id] = sorted;
      }

      let leaderboard = dataCache[group.id].leaderboards[event.id];

      // Apply search filter
      if (searchTerm) {
        leaderboard = leaderboard.filter(row =>
          row.name.toLowerCase().includes(searchTerm)
        );
        if (leaderboard.length === 0) continue;
      }

      const eventDate = new Date(event.date_time).toLocaleDateString("en-GB", {
        weekday: "short", day: "numeric", month: "short", year: "numeric"
      });

      const winner = leaderboard[0];
      const medals = ["🥇", "🥈", "🥉"];

      const tableRows = leaderboard.map((row, i) => {
        const isMe = row.userId === currentUser.id;
        return `
          <tr ${isMe ? 'class="table-success"' : ""}>
            <td>${medals[i] || i + 1}</td>
            <td>${row.name}${isMe ? ' <span class="badge bg-success" style="font-size:0.65rem;">You</span>' : ""}</td>
            <td><strong>${row.points}</strong></td>
            <td>${row.played}</td>
          </tr>`;
      }).join("");

      eventBlocks.push(`
        <div class="results-event-block mb-3">
          <div class="results-event-header">
            <div>
              <span class="fw-semibold">${event.description || "Event"}</span>
              <span class="badge bg-secondary ms-2" style="font-size:0.7rem;">Finished</span>
            </div>
            <span class="text-muted small">${eventDate}</span>
          </div>
          ${winner ? `
            <div class="results-winner-row">
              🏆 <strong>${winner.name}</strong>
              <span class="text-muted ms-1" style="font-size:0.85rem;">${winner.points} pts</span>
            </div>` : ""}
          <div class="table-responsive mt-2">
            <table class="table table-sm results-table mb-0">
              <thead>
                <tr><th>#</th><th>Player</th><th>Points</th><th>Played</th></tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>
          </div>
        </div>
      `);
    }

    if (eventBlocks.length > 0) {
      sections.push(`
        <div class="results-group-section mb-4">
          <div class="results-group-header">
            <span class="results-group-name">📁 ${group.name}</span>
            <span class="badge bg-primary-subtle text-primary-emphasis">${eventBlocks.length} event${eventBlocks.length !== 1 ? "s" : ""}</span>
          </div>
          ${eventBlocks.join("")}
        </div>
      `);
    }
  }

  if (sections.length === 0) {
    resultsList.innerHTML = `
      <div class="list-card frosted-card text-center py-5">
        <div style="font-size:2.5rem;">📭</div>
        <h6 class="mt-3 fw-semibold">No finished events yet</h6>
        <p class="text-muted mb-0">Results will appear here once events are finalized.</p>
      </div>`;
    return;
  }

  resultsList.innerHTML = sections.join("");
}

// ── Wire filters ──────────────────────────────────────────────────────────────
groupSelect?.addEventListener("change", () => {
  dataCache = {}; // Clear cache on group change to reload
  loadResults();
});

searchInput?.addEventListener("input", () => {
  loadResults();
});

refreshBtn?.addEventListener("click", () => {
  dataCache = {};
  loadResults();
});

// ── Start ─────────────────────────────────────────────────────────────────────
init();

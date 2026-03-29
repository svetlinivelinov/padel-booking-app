import { requireAuth } from "./auth.js";
import {
  listMyGroups,
  listGroupEvents,
  getEventParticipants,
  getEvent,
  startGame,
  generateRound,
  getMatches,
  submitScore,
  getLeaderboard,
  getCurrentRound,
  getCurrentUserId,
  finalizeEvent,
} from "./database.js";
import { generateAmericanoRounds } from "./americano.js";

// ── State ─────────────────────────────────────────────────────────────────────
let currentEvent = null;
let currentUser = null;
let allRounds = [];
let currentRoundIndex = 0;
let playerProfiles = {};
let availableEvents = [];

// ── Elements ──────────────────────────────────────────────────────────────────
const eventSelect    = document.querySelector("#court-event-select");
const startPanel     = document.querySelector("#start-panel");
const gamePanel      = document.querySelector("#game-panel");
const emptyPanel     = document.querySelector("#empty-panel");
const emptyNextEvent = document.querySelector("#empty-next-event");
const startBtn       = document.querySelector("#start-btn");
const startStatus    = document.querySelector("#start-status");
const roundLabel     = document.querySelector("#round-label");
const roundSub       = document.querySelector("#round-sub");
const courtCards     = document.querySelector("#court-cards");
const leaderboard    = document.querySelector("#leaderboard");
const nextRoundBtn   = document.querySelector("#next-round-btn");
const finalizeBtn    = document.querySelector("#finalize-btn");
const finalPanel     = document.querySelector("#final-panel");

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  await loadEventOptions();
  eventSelect.addEventListener("change", () => loadCourt());
  if (eventSelect.value) {
    loadCourt();
  } else {
    showEmptyState();
  }
}

// ── Load event dropdown ───────────────────────────────────────────────────────
async function loadEventOptions() {
  const groups = await listMyGroups(currentUser.id);
  const allEvents = [];

  for (const group of groups) {
    const events = await listGroupEvents(group.id);
    events.forEach(e => allEvents.push({ ...e, groupName: group.name }));
  }

  allEvents.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
  availableEvents = allEvents;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const upcomingEvents = allEvents.filter(e =>
    e.game_status !== "finished" &&
    (new Date(e.date_time) >= today || e.game_status === "active")
  );

  eventSelect.innerHTML = upcomingEvents.length === 0
    ? `<option value="">No upcoming events</option>`
    : upcomingEvents.map(e => {
        const status = e.game_status === "active" ? " [Active]" : "";
        return `<option value="${e.id}">${e.description || "Event"} — ${new Date(e.date_time).toLocaleDateString()}${status}</option>`;
      }).join("");

  // Auto-select from URL
  const params = new URLSearchParams(window.location.search);
  const eventId = params.get("event");
  if (eventId) eventSelect.value = eventId;

  updateNextEventLabel();
}

// ── Load court for selected event ─────────────────────────────────────────────
async function loadCourt() {
  const eventId = eventSelect.value;
  if (!eventId) {
    showEmptyState();
    return;
  }

  currentEvent = await getEvent(eventId);
  if (!currentEvent) return;

  // Load player profiles for name display
  const participants = await getEventParticipants(eventId);
  const confirmed = participants.filter(p => p.status === "confirmed");
  playerProfiles = {};
  confirmed.forEach(p => {
    playerProfiles[p.user_id] = p.user?.display_name || p.user?.username || "Player";
  });

  const isOrganizer = currentEvent.created_by === currentUser.id;
  const gameStatus = currentEvent.game_status || "pending";
  const isClosed = currentEvent.is_closed === true;

  // Hide all panels first
  startPanel.style.display  = "none";
  gamePanel.style.display   = "none";
  if (emptyPanel) emptyPanel.style.display = "none";
  if (finalPanel) finalPanel.style.display = "none";

  if (gameStatus === "finished" || isClosed) {
    // Show final summary screen
    await renderFinalScreen(isOrganizer);
  } else if (gameStatus === "active") {
    // Regenerate allRounds if empty (page refresh mid-game)
    if (allRounds.length === 0 && currentEvent.total_rounds) {
      const courts = Math.max(1, Math.floor(Object.keys(playerProfiles).length / 4));
      allRounds = generateAmericanoRounds(Object.keys(playerProfiles), currentEvent.total_rounds, courts);
    }
    gamePanel.style.display = "block";
    await loadRound();
    // Show finalize button only for organizer when game is active
    if (finalizeBtn) {
      finalizeBtn.style.display = isOrganizer ? "block" : "none";
    }
  } else {
    // pending
    if (isOrganizer) {
      startPanel.style.display = "block";
    }
    showEmptyState();
  }
}

function updateNextEventLabel() {
  if (!emptyNextEvent) return;
  if (!availableEvents.length) {
    emptyNextEvent.textContent = "No scheduled events";
    return;
  }
  const now = new Date();
  const next = availableEvents.find(e => new Date(e.date_time) >= now) || availableEvents[0];
  emptyNextEvent.textContent = new Date(next.date_time).toLocaleString();
}

function showEmptyState() {
  updateNextEventLabel();
  if (emptyPanel) emptyPanel.style.display = "block";
}

// ── Start game ────────────────────────────────────────────────────────────────
startBtn.addEventListener("click", async () => {
  startBtn.disabled = true;
  startStatus.textContent = "Generating rounds...";

  try {
    const pointsPerMatch = Number.parseInt(document.querySelector("#points-per-match").value, 10);
    const totalRounds = Number.parseInt(document.querySelector("#total-rounds").value, 10);
    const courts = Math.floor(Object.keys(playerProfiles).length / 4);

    if (Number.isNaN(pointsPerMatch) || Number.isNaN(totalRounds)) {
      throw new Error("Please provide valid game settings");
    }

    if (Object.keys(playerProfiles).length < 4) {
      throw new Error("Need at least 4 confirmed players to start");
    }

    const playerIds = Object.keys(playerProfiles);
    allRounds = generateAmericanoRounds(playerIds, totalRounds, courts);

    // Save game settings — this also sets game_status = 'active'
    await startGame(currentEvent.id, pointsPerMatch, totalRounds);

    // Only generate round 1 — subsequent rounds generated on demand
    await generateRound(currentEvent.id, 1, allRounds[0]);

    startStatus.textContent = "Game started!";

    // Refresh event to get updated game_status
    currentEvent = await getEvent(currentEvent.id);

    startPanel.style.display = "none";
    if (emptyPanel) emptyPanel.style.display = "none";
    gamePanel.style.display = "block";

    // Show finalize button for organizer
    if (finalizeBtn) finalizeBtn.style.display = "block";

    currentRoundIndex = 0;
    await loadRound();

  } catch (err) {
    startStatus.textContent = err.message;
    startBtn.disabled = false;
  }
});

// ── Finalize event ────────────────────────────────────────────────────────────
if (finalizeBtn) {
  finalizeBtn.addEventListener("click", async () => {
    const confirmed = confirm(
      "Финализиране на събитието?\n\nСтатусът ще се смени на 'finished', събитието ще се затвори и ще се покаже финален екран с резултатите."
    );
    if (!confirmed) return;

    finalizeBtn.disabled = true;
    finalizeBtn.textContent = "Финализиране...";

    try {
      await finalizeEvent(currentEvent.id);
      // Refresh event state
      currentEvent = await getEvent(currentEvent.id);

      // Hide game panel, show final screen
      gamePanel.style.display = "none";
      finalizeBtn.style.display = "none";
      await renderFinalScreen(true);

      // Reload dropdown to reflect [Finished] label
      await loadEventOptions();
      eventSelect.value = currentEvent.id;

    } catch (err) {
      alert("Грешка при финализиране: " + err.message);
      finalizeBtn.disabled = false;
      finalizeBtn.textContent = "🏁 Финализирай събитието";
    }
  });
}

// ── Final / Summary Screen ────────────────────────────────────────────────────
async function renderFinalScreen(isOrganizer) {
  if (!finalPanel) return;

  finalPanel.style.display = "block";

  // Get leaderboard data
  const scores = await getLeaderboard(currentEvent.id);
  const p = playerProfiles;

  // If playerProfiles is empty (navigated directly), reload participants
  if (Object.keys(p).length === 0) {
    const participants = await getEventParticipants(currentEvent.id);
    participants.filter(pt => pt.status === "confirmed").forEach(pt => {
      playerProfiles[pt.user_id] = pt.user?.display_name || pt.user?.username || "Player";
    });
  }

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1].points - a[1].points);

  const winner = sorted[0];
  const winnerName = winner ? (playerProfiles[winner[0]] || "Player") : "—";
  const winnerPoints = winner ? winner[1].points : 0;

  const podiumHTML = sorted.slice(0, 3).map(([userId, data], i) => {
    const medals = ["🥇", "🥈", "🥉"];
    const isMe = userId === currentUser?.id;
    return `
      <div class="final-podium-item ${isMe ? "final-podium-me" : ""}">
        <div class="final-medal">${medals[i] || i + 1}</div>
        <div class="final-player-name">${playerProfiles[userId] || "Player"}</div>
        <div class="final-player-pts">${data.points} pts · ${data.played} played</div>
      </div>`;
  }).join("");

  const fullTableHTML = sorted.length > 0 ? `
    <table class="table table-sm mt-3">
      <thead>
        <tr><th>#</th><th>Player</th><th>Points</th><th>Played</th></tr>
      </thead>
      <tbody>
        ${sorted.map(([userId, data], i) => `
          <tr ${userId === currentUser?.id ? 'class="table-success"' : ""}>
            <td>${i + 1}</td>
            <td>${playerProfiles[userId] || "Player"}</td>
            <td><strong>${data.points}</strong></td>
            <td>${data.played}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>` : `<p class="text-muted">No scores recorded.</p>`;

  const closedBadge = currentEvent.is_closed
    ? `<span class="badge bg-secondary ms-2">Closed</span>`
    : "";

  finalPanel.innerHTML = `
    <div class="list-card frosted-card mb-4 final-screen">
      <div class="final-header">
        <div class="final-trophy">🏆</div>
        <h4 class="fw-bold mb-1">Event Finished ${closedBadge}</h4>
        <p class="text-muted mb-0">${currentEvent.description || "Padel Event"}</p>
      </div>

      <div class="final-winner-block">
        <div class="final-winner-label">Winner</div>
        <div class="final-winner-name">${winnerName}</div>
        <div class="final-winner-pts">${winnerPoints} points</div>
      </div>

      <div class="final-podium">
        ${podiumHTML}
      </div>

      <div class="event-divider my-3"></div>

      <h6 class="fw-semibold mb-0">Full Leaderboard</h6>
      ${fullTableHTML}

      <div class="event-divider my-3"></div>

      <div class="d-flex gap-2 flex-wrap">
        <a href="/event.html" class="btn btn-ghost btn-sm">← Back to Events</a>
        <a href="/court.html" class="btn btn-sun btn-sm">New Game</a>
      </div>
    </div>
  `;
}

// ── Load current round ────────────────────────────────────────────────────────
async function loadRound() {
  const round = await getCurrentRound(currentEvent.id);
  if (!round) return;

  currentRoundIndex = round.round_number;
  roundLabel.textContent = `Round ${round.round_number}`;
  roundSub.textContent   = `of ${currentEvent.total_rounds}`;

  const matches = await getMatches(currentEvent.id, round.round_number);
  const isOrganizer = currentEvent.created_by === currentUser.id;
  const allScored = matches.every(m => m.status === "completed");
  const isLastRound = round.round_number >= currentEvent.total_rounds;

  // Show "Next round" for organizer if all scored and not last round
  if (isOrganizer && allScored && !isLastRound) {
    nextRoundBtn.style.display = "block";
  } else {
    nextRoundBtn.style.display = "none";
  }

  // Show "Finalize" for organizer on last round once all scored
  if (finalizeBtn) {
    if (isOrganizer && allScored && isLastRound) {
      finalizeBtn.classList.add("btn-pulse");
    } else if (isOrganizer) {
      finalizeBtn.classList.remove("btn-pulse");
    }
  }

  // Render court cards
  courtCards.innerHTML = "";
  matches.forEach(match => {
    const card = renderCourtCard(match, isOrganizer);
    courtCards.appendChild(card);
  });

  await renderLeaderboard();
}

// ── Render a court card ───────────────────────────────────────────────────────
function renderCourtCard(match, isOrganizer) {
  const p = playerProfiles;
  const isMyMatch = [
    match.team_a_p1, match.team_a_p2,
    match.team_b_p1, match.team_b_p2
  ].includes(currentUser.id);

  const card = document.createElement("div");
  card.className = `list-card mb-3 ${isMyMatch ? "border-success" : ""}`;

  const scored = match.status === "completed";

  card.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2">
      <span class="fw-semibold">Court ${match.court_number}</span>
      ${isMyMatch ? `<span class="badge bg-success">Your match</span>` : ""}
      ${scored ? `<span class="badge bg-secondary">Done</span>` : ""}
    </div>
    <div class="d-flex justify-content-between align-items-center">
      <div class="text-center" style="flex:1">
        <div class="small fw-semibold">${p[match.team_a_p1] || "?"}</div>
        <div class="small text-muted">${p[match.team_a_p2] || "?"}</div>
      </div>
      <div class="text-center px-3">
        ${scored
          ? `<span class="fw-bold">${match.score_a} — ${match.score_b}</span>`
          : `<span class="text-muted">vs</span>`
        }
      </div>
      <div class="text-center" style="flex:1">
        <div class="small fw-semibold">${p[match.team_b_p1] || "?"}</div>
        <div class="small text-muted">${p[match.team_b_p2] || "?"}</div>
      </div>
    </div>
    ${isOrganizer && !scored ? `
      <div class="mt-3 d-flex align-items-center gap-2">
        <input
          type="number" min="0" max="${currentEvent.points_per_match}"
          id="score-a-${match.id}"
          class="form-control form-control-sm"
          placeholder="Team A"
          style="max-width:80px"
        />
        <span>—</span>
        <input
          type="number" min="0" max="${currentEvent.points_per_match}"
          id="score-b-${match.id}"
          class="form-control form-control-sm"
          placeholder="Team B"
          style="max-width:80px"
        />
        <button class="btn btn-sm btn-sun" data-submit-match="${match.id}">Save</button>
      </div>
    ` : ""}
  `;

  card.querySelector(`[data-submit-match]`)
    ?.addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      const scoreA = Number.parseInt(document.querySelector(`#score-a-${match.id}`)?.value, 10);
      const scoreB = Number.parseInt(document.querySelector(`#score-b-${match.id}`)?.value, 10);

      if (isNaN(scoreA) || isNaN(scoreB)) { alert("Please enter both scores"); return; }
      if (scoreA < 0 || scoreB < 0) { alert("Scores cannot be negative"); return; }
      if (scoreA > currentEvent.points_per_match || scoreB > currentEvent.points_per_match) {
        alert(`Scores cannot exceed ${currentEvent.points_per_match}`); return;
      }
      if (scoreA + scoreB !== currentEvent.points_per_match) {
        alert(`Scores must add up to ${currentEvent.points_per_match}`); return;
      }

      btn.disabled = true;
      btn.textContent = "Saving...";

      try {
        await submitScore(match.id, scoreA, scoreB);
        await loadRound();
      } catch (err) {
        alert(err.message);
        btn.disabled = false;
        btn.textContent = "Save";
      }
    });

  return card;
}

// ── Next round ────────────────────────────────────────────────────────────────
nextRoundBtn.addEventListener("click", async () => {
  nextRoundBtn.disabled = true;
  nextRoundBtn.textContent = "Loading...";

  try {
    const nextIndex = currentRoundIndex + 1;
    if (allRounds[nextIndex - 1]) {
      await generateRound(currentEvent.id, nextIndex, allRounds[nextIndex - 1]);
    }
    currentRoundIndex = nextIndex;
    await loadRound();
  } catch (err) {
    alert(err.message);
  } finally {
    nextRoundBtn.disabled = false;
    nextRoundBtn.textContent = "Next round →";
  }
});

// ── Leaderboard ───────────────────────────────────────────────────────────────
async function renderLeaderboard() {
  const scores = await getLeaderboard(currentEvent.id);
  const p = playerProfiles;

  const sorted = Object.entries(scores)
    .sort((a, b) => b[1].points - a[1].points);

  if (sorted.length === 0) {
    leaderboard.innerHTML = `<p class="text-muted small">No scores yet</p>`;
    return;
  }

  leaderboard.innerHTML = `
    <table class="table table-sm">
      <thead>
        <tr><th>#</th><th>Player</th><th>Points</th><th>Played</th></tr>
      </thead>
      <tbody>
        ${sorted.map(([userId, data], i) => `
          <tr ${userId === currentUser.id ? 'class="table-success"' : ""}>
            <td>${i + 1}</td>
            <td>${p[userId] || "Player"}</td>
            <td><strong>${data.points}</strong></td>
            <td>${data.played}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

// ── Auto refresh every 15 seconds (only when active) ─────────────────────────
setInterval(() => {
  if (!document.hidden && currentEvent?.game_status === "active") loadRound();
}, 15000);

// ── Start ─────────────────────────────────────────────────────────────────────
init();

import { requireAuth, getUserRole } from "./auth.js";
import * as db from "./database.js?v=20260407";

const {
  listOwnedGroups,
  listGroupEvents,
  listGroupMembers,
  getEventParticipants,
  updateGroup,
  removeGroupMember,
  finalizeEvent,
  adminListGroups,
  adminListGroupMembers,
  adminListGroupEvents,
  adminListEventParticipants,
  adminListUsers,
  adminDeleteEvent,
  adminFinalizeEvent,
  adminAddParticipant,
  adminSimulateGame,
} = db;

const deleteEvent = db.deleteEvent;
const deleteGroup = db.deleteGroup;

const roleBadge = document.querySelector("#admin-role-badge");
const roleHint = document.querySelector("#admin-role-hint");
const panelStatus = document.querySelector("#admin-panel-status");

const groupSelect = document.querySelector("#admin-group-select");
const groupForm = document.querySelector("#admin-group-form");
const groupNameInput = document.querySelector("#admin-group-name");
const groupDescriptionInput = document.querySelector("#admin-group-description");
const deleteGroupBtn = document.querySelector("#admin-delete-group");

const kpiOwnedGroups = document.querySelector("#kpi-owned-groups");
const kpiGroupEvents = document.querySelector("#kpi-group-events");
const kpiConfirmedPlayers = document.querySelector("#kpi-confirmed-players");
const kpiWaitlistedPlayers = document.querySelector("#kpi-waitlisted-players");

const membersBody = document.querySelector("#admin-members-body");
const membersEmpty = document.querySelector("#admin-members-empty");

const eventsBody = document.querySelector("#admin-events-body");
const eventsEmpty = document.querySelector("#admin-events-empty");

const usersSection = document.querySelector("#admin-users-section");
const usersBody = document.querySelector("#admin-users-body");
const usersEmpty = document.querySelector("#admin-users-empty");

const simSection          = document.querySelector("#admin-simulate-section");
const simEventSelect      = document.querySelector("#sim-event-select");
const simUsersCheckboxes  = document.querySelector("#sim-users-checkboxes");
const simAddBtn           = document.querySelector("#sim-add-btn");
const simRunBtn           = document.querySelector("#sim-run-btn");
const simStatus           = document.querySelector("#sim-status");
const simParticipantCount = document.querySelector("#sim-participant-count");
const simResultsLink      = document.querySelector("#sim-results-link");

let currentUser = null;
let currentRole = "player";
let visibleGroups = [];
let selectedGroup = null;
let loadedUsers = [];

const isAdmin = () => currentRole === "admin";

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function setStatus(message, type = "muted") {
  if (!panelStatus) return;
  panelStatus.textContent = message;
  panelStatus.classList.remove("error", "success");
  if (type === "error" || type === "success") {
    panelStatus.classList.add(type);
  }
}

function formatRole(role) {
  if (!role) return "PLAYER";
  return String(role).toUpperCase();
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(dateStr || "-");
  }
}

function eventStateLabel(event) {
  if (event.game_status === "finished" || event.is_closed) return "Finished";
  if (event.game_status === "active") return "Active";
  return "Pending";
}

function eventStateClass(event) {
  if (event.game_status === "finished" || event.is_closed) return "admin-chip admin-chip-muted";
  if (event.game_status === "active") return "admin-chip admin-chip-live";
  return "admin-chip admin-chip-soft";
}

function renderGroupSelect() {
  if (!groupSelect) return;

  groupSelect.innerHTML = "";
  if (visibleGroups.length === 0) {
    groupSelect.innerHTML = '<option value="">No groups available</option>';
    groupSelect.disabled = true;
    return;
  }

  groupSelect.disabled = false;
  visibleGroups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    groupSelect.appendChild(option);
  });

  groupSelect.value = selectedGroup?.id || visibleGroups[0].id;
}

function renderUsers(users) {
  if (!usersSection) return;

  if (!isAdmin()) {
    usersSection.style.display = "none";
    return;
  }

  usersSection.style.display = "block";
  usersBody.innerHTML = "";

  if (!users || users.length === 0) {
    usersEmpty.style.display = "block";
    return;
  }

  usersEmpty.style.display = "none";

  usersBody.innerHTML = users
    .map((user) => {
      const name = user.display_name || user.username || "User";
      return `
        <tr>
          <td>${escapeHtml(name)}</td>
          <td>${escapeHtml(user.username || "-")}</td>
          <td>${escapeHtml(user.email || "-")}</td>
          <td><span class="badge-role">${escapeHtml(user.role || "player")}</span></td>
          <td>${escapeHtml(formatDate(user.created_at))}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadSummaryAndTables() {
  if (!selectedGroup) {
    kpiOwnedGroups.textContent = String(visibleGroups.length);
    kpiGroupEvents.textContent = "0";
    kpiConfirmedPlayers.textContent = "0";
    kpiWaitlistedPlayers.textContent = "0";

    membersBody.innerHTML = "";
    eventsBody.innerHTML = "";
    membersEmpty.style.display = "block";
    eventsEmpty.style.display = "block";
    return;
  }

  const [members, events] = await Promise.all([
    isAdmin() ? adminListGroupMembers(selectedGroup.id) : listGroupMembers(selectedGroup.id),
    isAdmin() ? adminListGroupEvents(selectedGroup.id) : listGroupEvents(selectedGroup.id),
  ]);

  const participantsByEvent = await Promise.all(
    events.map(async (event) => {
      const participants = isAdmin()
        ? await adminListEventParticipants(event.id)
        : await getEventParticipants(event.id);
      return { eventId: event.id, participants };
    })
  );

  const participantsMap = new Map(
    participantsByEvent.map((entry) => [entry.eventId, entry.participants])
  );

  let confirmedCount = 0;
  let waitlistedCount = 0;
  participantsByEvent.forEach(({ participants }) => {
    participants.forEach((p) => {
      if (p.status === "confirmed") confirmedCount += 1;
      if (p.status === "waitlisted") waitlistedCount += 1;
    });
  });

  kpiOwnedGroups.textContent = String(visibleGroups.length);
  kpiGroupEvents.textContent = String(events.length);
  kpiConfirmedPlayers.textContent = String(confirmedCount);
  kpiWaitlistedPlayers.textContent = String(waitlistedCount);

  renderMembers(members);
  renderEvents(events, participantsMap);
}

function renderMembers(members) {
  membersBody.innerHTML = "";
  if (!members || members.length === 0) {
    membersEmpty.style.display = "block";
    return;
  }

  membersEmpty.style.display = "none";

  const rows = members
    .map((member) => {
      const displayName = member.user?.display_name || member.user?.username || "Member";
      const username = member.user?.username || "-";
      const joinedAt = member.created_at ? formatDate(member.created_at) : "-";
      const canRemove = member.user_id !== selectedGroup.owner_id;

      return `
        <tr>
          <td>${escapeHtml(displayName)}</td>
          <td>${escapeHtml(username)}</td>
          <td><span class="badge-role">${escapeHtml(member.role || "member")}</span></td>
          <td>${escapeHtml(joinedAt)}</td>
          <td class="text-end">
            ${
              canRemove
                ? `<button class="btn btn-sm btn-ghost" data-remove-member="${member.user_id}">Remove</button>`
                : `<span class="text-muted small">Owner</span>`
            }
          </td>
        </tr>
      `;
    })
    .join("");

  membersBody.innerHTML = rows;

  membersBody.querySelectorAll("[data-remove-member]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const memberUserId = btn.getAttribute("data-remove-member");
      if (!memberUserId) return;

      const confirmed = window.confirm("Remove this member from the group?");
      if (!confirmed) return;

      btn.disabled = true;
      try {
        await removeGroupMember(selectedGroup.id, memberUserId);
        setStatus("Member removed.", "success");
        await loadSummaryAndTables();
      } catch (error) {
        setStatus(error.message || "Failed to remove member.", "error");
        btn.disabled = false;
      }
    });
  });
}

function renderEvents(events, participantsMap) {
  eventsBody.innerHTML = "";
  if (!events || events.length === 0) {
    eventsEmpty.style.display = "block";
    return;
  }

  eventsEmpty.style.display = "none";

  const rows = events
    .map((event) => {
      const participants = participantsMap.get(event.id) || [];
      const confirmed = participants.filter((p) => p.status === "confirmed").length;
      const waitlisted = participants.filter((p) => p.status === "waitlisted").length;
      const canModerateEvent = event.created_by === currentUser.id;
      const canAdminFinalizeEvent = isAdmin() && typeof adminFinalizeEvent === "function";
      const canAdminDeleteEvent = isAdmin() && typeof adminDeleteEvent === "function";
      const canFinalize = (canModerateEvent || canAdminFinalizeEvent) && eventStateLabel(event) !== "Finished";
      const canDeleteEvent = canAdminDeleteEvent || (canModerateEvent && typeof deleteEvent === "function");

      return `
        <tr>
          <td>
            <div class="fw-semibold">${escapeHtml(event.description || "Event")}</div>
            <div class="small text-muted">${escapeHtml(formatDate(event.date_time))}</div>
          </td>
          <td><span class="${eventStateClass(event)}">${escapeHtml(eventStateLabel(event))}</span></td>
          <td>${confirmed}/${escapeHtml(String(event.max_participants ?? "-"))}</td>
          <td>${waitlisted}</td>
          <td class="text-end admin-actions-cell">
            <div class="admin-actions-wrap">
            <a class="btn btn-sm btn-ghost" href="/event.html?group=${encodeURIComponent(selectedGroup.id)}&event=${encodeURIComponent(event.id)}">Open</a>
            ${
              canFinalize
                ? `<button class="btn btn-sm btn-sun" data-finalize-event="${event.id}">Close</button>`
                : ""
            }
            ${
              canDeleteEvent
                ? `<button class="btn btn-sm btn-ghost btn-ghost-danger" data-delete-event="${event.id}">Delete</button>`
                : ""
            }
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  eventsBody.innerHTML = rows;

  eventsBody.querySelectorAll("[data-finalize-event]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const eventId = btn.getAttribute("data-finalize-event");
      if (!eventId) return;

      btn.disabled = true;
      try {
        if (isAdmin() && typeof adminFinalizeEvent === "function") {
          await adminFinalizeEvent(eventId);
        } else {
          await finalizeEvent(eventId);
        }
        setStatus("Event closed.", "success");
        await loadSummaryAndTables();
      } catch (error) {
        setStatus(error.message || "Failed to close event.", "error");
        btn.disabled = false;
      }
    });
  });

  eventsBody.querySelectorAll("[data-delete-event]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const eventId = btn.getAttribute("data-delete-event");
      if (!eventId) return;

      const confirmed = window.confirm("Delete this event? This action cannot be undone.");
      if (!confirmed) return;

      btn.disabled = true;
      try {
        if (isAdmin() && typeof adminDeleteEvent === "function") {
          await adminDeleteEvent(eventId);
        } else if (typeof deleteEvent === "function") {
          await deleteEvent(eventId);
        } else {
          throw new Error("Delete event is unavailable until the latest assets are loaded.");
        }
        setStatus("Event deleted.", "success");
        await loadSummaryAndTables();
      } catch (error) {
        setStatus(error.message || "Failed to delete event.", "error");
        btn.disabled = false;
      }
    });
  });
}

async function initSimulateSection() {
  if (!simSection || !isAdmin()) return;
  simSection.style.display = "block";

  // Load all events across all visible groups
  const allEvents = [];
  for (const group of visibleGroups) {
    try {
      const events = await adminListGroupEvents(group.id);
      events.forEach(e => allEvents.push({ ...e, groupName: group.name }));
    } catch { /* skip */ }
  }
  allEvents.sort((a, b) => new Date(b.date_time) - new Date(a.date_time));

  simEventSelect.innerHTML = allEvents.length === 0
    ? '<option value="">No events found — create one first</option>'
    : allEvents.map(e => {
        const label = `[${escapeHtml(e.groupName)}] ${escapeHtml(e.description || "Event")} — ${new Date(e.date_time).toLocaleDateString()}`;
        return `<option value="${escapeHtml(e.id)}">${label}</option>`;
      }).join("");

  // Populate user checkboxes from the already-loaded users list
  simUsersCheckboxes.innerHTML = loadedUsers.map(u => {
    const name = escapeHtml(u.display_name || u.username || "User");
    return `<label class="d-flex align-items-center gap-1 small" style="cursor:pointer;white-space:nowrap">
      <input type="checkbox" value="${escapeHtml(u.id)}" class="form-check-input m-0"> ${name}
    </label>`;
  }).join("");

  const setSimStatus = (msg, cls = "") => {
    if (!simStatus) return;
    simStatus.textContent = msg;
    simStatus.className = "form-status mt-2 mb-0" + (cls ? " " + cls : "");
  };

  const refreshParticipantCount = async () => {
    const eventId = simEventSelect?.value;
    if (!eventId || !simParticipantCount) return;
    try {
      const parts = await adminListEventParticipants(eventId);
      const confirmed = parts.filter(p => p.status === "confirmed").length;
      simParticipantCount.textContent = `${confirmed} confirmed participant${confirmed !== 1 ? "s" : ""} currently`;
    } catch { simParticipantCount.textContent = ""; }
  };

  simEventSelect?.addEventListener("change", refreshParticipantCount);
  await refreshParticipantCount();

  simAddBtn?.addEventListener("click", async () => {
    const eventId = simEventSelect?.value;
    if (!eventId) { setSimStatus("Select an event first.", "error"); return; }
    const checked = [...(simUsersCheckboxes?.querySelectorAll("input:checked") ?? [])].map(el => el.value);
    if (checked.length === 0) { setSimStatus("Select at least one user.", "error"); return; }

    simAddBtn.disabled = true;
    setSimStatus(`Adding ${checked.length} participant(s)...`);
    let added = 0, failed = 0;
    for (const userId of checked) {
      try { await adminAddParticipant(eventId, userId); added++; }
      catch { failed++; }
    }
    simAddBtn.disabled = false;
    setSimStatus(`Done: ${added} added${failed ? `, ${failed} failed` : ""}.`, added > 0 ? "success" : "error");
    await refreshParticipantCount();
  });

  simRunBtn?.addEventListener("click", async () => {
    const eventId = simEventSelect?.value;
    if (!eventId) { setSimStatus("Select an event first.", "error"); return; }
    if (!window.confirm("This will generate all rounds with random scores and mark the event as Finished. Continue?")) return;

    simRunBtn.disabled = true;
    setSimStatus("Simulating game...");
    try {
      const result = await adminSimulateGame(eventId);
      setSimStatus(`✓ ${result}`, "success");
      if (simResultsLink) simResultsLink.style.display = "";
    } catch (err) {
      setSimStatus(err.message || "Simulation failed.", "error");
    } finally {
      simRunBtn.disabled = false;
    }
    await loadSummaryAndTables();
    await refreshParticipantCount();
  });
}

async function onGroupChange(groupId) {
  selectedGroup = visibleGroups.find((g) => g.id === groupId) || null;

  if (!selectedGroup) {
    groupNameInput.value = "";
    groupDescriptionInput.value = "";
    deleteGroupBtn.disabled = true;
    await loadSummaryAndTables();
    return;
  }

  groupNameInput.value = selectedGroup.name || "";
  groupDescriptionInput.value = selectedGroup.description || "";
  deleteGroupBtn.disabled = false;
  await loadSummaryAndTables();
}

async function init() {
  currentUser = await requireAuth();
  if (!currentUser) return;

  currentRole = await getUserRole(currentUser.id);

  if (roleBadge) {
    roleBadge.textContent = formatRole(currentRole);
  }

  if (roleHint) {
    if (isAdmin()) {
      roleHint.textContent = "Admin mode enabled. Showing all groups, users, and events.";
    } else if (currentRole === "organizer") {
      roleHint.textContent = "Organizer mode: you can moderate your own groups.";
    } else {
      roleHint.textContent = "Owner mode: controls are available for groups you own.";
    }
  }

  visibleGroups = isAdmin()
    ? await adminListGroups()
    : await listOwnedGroups(currentUser.id);
  selectedGroup = visibleGroups[0] || null;

  if (isAdmin()) {
    loadedUsers = await adminListUsers();
    renderUsers(loadedUsers);
  } else {
    renderUsers([]);
  }

  renderGroupSelect();
  await onGroupChange(selectedGroup?.id || "");
  await initSimulateSection();

  if (visibleGroups.length === 0) {
    setStatus(isAdmin() ? "No groups found in database." : "No groups owned yet. Create one from the Events page.");
  } else {
    setStatus("Admin panel ready.", "success");
  }
}

groupSelect?.addEventListener("change", async (event) => {
  await onGroupChange(event.target.value);
});

groupForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedGroup) return;

  const submitBtn = groupForm.querySelector("button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  try {
    const updated = await updateGroup(selectedGroup.id, {
      name: groupNameInput.value.trim(),
      description: groupDescriptionInput.value.trim() || null,
    });

    visibleGroups = visibleGroups.map((group) =>
      group.id === updated.id ? { ...group, ...updated } : group
    );
    selectedGroup = { ...selectedGroup, ...updated };
    renderGroupSelect();
    groupSelect.value = selectedGroup.id;

    setStatus("Group settings updated.", "success");
  } catch (error) {
    setStatus(error.message || "Failed to update group.", "error");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
});

deleteGroupBtn?.addEventListener("click", async () => {
  if (!selectedGroup) return;
  if (typeof deleteGroup !== "function") {
    setStatus("Delete group is unavailable until the latest assets are loaded.", "error");
    return;
  }

  const confirmed = window.confirm(
    `Delete group "${selectedGroup.name}"? This removes all related events and participants.`
  );
  if (!confirmed) return;

  deleteGroupBtn.disabled = true;
  try {
    await deleteGroup(selectedGroup.id);

    visibleGroups = visibleGroups.filter((group) => group.id !== selectedGroup.id);
    selectedGroup = visibleGroups[0] || null;
    renderGroupSelect();
    await onGroupChange(selectedGroup?.id || "");

    setStatus("Group deleted.", "success");
  } catch (error) {
    setStatus(error.message || "Failed to delete group.", "error");
  } finally {
    deleteGroupBtn.disabled = false;
  }
});

init().catch((error) => {
  setStatus(error.message || "Unable to load admin panel.", "error");
});

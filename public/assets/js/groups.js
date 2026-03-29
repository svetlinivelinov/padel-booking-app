import { requireAuth } from "./auth.js";
import {
  createGroup,
  addGroupMember,
  joinGroupByToken,
  listMyGroups,
} from "./database.js";

const createForm = document.querySelector("#group-create-form");
const status = document.querySelector("#group-status");

// ── Safe status helper — works even if #group-status doesn't exist on the page
const setStatus = (msg) => { if (status) status.textContent = msg; };

// ── Invite link handler ───────────────────────────────────────────────────────
(async () => {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get("invite");
  const eventId = params.get("event");
  if (!invite) return;

  try {
    const user = await requireAuth();

    if (!user) {
      const inviteRedirect = eventId
        ? `/group.html?invite=${invite}&event=${encodeURIComponent(eventId)}`
        : `/group.html?invite=${invite}`;
      sessionStorage.setItem("postAuthRedirect", inviteRedirect);
      window.location.href = `/signup.html?redirect=${encodeURIComponent(inviteRedirect)}`;
      return;
    }

    setStatus("Joining group...");


    const group = await joinGroupByToken(invite, user.id);

    // Clean invite token from URL without reloading
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);

    // Check if already a member or freshly joined
    const groups = await listMyGroups(user.id);
    const alreadyMember = groups.find(g => g.id === group.id);

    if (alreadyMember) {
      setStatus("You are already a member of this group. Redirecting...");
    } else {
      setStatus("Joined group successfully! Redirecting...");
    }

    setTimeout(() => {
      const eventParam = eventId ? `&event=${encodeURIComponent(eventId)}` : "";
      window.location.href = `/event.html?group=${group.id}${eventParam}`;
    }, 800);

  } catch (err) {
    if (err.message?.includes("duplicate") || err.code === "23505") {
      setStatus("You are already a member of this group.");
      setTimeout(() => refreshGroups(), 1000);
    } else {
      setStatus("Invalid or expired invite link.");
    }
  }
})();

// ── Refresh group list ────────────────────────────────────────────────────────
export async function refreshGroups() {
  const user = await requireAuth();

  if (!user) {
    console.warn("Not authenticated, cannot load groups");
    const eventSelect = document.querySelector("#event-group");
    if (eventSelect) {
      eventSelect.innerHTML = `<option value="">Sign in to see groups</option>`;
    }
    return;
  }

  let groups = [];
  try {
    groups = await listMyGroups(user.id);
  } catch (err) {
    setStatus(err?.message || "Failed to load groups.");
    ["#group-select", "#event-group"].forEach((selector) => {
      const select = document.querySelector(selector);
      if (select) {
        select.innerHTML = `<option value="">Unable to load groups</option>`;
      }
    });
    return;
  }

  // ── Group select dropdowns ──
  // Prefer a `group` URL param when setting the selected option so
  // navigating from dashboard with `?group=...` keeps the selection.
  const params = new URLSearchParams(window.location.search);
  const requestedGroup = params.get("group");

  ["#group-select", "#event-group"].forEach((selector) => {
    const select = document.querySelector(selector);
    if (!select) return;

    select.innerHTML = "";

    if (groups.length === 0) {
      select.innerHTML = `<option value="">No groups found</option>`;
      return;
    }

    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);
    });

    // If a valid group id was requested via URL, use it; otherwise fall back to the first group
    if (requestedGroup && groups.find(g => g.id === requestedGroup)) {
      select.value = requestedGroup;
    } else {
      select.value = groups[0].id;
    }

    if (selector === "#event-group" && typeof window.refreshEvents === "function") {
      window.refreshEvents();
    }
  });
}

// ── Create group ──────────────────────────────────────────────────────────────
async function handleCreate(e) {
  e.preventDefault();
  const user = await requireAuth();
  if (!user) return;

  const btn = createForm.querySelector("button[type=submit]");
  btn.disabled = true;
  setStatus("Creating group...");

  try {
    const name = createForm.querySelector("#group-name").value.trim();
    const description = createForm.querySelector("#group-description").value.trim();

    if (!name) throw new Error("Group name is required");

    const group = await createGroup({ name, description });
    await addGroupMember(group.id, user.id, "owner");

    setStatus(`Group "${name}" created successfully.`);
    createForm.reset();
    await refreshGroups();
  } catch (err) {
    setStatus(err.message);
  } finally {
    btn.disabled = false;
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
createForm?.addEventListener("submit", handleCreate);

// ── Init ──────────────────────────────────────────────────────────────────────
refreshGroups();
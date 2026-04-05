import { requireAuth } from "./auth.js";
import {
  joinGroupByToken,
  listMyGroups,
} from "./database.js";

const inviteStatus = document.querySelector("#group-status");
const setStatus = (msg) => { if (inviteStatus) inviteStatus.textContent = msg; };

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

    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);
    });

    if (selector === "#event-group") {
      const newOpt = document.createElement("option");
      newOpt.value = "__new__";
      newOpt.textContent = "+ Create new group";
      select.appendChild(newOpt);
    }

    if (groups.length === 0) {
      if (selector === "#event-group") {
        // No existing groups — auto-open the inline create panel
        select.value = "__new__";
        select.dispatchEvent(new Event("change"));
      } else {
        select.innerHTML = `<option value="">No groups found</option>`;
      }
      return;
    }

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

// ── Init ──────────────────────────────────────────────────────────────────────
refreshGroups();
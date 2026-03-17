import { requireAuth } from "./auth.js";
import {
  createGroup,
  addGroupMember,
  joinGroupByToken,
  listMyGroups,
} from "./database.js";

const createForm = document.querySelector("#group-create-form");
const joinForm = document.querySelector("#group-join-form");
const list = document.querySelector("#group-list");
const status = document.querySelector("#group-status");

// ── Safe status helper — works even if #group-status doesn't exist on the page
const setStatus = (msg) => { if (status) status.textContent = msg; };

// ── Invite link handler ───────────────────────────────────────────────────────
(async () => {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get("invite");
  if (!invite) return;

  try {
    const user = await requireAuth();

    if (!user) {
      const inviteRedirect = `/group.html?invite=${invite}`;
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
      window.location.href = `/event.html?group=${group.id}`;
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
    if (list) {
      list.innerHTML = `<p class="text-danger">Could not load groups right now.</p>`;
    }
    ["#group-select", "#event-group"].forEach((selector) => {
      const select = document.querySelector(selector);
      if (select) {
        select.innerHTML = `<option value="">Unable to load groups</option>`;
      }
    });
    return;
  }

  // ── Group list display ──
  if (list) {
    list.innerHTML = "";

    if (groups.length === 0) {
      list.innerHTML = `<p class="text-muted">You have no groups yet. Create one or join via invite link.</p>`;
    }

    groups.forEach((group) => {
      const inviteUrl = `${window.location.origin}/group.html?invite=${group.invite_token}`;
      const isOwner = group.owner_id === user.id;

      const item = document.createElement("div");
      item.className = "list-card mb-2";
      item.innerHTML = `
        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
          <span class="fw-semibold">${group.name}</span>
          <div class="d-flex gap-2 flex-wrap">
            ${group.invite_token ? `
              <button class="btn btn-sm btn-outline-secondary" data-copy-link>
                Copy invite link
              </button>
              <button class="btn btn-sm btn-outline-secondary" data-copy-token>
                Copy token
              </button>
            ` : ""}
          </div>
        </div>
        ${group.invite_token ? `
          <div class="mt-1">
            <small class="text-muted">Token: <code>${group.invite_token}</code></small>
          </div>
        ` : ""}
      `;

      // Copy invite link
      item.querySelector("[data-copy-link]")?.addEventListener("click", async (e) => {
        await navigator.clipboard.writeText(inviteUrl);
        const btn = e.currentTarget;
        if (btn) {
          btn.textContent = "Copied!";
          setTimeout(() => {
            if (btn) btn.textContent = "Copy invite link";
          }, 1500);
        }
      });

      // Copy token
      item.querySelector("[data-copy-token]")?.addEventListener("click", async (e) => {
        await navigator.clipboard.writeText(group.invite_token);
        const btn = e.currentTarget;
        if (btn) {
          btn.textContent = "Copied!";
          setTimeout(() => {
            if (btn) btn.textContent = "Copy token";
          }, 1500);
        }
      });

      list.appendChild(item);
    });
  }

  // ── Group select dropdowns ──
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

    if (!select.value) select.value = groups[0].id;

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

// ── Join group by token ───────────────────────────────────────────────────────
async function handleJoin(e) {
  e.preventDefault();
  const user = await requireAuth();
  if (!user) return;

  const btn = joinForm.querySelector("button[type=submit]");
  btn.disabled = true;
  setStatus("Joining group...");

  try {
    const token = joinForm.querySelector("#group-token").value.trim();
    if (!token) throw new Error("Please enter an invite token");

    await joinGroupByToken(token, user.id);
    setStatus("Joined group successfully.");
    joinForm.reset();
    await refreshGroups();
  } catch (err) {
    if (err.message?.includes("duplicate") || err.code === "23505") {
      setStatus("You are already a member of this group.");
    } else {
      setStatus(err.message);
    }
  } finally {
    btn.disabled = false;
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
createForm?.addEventListener("submit", handleCreate);
joinForm?.addEventListener("submit", handleJoin);

// ── Init ──────────────────────────────────────────────────────────────────────
refreshGroups();
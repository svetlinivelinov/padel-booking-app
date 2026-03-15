import { requireAuth } from "./auth.js";
import { createGroup, addGroupMember, joinGroupByToken, listMyGroups, regenerateInviteToken } from "./database.js";

const createForm = document.querySelector("#group-create-form");
const joinForm = document.querySelector("#group-join-form");
const list = document.querySelector("#group-list");
const status = document.querySelector("#group-status");

export async function refreshGroups() {
  const user = await requireAuth();
  if (!user) {
    console.warn("Not authenticated, cannot load groups");
    const eventSelect = document.querySelector("#event-group");
    if (eventSelect) {
      eventSelect.innerHTML = "<option value=\"\">Sign in to see groups</option>";
    }
    return;
  }

  const groups = await listMyGroups(user.id);
  if (list) {
    list.innerHTML = "";
    groups.forEach((group) => {
      const item = document.createElement("div");
      item.className = "list-card mb-2";
      let html = `<div class='d-flex justify-content-between align-items-center'>
        <span class='fw-semibold'>${group.name}</span>`;
      if (group.invite_token) {
        const inviteUrl = `${window.location.origin}/group.html?invite=${group.invite_token}`;
        html += `<span class='ms-2 small'>Token: <code>${group.invite_token}</code></span>`;
        html += `<button class='btn btn-sm btn-outline-secondary ms-2' data-copy-link>Copy invite link</button>`;
        html += `<button class='btn btn-sm btn-outline-secondary ms-2' data-copy-token>Copy token</button>`;
        if (group.owner_id === user.id) {
          html += `<button class='btn btn-sm btn-outline-warning ms-2' data-regenerate>Regenerate token</button>`;
        }
      }
      html += `</div>`;
      item.innerHTML = html;
      // Copy invite link
      const linkBtn = item.querySelector('[data-copy-link]');
      if (linkBtn && group.invite_token) {
        linkBtn.onclick = () => {
          const url = `${window.location.origin}/group.html?invite=${group.invite_token}`;
          navigator.clipboard.writeText(url);
          linkBtn.textContent = "Copied!";
          setTimeout(() => (linkBtn.textContent = "Copy invite link"), 1200);
        };
      }
      // Copy token
      const tokenBtn = item.querySelector('[data-copy-token]');
      if (tokenBtn && group.invite_token) {
        tokenBtn.onclick = () => {
          navigator.clipboard.writeText(group.invite_token);
          tokenBtn.textContent = "Copied!";
          setTimeout(() => (tokenBtn.textContent = "Copy token"), 1200);
        };
      }
      // Regenerate token (owner only)
      const regenBtn = item.querySelector('[data-regenerate]');
      if (regenBtn) {
        regenBtn.onclick = async () => {
          regenBtn.disabled = true;
          regenBtn.textContent = "Regenerating...";
          try {
            await regenerateInviteToken(group.id);
            await refreshGroups();
          } catch (err) {
            alert("Failed to regenerate token: " + err.message);
          }
        };
      }
      list.appendChild(item);
    });
// Improved: Auto-join group if invite token is in URL, then redirect to events page with group pre-selected
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get("invite");
  if (invite) {
    try {
      const user = await requireAuth();
      const group = await joinGroupByToken(invite, user.id);
      // Wait for membership to be established, then fetch groups
      setTimeout(async () => {
        const groups = await listMyGroups(user.id);
        const joined = groups.find(g => g.id === group.id);
        if (joined) {
          window.location.href = `/event.html?group=${group.id}`;
        } else {
          status.textContent = "Joined, but could not find group in your list. Try refreshing.";
        }
      }, 500);
    } catch (err) {
      if (status) status.textContent = err.message;
    }
  }
});
  }

  const select = document.querySelector("#group-select");
  if (select) {
    select.innerHTML = "";
    groups.forEach((group) => {
      const option = document.createElement("option");
      option.value = group.id;
      option.textContent = group.name;
      select.appendChild(option);
    });
  }

  const eventSelect = document.querySelector("#event-group");
  if (eventSelect) {
    eventSelect.innerHTML = "";
    if (groups.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No groups found";
      eventSelect.appendChild(option);
    } else {
      groups.forEach((group, idx) => {
        const option = document.createElement("option");
        option.value = group.id;
        option.textContent = group.name;
        eventSelect.appendChild(option);
      });
      // Auto-select first group if none selected
      if (!eventSelect.value) {
        eventSelect.value = groups[0].id;
      }
      // Trigger event list refresh
      if (typeof window.refreshEvents === "function") {
        window.refreshEvents();
      }
    }
  }
}

async function handleCreate(event) {
  event.preventDefault();
  const user = await requireAuth();
  if (!user) {
    return;
  }

  status.textContent = "Creating group...";
  try {
    const name = createForm.querySelector("#group-name").value.trim();
    const description = createForm.querySelector("#group-description").value.trim();
    const group = await createGroup({ name, description });
    await addGroupMember(group.id, user.id, "owner");
    status.textContent = `Group created. Invite token: ${group.invite_token}`;
    await refreshGroups();
  } catch (error) {
    status.textContent = error.message;
  }
}

async function handleJoin(event) {
  event.preventDefault();
  const user = await requireAuth();
  if (!user) {
    return;
  }

  status.textContent = "Joining group...";
  try {
    const token = joinForm.querySelector("#group-token").value.trim();
    await joinGroupByToken(token, user.id);
    status.textContent = "Joined group";
    await refreshGroups();
  } catch (error) {
    status.textContent = error.message;
  }
}

if (createForm) {
  createForm.addEventListener("submit", handleCreate);
}

if (joinForm) {
  joinForm.addEventListener("submit", handleJoin);
}

refreshGroups();


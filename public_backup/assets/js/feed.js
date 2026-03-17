import { requireAuth } from "./auth.js";
import { listMyGroups, listGroupEvents } from "./database.js";

const select = document.querySelector("#group-select");
const list = document.querySelector("#event-feed");

async function loadGroups() {
  const user = await requireAuth();
  if (!user || !select) {
    return;
  }

  const groups = await listMyGroups(user.id);
  select.innerHTML = "";
  groups.forEach((group) => {
    const option = document.createElement("option");
    option.value = group.id;
    option.textContent = group.name;
    select.appendChild(option);
  });

  if (groups.length) {
    await loadEvents(groups[0].id);
  }
}

async function loadEvents(groupId) {
  if (!list) {
    return;
  }

  const events = await listGroupEvents(groupId);
  list.innerHTML = "";
  events.forEach((event) => {
    const card = document.createElement("div");
    card.className = "list-card mb-2";
    card.innerHTML = `<div class="fw-semibold">${event.description || "Event"}</div>
      <div>${new Date(event.date_time).toLocaleString()}</div>
      <div>Max: ${event.max_participants}</div>`;
    list.appendChild(card);
  });
}

if (select) {
  select.addEventListener("change", (event) => loadEvents(event.target.value));
}

loadGroups();


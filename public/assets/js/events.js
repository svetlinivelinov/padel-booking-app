import { requireAuth } from "./auth.js";
import { createEvent, listGroupEvents, joinEvent, getEvent, updateEvent } from "./database.js";

const form = document.querySelector("#event-create-form");
const list = document.querySelector("#event-list");
const status = document.querySelector("#event-status");
const groupSelect = document.querySelector("#event-group");

// Auto-select group from URL if present
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const groupId = params.get("group");
  if (groupId && groupSelect) {
    groupSelect.value = groupId;
    refreshEvents();
  }
});

let editingEventId = null;
// Expose refreshEvents globally for group auto-select
window.refreshEvents = refreshEvents;

async function refreshEvents() {
  if (!list || !groupSelect || !groupSelect.value) {
    return;
  }

  const events = await listGroupEvents(groupSelect.value);
  list.innerHTML = "";
  events.forEach((event) => {
    const item = document.createElement("div");
    item.className = "list-card mb-2";
    // Parse as local time if possible
    let displayDate = event.date_time;
    if (displayDate && displayDate.length === 16 && displayDate.includes('T')) {
      // 'YYYY-MM-DDTHH:mm' format from input
      const [datePart, timePart] = displayDate.split('T');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      const localDate = new Date(year, month - 1, day, hour, minute);
      displayDate = localDate.toLocaleString();
    } else if (displayDate) {
      displayDate = new Date(displayDate).toLocaleString();
    }
    item.innerHTML = `<div class=\"fw-semibold\">${event.description || "Event"}</div>
      <div>${displayDate}</div>
      <button class=\"btn btn-sm btn-sun mt-2\" data-id=\"${event.id}\">Join</button>
      <button class=\"btn btn-sm btn-outline-secondary mt-2 ms-2\" data-edit-id=\"${event.id}\">Edit</button>`;
    list.appendChild(item);
  });

  list.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      status.textContent = "Joining...";
      try {
        const slotType = document.querySelector("#event-slot-type")?.value || "individual";
        const partnerName = document.querySelector("#event-partner-name")?.value || "";
        const result = await joinEvent(btn.dataset.id, slotType, partnerName);
        status.textContent = `Joined as ${result}`;
      } catch (error) {
        status.textContent = error.message;
      }
    });
  });

  list.querySelectorAll("button[data-edit-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const eventId = btn.getAttribute("data-edit-id");
      const eventData = await getEvent(eventId);
      if (eventData) {
        editingEventId = eventId;
        // Populate form fields
        groupSelect.value = eventData.group_id;
        form.querySelector("#event-date").value = eventData.date_time.slice(0, 16); // assumes ISO string
        form.querySelector("#event-max").value = eventData.max_participants;
        form.querySelector("#event-desc").value = eventData.description;
        form.querySelector("#event-type").value = eventData.type;
        status.textContent = "Editing event...";
        form.querySelector("button[type='submit']").textContent = "Update event";
      }
    });
  });
}

async function handleCreate(event) {
  event.preventDefault();
  const user = await requireAuth();
  if (!user) {
    return;
  }

  // Save the datetime-local value as-is (local time, no timezone conversion)
  let dateValue = form.querySelector("#event-date").value;
  // Patch: Remove created_by from update, and ensure date_time has seconds
  let updatePayload = {
    group_id: groupSelect.value,
    date_time: dateValue,
    max_participants: Number(form.querySelector("#event-max").value),
    description: form.querySelector("#event-desc").value.trim(),
    type: form.querySelector("#event-type").value
  };
  // If date_time is in 'YYYY-MM-DDTHH:mm', add ':00' for seconds
  if (updatePayload.date_time && updatePayload.date_time.length === 16) {
    updatePayload.date_time += ':00';
  }
  const payload = {
    group_id: groupSelect.value,
    created_by: user.id,
    date_time: dateValue,
    max_participants: Number(form.querySelector("#event-max").value),
    description: form.querySelector("#event-desc").value.trim(),
    type: form.querySelector("#event-type").value
  };

  try {
    if (editingEventId) {
      console.log("Updating event", editingEventId, updatePayload);
      const updated = await updateEvent(editingEventId, updatePayload);
      console.log("Update result", updated);
      status.textContent = "Event updated";
      editingEventId = null;
      form.querySelector("button[type='submit']").textContent = "Create event";
    } else {
      await createEvent(payload);
      status.textContent = "Event created";
    }
    form.reset();
    refreshEvents();
  } catch (error) {
    console.error("Event update/create error", error);
    status.textContent = error.message;
  }
}

if (form) {
  form.addEventListener("submit", handleCreate);
}

if (groupSelect) {
  groupSelect.addEventListener("change", refreshEvents);
}

refreshEvents();


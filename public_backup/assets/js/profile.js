import { requireAuth } from "./auth.js";
import { getProfile, upsertProfile } from "./database.js";

const form = document.querySelector("#profile-form");
const status = document.querySelector("#profile-status");

async function loadProfile() {
  const user = await requireAuth();
  if (!user) {
    return;
  }

  const { data } = await getProfile(user.id);
  if (!data) {
    return;
  }

  form.querySelector("#profile-display").value = data.display_name || "";
  form.querySelector("#profile-username").value = data.username || "";
  form.querySelector("#profile-bio").value = data.bio || "";
  form.querySelector("#profile-location").value = data.location || "";
  form.querySelector("#profile-skill").value = data.skill_level || "";
}

async function saveProfile(event) {
  event.preventDefault();
  const user = await requireAuth();
  if (!user) {
    return;
  }

  const payload = {
    id: user.id,
    display_name: form.querySelector("#profile-display").value.trim(),
    username: form.querySelector("#profile-username").value.trim(),
    bio: form.querySelector("#profile-bio").value.trim(),
    location: form.querySelector("#profile-location").value.trim(),
    skill_level: form.querySelector("#profile-skill").value.trim()
  };

  status.textContent = "Saving...";
  try {
    await upsertProfile(payload);
    status.textContent = "Profile saved";
  } catch (error) {
    status.textContent = error.message;
  }
}

if (form) {
  form.addEventListener("submit", saveProfile);
  loadProfile();
}


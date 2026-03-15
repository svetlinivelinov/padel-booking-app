import { signIn, signUp } from "./auth.js";

const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");

async function handleLogin(event) {
  event.preventDefault();
  const email = loginForm.querySelector("#login-email").value.trim();
  const password = loginForm.querySelector("#login-password").value;
  const status = document.querySelector("#login-status");

  status.textContent = "Signing in...";
  try {
    await signIn(email, password);
    window.location.href = "/dashboard.html";
  } catch (error) {
    status.textContent = error.message;
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const email = signupForm.querySelector("#signup-email").value.trim();
  const password = signupForm.querySelector("#signup-password").value;
  const displayName = signupForm.querySelector("#signup-display").value.trim();
  const username = signupForm.querySelector("#signup-username").value.trim();
  const status = document.querySelector("#signup-status");

  status.textContent = "Creating account...";
  try {
    await signUp({
      email,
      password,
      profile: { display_name: displayName, username }
    });
    status.textContent = "Check your email to confirm, then sign in.";
  } catch (error) {
    status.textContent = error.message;
  }
}

if (loginForm) {
  loginForm.addEventListener("submit", handleLogin);
}

if (signupForm) {
  signupForm.addEventListener("submit", handleSignup);
}


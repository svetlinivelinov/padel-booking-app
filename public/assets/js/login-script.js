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
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    window.location.href = redirect ? decodeURIComponent(redirect) : "/dashboard.html";
  } catch (error) {
    status.textContent = error.message;
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const email = signupForm.querySelector("#signup-email").value.trim();
  const password = signupForm.querySelector("#signup-password").value;
  const confirmPassword = signupForm.querySelector("#signup-password-confirm").value;
  const displayName = signupForm.querySelector("#signup-display").value.trim();
  const username = signupForm.querySelector("#signup-username").value.trim();
  const status = document.querySelector("#signup-status");

  const strongEnough = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password);
  if (password !== confirmPassword) {
    status.textContent = "Passwords do not match.";
    return;
  }
  if (!strongEnough) {
    status.textContent = "Use at least 8 chars with uppercase, lowercase, and a number.";
    return;
  }

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


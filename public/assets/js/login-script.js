import { signIn, signUp } from "./auth.js";

const loginForm = document.querySelector("#login-form");
const signupForm = document.querySelector("#signup-form");
const params = new URLSearchParams(window.location.search);
const redirect = params.get("redirect");

function toSafeRedirectPath(rawRedirect) {
  if (!rawRedirect) return "";

  let decoded = rawRedirect;
  try {
    decoded = decodeURIComponent(rawRedirect);
  } catch {
    decoded = rawRedirect;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return "";
  }

  return decoded;
}

const queryRedirectPath = toSafeRedirectPath(redirect);
const storedRedirectPath = toSafeRedirectPath(sessionStorage.getItem("postAuthRedirect") || "");
const redirectPath = queryRedirectPath || storedRedirectPath;

if (queryRedirectPath) {
  sessionStorage.setItem("postAuthRedirect", queryRedirectPath);
}

function withRedirect(path) {
  if (!redirectPath) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}redirect=${encodeURIComponent(redirectPath)}`;
}

function hydrateAuthLinks() {
  document.querySelectorAll('a[href="/signup.html"]').forEach((link) => {
    link.setAttribute("href", withRedirect("/signup.html"));
  });

  document.querySelectorAll('a[href="/login.html"]').forEach((link) => {
    link.setAttribute("href", withRedirect("/login.html"));
  });
}

hydrateAuthLinks();

async function handleLogin(event) {
  event.preventDefault();
  const email = loginForm.querySelector("#login-email").value.trim();
  const password = loginForm.querySelector("#login-password").value;
  const status = document.querySelector("#login-status");

  status.textContent = "Signing in...";
  try {
    await signIn(email, password);
    if (redirectPath) {
      sessionStorage.removeItem("postAuthRedirect");
    }
    window.location.href = redirectPath || "/dashboard.html";
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
    const loginPath = redirectPath
      ? `/login.html?redirect=${encodeURIComponent(redirectPath)}`
      : "/login.html";

    const signUpResult = await signUp({
      email,
      password,
      profile: { display_name: displayName, username },
      emailRedirectTo: `${window.location.origin}${loginPath}`
    });

    if (signUpResult?.session) {
      if (redirectPath) {
        sessionStorage.removeItem("postAuthRedirect");
      }
      window.location.href = redirectPath || "/dashboard.html";
      return;
    }

    status.textContent = "Check your email to confirm, then sign in. Your invite link will be kept.";
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


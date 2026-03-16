import { supabase } from "./config.js";

export async function signUp({ email, password, profile }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: profile?.display_name || "",
        username: profile?.username || ""
      }
    }
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}



export async function requireAuth() {
  // Wait for Supabase to restore session from localStorage
  return new Promise((resolve) => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        resolve(session.user);
      } else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        // No session after initial check — redirect
        if (!session) {
          const currentUrl = encodeURIComponent(
            window.location.pathname + window.location.search
          );
          window.location.href = `/login.html?redirect=${currentUrl}`;
          resolve(null);
        }
      }
    });
  });
}

export async function getUserRole(userId) {
  const { data, error } = await supabase.rpc("get_user_role", {
    p_user_id: userId
  });

  if (error) {
    return "player";
  }

  return data || "player";
}


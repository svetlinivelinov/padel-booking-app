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

export async function requireAuth(redirectTo = "/login.html") {
  const user = await getUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }

  return user;
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


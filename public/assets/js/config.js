import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = (window.SUPABASE_URL || "").trim();
const anonKey = (window.SUPABASE_ANON_KEY || "").trim();

if (!url || !anonKey) {
  throw new Error("Supabase configuration missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url, anonKey);
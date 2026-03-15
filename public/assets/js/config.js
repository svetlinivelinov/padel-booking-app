import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = window.SUPABASE_URL || "https://YOUR_PROJECT.supabase.co";
const anonKey = window.SUPABASE_ANON_KEY || "YOUR_ANON_KEY";

export const supabase = createClient(url, anonKey);


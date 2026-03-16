import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = "https://dpcftvjuqslqbmbfhgop.supabase.co";
const anonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwY2Z0dmp1cXNscWJtYmZoZ29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODkwOTQsImV4cCI6MjA4OTE2NTA5NH0.P70_qMTPIbz5WJmwZ9NBLmw9dHYUtlqmhxy38btgpDY";

export const supabase = createClient(url, anonKey);
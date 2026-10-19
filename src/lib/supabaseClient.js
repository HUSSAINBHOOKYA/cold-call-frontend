import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

console.log("Supabase URL:", supabaseUrl);
console.log(
  "Publishable key loaded correctly:",
  supabaseKey?.startsWith("sb_publishable_")
);

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Check your .env file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase public environment variables");
}

// Single shared client for the browser using anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: true },
  db: { schema: 'development' }, // your tables live in the 'development' schema
});

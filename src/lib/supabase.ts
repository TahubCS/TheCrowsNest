import { createClient } from "@supabase/supabase-js";

// Server-side Supabase client — uses service role key to bypass RLS.
// Only import this in server components / API routes, never in client code.
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const STORAGE_BUCKET = "thecrowsnest";

import { createBrowserClient } from "@supabase/ssr";

// IMPORTANT: Next.js inlines NEXT_PUBLIC_* via static string replacement at build time.
// You MUST use the full literal — process.env[variable] will NOT be replaced.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

import { createBrowserClient } from "@supabase/ssr";

function getEnvVar(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return val;
}

const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY");

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

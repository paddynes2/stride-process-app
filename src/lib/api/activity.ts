import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityAction } from "@/types/database";

interface LogActivityParams {
  supabase: SupabaseClient;
  workspace_id: string;
  user_id: string;
  action: ActivityAction;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  details?: Record<string, unknown>;
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  const { supabase, details, ...entry } = params;
  const { error } = await supabase
    .from("activity_log")
    .insert({ ...entry, details: details ?? null });

  if (error) {
    console.error("[logActivity] Failed to log activity:", error.message, entry);
  }
}

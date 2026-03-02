import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { team_id, name, hourly_rate } = body;

  if (!team_id) {
    return errorResponse("validation", "team_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    team_id,
    name: name?.trim() || "New Role",
  };

  if (hourly_rate !== undefined) insert.hourly_rate = hourly_rate;

  const { data: role, error } = await supabase
    .from("roles")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  void (async () => {
    const { data: team } = await supabase.from("teams").select("workspace_id").eq("id", role.team_id).single();
    if (team?.workspace_id) {
      await logActivity({ supabase, workspace_id: team.workspace_id, user_id: user.id, action: "created", entity_type: "roles", entity_id: role.id, entity_name: role.name });
    }
  })();

  return successResponse(role, 201);
}

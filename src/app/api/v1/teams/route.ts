import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const { data: teams, error } = await supabase
    .from("teams")
    .select("*, roles(*, people(*))")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(teams);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, name } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const { data: team, error } = await supabase
    .from("teams")
    .insert({
      workspace_id,
      name: name?.trim() || "New Team",
    })
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  void logActivity({ supabase, workspace_id: team.workspace_id, user_id: user.id, action: "created", entity_type: "teams", entity_id: team.id, entity_name: team.name });

  return successResponse(team, 201);
}

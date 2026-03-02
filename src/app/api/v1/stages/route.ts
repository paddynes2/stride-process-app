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
  const { workspace_id, tab_id, name, position_x, position_y } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!tab_id) {
    return errorResponse("validation", "tab_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    workspace_id,
    tab_id,
    name: name?.trim() || "New Stage",
    position_x: position_x ?? 0,
    position_y: position_y ?? 0,
  };

  if (body.description !== undefined) insert.description = body.description;
  if (body.channel !== undefined) insert.channel = body.channel;
  if (body.owner !== undefined) insert.owner = body.owner;
  if (body.width !== undefined) insert.width = body.width;
  if (body.height !== undefined) insert.height = body.height;

  const { data: stage, error } = await supabase
    .from("stages")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  logActivity({
    supabase,
    workspace_id,
    user_id: user.id,
    action: "created",
    entity_type: "stages",
    entity_id: stage.id,
    entity_name: stage.name,
  });

  return successResponse(stage, 201);
}

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

  const { data: toolSections, error } = await supabase
    .from("tool_sections")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(toolSections);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, name, position_x, position_y } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    workspace_id,
    name: name?.trim() || "New Tool Section",
    position_x: position_x ?? 0,
    position_y: position_y ?? 0,
  };

  if (body.description !== undefined) insert.description = body.description;
  if (body.width !== undefined) insert.width = body.width;
  if (body.height !== undefined) insert.height = body.height;

  const { data: toolSection, error } = await supabase
    .from("tool_sections")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  void logActivity({
    supabase,
    workspace_id,
    user_id: user.id,
    action: "created",
    entity_type: "tool_sections",
    entity_id: toolSection.id,
    entity_name: toolSection.name,
  });

  return successResponse(toolSection, 201);
}

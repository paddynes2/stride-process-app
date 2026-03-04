import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const EDITABLE_FIELDS = [
  "name",
  "description",
  "position_x",
  "position_y",
  "width",
  "height",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("validation", "No valid fields to update", 400);
  }

  const { data: toolSection, error } = await supabase
    .from("tool_sections")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("update_failed", error.message, 500);
  }

  void logActivity({
    supabase,
    workspace_id: toolSection.workspace_id,
    user_id: user.id,
    action: "updated",
    entity_type: "tool_sections",
    entity_id: toolSection.id,
    entity_name: toolSection.name,
    details: { changed_fields: Object.keys(updates) },
  });

  return successResponse(toolSection);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const { data: toolSection, error } = await supabase
    .from("tool_sections")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Tool section not found", 404);
    }
    return errorResponse("delete_failed", error.message, 500);
  }

  void logActivity({
    supabase,
    workspace_id: toolSection?.workspace_id,
    user_id: user.id,
    action: "deleted",
    entity_type: "tool_sections",
    entity_id: id,
    entity_name: toolSection?.name ?? "Tool Section",
  });

  return successResponse({ deleted: true });
}

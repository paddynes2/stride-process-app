import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/i;
const EDITABLE_FIELDS = ["name", "color", "icon"] as const;

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

  if (body.color !== undefined && !HEX_COLOR_REGEX.test(body.color)) {
    return errorResponse("validation", "Invalid color format. Must be a hex color like #14B8A6", 400);
  }

  const { data: perspective, error } = await supabase
    .from("perspectives")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Perspective not found or not accessible", 404);
    }
    return errorResponse("update_failed", error.message, 500);
  }

  void logActivity({ supabase, workspace_id: perspective.workspace_id, user_id: user.id, action: "updated", entity_type: "perspectives", entity_id: perspective.id, entity_name: perspective.name, details: { changed_fields: Object.keys(updates) } });

  return successResponse(perspective);
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

  const { data: perspective, error } = await supabase
    .from("perspectives")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Perspective not found or not accessible", 404);
    }
    return errorResponse("delete_failed", error.message, 500);
  }

  if (perspective) {
    void logActivity({ supabase, workspace_id: perspective.workspace_id, user_id: user.id, action: "deleted", entity_type: "perspectives", entity_id: id, entity_name: perspective.name });
  }

  return successResponse({ deleted: true });
}

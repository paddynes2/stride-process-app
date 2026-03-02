import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const EDITABLE_FIELDS = ["content", "category", "is_resolved"] as const;

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

  const { data: comment, error } = await supabase
    .from("comments")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Comment not found or not accessible", 404);
    }
    return errorResponse("update_failed", error.message, 500);
  }

  if (!comment) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  void logActivity({ supabase, workspace_id: comment.workspace_id, user_id: user.id, action: "updated", entity_type: "comments", entity_id: comment.id, entity_name: comment.content.slice(0, 60), details: { changed_fields: Object.keys(updates) } });

  return successResponse(comment);
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

  const { data: comment, error } = await supabase
    .from("comments")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Comment not found or not accessible", 404);
    }
    return errorResponse("delete_failed", error.message, 500);
  }

  if (comment) {
    void logActivity({ supabase, workspace_id: comment.workspace_id, user_id: user.id, action: "deleted", entity_type: "comments", entity_id: id, entity_name: comment.content.slice(0, 60) });
  }

  return successResponse({ deleted: true });
}

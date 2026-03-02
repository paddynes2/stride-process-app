import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const EDITABLE_FIELDS = ["title", "description", "status", "priority", "linked_step_id", "linked_touchpoint_id", "linked_section_id"] as const;
const VALID_STATUSES = ["proposed", "approved", "in_progress", "completed", "rejected"] as const;
const VALID_PRIORITIES = ["low", "medium", "high", "critical"] as const;
type ValidStatus = typeof VALID_STATUSES[number];
type ValidPriority = typeof VALID_PRIORITIES[number];

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

  if (updates.title !== undefined) {
    if (typeof updates.title !== "string" || (updates.title as string).trim() === "") {
      return errorResponse("validation", "title must be a non-empty string", 400);
    }
    updates.title = (updates.title as string).trim();
  }

  if (
    updates.status !== undefined &&
    !VALID_STATUSES.includes(updates.status as ValidStatus)
  ) {
    return errorResponse("validation", `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, 400);
  }

  if (
    updates.priority !== undefined &&
    !VALID_PRIORITIES.includes(updates.priority as ValidPriority)
  ) {
    return errorResponse("validation", `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`, 400);
  }

  const { data: idea, error } = await supabase
    .from("improvement_ideas")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Improvement idea not found or not accessible", 404);
    }
    return errorResponse("update_failed", error.message, 500);
  }

  if (!idea) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  void logActivity({ supabase, workspace_id: idea.workspace_id, user_id: user.id, action: "updated", entity_type: "improvement_ideas", entity_id: idea.id, entity_name: idea.title, details: { changed_fields: Object.keys(updates) } });

  return successResponse(idea);
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

  const { data: idea, error } = await supabase
    .from("improvement_ideas")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Improvement idea not found or not accessible", 404);
    }
    return errorResponse("delete_failed", error.message, 500);
  }

  if (idea) {
    void logActivity({ supabase, workspace_id: idea.workspace_id, user_id: user.id, action: "deleted", entity_type: "improvement_ideas", entity_id: id, entity_name: idea.title });
  }

  return successResponse({ deleted: true });
}

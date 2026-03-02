import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const { data: runbook, error } = await supabase
    .from("runbooks")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Runbook not found or not accessible", 404);
    }
    return errorResponse("fetch_failed", error.message, 500);
  }

  if (!runbook) {
    return errorResponse("not_found", "Runbook not found or not accessible", 404);
  }

  return successResponse(runbook);
}

const EDITABLE_FIELDS = ["name", "status", "completed_at"] as const;

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

  const { data: runbook, error } = await supabase
    .from("runbooks")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Runbook not found or not accessible", 404);
    }
    return errorResponse("update_failed", error.message, 500);
  }

  if (!runbook) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  const action = updates.status === "completed" ? "completed" : "updated";
  void logActivity({ supabase, workspace_id: runbook.workspace_id, user_id: user.id, action, entity_type: "runbooks", entity_id: runbook.id, entity_name: runbook.name, details: { changed_fields: Object.keys(updates) } });

  return successResponse(runbook);
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

  const { data: runbook, error } = await supabase
    .from("runbooks")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Runbook not found or not accessible", 404);
    }
    return errorResponse("delete_failed", error.message, 500);
  }

  if (runbook) {
    void logActivity({ supabase, workspace_id: runbook.workspace_id, user_id: user.id, action: "deleted", entity_type: "runbooks", entity_id: id, entity_name: runbook.name });
  }

  return successResponse({ deleted: true });
}

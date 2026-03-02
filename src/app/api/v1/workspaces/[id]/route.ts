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

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("*, tabs(*)")
    .eq("id", id)
    .single();

  if (error) {
    return errorResponse("not_found", "Workspace not found", 404);
  }

  return successResponse(workspace);
}

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

  if (body.name !== undefined) updates.name = body.name;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  if (Object.keys(updates).length === 0) {
    return errorResponse("validation", "No valid fields to update", 400);
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("update_failed", error.message, 500);
  }

  void logActivity({
    supabase,
    workspace_id: workspace.id,
    user_id: user.id,
    action: "updated",
    entity_type: "workspaces",
    entity_id: workspace.id,
    entity_name: workspace.name,
    details: { changed_fields: Object.keys(updates) },
  });

  return successResponse(workspace);
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

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("delete_failed", error.message, 500);
  }

  void logActivity({
    supabase,
    workspace_id: id,
    user_id: user.id,
    action: "deleted",
    entity_type: "workspaces",
    entity_id: id,
    entity_name: workspace?.name ?? "Workspace",
  });

  return successResponse({ deleted: true });
}

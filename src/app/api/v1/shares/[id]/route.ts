import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const EDITABLE_FIELDS = ["is_active"] as const;

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

  const { data: share, error } = await supabase
    .from("public_shares")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("update_failed", error.message, 500);
  }

  logActivity({
    supabase,
    workspace_id: share.workspace_id,
    user_id: user.id,
    action: "updated",
    entity_type: "public_shares",
    entity_id: share.id,
    entity_name: "Shared Link",
    details: { changed_fields: Object.keys(updates) },
  });

  return successResponse(share);
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

  const { data: share, error } = await supabase
    .from("public_shares")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("delete_failed", error.message, 500);
  }

  logActivity({
    supabase,
    workspace_id: share?.workspace_id,
    user_id: user.id,
    action: "deleted",
    entity_type: "public_shares",
    entity_id: id,
    entity_name: "Shared Link",
  });

  return successResponse({ deleted: true });
}

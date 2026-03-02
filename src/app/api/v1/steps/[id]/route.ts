import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const EDITABLE_FIELDS = [
  "name",
  "position_x",
  "position_y",
  "section_id",
  "status",
  "step_type",
  "executor",
  "notes",
  "video_url",
  "attributes",
  "time_minutes",
  "frequency_per_month",
  "maturity_score",
  "target_maturity",
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

  const { data: step, error } = await supabase
    .from("steps")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("update_failed", error.message, 500);
  }

  logActivity({
    supabase,
    workspace_id: step.workspace_id,
    user_id: user.id,
    action: "updated",
    entity_type: "steps",
    entity_id: step.id,
    entity_name: step.name,
    details: { changed_fields: Object.keys(updates) },
  });

  return successResponse(step);
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

  const { data: step, error } = await supabase
    .from("steps")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("delete_failed", error.message, 500);
  }

  logActivity({
    supabase,
    workspace_id: step?.workspace_id,
    user_id: user.id,
    action: "deleted",
    entity_type: "steps",
    entity_id: id,
    entity_name: step?.name ?? "Step",
  });

  return successResponse({ deleted: true });
}

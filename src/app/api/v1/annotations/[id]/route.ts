import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const EDITABLE_FIELDS = ["content", "rating"] as const;

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

  if (updates.rating !== undefined && (typeof updates.rating !== "number" || (updates.rating as number) < 1 || (updates.rating as number) > 5)) {
    return errorResponse("validation", "Rating must be an integer between 1 and 5", 400);
  }

  const { data: annotation, error } = await supabase
    .from("perspective_annotations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Annotation not found or not accessible", 404);
    }
    return errorResponse("update_failed", error.message, 500);
  }

  void (async () => {
    const { data: perspective } = await supabase.from("perspectives").select("workspace_id").eq("id", annotation.perspective_id).single();
    if (perspective?.workspace_id) {
      await logActivity({ supabase, workspace_id: perspective.workspace_id, user_id: user.id, action: "updated", entity_type: "perspective_annotations", entity_id: annotation.id, entity_name: `${annotation.annotatable_type} annotation`, details: { changed_fields: Object.keys(updates) } });
    }
  })();

  return successResponse(annotation);
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

  const { data: annotation, error } = await supabase
    .from("perspective_annotations")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Annotation not found or not accessible", 404);
    }
    return errorResponse("delete_failed", error.message, 500);
  }

  if (annotation) {
    void (async () => {
      const { data: perspective } = await supabase.from("perspectives").select("workspace_id").eq("id", annotation.perspective_id).single();
      if (perspective?.workspace_id) {
        await logActivity({ supabase, workspace_id: perspective.workspace_id, user_id: user.id, action: "deleted", entity_type: "perspective_annotations", entity_id: id, entity_name: `${annotation.annotatable_type} annotation` });
      }
    })();
  }

  return successResponse({ deleted: true });
}

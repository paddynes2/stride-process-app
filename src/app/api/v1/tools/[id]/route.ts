import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const EDITABLE_FIELDS = ["name", "description", "category", "vendor", "url", "logo_url", "cost_per_month", "position_x", "position_y", "status"] as const;
const VALID_STATUSES = ["active", "considering", "cancelled"] as const;

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
      if (field === "cost_per_month" || field === "position_x" || field === "position_y") {
        updates[field] = body[field] != null ? Number(body[field]) : null;
      } else if (field === "status") {
        if (!VALID_STATUSES.includes(body[field])) {
          return errorResponse("validation", `status must be one of: ${VALID_STATUSES.join(", ")}`, 400);
        }
        updates[field] = body[field];
      } else {
        updates[field] = typeof body[field] === "string" ? body[field].trim() || null : body[field];
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("validation", "No valid fields to update", 400);
  }

  const { data: tool, error } = await supabase
    .from("tools")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("update_failed", error.message, 500);
  }

  void logActivity({ supabase, workspace_id: tool.workspace_id, user_id: user.id, action: "updated", entity_type: "tools", entity_id: tool.id, entity_name: tool.name, details: { changed_fields: Object.keys(updates) } });

  return successResponse(tool);
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

  const { data: tool, error } = await supabase
    .from("tools")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("delete_failed", error.message, 500);
  }

  if (tool) {
    void logActivity({ supabase, workspace_id: tool.workspace_id, user_id: user.id, action: "deleted", entity_type: "tools", entity_id: id, entity_name: tool.name });
  }

  return successResponse({ deleted: true });
}

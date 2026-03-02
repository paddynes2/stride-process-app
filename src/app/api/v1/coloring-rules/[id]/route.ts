import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";
const EDITABLE_FIELDS = ["name", "color", "criteria_type", "criteria_value", "is_active", "position"] as const;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/i;
const VALID_CRITERIA_TYPES = ["status", "executor", "step_type", "has_role", "maturity_below", "maturity_above"] as const;
type ValidCriteriaType = typeof VALID_CRITERIA_TYPES[number];

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

  if (updates.color !== undefined && !HEX_COLOR_REGEX.test(updates.color as string)) {
    return errorResponse("validation", "Invalid color format. Must be a hex color like #14B8A6", 400);
  }

  if (
    updates.criteria_type !== undefined &&
    !VALID_CRITERIA_TYPES.includes(updates.criteria_type as ValidCriteriaType)
  ) {
    return errorResponse(
      "validation",
      `Invalid criteria_type. Must be one of: ${VALID_CRITERIA_TYPES.join(", ")}`,
      400
    );
  }

  const { data: rule, error } = await supabase
    .from("coloring_rules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Coloring rule not found or not accessible", 404);
    }
    return errorResponse("update_failed", error.message, 500);
  }

  if (!rule) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  void logActivity({ supabase, workspace_id: rule.workspace_id, user_id: user.id, action: "updated", entity_type: "coloring_rules", entity_id: rule.id, entity_name: rule.name, details: { changed_fields: Object.keys(updates) } });

  return successResponse(rule);
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

  const { data: rule, error } = await supabase
    .from("coloring_rules")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Coloring rule not found or not accessible", 404);
    }
    return errorResponse("delete_failed", error.message, 500);
  }

  if (rule) {
    void logActivity({ supabase, workspace_id: rule.workspace_id, user_id: user.id, action: "deleted", entity_type: "coloring_rules", entity_id: id, entity_name: rule.name });
  }

  return successResponse({ deleted: true });
}

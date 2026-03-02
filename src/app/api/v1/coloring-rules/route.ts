import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";
import type { CriteriaType } from "@/types/database";

const VALID_CRITERIA_TYPES: CriteriaType[] = ["status", "executor", "step_type", "has_role", "maturity_below", "maturity_above"];

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");

  if (!workspaceId) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const { data: rules, error } = await supabase
    .from("coloring_rules")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(rules);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, name, color, criteria_type, criteria_value, is_active, position } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!name || typeof name !== "string" || name.trim() === "") {
    return errorResponse("validation", "name is required", 400);
  }

  if (!color || typeof color !== "string" || color.trim() === "") {
    return errorResponse("validation", "color is required", 400);
  }

  if (!criteria_type) {
    return errorResponse("validation", "criteria_type is required", 400);
  }

  if (!VALID_CRITERIA_TYPES.includes(criteria_type)) {
    return errorResponse("validation", `Invalid criteria_type. Must be one of: ${VALID_CRITERIA_TYPES.join(", ")}`, 400);
  }

  if (!criteria_value || typeof criteria_value !== "string" || criteria_value.trim() === "") {
    return errorResponse("validation", "criteria_value is required", 400);
  }

  const insert: Record<string, unknown> = {
    workspace_id,
    name,
    color,
    criteria_type,
    criteria_value,
  };

  if (is_active !== undefined) insert.is_active = is_active;
  if (position !== undefined) insert.position = position;

  const { data: rule, error } = await supabase
    .from("coloring_rules")
    .insert(insert)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("forbidden", "Permission denied", 403);
    }
    return errorResponse("create_failed", error.message, 500);
  }

  if (!rule) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  void logActivity({ supabase, workspace_id: rule.workspace_id, user_id: user.id, action: "created", entity_type: "coloring_rules", entity_id: rule.id, entity_name: rule.name });

  return successResponse(rule, 201);
}

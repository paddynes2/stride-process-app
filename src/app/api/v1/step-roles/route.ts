import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const stepId = request.nextUrl.searchParams.get("step_id");
  const stepIds = request.nextUrl.searchParams.get("step_ids");

  if (!stepId && !stepIds) {
    return errorResponse("validation", "step_id or step_ids query parameter is required", 400);
  }

  let query = supabase
    .from("step_roles")
    .select("*, role:roles(id, name, hourly_rate, team:teams(id, name))")
    .order("created_at", { ascending: true });

  if (stepId) {
    query = query.eq("step_id", stepId);
  } else if (stepIds) {
    const ids = stepIds.split(",").filter(Boolean);
    if (ids.length === 0) {
      return successResponse([]);
    }
    query = query.in("step_id", ids);
  }

  const { data: stepRoles, error } = await query;

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(stepRoles ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { step_id, role_id } = body;

  if (!step_id) {
    return errorResponse("validation", "step_id is required", 400);
  }

  if (!role_id) {
    return errorResponse("validation", "role_id is required", 400);
  }

  const { data: stepRole, error } = await supabase
    .from("step_roles")
    .insert({ step_id, role_id })
    .select("*, role:roles(id, name, hourly_rate, team:teams(id, name))")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("duplicate", "This role is already assigned to this step", 409);
    }
    return errorResponse("create_failed", error.message, 500);
  }

  void (async () => {
    const { data: step } = await supabase.from("steps").select("workspace_id").eq("id", stepRole.step_id).single();
    if (step?.workspace_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const roleName = (stepRole as Record<string, any>).role?.name ?? "step_role";
      await logActivity({ supabase, workspace_id: step.workspace_id, user_id: user.id, action: "created", entity_type: "step_roles", entity_id: stepRole.id, entity_name: roleName });
    }
  })();

  return successResponse(stepRole, 201);
}

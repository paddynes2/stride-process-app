import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const stepId = request.nextUrl.searchParams.get("step_id");

  if (!stepId) {
    return errorResponse("validation", "step_id query parameter is required", 400);
  }

  const { data: stepRoles, error } = await supabase
    .from("step_roles")
    .select("*, role:roles(id, name, hourly_rate, team:teams(id, name))")
    .eq("step_id", stepId)
    .order("created_at", { ascending: true });

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

  return successResponse(stepRole, 201);
}

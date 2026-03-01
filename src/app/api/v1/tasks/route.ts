import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  const stepId = request.nextUrl.searchParams.get("step_id");

  if (!workspaceId) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true });

  if (stepId) {
    query = query.eq("step_id", stepId);
  }

  const { data: tasks, error } = await query;

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(tasks);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, step_id, title, assigned_to } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!step_id) {
    return errorResponse("validation", "step_id is required", 400);
  }

  if (!title || typeof title !== "string" || title.trim() === "") {
    return errorResponse("validation", "title is required", 400);
  }

  // Determine next position for this step
  const { data: maxPosData } = await supabase
    .from("tasks")
    .select("position")
    .eq("step_id", step_id)
    .order("position", { ascending: false })
    .limit(1);

  const position = maxPosData && maxPosData.length > 0 ? maxPosData[0].position + 1 : 0;

  const insert: Record<string, unknown> = {
    workspace_id,
    step_id,
    title: title.trim(),
    created_by: user.id,
    position,
  };

  if (assigned_to !== undefined) insert.assigned_to = assigned_to;

  const { data: task, error } = await supabase
    .from("tasks")
    .insert(insert)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("forbidden", "Permission denied", 403);
    }
    return errorResponse("create_failed", error.message, 500);
  }

  if (!task) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  return successResponse(task, 201);
}

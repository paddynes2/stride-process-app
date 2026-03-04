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

  const toolId = request.nextUrl.searchParams.get("tool_id");
  const stepId = request.nextUrl.searchParams.get("step_id");

  if (!toolId && !stepId) {
    return errorResponse("validation", "tool_id or step_id query parameter is required", 400);
  }

  if (toolId) {
    const { data: stepTools, error } = await supabase
      .from("step_tools")
      .select("*, step:steps(id, name, section_id)")
      .eq("tool_id", toolId)
      .order("created_at", { ascending: true });

    if (error) {
      return errorResponse("fetch_failed", error.message, 500);
    }

    return successResponse(stepTools ?? []);
  }

  // stepId case
  const { data: stepTools, error } = await supabase
    .from("step_tools")
    .select("*, tool:tools(id, name, cost_per_month)")
    .eq("step_id", stepId!)
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(stepTools ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { step_id, tool_id } = body;

  if (!step_id) {
    return errorResponse("validation", "step_id is required", 400);
  }

  if (!tool_id) {
    return errorResponse("validation", "tool_id is required", 400);
  }

  const { data: stepTool, error } = await supabase
    .from("step_tools")
    .insert({ step_id, tool_id })
    .select("*, tool:tools(id, name, cost_per_month)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("duplicate", "This tool is already assigned to this step", 409);
    }
    return errorResponse("create_failed", error.message, 500);
  }

  void (async () => {
    const { data: step } = await supabase.from("steps").select("workspace_id").eq("id", stepTool.step_id).single();
    if (step?.workspace_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const toolName = (stepTool as Record<string, any>).tool?.name ?? "step_tool";
      await logActivity({ supabase, workspace_id: step.workspace_id, user_id: user.id, action: "created", entity_type: "step_tools", entity_id: stepTool.id, entity_name: toolName });
    }
  })();

  return successResponse(stepTool, 201);
}

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

  if (!workspaceId) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const { data: runbooks, error } = await supabase
    .from("runbooks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(runbooks);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, section_id, name } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!section_id) {
    return errorResponse("validation", "section_id is required", 400);
  }

  // Resolve runbook name — default to section name if not provided
  let runbookName: string;
  if (name && typeof name === "string" && name.trim() !== "") {
    runbookName = name.trim();
  } else {
    const { data: section, error: sectionError } = await supabase
      .from("sections")
      .select("name")
      .eq("id", section_id)
      .single();

    if (sectionError || !section) {
      return errorResponse("not_found", "Section not found or not accessible", 404);
    }

    runbookName = section.name;
  }

  // Create runbook
  const { data: runbook, error: runbookError } = await supabase
    .from("runbooks")
    .insert({
      workspace_id,
      section_id,
      name: runbookName,
      created_by: user.id,
    })
    .select()
    .single();

  if (runbookError) {
    if (runbookError.code === "PGRST116") {
      return errorResponse("forbidden", "Permission denied", 403);
    }
    return errorResponse("create_failed", runbookError.message, 500);
  }

  if (!runbook) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  // Snapshot-copy section's steps into runbook_steps ordered by position_x
  const { data: steps, error: stepsError } = await supabase
    .from("steps")
    .select("id, position_x")
    .eq("section_id", section_id)
    .order("position_x", { ascending: true });

  if (stepsError) {
    return errorResponse("fetch_failed", stepsError.message, 500);
  }

  if (steps && steps.length > 0) {
    const runbookSteps = steps.map((step, index) => ({
      runbook_id: runbook.id,
      step_id: step.id,
      position: index,
    }));

    const { error: insertError } = await supabase
      .from("runbook_steps")
      .insert(runbookSteps);

    if (insertError) {
      return errorResponse("create_failed", insertError.message, 500);
    }
  }

  return successResponse(runbook, 201);
}

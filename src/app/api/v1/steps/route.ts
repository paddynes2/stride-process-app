import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  const tabId = searchParams.get("tab_id");

  if (!workspaceId) {
    return errorResponse("validation", "workspace_id query param is required", 400);
  }

  let query = supabase
    .from("steps")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (tabId) {
    query = query.eq("tab_id", tabId);
  }

  const { data: steps, error } = await query;

  if (error) {
    return errorResponse("query_failed", error.message, 500);
  }

  return successResponse(steps ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, tab_id } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!tab_id) {
    return errorResponse("validation", "tab_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    workspace_id,
    tab_id,
    name: body.name?.trim() || "Untitled",
    position_x: body.position_x ?? 0,
    position_y: body.position_y ?? 0,
  };

  if (body.section_id !== undefined) insert.section_id = body.section_id;
  if (body.status !== undefined) insert.status = body.status;
  if (body.step_type !== undefined) insert.step_type = body.step_type;
  if (body.executor !== undefined) insert.executor = body.executor;
  if (body.notes !== undefined) insert.notes = body.notes;
  if (body.video_url !== undefined) insert.video_url = body.video_url;
  if (body.attributes !== undefined) insert.attributes = body.attributes;
  if (body.time_minutes !== undefined) insert.time_minutes = body.time_minutes;
  if (body.frequency_per_month !== undefined) insert.frequency_per_month = body.frequency_per_month;

  const { data: step, error } = await supabase
    .from("steps")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  return successResponse(step, 201);
}

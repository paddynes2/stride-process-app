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

  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspace_id");
  const tabId = searchParams.get("tab_id");

  if (!workspaceId) {
    return errorResponse("validation", "workspace_id query param is required", 400);
  }

  let query = supabase
    .from("touchpoints")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (tabId) {
    query = query.eq("tab_id", tabId);
  }

  const { data: touchpoints, error } = await query;

  if (error) {
    return errorResponse("query_failed", error.message, 500);
  }

  return successResponse(touchpoints ?? []);
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

  if (body.stage_id !== undefined) insert.stage_id = body.stage_id;
  if (body.pain_score !== undefined) insert.pain_score = body.pain_score;
  if (body.gain_score !== undefined) insert.gain_score = body.gain_score;
  if (body.sentiment !== undefined) insert.sentiment = body.sentiment;
  if (body.customer_emotion !== undefined) insert.customer_emotion = body.customer_emotion;
  if (body.notes !== undefined) insert.notes = body.notes;

  const { data: touchpoint, error } = await supabase
    .from("touchpoints")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  void logActivity({
    supabase,
    workspace_id,
    user_id: user.id,
    action: "created",
    entity_type: "touchpoints",
    entity_id: touchpoint.id,
    entity_name: touchpoint.name,
  });

  return successResponse(touchpoint, 201);
}

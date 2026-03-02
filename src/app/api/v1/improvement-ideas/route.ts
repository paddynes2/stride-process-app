import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";
import type { ImprovementStatus, ImprovementPriority } from "@/types/database";

const VALID_STATUSES: ImprovementStatus[] = ["proposed", "approved", "in_progress", "completed", "rejected"];
const VALID_PRIORITIES: ImprovementPriority[] = ["low", "medium", "high", "critical"];

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

  let query = supabase
    .from("improvement_ideas")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  const status = request.nextUrl.searchParams.get("status");
  if (status) {
    query = query.eq("status", status);
  }

  const priority = request.nextUrl.searchParams.get("priority");
  if (priority) {
    query = query.eq("priority", priority);
  }

  const { data: ideas, error } = await query;

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(ideas);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, title, description, status, priority, linked_step_id, linked_touchpoint_id, linked_section_id } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!title || typeof title !== "string" || title.trim() === "") {
    return errorResponse("validation", "title is required", 400);
  }

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return errorResponse("validation", `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, 400);
  }

  if (priority !== undefined && !VALID_PRIORITIES.includes(priority)) {
    return errorResponse("validation", `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(", ")}`, 400);
  }

  const insert: Record<string, unknown> = {
    workspace_id,
    title: title.trim(),
    created_by: user.id,
  };

  if (description !== undefined) insert.description = description;
  if (status !== undefined) insert.status = status;
  if (priority !== undefined) insert.priority = priority;
  if (linked_step_id !== undefined) insert.linked_step_id = linked_step_id;
  if (linked_touchpoint_id !== undefined) insert.linked_touchpoint_id = linked_touchpoint_id;
  if (linked_section_id !== undefined) insert.linked_section_id = linked_section_id;

  const { data: idea, error } = await supabase
    .from("improvement_ideas")
    .insert(insert)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("forbidden", "Permission denied", 403);
    }
    return errorResponse("create_failed", error.message, 500);
  }

  if (!idea) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  void logActivity({ supabase, workspace_id: idea.workspace_id, user_id: user.id, action: "created", entity_type: "improvement_ideas", entity_id: idea.id, entity_name: idea.title });

  return successResponse(idea, 201);
}

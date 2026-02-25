import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, tab_id, source_step_id, target_step_id } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!tab_id) {
    return errorResponse("validation", "tab_id is required", 400);
  }

  if (!source_step_id) {
    return errorResponse("validation", "source_step_id is required", 400);
  }

  if (!target_step_id) {
    return errorResponse("validation", "target_step_id is required", 400);
  }

  if (source_step_id === target_step_id) {
    return errorResponse("validation", "source and target steps must be different", 400);
  }

  const { data: connection, error } = await supabase
    .from("connections")
    .insert({ workspace_id, tab_id, source_step_id, target_step_id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return errorResponse("duplicate", "Connection already exists between these steps", 409);
    }
    return errorResponse("create_failed", error.message, 500);
  }

  return successResponse(connection, 201);
}

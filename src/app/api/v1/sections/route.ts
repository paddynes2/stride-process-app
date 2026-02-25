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
  const { workspace_id, tab_id, name, position_x, position_y } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!tab_id) {
    return errorResponse("validation", "tab_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    workspace_id,
    tab_id,
    name: name?.trim() || "New Section",
    position_x: position_x ?? 0,
    position_y: position_y ?? 0,
  };

  if (body.width !== undefined) insert.width = body.width;
  if (body.height !== undefined) insert.height = body.height;

  const { data: section, error } = await supabase
    .from("sections")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  return successResponse(section, 201);
}

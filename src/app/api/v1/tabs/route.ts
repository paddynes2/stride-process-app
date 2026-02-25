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
  const { workspace_id, name } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!name?.trim()) {
    return errorResponse("validation", "Tab name is required", 400);
  }

  // Get the next position for this workspace
  const { data: existing } = await supabase
    .from("tabs")
    .select("position")
    .eq("workspace_id", workspace_id)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0;

  const { data: tab, error } = await supabase
    .from("tabs")
    .insert({ workspace_id, name: name.trim(), position: nextPosition })
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  return successResponse(tab, 201);
}

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

  const { data: perspectives, error } = await supabase
    .from("perspectives")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(perspectives);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, name, color, icon } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    workspace_id,
    name: name?.trim() || "New Perspective",
  };

  if (color !== undefined) insert.color = color;
  if (icon !== undefined) insert.icon = icon;

  const { data: perspective, error } = await supabase
    .from("perspectives")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  return successResponse(perspective, 201);
}

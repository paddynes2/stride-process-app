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

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const { data: tools, error } = await supabase
    .from("tools")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(tools);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, name, description, category, vendor, url, cost_per_month } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const { data: tool, error } = await supabase
    .from("tools")
    .insert({
      workspace_id,
      name: name?.trim() || "New Tool",
      description: description?.trim() || null,
      category: category?.trim() || null,
      vendor: vendor?.trim() || null,
      url: url?.trim() || null,
      cost_per_month: cost_per_month != null ? Number(cost_per_month) : null,
    })
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  void logActivity({ supabase, workspace_id: tool.workspace_id, user_id: user.id, action: "created", entity_type: "tools", entity_id: tool.id, entity_name: tool.name });

  return successResponse(tool, 201);
}

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  // Get all org memberships for this user
  const { data: memberships, error: memErr } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (memErr) {
    return errorResponse("query_failed", memErr.message, 500);
  }

  if (!memberships || memberships.length === 0) {
    return successResponse([]);
  }

  const orgIds = memberships.map((m) => m.organization_id);

  // Get all workspaces for those orgs
  const { data: workspaces, error: wsErr } = await supabase
    .from("workspaces")
    .select("*, organizations(name, slug)")
    .in("organization_id", orgIds)
    .order("created_at", { ascending: false });

  if (wsErr) {
    return errorResponse("query_failed", wsErr.message, 500);
  }

  return successResponse(workspaces ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return errorResponse("validation", "Workspace name is required", 400);
  }

  // Use the bootstrap_workspace function which creates org + membership + workspace + tab
  const { data, error } = await supabase.rpc("bootstrap_workspace", {
    p_workspace_name: name,
  });

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  // Fetch the full workspace with tabs to return
  const { data: workspace, error: fetchErr } = await supabase
    .from("workspaces")
    .select("*, tabs(*)")
    .eq("id", data.workspace_id)
    .single();

  if (fetchErr) {
    return errorResponse("fetch_failed", fetchErr.message, 500);
  }

  return successResponse(workspace, 201);
}

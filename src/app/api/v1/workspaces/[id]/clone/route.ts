import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const { data: result, error: rpcError } = await supabase.rpc("clone_workspace", {
    p_source_workspace_id: id,
  });

  if (rpcError) {
    return errorResponse("clone_failed", rpcError.message, 500);
  }

  const rpcResult = result as { workspace_id: string } | null;
  if (!rpcResult?.workspace_id) {
    return errorResponse("clone_failed", "Clone returned no workspace ID", 500);
  }

  const newWorkspaceId = rpcResult.workspace_id;

  const { data: workspace, error: fetchError } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", newWorkspaceId)
    .single();

  if (fetchError || !workspace) {
    return errorResponse("fetch_failed", "Clone succeeded but could not fetch new workspace", 500);
  }

  void logActivity({
    supabase,
    workspace_id: newWorkspaceId,
    user_id: user.id,
    action: "created",
    entity_type: "workspaces",
    entity_id: newWorkspaceId,
    entity_name: workspace.name,
    details: { cloned_from: id },
  });

  return successResponse(workspace);
}

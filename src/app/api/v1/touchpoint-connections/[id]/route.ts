import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const { data: connection, error } = await supabase
    .from("touchpoint_connections")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("delete_failed", error.message, 500);
  }

  logActivity({
    supabase,
    workspace_id: connection?.workspace_id,
    user_id: user.id,
    action: "deleted",
    entity_type: "touchpoint_connections",
    entity_id: id,
    entity_name: "Touchpoint Connection",
  });

  return successResponse({ deleted: true });
}

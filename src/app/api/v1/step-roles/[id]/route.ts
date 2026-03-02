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

  const { data: stepRole, error } = await supabase
    .from("step_roles")
    .delete()
    .eq("id", id)
    .select("id, step_id, role_id")
    .single();

  if (error) {
    return errorResponse("delete_failed", error.message, 500);
  }

  if (stepRole) {
    void (async () => {
      const { data: step } = await supabase.from("steps").select("workspace_id").eq("id", stepRole.step_id).single();
      if (step?.workspace_id) {
        await logActivity({ supabase, workspace_id: step.workspace_id, user_id: user.id, action: "deleted", entity_type: "step_roles", entity_id: id, entity_name: "step_role" });
      }
    })();
  }

  return successResponse({ deleted: true });
}

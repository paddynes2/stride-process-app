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

  const { data: template, error } = await supabase
    .from("templates")
    .delete()
    .eq("id", id)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("not_found", "Template not found or not accessible", 404);
    }
    return errorResponse("delete_failed", error.message, 500);
  }

  if (template) {
    void logActivity({ supabase, workspace_id: template.workspace_id, user_id: user.id, action: "deleted", entity_type: "templates", entity_id: id, entity_name: template.name });
  }

  return successResponse({ deleted: true });
}

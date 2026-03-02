import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

const EDITABLE_FIELDS = ["name", "hourly_rate"] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return errorResponse("validation", "No valid fields to update", 400);
  }

  const { data: role, error } = await supabase
    .from("roles")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return errorResponse("update_failed", error.message, 500);
  }

  void (async () => {
    const { data: team } = await supabase.from("teams").select("workspace_id").eq("id", role.team_id).single();
    if (team?.workspace_id) {
      await logActivity({ supabase, workspace_id: team.workspace_id, user_id: user.id, action: "updated", entity_type: "roles", entity_id: role.id, entity_name: role.name, details: { changed_fields: Object.keys(updates) } });
    }
  })();

  return successResponse(role);
}

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

  const { data: role, error } = await supabase
    .from("roles")
    .delete()
    .eq("id", id)
    .select("id, name, team_id")
    .single();

  if (error) {
    return errorResponse("delete_failed", error.message, 500);
  }

  if (role) {
    void (async () => {
      const { data: team } = await supabase.from("teams").select("workspace_id").eq("id", role.team_id).single();
      if (team?.workspace_id) {
        await logActivity({ supabase, workspace_id: team.workspace_id, user_id: user.id, action: "deleted", entity_type: "roles", entity_id: id, entity_name: role.name });
      }
    })();
  }

  return successResponse({ deleted: true });
}

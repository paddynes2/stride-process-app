import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { role_id, name, email } = body;

  if (!role_id) {
    return errorResponse("validation", "role_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    role_id,
    name: name?.trim() || "New Person",
  };

  if (email !== undefined) insert.email = email;

  const { data: person, error } = await supabase
    .from("people")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  void (async () => {
    const { data: role } = await supabase.from("roles").select("team_id").eq("id", person.role_id).single();
    if (role?.team_id) {
      const { data: team } = await supabase.from("teams").select("workspace_id").eq("id", role.team_id).single();
      if (team?.workspace_id) {
        await logActivity({ supabase, workspace_id: team.workspace_id, user_id: user.id, action: "created", entity_type: "people", entity_id: person.id, entity_name: person.name });
      }
    }
  })();

  return successResponse(person, 201);
}

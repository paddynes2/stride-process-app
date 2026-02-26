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
  const { team_id, name, hourly_rate } = body;

  if (!team_id) {
    return errorResponse("validation", "team_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    team_id,
    name: name?.trim() || "New Role",
  };

  if (hourly_rate !== undefined) insert.hourly_rate = hourly_rate;

  const { data: role, error } = await supabase
    .from("roles")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  return successResponse(role, 201);
}

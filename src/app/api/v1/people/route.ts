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

  return successResponse(person, 201);
}

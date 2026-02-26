import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

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

  const { data: shares, error } = await supabase
    .from("public_shares")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(shares);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  const { data: share, error } = await supabase
    .from("public_shares")
    .insert({
      workspace_id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  return successResponse(share, 201);
}

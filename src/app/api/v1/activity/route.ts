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

  const userId = request.nextUrl.searchParams.get("user_id");
  const action = request.nextUrl.searchParams.get("action");
  const entityType = request.nextUrl.searchParams.get("entity_type");
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const limitParam = request.nextUrl.searchParams.get("limit");
  const offsetParam = request.nextUrl.searchParams.get("offset");

  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 50) : 50;
  const offset = offsetParam ? Math.max(0, parseInt(offsetParam, 10) || 0) : 0;

  let query = supabase
    .from("activity_log")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  if (action) {
    query = query.eq("action", action);
  }

  if (entityType) {
    query = query.eq("entity_type", entityType);
  }

  if (from) {
    query = query.gte("created_at", from);
  }

  if (to) {
    query = query.lte("created_at", to);
  }

  const { data: entries, error } = await query;

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(entries);
}

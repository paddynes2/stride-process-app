import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const runbookId = request.nextUrl.searchParams.get("runbook_id");

  if (!runbookId) {
    return errorResponse("validation", "runbook_id is required", 400);
  }

  const { data: steps, error } = await supabase
    .from("runbook_steps")
    .select("*")
    .eq("runbook_id", runbookId)
    .order("position", { ascending: true });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(steps);
}

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const { shareId } = await params;

  if (!shareId) {
    return errorResponse("validation", "Share ID is required", 400);
  }

  const supabase = await createClient();

  // Call SECURITY DEFINER function — bypasses RLS, no auth required
  const { data, error } = await supabase.rpc("get_public_share_data", {
    p_share_id: shareId,
  });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  if (!data) {
    return errorResponse("not_found", "Share not found or inactive", 404);
  }

  return successResponse(data);
}

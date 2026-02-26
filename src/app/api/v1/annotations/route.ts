import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const perspectiveId = request.nextUrl.searchParams.get("perspective_id");
  const annotatableType = request.nextUrl.searchParams.get("annotatable_type");
  const annotatableId = request.nextUrl.searchParams.get("annotatable_id");

  if (!perspectiveId) {
    return errorResponse("validation", "perspective_id is required", 400);
  }

  let query = supabase
    .from("perspective_annotations")
    .select("*")
    .eq("perspective_id", perspectiveId)
    .order("created_at", { ascending: true });

  if (annotatableType) {
    query = query.eq("annotatable_type", annotatableType);
  }

  if (annotatableId) {
    query = query.eq("annotatable_id", annotatableId);
  }

  const { data: annotations, error } = await query;

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(annotations);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { perspective_id, annotatable_type, annotatable_id, content, rating } = body;

  if (!perspective_id) {
    return errorResponse("validation", "perspective_id is required", 400);
  }

  if (!annotatable_type) {
    return errorResponse("validation", "annotatable_type is required", 400);
  }

  if (!annotatable_id) {
    return errorResponse("validation", "annotatable_id is required", 400);
  }

  const insert: Record<string, unknown> = {
    perspective_id,
    annotatable_type,
    annotatable_id,
  };

  if (content !== undefined) insert.content = content;
  if (rating !== undefined) insert.rating = rating;

  const { data: annotation, error } = await supabase
    .from("perspective_annotations")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  return successResponse(annotation, 201);
}

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import type { CommentableType, CommentCategory } from "@/types/database";

const VALID_COMMENTABLE_TYPES: CommentableType[] = ["step", "section", "touchpoint", "stage"];
const VALID_CATEGORIES: CommentCategory[] = ["note", "decision", "pain_point", "idea", "question"];

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

  const commentableType = request.nextUrl.searchParams.get("commentable_type");
  const commentableId = request.nextUrl.searchParams.get("commentable_id");
  const category = request.nextUrl.searchParams.get("category");
  const isResolvedParam = request.nextUrl.searchParams.get("is_resolved");

  let query = supabase
    .from("comments")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (commentableType) {
    query = query.eq("commentable_type", commentableType);
  }

  if (commentableId) {
    query = query.eq("commentable_id", commentableId);
  }

  if (category) {
    query = query.eq("category", category);
  }

  if (isResolvedParam !== null) {
    query = query.eq("is_resolved", isResolvedParam === "true");
  }

  const { data: comments, error } = await query;

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(comments);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, commentable_type, commentable_id, parent_id, content, category } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!commentable_type) {
    return errorResponse("validation", "commentable_type is required", 400);
  }

  if (!VALID_COMMENTABLE_TYPES.includes(commentable_type)) {
    return errorResponse("validation", `Invalid commentable_type. Must be one of: ${VALID_COMMENTABLE_TYPES.join(", ")}`, 400);
  }

  if (!commentable_id) {
    return errorResponse("validation", "commentable_id is required", 400);
  }

  if (!content || typeof content !== "string" || content.trim() === "") {
    return errorResponse("validation", "content is required", 400);
  }

  if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
    return errorResponse("validation", `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`, 400);
  }

  const insert: Record<string, unknown> = {
    workspace_id,
    commentable_type,
    commentable_id,
    author_id: user.id,
    content,
  };

  if (parent_id !== undefined) insert.parent_id = parent_id;
  if (category !== undefined) insert.category = category;

  const { data: comment, error } = await supabase
    .from("comments")
    .insert(insert)
    .select()
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return errorResponse("forbidden", "Permission denied", 403);
    }
    return errorResponse("create_failed", error.message, 500);
  }

  if (!comment) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  return successResponse(comment, 201);
}

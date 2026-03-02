import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";
import type { TemplateData } from "@/types/database";

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

  const { data: templates, error } = await supabase
    .from("templates")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) {
    return errorResponse("fetch_failed", error.message, 500);
  }

  return successResponse(templates);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { workspace_id, section_id, name, description, category } = body;

  if (!workspace_id) {
    return errorResponse("validation", "workspace_id is required", 400);
  }

  if (!section_id) {
    return errorResponse("validation", "section_id is required", 400);
  }

  if (!name || typeof name !== "string" || name.trim() === "") {
    return errorResponse("validation", "name is required", 400);
  }

  // Fetch section
  const { data: section, error: sectionError } = await supabase
    .from("sections")
    .select("*")
    .eq("id", section_id)
    .single();

  if (sectionError || !section) {
    return errorResponse("not_found", "Section not found or not accessible", 404);
  }

  // Fetch steps for this section, ordered left-to-right
  const { data: steps, error: stepsError } = await supabase
    .from("steps")
    .select("*")
    .eq("section_id", section_id)
    .order("position_x", { ascending: true });

  if (stepsError) {
    return errorResponse("fetch_failed", stepsError.message, 500);
  }

  const stepList = steps ?? [];
  const stepIds = stepList.map((s) => s.id);

  // Fetch connections between steps in this section
  let connections: { source_step_id: string; target_step_id: string }[] = [];
  if (stepIds.length > 0) {
    const { data: conns, error: connsError } = await supabase
      .from("connections")
      .select("source_step_id, target_step_id")
      .in("source_step_id", stepIds)
      .in("target_step_id", stepIds);

    if (connsError) {
      return errorResponse("fetch_failed", connsError.message, 500);
    }

    connections = conns ?? [];
  }

  // Fetch step_roles with role names for snapshot
  let stepRoles: { step_id: string; role_name: string }[] = [];

  if (stepIds.length > 0) {
    const { data: sr, error: srError } = await supabase
      .from("step_roles")
      .select("step_id, role:roles(name)")
      .in("step_id", stepIds);

    if (srError) {
      return errorResponse("fetch_failed", srError.message, 500);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stepRoles = (sr ?? []).map((r: any) => ({
      step_id: r.step_id as string,
      role_name: (r.role?.name ?? "") as string,
    })).filter((r) => r.role_name !== "");
  }

  // Build template_data — step positions stored relative to section origin
  const templateData: TemplateData = {
    section: {
      name: section.name,
      summary: section.summary,
      width: section.width,
      height: section.height,
      notes: section.notes,
    },
    steps: stepList.map((step) => ({
      id: step.id,
      name: step.name,
      position_x: step.position_x - section.position_x,
      position_y: step.position_y - section.position_y,
      status: step.status,
      step_type: step.step_type,
      executor: step.executor,
      notes: step.notes,
      video_url: step.video_url,
      attributes: step.attributes,
      time_minutes: step.time_minutes,
      frequency_per_month: step.frequency_per_month,
      maturity_score: step.maturity_score,
      target_maturity: step.target_maturity,
    })),
    connections,
    step_roles: stepRoles,
  };

  const { data: template, error: insertError } = await supabase
    .from("templates")
    .insert({
      workspace_id,
      name: name.trim(),
      description: description ?? null,
      category: category ?? null,
      template_data: templateData,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    if (insertError.code === "PGRST116") {
      return errorResponse("forbidden", "Permission denied", 403);
    }
    return errorResponse("create_failed", insertError.message, 500);
  }

  if (!template) {
    return errorResponse("forbidden", "Permission denied", 403);
  }

  void logActivity({ supabase, workspace_id: template.workspace_id, user_id: user.id, action: "created", entity_type: "templates", entity_id: template.id, entity_name: template.name });

  return successResponse(template, 201);
}

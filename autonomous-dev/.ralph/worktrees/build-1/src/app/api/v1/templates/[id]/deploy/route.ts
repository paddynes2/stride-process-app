import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";
import { logActivity } from "@/lib/api/activity";
import type { TemplateData } from "@/types/database";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const { tab_id, position_x, position_y } = body;

  if (!tab_id) {
    return errorResponse("validation", "tab_id is required", 400);
  }

  // 1. Fetch template row (RLS ensures caller can access it)
  const { data: template, error: templateError } = await supabase
    .from("templates")
    .select("*")
    .eq("id", id)
    .single();

  if (templateError || !template) {
    return errorResponse("not_found", "Template not found or not accessible", 404);
  }

  const templateData = template.template_data as TemplateData;

  // 2. Get target workspace from tab (RLS ensures caller can access it)
  const { data: tab, error: tabError } = await supabase
    .from("tabs")
    .select("workspace_id")
    .eq("id", tab_id)
    .single();

  if (tabError || !tab) {
    return errorResponse("not_found", "Tab not found or not accessible", 404);
  }

  const targetWorkspaceId: string = tab.workspace_id;
  const sectionPosX: number = position_x ?? 0;
  const sectionPosY: number = position_y ?? 0;

  // 3. Insert new section at provided position
  const { data: newSection, error: sectionError } = await supabase
    .from("sections")
    .insert({
      workspace_id: targetWorkspaceId,
      tab_id,
      name: templateData.section.name,
      summary: templateData.section.summary ?? null,
      position_x: sectionPosX,
      position_y: sectionPosY,
      width: templateData.section.width ?? 600,
      height: templateData.section.height ?? 400,
      notes: templateData.section.notes ?? null,
    })
    .select()
    .single();

  if (sectionError || !newSection) {
    return errorResponse("create_failed", sectionError?.message ?? "Failed to create section", 500);
  }

  // 4. Insert steps with new UUIDs, building oldStepId → newStepId map
  const stepIdMap = new Map<string, string>();

  for (const templateStep of templateData.steps) {
    const { data: newStep, error: stepError } = await supabase
      .from("steps")
      .insert({
        workspace_id: targetWorkspaceId,
        tab_id,
        section_id: newSection.id,
        name: templateStep.name,
        position_x: sectionPosX + (templateStep.position_x ?? 0),
        position_y: sectionPosY + (templateStep.position_y ?? 0),
        status: templateStep.status ?? "draft",
        step_type: templateStep.step_type ?? null,
        executor: templateStep.executor ?? "empty",
        notes: templateStep.notes ?? null,
        video_url: templateStep.video_url ?? null,
        attributes: templateStep.attributes ?? {},
        time_minutes: templateStep.time_minutes ?? null,
        frequency_per_month: templateStep.frequency_per_month ?? null,
        maturity_score: templateStep.maturity_score ?? null,
        target_maturity: templateStep.target_maturity ?? null,
      })
      .select("id")
      .single();

    if (stepError || !newStep) {
      continue;
    }

    if (templateStep.id) {
      stepIdMap.set(templateStep.id, newStep.id);
    }
  }

  // 5. Insert connections with remapped source/target IDs
  const connectionInserts = templateData.connections
    .map((conn) => {
      const newSourceId = stepIdMap.get(conn.source_step_id);
      const newTargetId = stepIdMap.get(conn.target_step_id);
      if (!newSourceId || !newTargetId) return null;
      return {
        workspace_id: targetWorkspaceId,
        tab_id,
        source_step_id: newSourceId,
        target_step_id: newTargetId,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  if (connectionInserts.length > 0) {
    await supabase.from("connections").insert(connectionInserts);
  }

  // 6. Match role assignments by name in target workspace — silently skip unmatched
  if (templateData.step_roles.length > 0) {
    const { data: teamRows } = await supabase
      .from("teams")
      .select("id")
      .eq("workspace_id", targetWorkspaceId);

    const teamIds = (teamRows ?? []).map((t) => t.id);

    if (teamIds.length > 0) {
      const { data: roleRows } = await supabase
        .from("roles")
        .select("id, name")
        .in("team_id", teamIds);

      const roleNameMap = new Map<string, string>();
      for (const role of roleRows ?? []) {
        roleNameMap.set(role.name, role.id);
      }

      const stepRoleInserts = templateData.step_roles
        .map((sr) => {
          const newStepId = stepIdMap.get(sr.step_id);
          const roleId = roleNameMap.get(sr.role_name);
          if (!newStepId || !roleId) return null;
          return { step_id: newStepId, role_id: roleId };
        })
        .filter((sr): sr is NonNullable<typeof sr> => sr !== null);

      if (stepRoleInserts.length > 0) {
        await supabase.from("step_roles").insert(stepRoleInserts);
      }
    }
  }

  void logActivity({ supabase, workspace_id: targetWorkspaceId, user_id: user.id, action: "created", entity_type: "templates", entity_id: id, entity_name: `Deploy: ${template.name}` });

  return successResponse({ section_id: newSection.id }, 201);
}

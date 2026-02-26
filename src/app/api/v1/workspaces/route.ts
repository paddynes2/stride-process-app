import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api/response";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  // Get all org memberships for this user
  const { data: memberships, error: memErr } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (memErr) {
    return errorResponse("query_failed", memErr.message, 500);
  }

  if (!memberships || memberships.length === 0) {
    return successResponse([]);
  }

  const orgIds = memberships.map((m) => m.organization_id);

  // Get all workspaces for those orgs
  const { data: workspaces, error: wsErr } = await supabase
    .from("workspaces")
    .select("*, organizations(name, slug)")
    .in("organization_id", orgIds)
    .order("created_at", { ascending: false });

  if (wsErr) {
    return errorResponse("query_failed", wsErr.message, 500);
  }

  return successResponse(workspaces ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return errorResponse("unauthorized", "Not authenticated", 401);
  }

  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return errorResponse("validation", "Workspace name is required", 400);
  }

  // Use the bootstrap_workspace function which creates org + membership + workspace + tab
  const { data, error } = await supabase.rpc("bootstrap_workspace", {
    p_workspace_name: name,
  });

  if (error) {
    return errorResponse("create_failed", error.message, 500);
  }

  // Fetch the full workspace with tabs to return
  const { data: workspace, error: fetchErr } = await supabase
    .from("workspaces")
    .select("*, tabs(*)")
    .eq("id", data.workspace_id)
    .single();

  if (fetchErr) {
    return errorResponse("fetch_failed", fetchErr.message, 500);
  }

  // Seed "Getting Started" template content on the first tab
  const tabs = (workspace as Record<string, unknown>).tabs as Array<{ id: string }> | undefined;
  const firstTabId = tabs?.[0]?.id;

  if (firstTabId) {
    try {
      // Create a section to hold the example steps
      const { data: section } = await supabase
        .from("sections")
        .insert({
          workspace_id: data.workspace_id,
          tab_id: firstTabId,
          name: "Getting Started",
          summary: "This is an example section. Edit or delete it to start mapping your own process.",
          position_x: 100,
          position_y: 80,
          width: 700,
          height: 200,
        })
        .select()
        .single();

      if (section) {
        // Create 3 example steps inside the section
        const stepData = [
          { name: "Document the process", position_x: 30, position_y: 50, status: "draft" as const },
          { name: "Score maturity", position_x: 250, position_y: 50, status: "draft" as const },
          { name: "Identify gaps", position_x: 470, position_y: 50, status: "draft" as const },
        ];

        const { data: steps } = await supabase
          .from("steps")
          .insert(
            stepData.map((s) => ({
              workspace_id: data.workspace_id,
              tab_id: firstTabId,
              section_id: section.id,
              name: s.name,
              position_x: s.position_x,
              position_y: s.position_y,
              status: s.status,
            }))
          )
          .select()
          .order("position_x", { ascending: true });

        // Connect the steps in sequence: step1 → step2 → step3
        if (steps && steps.length === 3) {
          await supabase.from("connections").insert([
            {
              workspace_id: data.workspace_id,
              tab_id: firstTabId,
              source_step_id: steps[0].id,
              target_step_id: steps[1].id,
            },
            {
              workspace_id: data.workspace_id,
              tab_id: firstTabId,
              source_step_id: steps[1].id,
              target_step_id: steps[2].id,
            },
          ]);
        }
      }
    } catch {
      // Template seeding is best-effort — don't fail workspace creation
    }
  }

  return successResponse(workspace, 201);
}

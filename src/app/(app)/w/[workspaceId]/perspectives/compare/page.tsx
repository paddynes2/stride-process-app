import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PerspectivesCompareView } from "./perspectives-compare-view";
import type { Perspective } from "@/types/database";
import type { ElementInfo } from "./export-pdf";

export default async function PerspectivesComparePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [workspaceRes, perspectivesRes, stepsRes, sectionsRes, stagesRes, touchpointsRes] =
    await Promise.all([
      supabase.from("workspaces").select("name").eq("id", workspaceId).single(),
      supabase.from("perspectives").select("*").eq("workspace_id", workspaceId).order("created_at"),
      supabase.from("steps").select("id, name, tab_id").eq("workspace_id", workspaceId),
      supabase.from("sections").select("id, name, tab_id").eq("workspace_id", workspaceId),
      supabase.from("stages").select("id, name, tab_id").eq("workspace_id", workspaceId),
      supabase.from("touchpoints").select("id, name, tab_id").eq("workspace_id", workspaceId),
    ]);

  // Build lookup map: annotatable_id → { name, tab_id, type }
  const elementMap: Record<string, ElementInfo> = {};

  for (const step of (stepsRes.data ?? []) as { id: string; name: string; tab_id: string }[]) {
    elementMap[step.id] = { name: step.name, tab_id: step.tab_id, type: "step" };
  }
  for (const section of (sectionsRes.data ?? []) as { id: string; name: string; tab_id: string }[]) {
    elementMap[section.id] = { name: section.name, tab_id: section.tab_id, type: "section" };
  }
  for (const stage of (stagesRes.data ?? []) as { id: string; name: string; tab_id: string }[]) {
    elementMap[stage.id] = { name: stage.name, tab_id: stage.tab_id, type: "stage" };
  }
  for (const touchpoint of (touchpointsRes.data ?? []) as { id: string; name: string; tab_id: string }[]) {
    elementMap[touchpoint.id] = { name: touchpoint.name, tab_id: touchpoint.tab_id, type: "touchpoint" };
  }

  return (
    <PerspectivesCompareView
      workspaceId={workspaceId}
      workspaceName={workspaceRes.data?.name ?? "Workspace"}
      perspectives={(perspectivesRes.data ?? []) as Perspective[]}
      elementMap={elementMap}
    />
  );
}

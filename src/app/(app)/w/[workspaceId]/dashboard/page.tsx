import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardView } from "./dashboard-view";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [stepsRes, sectionsRes, tabsRes, stagesRes, touchpointsRes, teamsRes, perspectivesRes] = await Promise.all([
    supabase.from("steps").select("id, status, executor, maturity_score, target_maturity, time_minutes, frequency_per_month").eq("workspace_id", workspaceId),
    supabase.from("sections").select("id").eq("workspace_id", workspaceId),
    supabase.from("tabs").select("id, name, canvas_type").eq("workspace_id", workspaceId).order("position"),
    supabase.from("stages").select("id").eq("workspace_id", workspaceId),
    supabase.from("touchpoints").select("id, pain_score, sentiment").eq("workspace_id", workspaceId),
    supabase.from("teams").select("id").eq("workspace_id", workspaceId),
    supabase.from("perspectives").select("id").eq("workspace_id", workspaceId),
  ]);

  return (
    <DashboardView
      workspaceId={workspaceId}
      steps={stepsRes.data ?? []}
      sections={sectionsRes.data ?? []}
      tabs={tabsRes.data ?? []}
      stages={stagesRes.data ?? []}
      touchpoints={touchpointsRes.data ?? []}
      teamCount={teamsRes.data?.length ?? 0}
      perspectiveCount={perspectivesRes.data?.length ?? 0}
    />
  );
}

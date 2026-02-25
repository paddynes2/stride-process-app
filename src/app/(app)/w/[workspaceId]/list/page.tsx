import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { StepListView } from "./step-list-view";

export default async function ListPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [stepsRes, sectionsRes, tabsRes] = await Promise.all([
    supabase.from("steps").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("sections").select("id, name").eq("workspace_id", workspaceId),
    supabase.from("tabs").select("id, name").eq("workspace_id", workspaceId).order("position"),
  ]);

  return (
    <StepListView
      workspaceId={workspaceId}
      steps={stepsRes.data ?? []}
      sections={sectionsRes.data ?? []}
      tabs={tabsRes.data ?? []}
    />
  );
}

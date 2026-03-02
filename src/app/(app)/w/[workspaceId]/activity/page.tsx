import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ActivityView } from "./activity-view";
import type { ActivityLog } from "@/types/database";

export default async function ActivityPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: entries },
    { data: steps },
    { data: sections },
    { data: stages },
    { data: touchpoints },
  ] = await Promise.all([
    supabase
      .from("activity_log")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .range(0, 49),
    supabase.from("steps").select("id, name, tab_id").eq("workspace_id", workspaceId),
    supabase.from("sections").select("id, name, tab_id").eq("workspace_id", workspaceId),
    supabase.from("stages").select("id, name, tab_id").eq("workspace_id", workspaceId),
    supabase.from("touchpoints").select("id, name, tab_id").eq("workspace_id", workspaceId),
  ]);

  // Build entity ID → tab_id mapping for navigation links
  const entityTabMap: Record<string, string> = {};
  for (const s of steps ?? []) if (s.tab_id) entityTabMap[s.id] = s.tab_id;
  for (const s of sections ?? []) if (s.tab_id) entityTabMap[s.id] = s.tab_id;
  for (const s of stages ?? []) if (s.tab_id) entityTabMap[s.id] = s.tab_id;
  for (const t of touchpoints ?? []) if (t.tab_id) entityTabMap[t.id] = t.tab_id;

  return (
    <ActivityView
      initialEntries={(entries ?? []) as ActivityLog[]}
      workspaceId={workspaceId}
      entityTabMap={entityTabMap}
    />
  );
}

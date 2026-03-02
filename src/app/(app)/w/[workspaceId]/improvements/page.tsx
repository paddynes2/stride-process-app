import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ImprovementsView } from "./improvements-view";
import type { ImprovementIdea } from "@/types/database";

export default async function ImprovementsPage({
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

  const [
    { data: ideas },
    { data: steps },
    { data: sections },
    { data: touchpoints },
  ] = await Promise.all([
    supabase
      .from("improvement_ideas")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
    supabase.from("steps").select("id, name, tab_id").eq("workspace_id", workspaceId),
    supabase.from("sections").select("id, name, tab_id").eq("workspace_id", workspaceId),
    supabase.from("touchpoints").select("id, name, tab_id").eq("workspace_id", workspaceId),
  ]);

  const entityNames: Record<string, string> = {};
  const entityTabMap: Record<string, string> = {};

  for (const s of steps ?? []) {
    entityNames[s.id] = s.name;
    if (s.tab_id) entityTabMap[s.id] = s.tab_id;
  }
  for (const s of sections ?? []) {
    entityNames[s.id] = s.name;
    if (s.tab_id) entityTabMap[s.id] = s.tab_id;
  }
  for (const t of touchpoints ?? []) {
    entityNames[t.id] = t.name;
    if (t.tab_id) entityTabMap[t.id] = t.tab_id;
  }

  return (
    <ImprovementsView
      initialIdeas={(ideas ?? []) as ImprovementIdea[]}
      entityNames={entityNames}
      workspaceId={workspaceId}
      entityTabMap={entityTabMap}
    />
  );
}

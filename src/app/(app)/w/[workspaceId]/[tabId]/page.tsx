import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CanvasView } from "./canvas-view";

export default async function TabPage({
  params,
}: {
  params: Promise<{ workspaceId: string; tabId: string }>;
}) {
  const { workspaceId, tabId } = await params;
  const supabase = await createClient();

  // Fetch all data for this tab
  const [sectionsRes, stepsRes, connectionsRes] = await Promise.all([
    supabase.from("sections").select("*").eq("tab_id", tabId).order("created_at"),
    supabase.from("steps").select("*").eq("tab_id", tabId).order("created_at"),
    supabase.from("connections").select("*").eq("tab_id", tabId),
  ]);

  return (
    <CanvasView
      workspaceId={workspaceId}
      tabId={tabId}
      initialSections={sectionsRes.data ?? []}
      initialSteps={stepsRes.data ?? []}
      initialConnections={connectionsRes.data ?? []}
    />
  );
}

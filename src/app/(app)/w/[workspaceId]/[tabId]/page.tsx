import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CanvasView } from "./canvas-view";
import { JourneyCanvasView } from "./journey-canvas-view";

export default async function TabPage({
  params,
}: {
  params: Promise<{ workspaceId: string; tabId: string }>;
}) {
  const { workspaceId, tabId } = await params;
  const supabase = await createClient();

  // Fetch the tab record to determine canvas type
  const { data: tab } = await supabase
    .from("tabs")
    .select("canvas_type")
    .eq("id", tabId)
    .single();

  if (!tab) {
    notFound();
  }

  if (tab.canvas_type === "journey") {
    // Fetch journey-specific data
    const [stagesRes, touchpointsRes, connectionsRes] = await Promise.all([
      supabase.from("stages").select("*").eq("tab_id", tabId).order("created_at"),
      supabase.from("touchpoints").select("*").eq("tab_id", tabId).order("created_at"),
      supabase.from("touchpoint_connections").select("*").eq("tab_id", tabId),
    ]);

    return (
      <JourneyCanvasView
        workspaceId={workspaceId}
        tabId={tabId}
        initialStages={stagesRes.data ?? []}
        initialTouchpoints={touchpointsRes.data ?? []}
        initialConnections={connectionsRes.data ?? []}
      />
    );
  }

  // Default: process canvas
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

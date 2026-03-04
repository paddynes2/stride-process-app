import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { CanvasView } from "./canvas-view";
import { JourneyCanvasView } from "./journey-canvas-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tabId: string }>;
}): Promise<Metadata> {
  const { tabId } = await params;
  const supabase = await createClient();
  const { data: tab } = await supabase
    .from("tabs")
    .select("name")
    .eq("id", tabId)
    .single();
  return { title: tab?.name ?? "Canvas" };
}

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
    .select("canvas_type, name")
    .eq("id", tabId)
    .single();

  if (!tab) {
    notFound();
  }

  if (tab.canvas_type === "journey") {
    // Fetch journey-specific data + workspace name for export
    const [stagesRes, touchpointsRes, connectionsRes, workspaceRes] = await Promise.all([
      supabase.from("stages").select("*").eq("tab_id", tabId).order("created_at"),
      supabase.from("touchpoints").select("*").eq("tab_id", tabId).order("created_at"),
      supabase.from("touchpoint_connections").select("*").eq("tab_id", tabId),
      supabase.from("workspaces").select("name").eq("id", workspaceId).single(),
    ]);

    return (
      <JourneyCanvasView
        workspaceId={workspaceId}
        tabId={tabId}
        tabName={tab.name}
        workspaceName={workspaceRes.data?.name ?? "Workspace"}
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

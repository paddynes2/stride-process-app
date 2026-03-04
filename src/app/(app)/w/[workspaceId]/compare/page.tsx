import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CompareView } from "./compare-view";

export const metadata: Metadata = { title: "Compare" };

export default async function ComparePage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch workspace name
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  // Fetch all tabs to find process and journey types
  const { data: tabs } = await supabase
    .from("tabs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position");

  const allTabs = tabs ?? [];
  const processTab = allTabs.find((t) => t.canvas_type === "process") ?? null;
  const journeyTab = allTabs.find((t) => t.canvas_type === "journey") ?? null;

  // If both exist, fetch data for each
  let processSections: unknown[] = [];
  let processSteps: unknown[] = [];
  let processConnections: unknown[] = [];
  let journeyStages: unknown[] = [];
  let journeyTouchpoints: unknown[] = [];
  let journeyConnections: unknown[] = [];

  if (processTab) {
    const [secRes, stepRes, connRes] = await Promise.all([
      supabase.from("sections").select("*").eq("tab_id", processTab.id).order("created_at"),
      supabase.from("steps").select("*").eq("tab_id", processTab.id).order("created_at"),
      supabase.from("connections").select("*").eq("tab_id", processTab.id),
    ]);
    processSections = secRes.data ?? [];
    processSteps = stepRes.data ?? [];
    processConnections = connRes.data ?? [];
  }

  if (journeyTab) {
    const [stgRes, tpRes, tcRes] = await Promise.all([
      supabase.from("stages").select("*").eq("tab_id", journeyTab.id).order("created_at"),
      supabase.from("touchpoints").select("*").eq("tab_id", journeyTab.id).order("created_at"),
      supabase.from("touchpoint_connections").select("*").eq("tab_id", journeyTab.id),
    ]);
    journeyStages = stgRes.data ?? [];
    journeyTouchpoints = tpRes.data ?? [];
    journeyConnections = tcRes.data ?? [];
  }

  return (
    <CompareView
      workspaceId={workspaceId}
      workspaceName={workspace?.name ?? "Workspace"}
      processTab={processTab}
      journeyTab={journeyTab}
      processSections={processSections as import("@/types/database").Section[]}
      processSteps={processSteps as import("@/types/database").Step[]}
      processConnections={processConnections as import("@/types/database").Connection[]}
      journeyStages={journeyStages as import("@/types/database").Stage[]}
      journeyTouchpoints={journeyTouchpoints as import("@/types/database").Touchpoint[]}
      journeyConnections={journeyConnections as import("@/types/database").TouchpointConnection[]}
    />
  );
}

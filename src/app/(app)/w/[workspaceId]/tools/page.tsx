import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ToolsCanvasView } from "./tools-canvas-view";

export const metadata: Metadata = { title: "Tools" };

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tools }, { data: toolSections }, { data: steps }, { data: processSections }] = await Promise.all([
    supabase
      .from("tools")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at"),
    supabase
      .from("tool_sections")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at"),
    supabase
      .from("steps")
      .select("id, name, section_id, tab_id, frequency_per_month")
      .eq("workspace_id", workspaceId),
    supabase
      .from("sections")
      .select("id, name")
      .eq("workspace_id", workspaceId),
  ]);

  const toolIds = (tools ?? []).map((t) => t.id);
  let stepTools: { id: string; step_id: string; tool_id: string }[] = [];
  if (toolIds.length > 0) {
    const { data } = await supabase
      .from("step_tools")
      .select("id, step_id, tool_id")
      .in("tool_id", toolIds);
    stepTools = data ?? [];
  }

  return (
    <ToolsCanvasView
      workspaceId={workspaceId}
      initialTools={tools ?? []}
      initialToolSections={toolSections ?? []}
      initialSteps={steps ?? []}
      initialStepTools={stepTools}
      initialSections={processSections ?? []}
    />
  );
}

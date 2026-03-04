import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ToolsCanvasView } from "./tools-canvas-view";

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tools }, { data: toolSections }] = await Promise.all([
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
  ]);

  return (
    <ToolsCanvasView
      workspaceId={workspaceId}
      initialTools={tools ?? []}
      initialToolSections={toolSections ?? []}
    />
  );
}

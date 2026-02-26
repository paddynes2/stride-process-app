import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ToolsView } from "./tools-view";

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: tools } = await supabase
    .from("tools")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at");

  return (
    <ToolsView
      workspaceId={workspaceId}
      initialTools={tools ?? []}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { RunbooksListView, type RunbookWithRelations } from "./runbooks-list-view";

export default async function RunbooksPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: runbooks } = await supabase
    .from("runbooks")
    .select("*, sections(id, name), runbook_steps(id, status)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  return (
    <RunbooksListView
      runbooks={(runbooks ?? []) as RunbookWithRelations[]}
      workspaceId={workspaceId}
    />
  );
}

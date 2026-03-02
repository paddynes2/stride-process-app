import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { PlaybookView } from "./playbook-view";
import type { RunbookStepEnriched } from "../runbook-view";
import type { Runbook } from "@/types/database";

export default async function PlaybookPage({
  params,
}: {
  params: Promise<{ workspaceId: string; runbookId: string }>;
}) {
  const { workspaceId, runbookId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: runbook }, { data: steps }] = await Promise.all([
    supabase
      .from("runbooks")
      .select("*")
      .eq("id", runbookId)
      .eq("workspace_id", workspaceId)
      .single(),
    supabase
      .from("runbook_steps")
      .select("*, steps(id, name)")
      .eq("runbook_id", runbookId)
      .order("position", { ascending: true }),
  ]);

  if (!runbook) notFound();

  return (
    <PlaybookView
      runbook={runbook as Runbook}
      initialSteps={(steps ?? []) as RunbookStepEnriched[]}
      workspaceId={workspaceId}
    />
  );
}

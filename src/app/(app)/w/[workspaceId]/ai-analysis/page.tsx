import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AIAnalysisView } from "./ai-analysis-view";
import type { AIAnalysisResult } from "@/types/database";

export const metadata: Metadata = { title: "AI Analysis" };

export default async function AIAnalysisPage({
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

  const [workspaceRes, stepsRes] = await Promise.all([
    supabase.from("workspaces").select("*").eq("id", workspaceId).single(),
    supabase.from("steps").select("id, name, tab_id").eq("workspace_id", workspaceId),
  ]);

  if (!workspaceRes.data) redirect("/workspaces");

  const workspace = workspaceRes.data;
  const settings = (workspace.settings ?? {}) as Record<string, unknown>;
  const lastAnalysis = (settings.last_analysis ?? null) as AIAnalysisResult | null;
  const lastAnalysisAt = (settings.last_analysis_at ?? null) as string | null;

  const steps = stepsRes.data ?? [];
  const stepMap: Record<string, { name: string; tabId: string }> = {};
  for (const step of steps) {
    stepMap[step.id] = { name: step.name, tabId: step.tab_id };
  }

  return (
    <AIAnalysisView
      workspaceId={workspaceId}
      stepMap={stepMap}
      initialAnalysis={lastAnalysis}
      lastAnalysisAt={lastAnalysisAt}
      hasSteps={steps.length > 0}
    />
  );
}

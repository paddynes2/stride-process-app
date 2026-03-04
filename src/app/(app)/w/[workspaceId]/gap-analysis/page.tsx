import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GapAnalysisView } from "./gap-analysis-view";

export const metadata: Metadata = { title: "Gap Analysis" };

export default async function GapAnalysisPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [stepsRes, sectionsRes] = await Promise.all([
    supabase.from("steps").select("*").eq("workspace_id", workspaceId).order("created_at"),
    supabase.from("sections").select("id, name").eq("workspace_id", workspaceId),
  ]);

  return (
    <GapAnalysisView
      workspaceId={workspaceId}
      steps={stepsRes.data ?? []}
      sections={sectionsRes.data ?? []}
    />
  );
}

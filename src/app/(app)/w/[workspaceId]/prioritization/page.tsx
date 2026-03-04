import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PrioritizationView } from "./prioritization-view";
import type { Tab, Section, Stage, Step, Touchpoint } from "@/types/database";

export const metadata: Metadata = { title: "Prioritization" };

export default async function PrioritizationPage({
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

  const [stepsRes, touchpointsRes, sectionsRes, stagesRes, tabsRes] =
    await Promise.all([
      supabase
        .from("steps")
        .select("id, name, tab_id, section_id, effort_score, impact_score")
        .eq("workspace_id", workspaceId),
      supabase
        .from("touchpoints")
        .select("id, name, tab_id, stage_id, effort_score, impact_score")
        .eq("workspace_id", workspaceId),
      supabase
        .from("sections")
        .select("id, name, tab_id")
        .eq("workspace_id", workspaceId),
      supabase
        .from("stages")
        .select("id, name, tab_id")
        .eq("workspace_id", workspaceId),
      supabase
        .from("tabs")
        .select("id, name, canvas_type")
        .eq("workspace_id", workspaceId)
        .order("position"),
    ]);

  return (
    <PrioritizationView
      workspaceId={workspaceId}
      steps={
        (stepsRes.data ?? []) as Pick<
          Step,
          "id" | "name" | "tab_id" | "section_id" | "effort_score" | "impact_score"
        >[]
      }
      touchpoints={
        (touchpointsRes.data ?? []) as Pick<
          Touchpoint,
          "id" | "name" | "tab_id" | "stage_id" | "effort_score" | "impact_score"
        >[]
      }
      sections={
        (sectionsRes.data ?? []) as Pick<Section, "id" | "name" | "tab_id">[]
      }
      stages={
        (stagesRes.data ?? []) as Pick<Stage, "id" | "name" | "tab_id">[]
      }
      tabs={
        (tabsRes.data ?? []) as Pick<Tab, "id" | "name" | "canvas_type">[]
      }
    />
  );
}

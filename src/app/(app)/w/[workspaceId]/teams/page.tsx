import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TeamsView } from "./teams-view";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: teams } = await supabase
    .from("teams")
    .select("*, roles(*, people(*))")
    .eq("workspace_id", workspaceId)
    .order("created_at");

  return (
    <TeamsView
      workspaceId={workspaceId}
      initialTeams={teams ?? []}
    />
  );
}

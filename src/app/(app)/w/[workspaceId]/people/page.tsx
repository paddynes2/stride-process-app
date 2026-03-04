import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PeopleView } from "./people-view";

export const metadata: Metadata = { title: "People" };

export default async function PeoplePage({
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
    <PeopleView
      workspaceId={workspaceId}
      initialTeams={teams ?? []}
    />
  );
}

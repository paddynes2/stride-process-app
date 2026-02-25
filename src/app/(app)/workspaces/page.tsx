import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceList } from "./workspace-list";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  const orgIds = (memberships ?? []).map((m) => m.organization_id);

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .in("organization_id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  return <WorkspaceList workspaces={workspaces ?? []} />;
}

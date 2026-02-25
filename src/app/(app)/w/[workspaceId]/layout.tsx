import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceShell } from "./workspace-shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { workspaceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (!workspace) redirect("/workspaces");

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch org
  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", workspace.organization_id)
    .single();

  if (!org) redirect("/workspaces");

  // Fetch all workspaces for this org
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .eq("organization_id", org.id)
    .eq("is_active", true)
    .order("created_at");

  // Fetch tabs
  const { data: tabs } = await supabase
    .from("tabs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position");

  return (
    <WorkspaceShell
      user={profile ?? { id: user.id, email: user.email ?? "", name: null, avatar_url: null, settings: {}, created_at: "", updated_at: "" }}
      organization={org}
      workspace={workspace}
      workspaces={workspaces ?? []}
      tabs={tabs ?? []}
    >
      {children}
    </WorkspaceShell>
  );
}

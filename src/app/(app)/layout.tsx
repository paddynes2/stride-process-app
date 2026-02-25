import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LayoutClient } from "./layout-client";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const userProfile = profile ?? {
    id: user.id,
    email: user.email ?? "",
    name: user.user_metadata?.name ?? null,
    avatar_url: null,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Fetch user's organizations
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) {
    // No organization — bootstrap one
    const { data: bootstrapResult } = await supabase.rpc("bootstrap_workspace", {
      p_workspace_name: "My Workspace",
    });

    if (bootstrapResult) {
      redirect("/workspaces");
    }
  }

  const orgIds = (memberships ?? []).map((m) => m.organization_id);

  // Fetch organizations
  const { data: organizations } = await supabase
    .from("organizations")
    .select("*")
    .in("id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"]);

  // Fetch all workspaces
  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("*")
    .in("organization_id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"])
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  return (
    <LayoutClient
      user={userProfile}
      organizations={organizations ?? []}
      workspaces={workspaces ?? []}
    >
      {children}
    </LayoutClient>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Check if user has a workspace, if not bootstrap one
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: memberships } = await supabase
          .from("organization_members")
          .select("organization_id")
          .eq("user_id", user.id)
          .limit(1);

        if (!memberships || memberships.length === 0) {
          // First login — bootstrap workspace
          await supabase.rpc("bootstrap_workspace", { p_workspace_name: "My Workspace" });
        }
      }
      return NextResponse.redirect(new URL("/workspaces", origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth_callback_failed", request.url));
}

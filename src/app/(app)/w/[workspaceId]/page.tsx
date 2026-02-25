import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  const supabase = await createClient();

  // Fetch first tab to redirect to
  const { data: tabs } = await supabase
    .from("tabs")
    .select("id")
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true })
    .limit(1);

  if (tabs && tabs.length > 0) {
    redirect(`/w/${workspaceId}/${tabs[0].id}`);
  }

  // No tabs — shouldn't happen, but show a fallback
  redirect(`/w/${workspaceId}/settings`);
}

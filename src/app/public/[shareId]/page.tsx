import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PublicCanvasView } from "./public-canvas-view";

interface PublicSharePageProps {
  params: Promise<{ shareId: string }>;
}

export async function generateMetadata({ params }: PublicSharePageProps): Promise<Metadata> {
  const { shareId } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_public_share_data", {
    p_share_id: shareId,
  });

  const workspaceName = data?.workspace?.name ?? "Shared Process";

  return {
    title: `${workspaceName} — Stride`,
    description: `View the process map for ${workspaceName}`,
  };
}

export default async function PublicSharePage({ params }: PublicSharePageProps) {
  const { shareId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_public_share_data", {
    p_share_id: shareId,
  });

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            Not Found
          </h1>
          <p className="text-[var(--text-secondary)]">
            This share link is invalid or has been disabled.
          </p>
        </div>
      </div>
    );
  }

  // The RPC returns JSONB — type it for the client
  const shareData = data as {
    workspace: { id: string; name: string };
    tabs: Array<{
      id: string;
      name: string;
      position: number;
      sections: Array<{
        id: string;
        name: string;
        summary: string | null;
        position_x: number;
        position_y: number;
        width: number;
        height: number;
      }>;
      steps: Array<{
        id: string;
        name: string;
        section_id: string | null;
        position_x: number;
        position_y: number;
        status: string;
        step_type: string | null;
        executor: string;
        maturity_score: number | null;
        target_maturity: number | null;
      }>;
      connections: Array<{
        id: string;
        source_step_id: string;
        target_step_id: string;
      }>;
    }>;
  };

  return <PublicCanvasView shareData={shareData} />;
}

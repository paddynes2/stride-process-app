"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace error:", error);
  }, [error]);

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex max-w-md flex-col items-center gap-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--error-subtle,rgba(239,68,68,0.1))]">
          <AlertTriangle className="h-6 w-6 text-[var(--accent-red)]" />
        </div>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Failed to load workspace
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {error.message || "An unexpected error occurred while loading this workspace."}
        </p>
        <div className="flex gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = "/workspaces")}
          >
            Back to workspaces
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Runbook, RunbookStatus, RunbookStepStatus } from "@/types/database";

export type RunbookWithRelations = Runbook & {
  sections: { id: string; name: string } | null;
  runbook_steps: { id: string; status: RunbookStepStatus }[];
};

const STATUS_CONFIG: Record<RunbookStatus, { variant: React.ComponentProps<typeof Badge>["variant"]; label: string }> = {
  active: { variant: "default", label: "Active" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "destructive", label: "Cancelled" },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

interface RunbooksListViewProps {
  runbooks: RunbookWithRelations[];
  workspaceId: string;
}

export function RunbooksListView({ runbooks, workspaceId }: RunbooksListViewProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[var(--text-tertiary)]" />
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Runbooks</h1>
          <span className="text-[12px] text-[var(--text-tertiary)]">{runbooks.length}</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {runbooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-8 w-8 text-[var(--text-quaternary)] mb-3" />
            <p className="text-[13px] text-[var(--text-secondary)]">No runbooks yet</p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              Open a section panel and click &quot;Run as Checklist&quot; to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {runbooks.map((runbook) => {
              const steps = runbook.runbook_steps ?? [];
              const total = steps.length;
              const completed = steps.filter((s) => s.status === "completed").length;
              const statusCfg = STATUS_CONFIG[runbook.status];
              return (
                <Link
                  key={runbook.id}
                  href={`/w/${workspaceId}/runbooks/${runbook.id}`}
                  className="block rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)] hover:border-[var(--border-default)] transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-medium text-[var(--text-primary)] truncate flex-1">
                      {runbook.name}
                    </span>
                    <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                    <span className="truncate max-w-[120px]">{runbook.sections?.name ?? "—"}</span>
                    <span>·</span>
                    <span className="font-medium text-[var(--text-secondary)] shrink-0">{completed}/{total} steps</span>
                    <span>·</span>
                    <span className="shrink-0">{formatDate(runbook.created_at)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

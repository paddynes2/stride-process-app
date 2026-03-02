"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { updateRunbookStep } from "@/lib/api/client";
import { toastError } from "@/lib/api/toast-helpers";
import { cn } from "@/lib/utils";
import type { Runbook, RunbookStep, RunbookStatus, RunbookStepStatus } from "@/types/database";

export type RunbookStepEnriched = RunbookStep & {
  steps: { id: string; name: string } | null;
};

const RUNBOOK_STATUS_CONFIG: Record<RunbookStatus, { variant: React.ComponentProps<typeof Badge>["variant"]; label: string }> = {
  active: { variant: "default", label: "Active" },
  completed: { variant: "success", label: "Completed" },
  cancelled: { variant: "destructive", label: "Cancelled" },
};

const STEP_STATUS_CONFIG: Record<RunbookStepStatus, { variant: React.ComponentProps<typeof Badge>["variant"]; label: string }> = {
  pending: { variant: "secondary", label: "Pending" },
  in_progress: { variant: "default", label: "In Progress" },
  completed: { variant: "success", label: "Done" },
  skipped: { variant: "warning", label: "Skipped" },
};

interface RunbookViewProps {
  runbook: Runbook;
  initialSteps: RunbookStepEnriched[];
  workspaceId: string;
}

export function RunbookView({ runbook, initialSteps, workspaceId }: RunbookViewProps) {
  const [steps, setSteps] = React.useState(initialSteps);
  const noteSaveTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const completedCount = steps.filter((s) => s.status === "completed").length;
  const total = steps.length;
  const progressPct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
  const statusCfg = RUNBOOK_STATUS_CONFIG[runbook.status];

  const handleToggle = async (step: RunbookStepEnriched) => {
    const newStatus: RunbookStepStatus = step.status === "completed" ? "pending" : "completed";
    const completedAt = newStatus === "completed" ? new Date().toISOString() : null;
    const prev = { ...step };
    setSteps((s) =>
      s.map((item) => item.id === step.id ? { ...item, status: newStatus, completed_at: completedAt } : item)
    );
    try {
      await updateRunbookStep(step.id, { status: newStatus, completed_at: completedAt });
    } catch (err) {
      setSteps((s) => s.map((item) => item.id === step.id ? prev : item));
      toastError("Failed to update step", { error: err });
    }
  };

  const handleNotesChange = (stepId: string, notes: string) => {
    setSteps((s) => s.map((item) => item.id === stepId ? { ...item, notes: notes || null } : item));
    clearTimeout(noteSaveTimers.current[stepId]);
    noteSaveTimers.current[stepId] = setTimeout(async () => {
      try {
        await updateRunbookStep(stepId, { notes: notes || null });
      } catch (err) {
        toastError("Failed to save notes", { error: err });
      }
    }, 600);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Link
            href={`/w/${workspaceId}/runbooks`}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
            aria-label="Back to runbooks"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <ClipboardList className="h-4 w-4 text-[var(--text-tertiary)]" />
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)] flex-1 truncate">
            {runbook.name}
          </h1>
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-[var(--bg-surface-active)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--brand)] rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="text-[12px] font-medium text-[var(--text-secondary)] shrink-0">
            {completedCount}/{total}
          </span>
        </div>
      </div>

      {/* Step checklist */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {steps.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] text-[var(--text-secondary)]">No steps in this runbook</p>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step) => {
              const isCompleted = step.status === "completed";
              const stepName = step.steps?.name ?? "Deleted Step";
              const stepStatusCfg = STEP_STATUS_CONFIG[step.status];
              return (
                <div
                  key={step.id}
                  className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)]"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggle(step)}
                      aria-label={isCompleted ? "Mark incomplete" : "Mark complete"}
                      className="shrink-0 mt-0.5 h-4 w-4 rounded-sm border flex items-center justify-center transition-colors"
                      style={
                        isCompleted
                          ? { backgroundColor: "var(--brand)", borderColor: "var(--brand)" }
                          : { borderColor: "var(--border-default)" }
                      }
                    >
                      {isCompleted && (
                        <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2}>
                          <polyline points="2,6 5,9 10,3" />
                        </svg>
                      )}
                    </button>

                    {/* Step name + status + notes */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span
                          className={cn(
                            "text-[13px] font-medium truncate flex-1",
                            isCompleted ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
                          )}
                        >
                          {stepName}
                        </span>
                        <Badge variant={stepStatusCfg.variant}>{stepStatusCfg.label}</Badge>
                      </div>
                      <textarea
                        value={step.notes ?? ""}
                        onChange={(e) => handleNotesChange(step.id, e.target.value)}
                        placeholder="Add notes..."
                        rows={1}
                        className="w-full text-[12px] bg-transparent border-b border-transparent resize-none text-[var(--text-secondary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

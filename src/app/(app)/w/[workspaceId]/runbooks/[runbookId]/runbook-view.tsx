"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { updateRunbook, updateRunbookStep } from "@/lib/api/client";
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

const STEP_STATUS_CONFIG: Record<RunbookStepStatus, { label: string }> = {
  pending: { label: "Pending" },
  in_progress: { label: "In Progress" },
  completed: { label: "Done" },
  skipped: { label: "Skipped" },
};

const STEP_STATUS_ORDER: RunbookStepStatus[] = ["pending", "in_progress", "completed", "skipped"];

const STEP_STATUS_ACTIVE_CLASS: Record<RunbookStepStatus, string> = {
  pending: "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border-subtle)]",
  in_progress: "bg-[var(--signal-subtle)] text-[var(--signal)] border-[var(--signal-subtle)]",
  completed: "bg-[var(--success-subtle)] text-[var(--success)] border-[var(--success-subtle)]",
  skipped: "bg-[var(--warning-subtle)] text-[var(--warning)] border-[var(--warning-subtle)]",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface RunbookViewProps {
  runbook: Runbook;
  initialSteps: RunbookStepEnriched[];
  workspaceId: string;
  userId?: string;
}

export function RunbookView({ runbook: initialRunbook, initialSteps, workspaceId, userId }: RunbookViewProps) {
  const [runbook, setRunbook] = React.useState(initialRunbook);
  const [steps, setSteps] = React.useState(initialSteps);
  const [confirmCompleteOpen, setConfirmCompleteOpen] = React.useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = React.useState(false);
  const noteSaveTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const isReadOnly = runbook.status === "completed" || runbook.status === "cancelled";
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const inProgressCount = steps.filter((s) => s.status === "in_progress").length;
  const skippedCount = steps.filter((s) => s.status === "skipped").length;
  const resolvedCount = completedCount + skippedCount;
  const total = steps.length;
  const progressPct = total === 0 ? 0 : Math.round((resolvedCount / total) * 100);
  const statusCfg = RUNBOOK_STATUS_CONFIG[runbook.status];

  const handleStepStatus = async (step: RunbookStepEnriched, newStatus: RunbookStepStatus) => {
    if (isReadOnly || step.status === newStatus) return;
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
    if (isReadOnly) return;
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

  const executeCompleteRunbook = async () => {
    setConfirmCompleteOpen(false);
    const prev = { ...runbook };
    const now = new Date().toISOString();
    setRunbook((r) => ({ ...r, status: "completed" as RunbookStatus, completed_at: now }));
    try {
      const updated = await updateRunbook(runbook.id, { status: "completed", completed_at: now });
      setRunbook(updated);
    } catch (err) {
      setRunbook(prev);
      toastError("Failed to complete runbook", { error: err });
    }
  };

  const executeCancelRunbook = async () => {
    setConfirmCancelOpen(false);
    const prev = { ...runbook };
    setRunbook((r) => ({ ...r, status: "cancelled" as RunbookStatus }));
    try {
      const updated = await updateRunbook(runbook.id, { status: "cancelled" });
      setRunbook(updated);
    } catch (err) {
      setRunbook(prev);
      toastError("Failed to cancel runbook", { error: err });
    }
  };

  const createdByLabel =
    userId && runbook.created_by === userId ? "by you" : `by ${runbook.created_by.slice(0, 8)}`;

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
          {!isReadOnly && (
            <div className="flex items-center gap-1.5">
              <Button variant="secondary" size="sm" asChild>
                <Link href="./playbook">
                  <Play className="h-3.5 w-3.5" aria-label="Playbook Mode" />
                  Playbook
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setConfirmCancelOpen(true)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => setConfirmCompleteOpen(true)}>
                Complete
              </Button>
            </div>
          )}
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
            {resolvedCount}/{total}
          </span>
        </div>

        {/* Progress text */}
        <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
          {resolvedCount} of {total} resolved
          {inProgressCount > 0 && (
            <> · {inProgressCount} in progress</>
          )}
        </p>
      </div>

      {/* Step checklist */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {/* Read-only banner */}
        {isReadOnly && (
          <div className="mb-3 px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface-active)] border border-[var(--border-subtle)] text-[12px] text-[var(--text-secondary)]">
            {runbook.status === "completed"
              ? `This runbook was completed${runbook.completed_at ? ` on ${formatDate(runbook.completed_at)}` : ""}`
              : "This runbook was cancelled"}
          </div>
        )}

        {steps.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-[13px] text-[var(--text-secondary)]">No steps in this runbook</p>
          </div>
        ) : (
          <div className="space-y-2">
            {steps.map((step) => {
              const isCompleted = step.status === "completed";
              const stepName = step.steps?.name ?? "Deleted Step";
              return (
                <div
                  key={step.id}
                  className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)]"
                >
                  {/* Step name */}
                  <p
                    className={cn(
                      "text-[13px] font-medium mb-1.5",
                      isCompleted ? "line-through text-[var(--text-tertiary)]" : "text-[var(--text-primary)]"
                    )}
                  >
                    {stepName}
                  </p>

                  {/* Status button group */}
                  <div className="flex items-center gap-1 flex-wrap mb-2">
                    {STEP_STATUS_ORDER.map((s) => {
                      const isActive = step.status === s;
                      return (
                        <button
                          key={s}
                          disabled={isReadOnly}
                          onClick={() => handleStepStatus(step, s)}
                          aria-label={`Set status to ${STEP_STATUS_CONFIG[s].label}`}
                          aria-pressed={isActive}
                          className={cn(
                            "text-[10px] px-1.5 py-0.5 rounded-sm font-medium border transition-colors",
                            isActive
                              ? STEP_STATUS_ACTIVE_CLASS[s]
                              : "text-[var(--text-quaternary)] border-transparent hover:text-[var(--text-tertiary)] disabled:hover:text-[var(--text-quaternary)]"
                          )}
                        >
                          {STEP_STATUS_CONFIG[s].label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Notes */}
                  <textarea
                    value={step.notes ?? ""}
                    onChange={(e) => handleNotesChange(step.id, e.target.value)}
                    placeholder="Add notes..."
                    rows={1}
                    disabled={isReadOnly}
                    className="w-full text-[12px] bg-transparent border-b border-transparent resize-none text-[var(--text-secondary)] placeholder:text-[var(--text-quaternary)] focus:outline-none focus:border-[var(--border-subtle)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Metadata footer */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] px-6 py-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-tertiary)]">
          <span>Started {formatDate(runbook.started_at)}</span>
          {runbook.completed_at && (
            <span>Completed {formatDate(runbook.completed_at)}</span>
          )}
          <span>Created {createdByLabel}</span>
        </div>
      </div>

      {/* Complete confirmation dialog */}
      <Dialog open={confirmCompleteOpen} onOpenChange={setConfirmCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete runbook?</DialogTitle>
            <DialogDescription>
              Marking this runbook as complete will lock all steps. You will no longer be able to
              update step statuses or add notes.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmCompleteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executeCompleteRunbook}>
              Mark Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel confirmation dialog */}
      <Dialog open={confirmCancelOpen} onOpenChange={setConfirmCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel runbook?</DialogTitle>
            <DialogDescription>
              Cancelling this runbook will stop execution and lock all steps. This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirmCancelOpen(false)}>
              Go Back
            </Button>
            <Button variant="destructive" onClick={executeCancelRunbook}>
              Cancel Runbook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

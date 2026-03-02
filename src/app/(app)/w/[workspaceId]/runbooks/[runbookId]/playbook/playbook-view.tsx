"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateRunbookStep } from "@/lib/api/client";
import { toastError } from "@/lib/api/toast-helpers";
import { cn } from "@/lib/utils";
import type { Runbook } from "@/types/database";
import type { RunbookStepEnriched } from "../runbook-view";

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface PlaybookViewProps {
  runbook: Runbook;
  initialSteps: RunbookStepEnriched[];
  workspaceId: string;
}

export function PlaybookView({ runbook, initialSteps, workspaceId }: PlaybookViewProps) {
  const [steps, setSteps] = React.useState(initialSteps);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [isUpdating, setIsUpdating] = React.useState(false);

  const total = steps.length;
  const completedCount = steps.filter((s) => s.status === "completed").length;
  const progressPct = total === 0 ? 0 : Math.round((completedCount / total) * 100);

  const currentStep = steps[currentIndex] ?? null;
  const stepName = currentStep?.steps?.name ?? "Deleted Step";
  const isCompleted = currentStep?.status === "completed";
  const isReadOnly = runbook.status !== "active";

  const handleMarkComplete = async () => {
    if (!currentStep || isUpdating || isReadOnly) return;
    const now = new Date().toISOString();
    const prev = { ...currentStep };
    setIsUpdating(true);

    const updatedSteps = steps.map((item) =>
      item.id === currentStep.id
        ? { ...item, status: "completed" as const, completed_at: now }
        : item
    );
    setSteps(updatedSteps);

    // Auto-advance to next non-completed step
    const nextIdx = updatedSteps.findIndex(
      (s, i) => i > currentIndex && (s.status === "pending" || s.status === "in_progress")
    );
    if (nextIdx !== -1) {
      setCurrentIndex(nextIdx);
    }

    try {
      await updateRunbookStep(currentStep.id, { status: "completed", completed_at: now });
    } catch (err) {
      setSteps((s) => s.map((item) => (item.id === currentStep.id ? prev : item)));
      toastError("Failed to update step", { error: err });
    } finally {
      setIsUpdating(false);
    }
  };

  if (total === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-[var(--surface)] flex flex-col items-center justify-center gap-4">
        <p className="text-[14px] text-[var(--text-secondary)]">No steps in this runbook.</p>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/w/${workspaceId}/runbooks/${runbook.id}`}>
            <ArrowLeft className="h-4 w-4" aria-label="Back" />
            Back to Runbook
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[var(--surface)] flex flex-col">
      {/* Top bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <Link
          href={`/w/${workspaceId}/runbooks/${runbook.id}`}
          className="flex items-center gap-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors text-[13px] shrink-0"
        >
          <ArrowLeft className="h-4 w-4" aria-label="Back" />
          Exit
        </Link>
        <span className="text-[13px] font-medium text-[var(--text-primary)] truncate mx-4 text-center">
          {runbook.name}
        </span>
        <span className="text-[12px] text-[var(--text-tertiary)] shrink-0">
          Step {currentIndex + 1} of {total}
        </span>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-4 py-2">
        <div className="h-1.5 bg-[var(--bg-surface-active)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[var(--brand)] rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Step content — vertically centered */}
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-xl">
          {/* Status indicator */}
          <div className="mb-4">
            {isCompleted ? (
              <div className="flex items-center gap-2">
                <CheckCircle2
                  className="h-5 w-5 text-[var(--success)] shrink-0"
                  aria-label="Completed"
                />
                <span className="text-[12px] text-[var(--success)]">
                  Completed
                  {currentStep?.completed_at
                    ? ` · ${formatDate(currentStep.completed_at)}`
                    : ""}
                </span>
              </div>
            ) : (
              <Badge
                variant={currentStep?.status === "in_progress" ? "in_progress" : "secondary"}
              >
                {currentStep?.status === "in_progress" ? "In Progress" : "Pending"}
              </Badge>
            )}
          </div>

          {/* Step name — large and centered */}
          <h2
            className={cn(
              "text-[28px] font-semibold leading-tight mb-8",
              isCompleted
                ? "line-through text-[var(--text-tertiary)]"
                : "text-[var(--text-primary)]"
            )}
          >
            {stepName}
          </h2>

          {/* Primary action */}
          {!isCompleted && !isReadOnly && (
            <Button
              size="xl"
              className="w-full mb-4"
              onClick={handleMarkComplete}
              disabled={isUpdating}
              loading={isUpdating}
            >
              Mark Complete &amp; Next
            </Button>
          )}

          {/* Prev / Next navigation */}
          <div className="flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              size="default"
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              disabled={currentIndex === 0}
              aria-label="Previous step"
            >
              <ChevronLeft className="h-4 w-4" aria-label="Previous" />
              Prev
            </Button>
            <Button
              variant="secondary"
              size="default"
              onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
              disabled={currentIndex === total - 1}
              aria-label="Next step"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-label="Next" />
            </Button>
          </div>
        </div>
      </div>

      {/* Step dots + summary */}
      <div className="shrink-0 px-6 py-4 border-t border-[var(--border-subtle)]">
        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-xl mx-auto">
          {steps.map((step, i) => (
            <button
              key={step.id}
              onClick={() => setCurrentIndex(i)}
              aria-label={`Go to step ${i + 1}`}
              className={cn(
                "w-2.5 h-2.5 rounded-full transition-all min-w-[10px] min-h-[10px]",
                i === currentIndex
                  ? "bg-[var(--text-primary)] scale-125"
                  : step.status === "completed"
                  ? "bg-[var(--brand)]"
                  : "bg-[var(--bg-surface-active)] hover:bg-[var(--text-tertiary)]"
              )}
            />
          ))}
        </div>
        <p className="text-center text-[11px] text-[var(--text-tertiary)] mt-2">
          {completedCount} of {total} steps completed
        </p>
      </div>
    </div>
  );
}

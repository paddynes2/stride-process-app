"use client";

import * as React from "react";
import { X, Trash2, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

const RichTextEditor = dynamic(
  () => import("./rich-text-editor").then((mod) => ({ default: mod.RichTextEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[120px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] animate-pulse" />
    ),
  }
);
import { updateSection, deleteSection as apiDeleteSection, fetchStepRolesBatch } from "@/lib/api/client";
import type { StepRoleWithDetails } from "@/lib/api/client";
import type { Section, Step } from "@/types/database";
import { TaskCountsContext } from "@/types/canvas";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";

interface SectionDetailPanelProps {
  section: Section;
  steps: Step[];
  onUpdate: (section: Section) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function SectionDetailPanel({ section, steps, onUpdate, onDelete, onClose }: SectionDetailPanelProps) {
  const [name, setName] = React.useState(section.name);
  const nameTimeoutRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  const [stepRolesMap, setStepRolesMap] = React.useState<Record<string, StepRoleWithDetails[]>>({});

  React.useEffect(() => {
    setName(section.name);
  }, [section.id, section.name]);

  // Fetch step roles for cost calculation
  React.useEffect(() => {
    let cancelled = false;
    const stepIds = steps.map((s) => s.id);
    if (stepIds.length === 0) {
      setStepRolesMap({});
      return;
    }
    fetchStepRolesBatch(stepIds)
      .then((roles) => {
        if (cancelled) return;
        const map: Record<string, StepRoleWithDetails[]> = {};
        for (const sr of roles) {
          if (!map[sr.step_id]) map[sr.step_id] = [];
          map[sr.step_id].push(sr);
        }
        setStepRolesMap(map);
      })
      .catch(() => { /* silently fail — cost section stays hidden */ });
    return () => { cancelled = true; };
  }, [section.id, steps]);

  const handleFieldUpdate = async (field: string, value: unknown) => {
    try {
      const updated = await updateSection(section.id, { [field]: value });
      onUpdate(updated);
    } catch (err) {
      toastError(`Failed to update ${field}`, { error: err, retry: () => handleFieldUpdate(field, value) });
    }
  };

  const handleNameChange = (newName: string) => {
    setName(newName);
    clearTimeout(nameTimeoutRef.current);
    nameTimeoutRef.current = setTimeout(() => {
      if (newName.trim()) handleFieldUpdate("name", newName.trim());
    }, 500);
  };

  const handleDelete = async () => {
    try {
      await apiDeleteSection(section.id);
      onDelete(section.id);
      toast.success("Section deleted");
    } catch (err) {
      toastError("Failed to delete section", { error: err });
    }
  };

  const taskCounts = React.useContext(TaskCountsContext);

  // Task rollup — total/completed across all steps in this section
  const totalTasksCompleted = steps.reduce((sum, s) => sum + (taskCounts.get(s.id)?.completed ?? 0), 0);
  const totalTasksCount = steps.reduce((sum, s) => sum + (taskCounts.get(s.id)?.total ?? 0), 0);
  const stepsWithTasks = steps.filter((s) => (taskCounts.get(s.id)?.total ?? 0) > 0);

  // Status distribution
  const statusCounts = steps.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Maturity averages (exclude null values)
  const stepsWithMaturity = steps.filter((s) => s.maturity_score != null);
  const stepsWithTarget = steps.filter((s) => s.target_maturity != null);
  const avgMaturity = stepsWithMaturity.length > 0
    ? stepsWithMaturity.reduce((sum, s) => sum + s.maturity_score!, 0) / stepsWithMaturity.length
    : null;
  const avgTarget = stepsWithTarget.length > 0
    ? stepsWithTarget.reduce((sum, s) => sum + s.target_maturity!, 0) / stepsWithTarget.length
    : null;
  const maturityGap = avgMaturity != null && avgTarget != null ? avgTarget - avgMaturity : null;

  // Section cost: sum of step costs
  const sectionCost = steps.reduce((total, s) => {
    if (!s.time_minutes || !s.frequency_per_month) return total;
    const monthlyHours = (s.time_minutes * s.frequency_per_month) / 60;
    const roles = stepRolesMap[s.id] ?? [];
    const rolesWithRate = roles.filter((sr) => sr.role.hourly_rate != null);
    if (rolesWithRate.length === 0) return total;
    const avgRate = rolesWithRate.reduce((sum, sr) => sum + Number(sr.role.hourly_rate), 0) / rolesWithRate.length;
    return total + monthlyHours * avgRate;
  }, 0);

  const totalMonthlyHours = steps.reduce((sum, s) => {
    if (!s.time_minutes || !s.frequency_per_month) return sum;
    return sum + (s.time_minutes * s.frequency_per_month) / 60;
  }, 0);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Section Details
        </span>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close panel">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Name
          </label>
          <Input value={name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Section name" />
        </div>

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Summary
          </label>
          <Textarea
            value={section.summary ?? ""}
            onChange={(e) => handleFieldUpdate("summary", e.target.value || null)}
            placeholder="Brief description of this section..."
            rows={3}
          />
        </div>

        <Separator />

        {/* Steps overview */}
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-2">
            Steps ({steps.length})
          </label>
          {steps.length === 0 ? (
            <p className="text-[11px] text-[var(--text-tertiary)]">No steps in this section</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Badge key={status} variant={status as "draft" | "in_progress" | "testing" | "live" | "archived"}>
                  {status.replace("_", " ")}: {count}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Task rollup — only shown when section has steps with tasks */}
        {totalTasksCount > 0 && (
          <>
            <Separator />
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <ListTodo className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
                <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">
                  Tasks
                </label>
                <span className="ml-auto text-[11px] font-semibold text-[var(--text-primary)]">
                  {totalTasksCompleted}/{totalTasksCount}
                </span>
              </div>
              <div className="space-y-1.5">
                {stepsWithTasks.map((s) => {
                  const tc = taskCounts.get(s.id)!;
                  return (
                    <div key={s.id} className="flex items-center justify-between">
                      <span className="text-[12px] text-[var(--text-secondary)] truncate flex-1 min-w-0 mr-2">
                        {s.name}
                      </span>
                      <span className="text-[12px] font-medium text-[var(--text-primary)] shrink-0">
                        {tc.completed}/{tc.total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Maturity averages */}
        {(avgMaturity != null || avgTarget != null) && (
          <>
            <Separator />
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-2">
                Maturity
              </label>
              <div className="space-y-2">
                {avgMaturity != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--text-secondary)]">Current Avg</span>
                    <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                      {avgMaturity.toFixed(1)} / 5
                    </span>
                  </div>
                )}
                {avgTarget != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--text-secondary)]">Target Avg</span>
                    <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                      {avgTarget.toFixed(1)} / 5
                    </span>
                  </div>
                )}
                {maturityGap != null && (
                  <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)]">
                    <span className="text-[12px] text-[var(--text-secondary)]">Gap</span>
                    <span
                      className="text-[12px] font-semibold"
                      style={{
                        color: maturityGap <= 0 ? "#22C55E" : maturityGap <= 1 ? "#EAB308" : "#EF4444",
                      }}
                    >
                      {maturityGap > 0 ? `+${maturityGap.toFixed(1)} levels to improve` : "On target"}
                    </span>
                  </div>
                )}
                <p className="text-[10px] text-[var(--text-quaternary)]">
                  Based on {stepsWithMaturity.length} of {steps.length} steps scored
                </p>
              </div>
            </div>
          </>
        )}

        {/* Section cost */}
        {(totalMonthlyHours > 0 || sectionCost > 0) && (
          <>
            <Separator />
            <div>
              <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-2">
                Cost
              </label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text-secondary)]">Monthly Time</span>
                  <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                    {totalMonthlyHours.toFixed(1)}h
                  </span>
                </div>
                {sectionCost > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-[var(--text-secondary)]">Monthly Cost</span>
                    <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                      ${sectionCost.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-1.5">
            Notes
          </label>
          <RichTextEditor
            content={section.notes ?? ""}
            onChange={(html) => handleFieldUpdate("notes", html)}
          />
        </div>
      </div>

      <div className="px-4 py-3 border-t border-[var(--border-subtle)]">
        <Button variant="destructive" size="sm" onClick={handleDelete} className="w-full">
          <Trash2 className="h-3.5 w-3.5" />
          Delete Section
        </Button>
      </div>
    </div>
  );
}

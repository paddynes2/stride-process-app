"use client";

import * as React from "react";
import Link from "next/link";
import { Lightbulb, ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { updateImprovementIdea, deleteImprovementIdea } from "@/lib/api/client";
import { toastError } from "@/lib/api/toast-helpers";
import type { ImprovementIdea, ImprovementStatus, ImprovementPriority } from "@/types/database";

const STATUS_CONFIG: Record<ImprovementStatus, { label: string; className: string }> = {
  proposed: { label: "Proposed", className: "bg-[var(--bg-surface-secondary)] text-[var(--text-secondary)]" },
  approved: { label: "Approved", className: "bg-[#3B82F6]/15 text-[#3B82F6]" },
  in_progress: { label: "In Progress", className: "bg-[#EAB308]/15 text-[#EAB308]" },
  completed: { label: "Completed", className: "bg-[#22C55E]/15 text-[#22C55E]" },
  rejected: { label: "Rejected", className: "bg-[#EF4444]/15 text-[#EF4444]" },
};

const PRIORITY_CONFIG: Record<ImprovementPriority, { label: string; className: string }> = {
  low: { label: "Low", className: "bg-[var(--bg-surface-secondary)] text-[var(--text-tertiary)]" },
  medium: { label: "Medium", className: "bg-[#3B82F6]/15 text-[#3B82F6]" },
  high: { label: "High", className: "bg-[#EAB308]/15 text-[#EAB308]" },
  critical: { label: "Critical", className: "bg-[#EF4444]/15 text-[#EF4444]" },
};

const ALL_STATUSES: ImprovementStatus[] = ["proposed", "approved", "in_progress", "completed", "rejected"];
const ALL_PRIORITIES: ImprovementPriority[] = ["low", "medium", "high", "critical"];

type StatusFilter = "all" | ImprovementStatus;
type PriorityFilter = "all" | ImprovementPriority;

interface ImprovementsViewProps {
  initialIdeas: ImprovementIdea[];
  entityNames: Record<string, string>;
  workspaceId: string;
  entityTabMap: Record<string, string>;
}

export function ImprovementsView({ initialIdeas, entityNames, workspaceId, entityTabMap }: ImprovementsViewProps) {
  const [ideas, setIdeas] = React.useState<ImprovementIdea[]>(initialIdeas);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");

  const filtered = React.useMemo(() => {
    return ideas.filter((idea) => {
      if (statusFilter !== "all" && idea.status !== statusFilter) return false;
      if (priorityFilter !== "all" && idea.priority !== priorityFilter) return false;
      return true;
    });
  }, [ideas, statusFilter, priorityFilter]);

  const handleStatusChange = async (idea: ImprovementIdea, newStatus: ImprovementStatus) => {
    try {
      const updated = await updateImprovementIdea(idea.id, { status: newStatus });
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      toastError("Failed to update status", { error: err });
    }
  };

  const handleDelete = async (idea: ImprovementIdea) => {
    if (!window.confirm("Delete this improvement idea?")) return;
    try {
      await deleteImprovementIdea(idea.id);
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
    } catch (err) {
      toastError("Failed to delete improvement", { error: err });
    }
  };

  const getLinkedEntityId = (idea: ImprovementIdea): string | null =>
    idea.linked_step_id ?? idea.linked_section_id ?? idea.linked_touchpoint_id ?? null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[var(--text-tertiary)]" />
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Improvements</h1>
          <span className="text-[12px] text-[var(--text-tertiary)]">{filtered.length}</span>
        </div>
      </div>

      {/* Status filter tabs + priority filter */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-[var(--border-subtle)] overflow-x-auto shrink-0">
        <button
          onClick={() => setStatusFilter("all")}
          className={cn(
            "px-3 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors whitespace-nowrap",
            statusFilter === "all"
              ? "bg-[var(--signal-subtle)] text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
          )}
        >
          All
        </button>
        {ALL_STATUSES.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-3 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors whitespace-nowrap",
              statusFilter === status
                ? "bg-[var(--signal-subtle)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            )}
          >
            {STATUS_CONFIG[status].label}
          </button>
        ))}
        <div className="ml-auto shrink-0 pl-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
            className="px-2.5 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium bg-[var(--bg-surface-active)] border border-[var(--border-subtle)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border-default)]"
          >
            <option value="all">All Priorities</option>
            {ALL_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_CONFIG[p].label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ideas list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Lightbulb className="h-8 w-8 text-[var(--text-quaternary)] mb-3" />
            <p className="text-[13px] text-[var(--text-secondary)]">
              {statusFilter === "all" && priorityFilter === "all"
                ? "No improvement ideas yet"
                : "No ideas match the current filters"}
            </p>
            {statusFilter === "all" && priorityFilter === "all" && (
              <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                Add improvements from step, section, or touchpoint detail panels.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((idea) => {
              const linkedEntityId = getLinkedEntityId(idea);
              const entityName = linkedEntityId ? (entityNames[linkedEntityId] ?? null) : null;
              const tabId = linkedEntityId ? (entityTabMap[linkedEntityId] ?? null) : null;
              const statusConf = STATUS_CONFIG[idea.status];
              const priorityConf = PRIORITY_CONFIG[idea.priority];

              return (
                <div
                  key={idea.id}
                  className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)]"
                >
                  {/* Top row: title + badges */}
                  <div className="flex items-start gap-2 mb-1.5">
                    <span className="text-[13px] font-semibold text-[var(--text-primary)] flex-1 min-w-0 leading-snug">
                      {idea.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Status badge with inline change dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={cn(
                              "flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-sm font-medium transition-opacity hover:opacity-80",
                              statusConf.className
                            )}
                          >
                            {statusConf.label}
                            <ChevronDown className="h-2.5 w-2.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {ALL_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onSelect={() => handleStatusChange(idea, s)}
                              className={idea.status === s ? "font-semibold" : ""}
                            >
                              {STATUS_CONFIG[s].label}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Priority badge */}
                      <span
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded-sm font-medium",
                          priorityConf.className
                        )}
                      >
                        {priorityConf.label}
                      </span>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(idea)}
                        className="text-[var(--text-tertiary)] hover:text-[#EF4444] transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Description preview */}
                  {idea.description && (
                    <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 mb-1.5">
                      {idea.description}
                    </p>
                  )}

                  {/* Linked entity */}
                  {entityName && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-[10px] text-[var(--text-quaternary)]">Linked to:</span>
                      <Link
                        href={tabId ? `/w/${workspaceId}/${tabId}` : `/w/${workspaceId}`}
                        className="text-[11px] text-[var(--accent-blue)] hover:underline truncate max-w-[200px]"
                      >
                        {entityName}
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

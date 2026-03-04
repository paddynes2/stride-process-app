"use client";

import * as React from "react";
import Link from "next/link";
import { Lightbulb, ChevronDown, ChevronUp, Trash2, Sparkles, RefreshCw, AlertCircle, KeyRound, Clock, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { updateImprovementIdea, deleteImprovementIdea, createImprovementIdea, fetchAISuggestions, type AISuggestion, type AISuggestionCategory } from "@/lib/api/client";
import { toastError } from "@/lib/api/toast-helpers";
import type { ImprovementIdea, ImprovementStatus, ImprovementPriority, Tab } from "@/types/database";

type SuggestionsState =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "loaded"; suggestions: AISuggestion[] }
  | { type: "not_configured" }
  | { type: "rate_limited"; retryAfterSeconds: number }
  | { type: "error"; message: string };

// ─── Config ──────────────────────────────────────────────────────────────────

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

const CATEGORY_CONFIG: Record<AISuggestionCategory, { label: string; className: string }> = {
  process: { label: "Process", className: "bg-[#8B5CF6]/15 text-[#8B5CF6]" },
  technology: { label: "Technology", className: "bg-[#3B82F6]/15 text-[#3B82F6]" },
  people: { label: "People", className: "bg-[#22C55E]/15 text-[#22C55E]" },
  governance: { label: "Governance", className: "bg-[#EAB308]/15 text-[#EAB308]" },
};

const ALL_STATUSES: ImprovementStatus[] = ["proposed", "approved", "in_progress", "completed", "rejected"];
const ALL_PRIORITIES: ImprovementPriority[] = ["low", "medium", "high", "critical"];

const RATE_LIMIT_RE = /Please wait (\d+) seconds/;

function classifySuggestionsError(err: unknown): SuggestionsState {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("OPENROUTER_API_KEY") || msg.includes("OpenRouter API key")) {
    return { type: "not_configured" };
  }
  const rateMatch = RATE_LIMIT_RE.exec(msg);
  if (rateMatch) {
    return { type: "rate_limited", retryAfterSeconds: parseInt(rateMatch[1], 10) };
  }
  return { type: "error", message: msg };
}

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusFilter = "all" | ImprovementStatus;
type PriorityFilter = "all" | ImprovementPriority;

interface ImprovementsViewProps {
  initialIdeas: ImprovementIdea[];
  entityNames: Record<string, string>;
  workspaceId: string;
  entityTabMap: Record<string, string>;
  tabs?: Pick<Tab, "id" | "canvas_type">[];
  hasSteps?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ImprovementsView({ initialIdeas, entityNames, workspaceId, entityTabMap, tabs = [], hasSteps = true }: ImprovementsViewProps) {
  const [ideas, setIdeas] = React.useState<ImprovementIdea[]>(initialIdeas);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = React.useState<PriorityFilter>("all");
  const [suggestionsState, setSuggestionsState] = React.useState<SuggestionsState>({ type: "idle" });
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);
  const [addedIndices, setAddedIndices] = React.useState<Set<number>>(new Set());

  const filtered = React.useMemo(() => {
    return ideas.filter((idea) => {
      if (statusFilter !== "all" && idea.status !== statusFilter) return false;
      if (priorityFilter !== "all" && idea.priority !== priorityFilter) return false;
      return true;
    });
  }, [ideas, statusFilter, priorityFilter]);

  const handleStatusChange = async (idea: ImprovementIdea, newStatus: ImprovementStatus) => {
    const prevIdeas = [...ideas];
    setIdeas((prev) => prev.map((i) => (i.id === idea.id ? { ...i, status: newStatus } : i)));
    try {
      const updated = await updateImprovementIdea(idea.id, { status: newStatus });
      setIdeas((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
    } catch (err) {
      setIdeas(prevIdeas);
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

  const handleGenerateSuggestions = async () => {
    setSuggestionsState({ type: "loading" });
    setIsPanelOpen(true);
    try {
      const suggestions = await fetchAISuggestions(workspaceId);
      setSuggestionsState({ type: "loaded", suggestions });
    } catch (err) {
      setSuggestionsState(classifySuggestionsError(err));
    }
  };

  const handleAddAsImprovement = async (suggestion: AISuggestion, index: number) => {
    const linkedStepId = suggestion.affected_step_ids[0] ?? null;
    try {
      const newIdea = await createImprovementIdea({
        workspace_id: workspaceId,
        title: suggestion.title,
        description: suggestion.description,
        priority: "medium",
        ...(linkedStepId ? { linked_step_id: linkedStepId } : {}),
      });
      setIdeas((prev) => [newIdea, ...prev]);
      setAddedIndices((prev) => new Set(prev).add(index));
      setTimeout(() => {
        setAddedIndices((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }, 2000);
    } catch (err) {
      toastError("Failed to add improvement", { error: err });
    }
  };

  const getLinkedEntityId = (idea: ImprovementIdea): string | null =>
    idea.linked_step_id ?? idea.linked_section_id ?? idea.linked_touchpoint_id ?? null;

  const isLoading = suggestionsState.type === "loading";
  const showPanel = suggestionsState.type !== "idle";

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-[var(--text-tertiary)]" />
            <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Improvements</h1>
            <span className="text-[12px] text-[var(--text-tertiary)]">{filtered.length}</span>
          </div>
          <button
            onClick={handleGenerateSuggestions}
            disabled={isLoading || suggestionsState.type === "rate_limited" || !hasSteps}
            title={!hasSteps ? "Add steps to the canvas before generating suggestions" : undefined}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors",
              isLoading || suggestionsState.type === "rate_limited" || !hasSteps
                ? "bg-[var(--bg-surface-active)] text-[var(--text-tertiary)] cursor-not-allowed"
                : "bg-[var(--accent-blue)] text-white hover:opacity-90"
            )}
          >
            {isLoading ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            {isLoading ? "Generating…" : "AI Suggestions"}
          </button>
        </div>
      </div>

      {/* AI Suggestions collapsible panel */}
      {showPanel && (
        <div className="border-b border-[var(--border-subtle)] shrink-0">
          <button
            onClick={() => setIsPanelOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--bg-surface-hover)] transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[var(--accent-blue)]" />
              <span className="text-[12px] font-semibold text-[var(--text-primary)]">AI Suggestions</span>
              {suggestionsState.type === "loaded" && (
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {suggestionsState.suggestions.length}
                </span>
              )}
            </div>
            {isPanelOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
            )}
          </button>

          {isPanelOpen && (
            <div className="px-4 pb-3">
              {suggestionsState.type === "loading" ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <RefreshCw className="h-4 w-4 text-[var(--text-tertiary)] animate-spin" />
                  <span className="text-[12px] text-[var(--text-secondary)]">Generating suggestions…</span>
                </div>
              ) : suggestionsState.type === "not_configured" ? (
                <div className="flex items-start gap-2 py-3">
                  <KeyRound className="h-4 w-4 text-[var(--text-quaternary)] shrink-0 mt-0.5" />
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    AI suggestions require{" "}
                    <code className="text-[var(--text-primary)] bg-[var(--bg-surface-active)] px-1 rounded">
                      OPENROUTER_API_KEY
                    </code>{" "}
                    in your environment variables.
                  </p>
                </div>
              ) : suggestionsState.type === "rate_limited" ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <Clock className="h-4 w-4 text-[var(--text-quaternary)]" />
                  <span className="text-[12px] text-[var(--text-secondary)]">
                    Rate limited — try again in about{" "}
                    {Math.ceil(suggestionsState.retryAfterSeconds / 60)}{" "}
                    minute{Math.ceil(suggestionsState.retryAfterSeconds / 60) !== 1 ? "s" : ""}.
                  </span>
                </div>
              ) : suggestionsState.type === "error" ? (
                <div className="flex items-start gap-2 py-3">
                  <AlertCircle className="h-4 w-4 text-[#EF4444]/60 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] text-[var(--text-secondary)] mb-1">{suggestionsState.message}</p>
                    <button
                      onClick={handleGenerateSuggestions}
                      className="text-[11px] text-[var(--accent-blue)] hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                </div>
              ) : suggestionsState.type === "loaded" && suggestionsState.suggestions.length === 0 ? (
                <div className="flex items-center justify-center py-4">
                  <span className="text-[12px] text-[var(--text-secondary)]">
                    No suggestions generated — add more steps with metrics to improve results.
                  </span>
                </div>
              ) : suggestionsState.type === "loaded" ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1 mt-1">
                  {suggestionsState.suggestions.map((suggestion, i) => {
                    const catConf = CATEGORY_CONFIG[suggestion.category] ?? CATEGORY_CONFIG.process;
                    return (
                      <div
                        key={i}
                        className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)]"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-[12px] font-semibold text-[var(--text-primary)] flex-1 min-w-0 leading-snug">
                            {suggestion.title}
                          </span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-sm font-medium shrink-0", catConf.className)}>
                            {catConf.label}
                          </span>
                        </div>
                        <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed mb-1.5">
                          {suggestion.description}
                        </p>
                        {suggestion.estimated_impact && (
                          <p className="text-[11px] text-[#22C55E] mb-2">
                            {suggestion.estimated_impact}
                          </p>
                        )}
                        <button
                          onClick={() => handleAddAsImprovement(suggestion, i)}
                          disabled={addedIndices.has(i)}
                          className={cn(
                            "flex items-center gap-1 text-[11px]",
                            addedIndices.has(i)
                              ? "text-[#22C55E] cursor-default"
                              : "text-[var(--accent-blue)] hover:underline"
                          )}
                        >
                          {addedIndices.has(i) ? (
                            <>
                              <Check className="h-3 w-3" />
                              Added ✓
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Add as Improvement
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {/* Status filter tabs + priority filter */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-[var(--border-subtle)] overflow-x-auto shrink-0">
        <button
          onClick={() => setStatusFilter("all")}
          aria-pressed={statusFilter === "all"}
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
            aria-pressed={statusFilter === status}
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
              <>
                <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                  Add improvements from step, section, or touchpoint detail panels.
                </p>
                {tabs.length > 0 && (
                  <Link
                    href={`/w/${workspaceId}/${(tabs.find((t) => t.canvas_type === "process") ?? tabs[0]).id}`}
                    className="text-[var(--accent-blue)] hover:underline text-[12px] mt-2"
                  >
                    Go to Canvas
                  </Link>
                )}
              </>
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
                        aria-label="Delete improvement idea"
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

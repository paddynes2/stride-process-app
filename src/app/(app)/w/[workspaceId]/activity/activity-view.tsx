"use client";

import * as React from "react";
import Link from "next/link";
import { Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchActivityLog } from "@/lib/api/client";
import type { ActivityLog, ActivityAction } from "@/types/database";

const ACTION_LABELS: Record<ActivityAction, string> = {
  created: "Created",
  updated: "Updated",
  deleted: "Deleted",
  completed: "Completed",
  assigned: "Assigned",
  commented: "Commented",
  exported: "Exported",
  shared: "Shared",
};

const ENTITY_TYPE_SINGULAR: Record<string, string> = {
  steps: "step",
  workspaces: "workspace",
  sections: "section",
  connections: "connection",
  stages: "stage",
  touchpoints: "touchpoint",
  touchpoint_connections: "touchpoint connection",
  teams: "team",
  roles: "role",
  people: "person",
  tools: "tool",
  step_roles: "role assignment",
  perspectives: "perspective",
  annotations: "annotation",
  comments: "comment",
  tasks: "task",
  runbooks: "runbook",
  runbook_steps: "runbook step",
  shares: "share",
};

const ALL_ACTIONS: ActivityAction[] = [
  "created",
  "updated",
  "deleted",
  "completed",
  "assigned",
  "commented",
  "exported",
  "shared",
];

type FilterTab = "all" | ActivityAction;

function formatRelativeTime(dateString: string): string {
  const diffSecs = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  return `${Math.floor(diffSecs / 86400)}d ago`;
}

interface ActivityViewProps {
  initialEntries: ActivityLog[];
  workspaceId: string;
  entityTabMap: Record<string, string>;
}

export function ActivityView({ initialEntries, workspaceId, entityTabMap }: ActivityViewProps) {
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");
  const [entries, setEntries] = React.useState<ActivityLog[]>(initialEntries);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(initialEntries.length === 50);

  const filtered = entries;

  async function fetchFiltered(action: FilterTab) {
    setLoading(true);
    try {
      const result = await fetchActivityLog(workspaceId, {
        limit: 50,
        offset: 0,
        ...(action !== "all" && { action }),
      });
      setEntries(result);
      setHasMore(result.length === 50);
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(action: FilterTab) {
    setActiveFilter(action);
    setEntries([]);
    fetchFiltered(action);
  }

  async function loadMore() {
    setLoading(true);
    try {
      const more = await fetchActivityLog(workspaceId, {
        limit: 50,
        offset: entries.length,
        ...(activeFilter !== "all" && { action: activeFilter }),
      });
      setEntries((prev) => [...prev, ...more]);
      setHasMore(more.length === 50);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-[var(--text-tertiary)]" />
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Activity</h1>
          <span className="text-[12px] text-[var(--text-tertiary)]">{filtered.length}</span>
        </div>
      </div>

      {/* Action filter tabs */}
      <div className="relative flex items-center gap-0.5 px-2 md:px-4 py-2 border-b border-[var(--border-subtle)] overflow-x-auto shrink-0" style={{ maskImage: "linear-gradient(to right, black 90%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, black 90%, transparent 100%)" }}>
        <button
          onClick={() => handleFilterChange("all")}
          className={cn(
            "px-2 md:px-3 py-1 rounded-[var(--radius-sm)] text-[11px] md:text-[12px] font-medium transition-colors whitespace-nowrap",
            activeFilter === "all"
              ? "bg-[var(--signal-subtle)] text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
          )}
        >
          All
        </button>
        {ALL_ACTIONS.map((action) => (
          <button
            key={action}
            onClick={() => handleFilterChange(action)}
            className={cn(
              "px-2 md:px-3 py-1 rounded-[var(--radius-sm)] text-[11px] md:text-[12px] font-medium transition-colors whitespace-nowrap",
              activeFilter === action
                ? "bg-[var(--signal-subtle)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            )}
          >
            {ACTION_LABELS[action]}
          </button>
        ))}
      </div>

      {/* Entry list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-8 w-8 text-[var(--text-quaternary)] mb-3" />
            <p className="text-[13px] text-[var(--text-secondary)]">
              {activeFilter === "all"
                ? "No activity yet"
                : `No ${ACTION_LABELS[activeFilter].toLowerCase()} activity`}
            </p>
            {activeFilter === "all" && (
              <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                Actions like creating steps, adding comments, and completing runbooks appear here.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((entry) => {
              const tabId = entityTabMap[entry.entity_id];
              const singular = ENTITY_TYPE_SINGULAR[entry.entity_type] ?? entry.entity_type;
              return (
                <div
                  key={entry.id}
                  className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)]"
                >
                  {/* Action sentence */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[12px] text-[var(--text-primary)]">
                      {ACTION_LABELS[entry.action]} {singular}{" "}
                      <Link
                        href={tabId ? `/w/${workspaceId}/${tabId}` : `/w/${workspaceId}`}
                        className="text-[var(--accent-blue)] hover:underline"
                      >
                        &ldquo;{entry.entity_name}&rdquo;
                      </Link>
                    </span>
                  </div>

                  {/* Author + timestamp */}
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                    <span>{entry.users?.email ?? "[Deleted User]"}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(entry.created_at)}</span>
                  </div>
                </div>
              );
            })}
            {loading && [0, 1, 2].map((i) => (
              <div
                key={`skeleton-${i}`}
                className="rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)]"
              >
                <div className="h-3 bg-[var(--bg-surface-secondary)] rounded-[var(--radius-md)] animate-pulse mb-1.5 w-3/4" />
                <div className="h-2.5 bg-[var(--bg-surface-secondary)] rounded-[var(--radius-md)] animate-pulse w-2/5" />
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && (
          <div className="pt-4 flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-[12px] font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-active)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] hover:border-[var(--border-default)] transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading…
                </>
              ) : (
                `Load More (${entries.length} loaded)`
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

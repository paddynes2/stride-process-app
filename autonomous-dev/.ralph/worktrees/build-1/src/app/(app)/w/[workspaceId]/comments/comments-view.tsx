"use client";

import * as React from "react";
import { MessageSquare, CheckCircle2, Circle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Comment, CommentCategory, CommentableType } from "@/types/database";

const CATEGORY_CONFIG: Record<CommentCategory, { variant: React.ComponentProps<typeof Badge>["variant"]; label: string }> = {
  note: { variant: "secondary", label: "Note" },
  decision: { variant: "default", label: "Decision" },
  pain_point: { variant: "destructive", label: "Pain Point" },
  idea: { variant: "warning", label: "Idea" },
  question: { variant: "info", label: "Question" },
};

const ENTITY_TYPE_LABELS: Record<CommentableType, string> = {
  step: "Step",
  section: "Section",
  stage: "Stage",
  touchpoint: "Touchpoint",
};

const ALL_CATEGORIES: CommentCategory[] = ["note", "decision", "pain_point", "idea", "question"];

type FilterTab = "all" | CommentCategory;

function formatRelativeTime(dateString: string): string {
  const diffSecs = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (diffSecs < 60) return "just now";
  if (diffSecs < 3600) return `${Math.floor(diffSecs / 60)}m ago`;
  if (diffSecs < 86400) return `${Math.floor(diffSecs / 3600)}h ago`;
  return `${Math.floor(diffSecs / 86400)}d ago`;
}

interface CommentsViewProps {
  workspaceId: string;
  initialComments: Comment[];
  entityNames: Record<string, string>;
}

export function CommentsView({ initialComments, entityNames }: CommentsViewProps) {
  const [activeFilter, setActiveFilter] = React.useState<FilterTab>("all");

  const topLevel = React.useMemo(
    () => initialComments.filter((c) => c.parent_id === null),
    [initialComments]
  );

  const filtered = React.useMemo(
    () => activeFilter === "all" ? topLevel : topLevel.filter((c) => c.category === activeFilter),
    [topLevel, activeFilter]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--border-subtle)] shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-[var(--text-tertiary)]" />
          <h1 className="text-[15px] font-semibold text-[var(--text-primary)]">Comments</h1>
          <span className="text-[12px] text-[var(--text-tertiary)]">{topLevel.length}</span>
        </div>
      </div>

      {/* Category filter tabs */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-[var(--border-subtle)] overflow-x-auto shrink-0">
        <button
          onClick={() => setActiveFilter("all")}
          className={cn(
            "px-3 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors whitespace-nowrap",
            activeFilter === "all"
              ? "bg-[var(--signal-subtle)] text-[var(--text-primary)]"
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
          )}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={cn(
              "px-3 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium transition-colors whitespace-nowrap",
              activeFilter === cat
                ? "bg-[var(--signal-subtle)] text-[var(--text-primary)]"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)]"
            )}
          >
            {CATEGORY_CONFIG[cat].label}
          </button>
        ))}
      </div>

      {/* Comment list */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-8 w-8 text-[var(--text-quaternary)] mb-3" />
            <p className="text-[13px] text-[var(--text-secondary)]">
              {activeFilter === "all"
                ? "No comments yet"
                : `No ${CATEGORY_CONFIG[activeFilter].label.toLowerCase()} comments`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((comment) => {
              const entityName = entityNames[comment.commentable_id] ?? comment.commentable_id.slice(0, 8);
              const entityTypeLabel = ENTITY_TYPE_LABELS[comment.commentable_type];
              return (
                <div
                  key={comment.id}
                  className={cn(
                    "rounded-[var(--radius-sm)] p-3 bg-[var(--bg-surface-active)] border border-[var(--border-subtle)]",
                    comment.is_resolved && "opacity-50"
                  )}
                >
                  {/* Entity label + type + category + resolved state */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[11px] font-medium text-[var(--text-secondary)] truncate max-w-[160px]">
                      {entityName}
                    </span>
                    <span className="text-[10px] text-[var(--text-quaternary)] px-1.5 py-0.5 rounded-sm bg-[var(--bg-surface)]">
                      {entityTypeLabel}
                    </span>
                    <Badge variant={CATEGORY_CONFIG[comment.category].variant}>
                      {CATEGORY_CONFIG[comment.category].label}
                    </Badge>
                    <span className="ml-auto">
                      {comment.is_resolved ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success)]" title="Resolved" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-[var(--text-quaternary)]" title="Unresolved" />
                      )}
                    </span>
                  </div>

                  {/* Content preview */}
                  <p className="text-[12px] text-[var(--text-primary)] leading-relaxed line-clamp-2 mb-1.5">
                    {comment.content}
                  </p>

                  {/* Author + timestamp */}
                  <div className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
                    <span className="font-mono">{comment.author_id.slice(0, 8)}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(comment.created_at)}</span>
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

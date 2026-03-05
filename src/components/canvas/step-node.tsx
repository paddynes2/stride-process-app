"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MessageSquare, ListTodo } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StepNodeData } from "@/types/canvas";
import { CommentCountsContext, TaskCountsContext, ColoringTintContext } from "@/types/canvas";
import { MATURITY_COLORS, MATURITY_FALLBACK_COLOR } from "@/lib/maturity";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  testing: "Testing",
  live: "Live",
  archived: "Archived",
};

const EXECUTOR_ICONS: Record<string, string> = {
  person: "👤",
  automation: "⚙️",
  ai_agent: "🤖",
  empty: "",
};

function StepNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as StepNodeData;
  const { step, heatMapMode, annotationColor } = nodeData;
  const maturityColor = step.maturity_score != null ? MATURITY_COLORS[step.maturity_score] ?? MATURITY_FALLBACK_COLOR : null;
  const commentCounts = React.useContext(CommentCountsContext);
  const commentCount = commentCounts.get(step.id) ?? 0;
  const taskCounts = React.useContext(TaskCountsContext);
  const taskCount = taskCounts.get(step.id);
  const coloringTints = React.useContext(ColoringTintContext);
  const coloringTint = coloringTints.get(step.id) ?? null;

  return (
    <div
      className={cn(
        "relative px-3 py-2.5 rounded-[var(--radius-md)] border min-w-[180px] max-w-[240px]",
        "shadow-[var(--shadow-sm)]",
        "transition-all duration-[var(--duration-fast)]",
        "hover:shadow-[var(--shadow-md)] hover:border-[var(--border-default)]",
        selected
          ? "border-[var(--accent-blue)] shadow-[0_0_0_1px_var(--accent-blue)]"
          : "border-[var(--border-subtle)]"
      )}
      style={
        heatMapMode && maturityColor
          ? { backgroundColor: `${maturityColor}15`, borderColor: selected ? undefined : `${maturityColor}60` }
          : coloringTint
          ? { backgroundColor: `${coloringTint}26` }
          : { backgroundColor: "var(--bg-surface)" }
      }
    >
      {/* Perspective annotation indicator */}
      {annotationColor && (
        <div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--bg-surface)]"
          style={{ backgroundColor: annotationColor }}
          title="Has perspective annotation"
          role="img"
          aria-label="Annotated by perspective"
        />
      )}

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-[var(--bg-surface)] !border-[var(--border-strong)] !w-2 !h-2 hover:!bg-[var(--accent-blue)] hover:!border-[var(--accent-blue)]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-[var(--bg-surface)] !border-[var(--border-strong)] !w-2 !h-2 hover:!bg-[var(--accent-blue)] hover:!border-[var(--accent-blue)]"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-[var(--bg-surface)] !border-[var(--border-strong)] !w-2 !h-2 hover:!bg-[var(--accent-blue)] hover:!border-[var(--accent-blue)]"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-[var(--bg-surface)] !border-[var(--border-strong)] !w-2 !h-2 hover:!bg-[var(--accent-blue)] hover:!border-[var(--accent-blue)]"
      />

      {/* Content */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-[var(--text-primary)] truncate leading-tight">
            {step.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Badge variant={step.status as "draft" | "in_progress" | "testing" | "live" | "archived"}>
              {STATUS_LABELS[step.status] ?? step.status}
            </Badge>
            {step.executor !== "empty" && (
              <span className="text-[10px]" title={step.executor}>
                {EXECUTOR_ICONS[step.executor]}
              </span>
            )}
          </div>
        </div>
        {step.maturity_score != null && (
          <div
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
            style={{ backgroundColor: MATURITY_COLORS[step.maturity_score] ?? MATURITY_FALLBACK_COLOR }}
            title={`Maturity: ${step.maturity_score}/5`}
          >
            {step.maturity_score}
          </div>
        )}
      </div>

      {/* Task count badge — bottom-left, only when total > 0 */}
      {taskCount && taskCount.total > 0 && (
        <div
          className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-[var(--bg-surface-active)] rounded px-1 py-0.5"
          title={`${taskCount.completed}/${taskCount.total} tasks completed`}
        >
          <ListTodo className="h-2.5 w-2.5 text-[var(--text-tertiary)]" />
          <span className="text-[9px] font-medium text-[var(--text-tertiary)]">{taskCount.completed}/{taskCount.total}</span>
        </div>
      )}

      {/* Comment count badge — bottom-right, only when count > 0 */}
      {commentCount > 0 && (
        <div
          className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-[var(--bg-surface-active)] rounded px-1 py-0.5"
          title={`${commentCount} unresolved comment${commentCount !== 1 ? "s" : ""}`}
        >
          <MessageSquare className="h-2.5 w-2.5 text-[var(--text-tertiary)]" />
          <span className="text-[9px] font-medium text-[var(--text-tertiary)]">{commentCount}</span>
        </div>
      )}
    </div>
  );
}

export const StepNode = React.memo(StepNodeComponent);

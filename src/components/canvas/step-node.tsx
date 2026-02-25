"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { StepNodeData } from "@/types/canvas";

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

export function StepNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as StepNodeData;
  const { step } = nodeData;

  return (
    <div
      className={cn(
        "px-3 py-2.5 rounded-[var(--radius-md)] border min-w-[180px] max-w-[240px]",
        "bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]",
        "transition-all duration-[var(--duration-fast)]",
        "hover:shadow-[var(--shadow-md)] hover:border-[var(--border-default)]",
        selected
          ? "border-[var(--accent-blue)] shadow-[0_0_0_1px_var(--accent-blue)]"
          : "border-[var(--border-subtle)]"
      )}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-[var(--bg-surface)] !border-[var(--border-strong)] !w-2 !h-2 hover:!bg-[var(--accent-blue)] hover:!border-[var(--accent-blue)]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
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
      </div>
    </div>
  );
}

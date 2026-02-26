"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { TouchpointNodeData } from "@/types/canvas";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22C55E",
  neutral: "#6B7280",
  negative: "#EF4444",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive",
  neutral: "Neutral",
  negative: "Negative",
};

export function TouchpointNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as TouchpointNodeData;
  const { touchpoint } = nodeData;
  const sentimentColor = touchpoint.sentiment
    ? SENTIMENT_COLORS[touchpoint.sentiment] ?? "#6B7280"
    : null;

  return (
    <div
      className={cn(
        "px-3 py-2.5 rounded-[var(--radius-md)] border min-w-[180px] max-w-[240px]",
        "shadow-[var(--shadow-sm)]",
        "transition-all duration-[var(--duration-fast)]",
        "hover:shadow-[var(--shadow-md)] hover:border-[var(--border-default)]",
        selected
          ? "border-[var(--accent-blue)] shadow-[0_0_0_1px_var(--accent-blue)]"
          : "border-[var(--border-subtle)]"
      )}
      style={
        sentimentColor
          ? { backgroundColor: `${sentimentColor}15`, borderColor: selected ? undefined : `${sentimentColor}60` }
          : { backgroundColor: "var(--bg-surface)" }
      }
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
            {touchpoint.name}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {touchpoint.sentiment && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm"
                style={{
                  backgroundColor: `${sentimentColor}20`,
                  color: sentimentColor ?? undefined,
                }}
              >
                {SENTIMENT_LABELS[touchpoint.sentiment] ?? touchpoint.sentiment}
              </span>
            )}
            {touchpoint.pain_score != null && (
              <span className="text-[10px] text-[var(--text-tertiary)]" title={`Pain: ${touchpoint.pain_score}/5`}>
                Pain {touchpoint.pain_score}
              </span>
            )}
          </div>
        </div>
        {touchpoint.sentiment && sentimentColor && (
          <div
            className="flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1"
            style={{ backgroundColor: sentimentColor }}
            title={`Sentiment: ${SENTIMENT_LABELS[touchpoint.sentiment] ?? touchpoint.sentiment}`}
          />
        )}
      </div>
    </div>
  );
}

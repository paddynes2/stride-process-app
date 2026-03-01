"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TouchpointNodeData } from "@/types/canvas";
import { CommentCountsContext } from "@/types/canvas";
import { PAIN_COLORS, PAIN_FALLBACK_COLOR } from "@/lib/pain";

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
  const { touchpoint, heatMapMode, annotationColor } = nodeData;
  const sentimentColor = touchpoint.sentiment
    ? SENTIMENT_COLORS[touchpoint.sentiment] ?? "#6B7280"
    : null;

  const painColor = touchpoint.pain_score != null
    ? PAIN_COLORS[touchpoint.pain_score] ?? PAIN_FALLBACK_COLOR
    : null;

  // Heat map mode: color by pain score. Normal mode: color by sentiment.
  const bgStyle = (() => {
    if (heatMapMode && painColor) {
      return { backgroundColor: `${painColor}15`, borderColor: selected ? undefined : `${painColor}60` };
    }
    if (sentimentColor) {
      return { backgroundColor: `${sentimentColor}15`, borderColor: selected ? undefined : `${sentimentColor}60` };
    }
    return { backgroundColor: "var(--bg-surface)" };
  })();

  const commentCounts = React.useContext(CommentCountsContext);
  const commentCount = commentCounts.get(touchpoint.id) ?? 0;

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
      style={bgStyle}
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
        {heatMapMode && touchpoint.pain_score != null && painColor ? (
          <div
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white mt-0.5"
            style={{ backgroundColor: painColor }}
            title={`Pain: ${touchpoint.pain_score}/5`}
          >
            {touchpoint.pain_score}
          </div>
        ) : touchpoint.sentiment && sentimentColor ? (
          <div
            className="flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1"
            style={{ backgroundColor: sentimentColor }}
            title={`Sentiment: ${SENTIMENT_LABELS[touchpoint.sentiment] ?? touchpoint.sentiment}`}
          />
        ) : null}
      </div>

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

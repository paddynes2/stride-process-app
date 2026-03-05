"use client";

import * as React from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SectionNodeData } from "@/types/canvas";
import { CommentCountsContext } from "@/types/canvas";
import { getMaturityColor } from "@/lib/maturity";

function SectionNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SectionNodeData;
  const { section, averageMaturity, averageTargetMaturity, heatMapMode, annotationColor } = nodeData;
  const maturityColor = getMaturityColor(averageMaturity);
  const commentCounts = React.useContext(CommentCountsContext);
  const commentCount = commentCounts.get(section.id) ?? 0;

  return (
    <>
      <NodeResizer
        minWidth={300}
        minHeight={200}
        isVisible={!!selected}
        lineClassName="!border-[var(--accent-blue)]"
        handleClassName="!w-2.5 !h-2.5 !bg-[var(--accent-blue)] !border-none !rounded-sm"
      />
      <div
        className={cn(
          "relative w-full h-full rounded-[var(--radius-lg)] border p-3",
          "transition-all duration-[var(--duration-fast)]",
          selected
            ? "border-[var(--accent-blue)]"
            : "border-[var(--border-subtle)]"
        )}
        style={
          heatMapMode && averageMaturity != null
            ? {
                backgroundColor: `${maturityColor}20`,
                borderColor: selected ? undefined : `${maturityColor}60`,
                pointerEvents: "none",
              }
            : {
                backgroundColor: selected ? "rgba(59,130,246,0.03)" : "rgba(255,255,255,0.015)",
                pointerEvents: "none",
              }
        }
      >
        {/* Perspective annotation indicator */}
        {annotationColor && (
          <div
            className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full border-2 border-[var(--bg-app)]"
            style={{ backgroundColor: annotationColor, pointerEvents: "auto" }}
            title="Has perspective annotation"
            role="img"
            aria-label="Annotated by perspective"
          />
        )}

        {/* Section label */}
        <div className="flex items-center gap-2 mb-2" style={{ pointerEvents: "auto" }}>
          <span
            className="text-[11px] font-semibold uppercase tracking-wide flex-1"
            style={{ color: selected ? "var(--accent-blue)" : "var(--text-tertiary)" }}
          >
            {section.name}
          </span>
          {averageMaturity != null && (
            <div
              className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
              style={{ backgroundColor: maturityColor }}
              title={`Avg maturity: ${averageMaturity.toFixed(1)}/5${averageTargetMaturity != null ? ` (target: ${averageTargetMaturity.toFixed(1)})` : ""}`}
            >
              {averageMaturity.toFixed(1)}
            </div>
          )}
        </div>
        {section.summary && (
          <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-2">
            {section.summary}
          </p>
        )}

        {/* Comment count badge — bottom-right, only when count > 0 */}
        {commentCount > 0 && (
          <div
            className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-[var(--bg-surface-active)] rounded px-1 py-0.5"
            style={{ pointerEvents: "auto" }}
            title={`${commentCount} unresolved comment${commentCount !== 1 ? "s" : ""}`}
          >
            <MessageSquare className="h-2.5 w-2.5 text-[var(--text-tertiary)]" />
            <span className="text-[9px] font-medium text-[var(--text-tertiary)]">{commentCount}</span>
          </div>
        )}
      </div>
    </>
  );
}

export const SectionNode = React.memo(SectionNodeComponent);

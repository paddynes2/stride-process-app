"use client";

import * as React from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { SectionNodeData } from "@/types/canvas";
import { getMaturityColor } from "@/lib/maturity";

export function SectionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SectionNodeData;
  const { section, averageMaturity, averageTargetMaturity, heatMapMode } = nodeData;
  const maturityColor = getMaturityColor(averageMaturity);

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
          "w-full h-full rounded-[var(--radius-lg)] border p-3",
          "transition-all duration-[var(--duration-fast)]",
          selected
            ? "border-[var(--accent-blue)]"
            : "border-[var(--border-subtle)]"
        )}
        style={
          heatMapMode && averageMaturity != null
            ? {
                backgroundColor: `${maturityColor}08`,
                borderColor: selected ? undefined : `${maturityColor}40`,
              }
            : {
                backgroundColor: selected ? "rgba(59,130,246,0.03)" : "rgba(255,255,255,0.015)",
              }
        }
      >
        {/* Section label */}
        <div className="flex items-center gap-2 mb-2">
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
          <p className="text-[11px] text-[var(--text-quaternary)] line-clamp-2">
            {section.summary}
          </p>
        )}
      </div>
    </>
  );
}

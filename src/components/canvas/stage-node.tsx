"use client";

import * as React from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { StageNodeData } from "@/types/canvas";
import { getPainColor } from "@/lib/pain";

const CHANNEL_ICONS: Record<string, string> = {
  web: "🌐",
  phone: "📱",
  email: "✉️",
  "in-person": "🤝",
  other: "📋",
};

export function StageNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as StageNodeData;
  const { stage, averagePainScore, heatMapMode } = nodeData;
  const channelIcon = stage.channel ? CHANNEL_ICONS[stage.channel] ?? "📋" : null;
  const painColor = getPainColor(averagePainScore);

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
          heatMapMode && averagePainScore != null
            ? {
                backgroundColor: `${painColor}08`,
                borderColor: selected ? undefined : `${painColor}40`,
              }
            : {
                backgroundColor: selected ? "rgba(59,130,246,0.03)" : "rgba(255,255,255,0.015)",
              }
        }
      >
        {/* Stage label */}
        <div className="flex items-center gap-2 mb-2">
          {channelIcon && (
            <span className="text-[11px]" title={stage.channel ?? undefined}>
              {channelIcon}
            </span>
          )}
          <span
            className="text-[11px] font-semibold uppercase tracking-wide flex-1"
            style={{ color: selected ? "var(--accent-blue)" : "var(--text-tertiary)" }}
          >
            {stage.name}
          </span>
          {averagePainScore != null && (
            <div
              className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
              style={{ backgroundColor: painColor }}
              title={`Avg pain: ${averagePainScore.toFixed(1)}/5`}
            >
              {averagePainScore.toFixed(1)}
            </div>
          )}
        </div>
        {stage.description && (
          <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-2">
            {stage.description}
          </p>
        )}
      </div>
    </>
  );
}

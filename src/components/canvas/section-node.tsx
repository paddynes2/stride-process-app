"use client";

import * as React from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { SectionNodeData } from "@/types/canvas";

export function SectionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as SectionNodeData;
  const { section } = nodeData;

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
            ? "border-[var(--accent-blue)] bg-[rgba(59,130,246,0.03)]"
            : "border-[var(--border-subtle)] bg-[rgba(255,255,255,0.015)]"
        )}
      >
        {/* Section label */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: selected ? "var(--accent-blue)" : "var(--text-tertiary)" }}
          >
            {section.name}
          </span>
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

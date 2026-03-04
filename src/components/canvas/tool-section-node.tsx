"use client";

import * as React from "react";
import { type NodeProps, NodeResizer } from "@xyflow/react";
import { cn } from "@/lib/utils";
import type { ToolSectionNodeData } from "@/types/canvas";

function ToolSectionNodeComponent({ data, selected, id }: NodeProps) {
  const nodeData = data as unknown as ToolSectionNodeData;
  const { toolSection, onResizeEnd } = nodeData;
  const sectionId = id.replace("tool-section-", "");

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={150}
        isVisible={!!selected}
        lineClassName="!border-[var(--accent-blue)]"
        handleClassName="!w-2.5 !h-2.5 !bg-[var(--accent-blue)] !border-none !rounded-sm"
        onResizeEnd={(_, params) => {
          onResizeEnd?.(sectionId, params.width, params.height);
        }}
      />
      <div
        className={cn(
          "relative w-full h-full rounded-[var(--radius-lg)] border p-3",
          "transition-all duration-[var(--duration-fast)]",
          selected
            ? "border-[var(--accent-blue)]"
            : "border-[var(--border-subtle)]"
        )}
        style={{
          backgroundColor: selected
            ? "rgba(59,130,246,0.03)"
            : "rgba(255,255,255,0.015)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[11px] font-semibold uppercase tracking-wide flex-1"
            style={{
              color: selected ? "var(--accent-blue)" : "var(--text-tertiary)",
            }}
          >
            {toolSection.name}
          </span>
        </div>
        {toolSection.description && (
          <p className="text-[11px] text-[var(--text-tertiary)] line-clamp-2">
            {toolSection.description}
          </p>
        )}
      </div>
    </>
  );
}

export const ToolSectionNode = React.memo(ToolSectionNodeComponent);

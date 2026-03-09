"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ToolNodeData } from "@/types/canvas";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  considering: "Considering",
  cancelled: "Cancelled",
};

const STATUS_VARIANTS: Record<string, "success" | "warning" | "draft"> = {
  active: "success",
  considering: "warning",
  cancelled: "draft",
};

function ToolNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ToolNodeData;
  const { tool } = nodeData;

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
      style={{ backgroundColor: "var(--bg-surface)" }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        {tool.logo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={tool.logo_url}
            alt=""
            className="w-5 h-5 rounded-[3px] object-contain shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-5 h-5 rounded-[3px] bg-[var(--bg-surface-hover)] flex items-center justify-center shrink-0">
            <span className="text-[9px] font-bold text-[var(--text-tertiary)] leading-none">
              {tool.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <p className="text-[13px] font-medium text-[var(--text-primary)] truncate leading-tight">
          {tool.name}
        </p>
      </div>
      <div className="flex items-center justify-between gap-1.5">
        <Badge variant={STATUS_VARIANTS[tool.status] ?? "secondary"}>
          {STATUS_LABELS[tool.status] ?? tool.status}
        </Badge>
        {tool.cost_per_month != null && (
          <span className="text-[11px] text-[var(--text-tertiary)] flex-shrink-0">
            ${tool.cost_per_month}/mo
          </span>
        )}
      </div>
    </div>
  );
}

export const ToolNode = React.memo(ToolNodeComponent);

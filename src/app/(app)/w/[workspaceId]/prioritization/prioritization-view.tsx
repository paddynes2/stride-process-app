"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { useRouter } from "next/navigation";
import type { Tab, Section, Stage, Step, Touchpoint } from "@/types/database";

const HSL_PALETTE = [
  "hsl(200, 70%, 65%)",
  "hsl(160, 60%, 55%)",
  "hsl(280, 60%, 65%)",
  "hsl(30, 80%, 60%)",
  "hsl(0, 65%, 60%)",
  "hsl(60, 65%, 50%)",
  "hsl(100, 60%, 55%)",
  "hsl(320, 60%, 65%)",
];

function hashColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return HSL_PALETTE[hash % 8];
}

interface PlotItem {
  id: string;
  name: string;
  tab_id: string;
  group_id: string | null;
  group_name: string | null;
  effort_score: number;
  impact_score: number;
  type: "step" | "touchpoint";
}

interface PrioritizationViewProps {
  workspaceId: string;
  steps: Pick<Step, "id" | "name" | "tab_id" | "section_id" | "effort_score" | "impact_score">[];
  touchpoints: Pick<Touchpoint, "id" | "name" | "tab_id" | "stage_id" | "effort_score" | "impact_score">[];
  sections: Pick<Section, "id" | "name" | "tab_id">[];
  stages: Pick<Stage, "id" | "name" | "tab_id">[];
  tabs: Pick<Tab, "id" | "name" | "canvas_type">[];
}

// Scores top-to-bottom (high impact = top)
const Y_AXIS_SCORES = [5, 4, 3, 2, 1] as const;
// Scores left-to-right (low effort = left)
const X_AXIS_SCORES = [1, 2, 3, 4, 5] as const;

export function PrioritizationView({
  workspaceId,
  steps,
  touchpoints,
  sections,
  stages,
  tabs,
}: PrioritizationViewProps) {
  const router = useRouter();
  const [selectedTabId, setSelectedTabId] = React.useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setSelectedGroupId(null);
  }, [selectedTabId]);

  const groupOptions = React.useMemo(() => {
    if (!selectedTabId) {
      return [
        ...sections.map((s) => ({ id: s.id, name: s.name, type: "section" as const })),
        ...stages.map((s) => ({ id: s.id, name: s.name, type: "stage" as const })),
      ];
    }
    const selectedTab = tabs.find((t) => t.id === selectedTabId);
    if (!selectedTab) return [];
    if (selectedTab.canvas_type === "process") {
      return sections
        .filter((s) => s.tab_id === selectedTabId)
        .map((s) => ({ id: s.id, name: s.name, type: "section" as const }));
    }
    return stages
      .filter((s) => s.tab_id === selectedTabId)
      .map((s) => ({ id: s.id, name: s.name, type: "stage" as const }));
  }, [selectedTabId, tabs, sections, stages]);

  const plotItems = React.useMemo<PlotItem[]>(() => {
    const stepItems = steps
      .filter((s) => s.effort_score != null && s.impact_score != null)
      .filter((s) => !selectedTabId || s.tab_id === selectedTabId)
      .filter((s) => !selectedGroupId || s.section_id === selectedGroupId)
      .map((s) => ({
        id: s.id,
        name: s.name,
        tab_id: s.tab_id,
        group_id: s.section_id ?? null,
        group_name: sections.find((sec) => sec.id === s.section_id)?.name ?? null,
        effort_score: s.effort_score as number,
        impact_score: s.impact_score as number,
        type: "step" as const,
      }));

    const touchpointItems = touchpoints
      .filter((t) => t.effort_score != null && t.impact_score != null)
      .filter((t) => !selectedTabId || t.tab_id === selectedTabId)
      .filter((t) => !selectedGroupId || t.stage_id === selectedGroupId)
      .map((t) => ({
        id: t.id,
        name: t.name,
        tab_id: t.tab_id,
        group_id: t.stage_id ?? null,
        group_name: stages.find((st) => st.id === t.stage_id)?.name ?? null,
        effort_score: t.effort_score as number,
        impact_score: t.impact_score as number,
        type: "touchpoint" as const,
      }));

    return [...stepItems, ...touchpointItems];
  }, [steps, touchpoints, sections, stages, selectedTabId, selectedGroupId]);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
            Prioritization Matrix
          </h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">
            Plot steps and touchpoints by effort and impact to identify priorities
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <select
            value={selectedTabId ?? ""}
            onChange={(e) => setSelectedTabId(e.target.value || null)}
            className="h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[12px] focus:outline-none focus:border-[var(--border-default)] transition-colors"
          >
            <option value="">All Tabs</option>
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>

          <select
            value={selectedGroupId ?? ""}
            onChange={(e) => setSelectedGroupId(e.target.value || null)}
            className="h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-[12px] focus:outline-none focus:border-[var(--border-default)] transition-colors"
            disabled={groupOptions.length === 0}
          >
            <option value="">All Sections / Stages</option>
            {groupOptions.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Chart */}
        {plotItems.length === 0 ? (
          <div className="flex items-center justify-center h-64 rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] text-[var(--text-tertiary)] text-[13px]">
            No items with both effort and impact scores. Open a step or touchpoint and assign scores in the detail panel.
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-hidden">
            {/* Main chart row: Y-axis title + Y-axis labels + chart area */}
            <div className="flex">
              {/* Y-axis title */}
              <div className="flex items-center justify-center w-6 shrink-0">
                <span
                  className="text-[9px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide select-none whitespace-nowrap"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  ↑ Impact
                </span>
              </div>

              {/* Y-axis numeric labels (5 at top → 1 at bottom) */}
              <div className="relative w-4 shrink-0" style={{ height: "480px" }}>
                {Y_AXIS_SCORES.map((score, i) => (
                  <span
                    key={score}
                    className="absolute right-0.5 text-[9px] text-[var(--text-tertiary)] select-none leading-none"
                    style={{ top: `${i * 25}%`, transform: "translateY(-50%)" }}
                  >
                    {score}
                  </span>
                ))}
              </div>

              {/* Chart area */}
              <div className="flex-1 relative" style={{ height: "480px" }}>
                {/* Quadrant background tints */}
                <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-[#22C55E]/5 pointer-events-none" />
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-[#F97316]/5 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-[#3B82F6]/5 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-[#EF4444]/5 pointer-events-none" />

                {/* Quadrant divider lines (at 50%) */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-[var(--border-subtle)] pointer-events-none" />
                <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--border-subtle)] pointer-events-none" />

                {/* Subtle grid lines at 25% and 75% — vertical (scores 2 and 4) */}
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: "25%", width: 0, borderLeft: "1px dashed var(--border-subtle)", opacity: 0.35 }}
                />
                <div
                  className="absolute top-0 bottom-0 pointer-events-none"
                  style={{ left: "75%", width: 0, borderLeft: "1px dashed var(--border-subtle)", opacity: 0.35 }}
                />

                {/* Subtle grid lines at 25% and 75% — horizontal (scores 4 and 2) */}
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: "25%", height: 0, borderTop: "1px dashed var(--border-subtle)", opacity: 0.35 }}
                />
                <div
                  className="absolute left-0 right-0 pointer-events-none"
                  style={{ top: "75%", height: 0, borderTop: "1px dashed var(--border-subtle)", opacity: 0.35 }}
                />

                {/* Quadrant labels */}
                <div className="absolute top-3 left-3 text-[10px] font-medium text-[var(--text-tertiary)]/50 pointer-events-none select-none">
                  Quick Wins
                </div>
                <div className="absolute top-3 right-3 text-[10px] font-medium text-[var(--text-tertiary)]/50 pointer-events-none select-none text-right">
                  Major Projects
                </div>
                <div className="absolute bottom-3 left-3 text-[10px] font-medium text-[var(--text-tertiary)]/50 pointer-events-none select-none">
                  Fill-Ins
                </div>
                <div className="absolute bottom-3 right-3 text-[10px] font-medium text-[var(--text-tertiary)]/50 pointer-events-none select-none text-right">
                  Deprioritize
                </div>

                {/* Dots */}
                <TooltipPrimitive.Provider delayDuration={200}>
                  {plotItems.map((item) => {
                    const xPct = ((item.effort_score - 1) / 4) * 100;
                    const yPct = ((5 - item.impact_score) / 4) * 100;
                    const color = hashColor(item.group_name ?? item.name);
                    return (
                      <TooltipPrimitive.Root key={item.id}>
                        <TooltipPrimitive.Trigger asChild>
                          <button
                            className="absolute w-3 h-3 rounded-full transition-transform hover:scale-150 focus:outline-none focus:ring-1 focus:ring-white/50"
                            style={{
                              left: `calc(${xPct}% - 6px)`,
                              top: `calc(${yPct}% - 6px)`,
                              backgroundColor: color,
                            }}
                            onClick={() =>
                              router.push(`/w/${workspaceId}/${item.tab_id}`)
                            }
                            aria-label={item.name}
                          />
                        </TooltipPrimitive.Trigger>
                        <TooltipPrimitive.Portal>
                          <TooltipPrimitive.Content
                            className="z-50 rounded-[var(--radius-sm)] bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] px-2 py-1.5 text-[11px] text-[var(--text-primary)] shadow-lg max-w-[200px]"
                            sideOffset={5}
                          >
                            <div className="font-medium truncate">{item.name}</div>
                            {item.group_name && (
                              <div className="text-[var(--text-tertiary)] truncate">
                                {item.group_name}
                              </div>
                            )}
                            <div className="text-[var(--text-tertiary)] mt-0.5">
                              Effort {item.effort_score} · Impact {item.impact_score}
                            </div>
                          </TooltipPrimitive.Content>
                        </TooltipPrimitive.Portal>
                      </TooltipPrimitive.Root>
                    );
                  })}
                </TooltipPrimitive.Provider>
              </div>
            </div>

            {/* X-axis numeric labels (1 at left → 5 at right) */}
            <div className="flex">
              <div className="w-6 shrink-0" />
              <div className="w-4 shrink-0" />
              <div className="flex-1 relative" style={{ height: "14px" }}>
                {X_AXIS_SCORES.map((score, i) => (
                  <span
                    key={score}
                    className="absolute text-[9px] text-[var(--text-tertiary)] select-none leading-none"
                    style={{ left: `${i * 25}%`, top: 0, transform: "translateX(-50%)" }}
                  >
                    {score}
                  </span>
                ))}
              </div>
            </div>

            {/* X-axis title */}
            <div className="flex">
              <div className="w-6 shrink-0" />
              <div className="w-4 shrink-0" />
              <div className="flex-1 text-center py-1.5">
                <span className="text-[9px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide select-none">
                  Effort →
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

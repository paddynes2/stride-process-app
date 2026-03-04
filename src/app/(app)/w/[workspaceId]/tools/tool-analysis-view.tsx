"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BarChart3, Package, Wrench, AlertCircle } from "lucide-react";
import type { Tool } from "@/types/database";

export interface AnalysisStep {
  id: string;
  name: string;
  section_id: string | null;
  tab_id: string;
  frequency_per_month: number | null;
}

export interface StepToolData {
  id: string;
  step_id: string;
  tool_id: string;
}

interface ToolAnalysisViewProps {
  workspaceId: string;
  tools: Tool[];
  steps: AnalysisStep[];
  stepTools: StepToolData[];
  onSelectTool: (toolId: string) => void;
}

export function ToolAnalysisView({
  workspaceId,
  tools,
  steps,
  stepTools,
  onSelectTool,
}: ToolAnalysisViewProps) {
  const router = useRouter();

  const toolMap = React.useMemo(
    () => new Map(tools.map((t) => [t.id, t])),
    [tools]
  );

  // Overlapping Tools: steps assigned 2+ tools
  const overlappingSteps = React.useMemo(() => {
    const toolsByStep = new Map<string, Set<string>>();
    for (const st of stepTools) {
      if (!toolsByStep.has(st.step_id)) toolsByStep.set(st.step_id, new Set());
      toolsByStep.get(st.step_id)!.add(st.tool_id);
    }

    const stepMap = new Map(steps.map((s) => [s.id, s]));
    const result: Array<{
      step: AnalysisStep;
      toolIds: string[];
      combinedMonthlyCost: number;
    }> = [];

    for (const [stepId, toolIdSet] of toolsByStep) {
      if (toolIdSet.size >= 2) {
        const step = stepMap.get(stepId);
        if (!step) continue;
        const toolIds = Array.from(toolIdSet);
        const combinedMonthlyCost = toolIds.reduce(
          (sum, tid) => sum + (toolMap.get(tid)?.cost_per_month ?? 0),
          0
        );
        result.push({ step, toolIds, combinedMonthlyCost });
      }
    }

    return result.sort((a, b) => b.combinedMonthlyCost - a.combinedMonthlyCost);
  }, [steps, stepTools, toolMap]);

  // Unused Tools: tools with zero step_tool assignments
  const unusedTools = React.useMemo(() => {
    const usedToolIds = new Set(stepTools.map((st) => st.tool_id));
    return tools.filter((t) => !usedToolIds.has(t.id));
  }, [tools, stepTools]);

  // Coverage Gaps: steps with no tool assigned, sorted by frequency_per_month desc
  const uncoveredSteps = React.useMemo(() => {
    const coveredStepIds = new Set(stepTools.map((st) => st.step_id));
    return [...steps]
      .filter((s) => !coveredStepIds.has(s.id))
      .sort(
        (a, b) => (b.frequency_per_month ?? 0) - (a.frequency_per_month ?? 0)
      );
  }, [steps, stepTools]);

  // Spend summary by status
  const spendByStatus = React.useMemo(() => {
    const totals = { active: 0, considering: 0, cancelled: 0 };
    for (const t of tools) {
      totals[t.status] += t.cost_per_month ?? 0;
    }
    return totals;
  }, [tools]);

  const totalMonthly = tools.reduce(
    (sum, t) => sum + (t.cost_per_month ?? 0),
    0
  );
  const totalAnnual = totalMonthly * 12;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="h-5 w-5 text-[var(--text-tertiary)]" />
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
            Tool Analysis
          </h1>
        </div>

        {/* Spend Summary */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 mb-4">
          <h2 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
            Spend Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                Monthly Total
              </p>
              <p className="text-[20px] font-bold text-[var(--text-primary)]">
                ${totalMonthly.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                Annual Total
              </p>
              <p className="text-[20px] font-bold text-[var(--text-primary)]">
                ${totalAnnual.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                Active
              </p>
              <p className="text-[16px] font-semibold text-[var(--success)]">
                ${spendByStatus.active.toLocaleString()}/mo
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                Considering
              </p>
              <p className="text-[16px] font-semibold text-[var(--warning)]">
                ${spendByStatus.considering.toLocaleString()}/mo
              </p>
            </div>
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide mb-1">
                Cancelled
              </p>
              <p className="text-[16px] font-semibold text-[var(--text-tertiary)]">
                ${spendByStatus.cancelled.toLocaleString()}/mo
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Overlapping Tools */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-[var(--text-tertiary)]" />
              <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Overlapping Tools
              </h2>
              <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">
                {overlappingSteps.length} steps
              </span>
            </div>
            {overlappingSteps.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">
                No steps have multiple tools assigned.
              </p>
            ) : (
              <div className="space-y-2">
                {overlappingSteps.map(({ step, toolIds, combinedMonthlyCost }) => (
                  <div
                    key={step.id}
                    className="py-1.5 border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() =>
                          router.push(
                            `/w/${workspaceId}/${step.tab_id}`
                          )
                        }
                        className="text-[12px] font-medium text-[var(--accent-blue)] hover:underline text-left truncate"
                      >
                        {step.name}
                      </button>
                      {combinedMonthlyCost > 0 && (
                        <span className="text-[11px] text-[var(--text-secondary)] shrink-0">
                          ${combinedMonthlyCost.toLocaleString()}/mo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {toolIds.map((tid) => (
                        <button
                          key={tid}
                          onClick={() => onSelectTool(tid)}
                          className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--accent-blue)] underline"
                        >
                          {toolMap.get(tid)?.name ?? tid}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unused Tools */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Wrench className="h-4 w-4 text-[var(--text-tertiary)]" />
              <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Unused Tools
              </h2>
              <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">
                {unusedTools.length} tools
              </span>
            </div>
            {unusedTools.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">
                All tools are assigned to at least one step.
              </p>
            ) : (
              <div className="space-y-1">
                {unusedTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between py-1 border-b border-[var(--border-subtle)] last:border-0"
                  >
                    <button
                      onClick={() => onSelectTool(tool.id)}
                      className="text-[12px] text-[var(--accent-blue)] hover:underline text-left"
                    >
                      {tool.name}
                    </button>
                    {tool.cost_per_month != null && tool.cost_per_month > 0 && (
                      <span className="text-[11px] text-[var(--text-tertiary)]">
                        ${tool.cost_per_month.toLocaleString()}/mo
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coverage Gaps — full width */}
          <div className="lg:col-span-2 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-[var(--text-tertiary)]" />
              <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Coverage Gaps
              </h2>
              <span className="ml-auto text-[11px] text-[var(--text-tertiary)]">
                {uncoveredSteps.length} steps without tools
              </span>
            </div>
            {uncoveredSteps.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">
                All steps have at least one tool assigned.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                      <th className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] pr-4">
                        Step
                      </th>
                      <th className="pb-2 text-right text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                        Frequency / mo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {uncoveredSteps.map((step) => (
                      <tr
                        key={step.id}
                        className="border-b border-[var(--border-subtle)] last:border-0"
                      >
                        <td className="py-1.5 pr-4">
                          <button
                            onClick={() =>
                              router.push(
                                `/w/${workspaceId}/${step.tab_id}`
                              )
                            }
                            className="text-[12px] text-[var(--accent-blue)] hover:underline text-left"
                          >
                            {step.name}
                          </button>
                        </td>
                        <td className="py-1.5 text-right text-[12px] text-[var(--text-secondary)]">
                          {step.frequency_per_month != null
                            ? step.frequency_per_month
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

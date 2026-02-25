"use client";

import type { Section, Step, Connection } from "@/types/database";

interface WorkspaceSummaryPanelProps {
  sections: Section[];
  steps: Step[];
  connections: Connection[];
}

export function WorkspaceSummaryPanel({ sections, steps, connections }: WorkspaceSummaryPanelProps) {
  const statusCounts = steps.reduce(
    (acc, s) => {
      acc[s.status] = (acc[s.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const executorCounts = steps.reduce(
    (acc, s) => {
      acc[s.executor] = (acc[s.executor] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalMinutes = steps.reduce((sum, s) => {
    if (s.time_minutes && s.frequency_per_month) {
      return sum + s.time_minutes * s.frequency_per_month;
    }
    return sum;
  }, 0);

  return (
    <div className="p-4 space-y-5">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Workspace Summary
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Sections" value={sections.length} />
        <StatCard label="Steps" value={steps.length} />
        <StatCard label="Connections" value={connections.length} />
      </div>

      {totalMinutes > 0 && (
        <div className="bg-[var(--bg-surface-hover)] rounded-[var(--radius-md)] p-3">
          <div className="text-[11px] text-[var(--text-tertiary)] mb-1">Monthly Cost</div>
          <div className="text-[16px] font-semibold text-[var(--text-primary)]">
            {(totalMinutes / 60).toFixed(1)}h
          </div>
        </div>
      )}

      {Object.keys(statusCounts).length > 0 && (
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-2">
            Status Distribution
          </label>
          <div className="space-y-1.5">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-secondary)] capitalize">{status.replace("_", " ")}</span>
                <span className="text-[var(--text-tertiary)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(executorCounts).length > 0 && (
        <div>
          <label className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide block mb-2">
            Executor Distribution
          </label>
          <div className="space-y-1.5">
            {Object.entries(executorCounts).map(([executor, count]) => (
              <div key={executor} className="flex items-center justify-between text-[12px]">
                <span className="text-[var(--text-secondary)] capitalize">{executor.replace("_", " ")}</span>
                <span className="text-[var(--text-tertiary)]">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[var(--bg-surface-hover)] rounded-[var(--radius-md)] p-3 text-center">
      <div className="text-[18px] font-semibold text-[var(--text-primary)]">{value}</div>
      <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">{label}</div>
    </div>
  );
}

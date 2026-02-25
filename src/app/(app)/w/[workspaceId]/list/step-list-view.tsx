"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Step } from "@/types/database";

interface StepListViewProps {
  workspaceId: string;
  steps: Step[];
  sections: { id: string; name: string }[];
  tabs: { id: string; name: string }[];
}

type SortField = "name" | "status" | "executor" | "created_at" | "section" | "tab";
type SortDir = "asc" | "desc";

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  testing: "Testing",
  live: "Live",
  archived: "Archived",
};

export function StepListView({ workspaceId, steps, sections, tabs }: StepListViewProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string | null>(null);
  const [executorFilter, setExecutorFilter] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<SortField>("created_at");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const sectionMap = React.useMemo(
    () => new Map(sections.map((s) => [s.id, s.name])),
    [sections]
  );
  const tabMap = React.useMemo(
    () => new Map(tabs.map((t) => [t.id, t.name])),
    [tabs]
  );

  const filtered = React.useMemo(() => {
    let result = [...steps];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }

    // Executor filter
    if (executorFilter) {
      result = result.filter((s) => s.executor === executorFilter);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "executor":
          cmp = a.executor.localeCompare(b.executor);
          break;
        case "section":
          cmp = (sectionMap.get(a.section_id ?? "") ?? "").localeCompare(sectionMap.get(b.section_id ?? "") ?? "");
          break;
        case "tab":
          cmp = (tabMap.get(a.tab_id) ?? "").localeCompare(tabMap.get(b.tab_id) ?? "");
          break;
        case "created_at":
        default:
          cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [steps, search, statusFilter, executorFilter, sortField, sortDir, sectionMap, tabMap]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const handleRowClick = (step: Step) => {
    router.push(`/w/${workspaceId}/${step.tab_id}`);
  };

  const uniqueStatuses = [...new Set(steps.map((s) => s.status))];
  const uniqueExecutors = [...new Set(steps.map((s) => s.executor))];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
            All Steps ({steps.length})
          </h1>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 max-w-xs">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search steps..."
              leftElement={<Search className="h-3.5 w-3.5" />}
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter ?? ""}
            onChange={(e) => setStatusFilter(e.target.value || null)}
            className="h-8 px-3 text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--signal)]"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s] ?? s}</option>
            ))}
          </select>

          {/* Executor filter */}
          <select
            value={executorFilter ?? ""}
            onChange={(e) => setExecutorFilter(e.target.value || null)}
            className="h-8 px-3 text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--signal)]"
          >
            <option value="">All Executors</option>
            {uniqueExecutors.map((e) => (
              <option key={e} value={e}>{e.replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[var(--bg-surface)]">
                <SortHeader label="Name" field="name" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Section" field="section" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Tab" field="tab" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" field="status" current={sortField} dir={sortDir} onSort={toggleSort} />
                <SortHeader label="Executor" field="executor" current={sortField} dir={sortDir} onSort={toggleSort} />
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                  Cost/mo
                </th>
                <SortHeader label="Created" field="created_at" current={sortField} dir={sortDir} onSort={toggleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-[13px] text-[var(--text-tertiary)]">
                    {search || statusFilter || executorFilter ? "No steps match your filters" : "No steps yet"}
                  </td>
                </tr>
              ) : (
                filtered.map((step) => (
                  <tr
                    key={step.id}
                    onClick={() => handleRowClick(step)}
                    className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-row-hover)] cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2 text-[13px] font-medium text-[var(--text-primary)] max-w-[200px] truncate">
                      {step.name}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                      {step.section_id ? sectionMap.get(step.section_id) ?? "—" : "—"}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                      {tabMap.get(step.tab_id) ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={step.status as "draft" | "in_progress" | "testing" | "live" | "archived"}>
                        {STATUS_LABELS[step.status] ?? step.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[var(--text-tertiary)] capitalize">
                      {step.executor === "empty" ? "—" : step.executor.replace("_", " ")}
                    </td>
                    <td className="px-3 py-2 text-[12px] text-[var(--text-tertiary)]">
                      {step.time_minutes && step.frequency_per_month
                        ? `${((step.time_minutes * step.frequency_per_month) / 60).toFixed(1)}h`
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-[11px] text-[var(--text-quaternary)]">
                      {new Date(step.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SortHeader({
  label,
  field,
  current,
  dir,
  onSort,
}: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = current === field;
  return (
    <th
      className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] cursor-pointer hover:text-[var(--text-secondary)] select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && (
          <ArrowUpDown className="h-3 w-3" style={{ transform: dir === "desc" ? "scaleY(-1)" : undefined }} />
        )}
      </div>
    </th>
  );
}

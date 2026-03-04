"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowUpDown, TrendingDown, Sparkles, RefreshCw, AlertCircle, KeyRound, Clock, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Step } from "@/types/database";
import { MATURITY_LABELS } from "@/lib/maturity";
import { generateGapNarrative } from "@/lib/api/client";

interface GapAnalysisViewProps {
  workspaceId: string;
  steps: Step[];
  sections: { id: string; name: string }[];
}

type SortField = "gap" | "name" | "section" | "current" | "target";
type SortDir = "asc" | "desc";

type NarrativeState =
  | { type: "idle"; text: string | null }
  | { type: "loading" }
  | { type: "error"; message: string }
  | { type: "not_configured" }
  | { type: "rate_limited"; retryAfterSeconds: number };

const GAP_COLORS: Record<number, string> = {
  0: "var(--text-quaternary)",
  1: "#22c55e",
  2: "#84cc16",
  3: "#eab308",
  4: "#f97316",
  5: "#ef4444",
};

const RATE_LIMIT_RE = /Please wait (\d+) seconds/;

function getGapColor(gap: number): string {
  if (gap <= 0) return GAP_COLORS[0];
  if (gap >= 5) return GAP_COLORS[5];
  return GAP_COLORS[gap] ?? GAP_COLORS[3];
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function classifyNarrativeError(err: unknown): NarrativeState {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("OPENROUTER_API_KEY") || msg.includes("OpenRouter API key")) {
    return { type: "not_configured" };
  }
  const rateMatch = RATE_LIMIT_RE.exec(msg);
  if (rateMatch) {
    return { type: "rate_limited", retryAfterSeconds: parseInt(rateMatch[1], 10) };
  }
  return { type: "error", message: msg };
}

export function GapAnalysisView({ workspaceId, steps, sections }: GapAnalysisViewProps) {
  const router = useRouter();
  const [sectionFilter, setSectionFilter] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<SortField>("gap");
  const [sortDir, setSortDir] = React.useState<SortDir>("desc");

  const [narrativeState, setNarrativeState] = React.useState<NarrativeState>({
    type: "idle",
    text: null,
  });
  const [copied, setCopied] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number>(0);
  const lastTextRef = React.useRef<string | null>(null);

  // Load cached narrative from localStorage on mount
  React.useEffect(() => {
    try {
      const cached = localStorage.getItem(`stride-gap-narrative-${workspaceId}`);
      if (cached) {
        const parsed = JSON.parse(cached) as { text: string; generatedAt: string };
        if (parsed.text) {
          setNarrativeState({ type: "idle", text: parsed.text });
          lastTextRef.current = parsed.text;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [workspaceId]);

  React.useEffect(() => {
    if (narrativeState.type !== "rate_limited") return;
    setCountdown(narrativeState.retryAfterSeconds);
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setNarrativeState({ type: "idle", text: lastTextRef.current });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [narrativeState]);

  const handleGenerateNarrative = async () => {
    setNarrativeState({ type: "loading" });
    try {
      const text = await generateGapNarrative(workspaceId);
      try {
        localStorage.setItem(
          `stride-gap-narrative-${workspaceId}`,
          JSON.stringify({ text, generatedAt: new Date().toISOString() })
        );
      } catch {
        // Ignore localStorage errors
      }
      lastTextRef.current = text;
      setNarrativeState({ type: "idle", text });
    } catch (err) {
      setNarrativeState(classifyNarrativeError(err));
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors
    }
  };

  const sectionMap = React.useMemo(
    () => new Map(sections.map((s) => [s.id, s.name])),
    [sections]
  );

  // Only steps with both current and target maturity set
  const gapSteps = React.useMemo(() => {
    let result = steps.filter(
      (s) => s.maturity_score != null && s.target_maturity != null
    );

    if (sectionFilter) {
      result = result.filter((s) => s.section_id === sectionFilter);
    }

    result.sort((a, b) => {
      const gapA = a.target_maturity! - a.maturity_score!;
      const gapB = b.target_maturity! - b.maturity_score!;
      let cmp = 0;

      switch (sortField) {
        case "gap":
          cmp = gapA - gapB;
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "section":
          cmp = (sectionMap.get(a.section_id ?? "") ?? "").localeCompare(
            sectionMap.get(b.section_id ?? "") ?? ""
          );
          break;
        case "current":
          cmp = a.maturity_score! - b.maturity_score!;
          break;
        case "target":
          cmp = a.target_maturity! - b.target_maturity!;
          break;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [steps, sectionFilter, sortField, sortDir, sectionMap]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "gap" ? "desc" : "asc");
    }
  };

  const handleRowClick = (step: Step) => {
    router.push(`/w/${workspaceId}/${step.tab_id}`);
  };

  // Summary stats
  const totalGap = gapSteps.reduce((sum, s) => sum + (s.target_maturity! - s.maturity_score!), 0);
  const avgGap = gapSteps.length > 0 ? totalGap / gapSteps.length : 0;
  const stepsWithGap = gapSteps.filter((s) => s.target_maturity! - s.maturity_score! > 0).length;

  // Sections that have scored steps (for filter dropdown)
  const scoredSectionIds = new Set(
    steps
      .filter((s) => s.maturity_score != null && s.target_maturity != null && s.section_id)
      .map((s) => s.section_id!)
  );
  const filterableSections = sections.filter((s) => scoredSectionIds.has(s.id));

  const hasGapData = gapSteps.length > 0;
  const isNarrativeLoading = narrativeState.type === "loading";
  const narrativeText = narrativeState.type === "idle" ? narrativeState.text : null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <TrendingDown className="h-5 w-5 text-[var(--text-tertiary)]" />
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">
            Gap Analysis
          </h1>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
              Steps Scored
            </div>
            <div className="text-[24px] font-semibold text-[var(--text-primary)]">
              {gapSteps.length}
              <span className="text-[13px] font-normal text-[var(--text-quaternary)] ml-1">
                / {steps.length}
              </span>
            </div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
              Steps Below Target
            </div>
            <div className="text-[24px] font-semibold" style={{ color: stepsWithGap > 0 ? "#f97316" : "#22c55e" }}>
              {stepsWithGap}
            </div>
          </div>
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)] mb-1">
              Average Gap
            </div>
            <div className="text-[24px] font-semibold" style={{ color: getGapColor(Math.round(avgGap)) }}>
              {avgGap.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Section filter */}
        {filterableSections.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <select
              value={sectionFilter ?? ""}
              onChange={(e) => setSectionFilter(e.target.value || null)}
              className="h-8 px-3 text-[12px] bg-[var(--input-bg)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--signal)]"
              aria-label="Filter by section"
            >
              <option value="">All Sections</option>
              {filterableSections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* AI Narrative section — above the table, always visible */}
        <div className="mb-6">
          {narrativeState.type === "idle" && narrativeText === null && (
            <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <Sparkles className="h-4 w-4 text-[var(--text-tertiary)] shrink-0" />
              <p className="text-[13px] text-[var(--text-secondary)] flex-1">
                {hasGapData
                  ? "Generate a consulting-grade narrative summary of this gap analysis."
                  : "Score steps to enable AI narrative."}
              </p>
              <button
                onClick={handleGenerateNarrative}
                disabled={!hasGapData}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium shrink-0",
                  hasGapData
                    ? "bg-[var(--accent-blue)] text-white hover:opacity-90 transition-opacity"
                    : "bg-[var(--bg-surface-active)] text-[var(--text-tertiary)] cursor-not-allowed"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate Summary
              </button>
            </div>
          )}

          {narrativeState.type === "loading" && (
            <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <RefreshCw className="h-4 w-4 text-[var(--text-tertiary)] animate-spin shrink-0" />
              <p className="text-[13px] text-[var(--text-secondary)] flex-1">
                Generating narrative… this may take a few seconds
              </p>
              <button
                disabled
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--bg-surface-active)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
            </div>
          )}

          {narrativeState.type === "not_configured" && (
            <div className="flex items-start gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <KeyRound className="h-4 w-4 text-[var(--text-quaternary)] shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[var(--text-primary)] mb-1">
                  API key not configured
                </p>
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  AI features require an OpenRouter API key. Add{" "}
                  <code className="text-[var(--text-primary)] bg-[var(--bg-surface-active)] px-1 rounded">
                    OPENROUTER_API_KEY
                  </code>{" "}
                  to your environment variables and redeploy.
                </p>
              </div>
            </div>
          )}

          {narrativeState.type === "rate_limited" && (
            <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <Clock className="h-4 w-4 text-[var(--text-quaternary)] shrink-0" />
              <p className="text-[13px] text-[var(--text-secondary)] flex-1">
                Try again in {formatCountdown(countdown)}
              </p>
              <button
                disabled
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--bg-surface-active)] text-[var(--text-secondary)] opacity-50 cursor-not-allowed shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </button>
            </div>
          )}

          {narrativeState.type === "error" && (
            <div className="flex items-center gap-3 p-4 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <AlertCircle className="h-4 w-4 text-[#EF4444]/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[var(--text-secondary)] truncate">
                  {narrativeState.message}
                </p>
              </div>
              <button
                onClick={handleGenerateNarrative}
                className="text-[12px] text-[var(--accent-blue)] hover:underline shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {narrativeState.type === "idle" && narrativeText !== null && (
            <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[var(--text-tertiary)]" />
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                    AI Gap Summary
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(narrativeText)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium transition-colors",
                      copied
                        ? "bg-[#22C55E]/15 text-[#22C55E]"
                        : "bg-[var(--bg-surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleGenerateNarrative}
                    disabled={isNarrativeLoading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--bg-surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Regenerate
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                {narrativeText.split("\n\n").filter(Boolean).map((paragraph, i) => (
                  <p key={i} className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        {gapSteps.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center">
            <TrendingDown className="h-8 w-8 text-[var(--text-quaternary)] mx-auto mb-3" />
            <p className="text-[14px] text-[var(--text-secondary)] mb-1">No scored steps yet</p>
            <p className="text-[12px] text-[var(--text-quaternary)]">
              Set both current and target maturity on steps to see gap analysis
            </p>
          </div>
        ) : (
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-[var(--bg-surface)]">
                  <GapSortHeader label="Step" field="name" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <GapSortHeader label="Section" field="section" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <GapSortHeader label="Current" field="current" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <GapSortHeader label="Target" field="target" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <GapSortHeader label="Gap" field="gap" current={sortField} dir={sortDir} onSort={toggleSort} />
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                    Visual
                  </th>
                </tr>
              </thead>
              <tbody>
                {gapSteps.map((step) => {
                  const gap = step.target_maturity! - step.maturity_score!;
                  const current = step.maturity_score!;
                  const target = step.target_maturity!;

                  return (
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
                      <td className="px-3 py-2 text-[13px] text-[var(--text-secondary)]">
                        <span className="font-medium">{current}</span>
                        <span className="text-[11px] text-[var(--text-quaternary)] ml-1">
                          {MATURITY_LABELS[current] ?? ""}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[13px] text-[var(--text-secondary)]">
                        <span className="font-medium">{target}</span>
                        <span className="text-[11px] text-[var(--text-quaternary)] ml-1">
                          {MATURITY_LABELS[target] ?? ""}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className="inline-flex items-center justify-center h-6 w-8 rounded-[2px] text-[13px] font-bold bg-[var(--bg-surface)]"
                          style={{
                            color: getGapColor(gap),
                          }}
                        >
                          {gap > 0 ? `+${gap}` : gap}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <GapBar current={current} target={target} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function GapBar({ current, target }: { current: number; target: number }) {
  return (
    <div className="flex items-center gap-0.5 w-[100px]">
      {[1, 2, 3, 4, 5].map((level) => {
        let color: string;
        if (level <= current) {
          color = "#22c55e"; // filled — at or below current
        } else if (level <= target) {
          color = "#ef4444"; // gap — between current and target
        } else {
          color = "var(--border-subtle)"; // unfilled — above target
        }
        return (
          <div
            key={level}
            className="h-3 flex-1 rounded-[1px]"
            style={{ backgroundColor: color, opacity: level <= current || level <= target ? 1 : 0.3 }}
          />
        );
      })}
    </div>
  );
}

function GapSortHeader({
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

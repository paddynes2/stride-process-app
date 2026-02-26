"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Layers,
  FileText,
  Map,
  Users,
  Eye,
  List,
  TrendingDown,
  Split,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getMaturityColor, MATURITY_LABELS } from "@/lib/maturity";
import type { StepStatus, ExecutorType, CanvasType, TouchpointSentiment } from "@/types/database";

interface DashboardStep {
  id: string;
  status: StepStatus;
  executor: ExecutorType;
  maturity_score: number | null;
  target_maturity: number | null;
  time_minutes: number | null;
  frequency_per_month: number | null;
}

interface DashboardTab {
  id: string;
  name: string;
  canvas_type: CanvasType;
}

interface DashboardTouchpoint {
  id: string;
  pain_score: number | null;
  sentiment: TouchpointSentiment | null;
}

interface DashboardViewProps {
  workspaceId: string;
  steps: DashboardStep[];
  sections: { id: string }[];
  tabs: DashboardTab[];
  stages: { id: string }[];
  touchpoints: DashboardTouchpoint[];
  teamCount: number;
  perspectiveCount: number;
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_progress: "In Progress",
  testing: "Testing",
  live: "Live",
  archived: "Archived",
};

const STATUS_ORDER: StepStatus[] = ["draft", "in_progress", "testing", "live", "archived"];

export function DashboardView({
  workspaceId,
  steps,
  sections,
  tabs,
  stages,
  touchpoints,
  teamCount,
  perspectiveCount,
}: DashboardViewProps) {
  const processTabs = tabs.filter((t) => t.canvas_type === "process");
  const journeyTabs = tabs.filter((t) => t.canvas_type === "journey");

  // Status distribution
  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of steps) {
      counts[s.status] = (counts[s.status] ?? 0) + 1;
    }
    return counts;
  }, [steps]);

  // Executor distribution
  const executorCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of steps) {
      if (s.executor !== "empty") {
        counts[s.executor] = (counts[s.executor] ?? 0) + 1;
      }
    }
    return counts;
  }, [steps]);

  // Maturity stats
  const maturityStats = React.useMemo(() => {
    const scored = steps.filter((s) => s.maturity_score != null);
    if (scored.length === 0) return null;
    const avg = scored.reduce((sum, s) => sum + (s.maturity_score ?? 0), 0) / scored.length;
    const targeted = scored.filter((s) => s.target_maturity != null);
    const avgTarget = targeted.length > 0
      ? targeted.reduce((sum, s) => sum + (s.target_maturity ?? 0), 0) / targeted.length
      : null;
    // Distribution by rounded score
    const dist: Record<number, number> = {};
    for (const s of scored) {
      const rounded = Math.round(s.maturity_score ?? 0);
      dist[rounded] = (dist[rounded] ?? 0) + 1;
    }
    return { avg, avgTarget, scored: scored.length, total: steps.length, dist };
  }, [steps]);

  // Cost estimate
  const totalHoursPerMonth = React.useMemo(() => {
    return steps.reduce((sum, s) => {
      if (s.time_minutes && s.frequency_per_month) {
        return sum + (s.time_minutes * s.frequency_per_month) / 60;
      }
      return sum;
    }, 0);
  }, [steps]);

  // Touchpoint sentiment
  const sentimentCounts = React.useMemo(() => {
    const counts: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
    for (const tp of touchpoints) {
      if (tp.sentiment) {
        counts[tp.sentiment] = (counts[tp.sentiment] ?? 0) + 1;
      }
    }
    return counts;
  }, [touchpoints]);

  const basePath = `/w/${workspaceId}`;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)]">Dashboard</h1>
          <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
            Workspace overview and key metrics
          </p>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard icon={LayoutGrid} label="Steps" value={steps.length} />
          <MetricCard icon={Layers} label="Sections" value={sections.length} />
          <MetricCard
            icon={FileText}
            label="Tabs"
            value={tabs.length}
            detail={`${processTabs.length} process · ${journeyTabs.length} journey`}
          />
          <MetricCard icon={Map} label="Touchpoints" value={touchpoints.length} />
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <MetricCard icon={Layers} label="Stages" value={stages.length} />
          <MetricCard icon={Users} label="Teams" value={teamCount} />
          <MetricCard icon={Eye} label="Perspectives" value={perspectiveCount} />
          <MetricCard
            icon={LayoutGrid}
            label="Effort/month"
            value={totalHoursPerMonth > 0 ? `${totalHoursPerMonth.toFixed(0)}h` : "—"}
          />
        </div>

        {/* Status + Maturity Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Status Breakdown */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <h2 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
              Step Status
            </h2>
            {steps.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">No steps yet</p>
            ) : (
              <div className="space-y-2">
                {STATUS_ORDER.map((status) => {
                  const count = statusCounts[status] ?? 0;
                  if (count === 0) return null;
                  const pct = (count / steps.length) * 100;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <Badge variant={status} className="w-[80px] justify-center">
                        {STATUS_LABELS[status]}
                      </Badge>
                      <div className="flex-1 h-2 bg-[var(--bg-surface-secondary)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: statusBarColor(status),
                          }}
                        />
                      </div>
                      <span className="text-[11px] text-[var(--text-tertiary)] w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Maturity Overview */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <h2 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
              Maturity Overview
            </h2>
            {!maturityStats ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">No maturity scores assigned</p>
            ) : (
              <div>
                {/* Average score */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span
                    className="text-[28px] font-bold"
                    style={{ color: getMaturityColor(maturityStats.avg) }}
                  >
                    {maturityStats.avg.toFixed(1)}
                  </span>
                  <span className="text-[12px] text-[var(--text-tertiary)]">
                    avg ({maturityStats.scored}/{maturityStats.total} scored)
                  </span>
                  {maturityStats.avgTarget != null && (
                    <span className="text-[12px] text-[var(--text-tertiary)]">
                      · target {maturityStats.avgTarget.toFixed(1)}
                    </span>
                  )}
                </div>
                {/* Distribution */}
                <div className="flex gap-1 items-end h-10">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const count = maturityStats.dist[level] ?? 0;
                    const maxCount = Math.max(...Object.values(maturityStats.dist), 1);
                    const heightPct = (count / maxCount) * 100;
                    return (
                      <div key={level} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full flex items-end justify-center" style={{ height: 32 }}>
                          <div
                            className="w-full rounded-sm transition-all"
                            style={{
                              height: `${Math.max(heightPct, count > 0 ? 12 : 0)}%`,
                              backgroundColor: getMaturityColor(level),
                              opacity: count > 0 ? 1 : 0.15,
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-[var(--text-tertiary)]">
                          {MATURITY_LABELS[level]?.slice(0, 3)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Executor + Touchpoint Sentiment Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Executor breakdown */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <h2 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
              Executor Types
            </h2>
            {Object.keys(executorCounts).length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">No executors assigned</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(executorCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([executor, count]) => (
                    <div key={executor} className="flex items-center justify-between">
                      <span className="text-[12px] text-[var(--text-secondary)] capitalize">
                        {executor.replace("_", " ")}
                      </span>
                      <span className="text-[12px] text-[var(--text-tertiary)]">{count}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Touchpoint Sentiment */}
          <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <h2 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">
              Touchpoint Sentiment
            </h2>
            {touchpoints.length === 0 ? (
              <p className="text-[12px] text-[var(--text-tertiary)]">No touchpoints yet</p>
            ) : (
              <div className="space-y-2">
                {[
                  { key: "positive", label: "Positive", color: "var(--success)" },
                  { key: "neutral", label: "Neutral", color: "var(--text-tertiary)" },
                  { key: "negative", label: "Negative", color: "var(--error)" },
                ].map(({ key, label, color }) => {
                  const count = sentimentCounts[key] ?? 0;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-[12px] text-[var(--text-secondary)]">{label}</span>
                      </div>
                      <span className="text-[12px] text-[var(--text-tertiary)]">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
          <h2 className="text-[13px] font-semibold text-[var(--text-primary)] mb-3">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <QuickLink href={`${basePath}/list`} icon={List} label="Step List" description="All steps in table view" />
            <QuickLink href={`${basePath}/gap-analysis`} icon={TrendingDown} label="Gap Analysis" description="Maturity gaps and priorities" />
            <QuickLink href={`${basePath}/compare`} icon={Split} label="Compare" description="Side-by-side canvas comparison" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  detail?: string;
}) {
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-[var(--text-tertiary)]" />
        <span className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wide font-medium">
          {label}
        </span>
      </div>
      <p className="text-[22px] font-bold text-[var(--text-primary)] leading-tight">{value}</p>
      {detail && (
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">{detail}</p>
      )}
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)] hover:bg-[var(--bg-surface-hover)] transition-colors group"
    >
      <Icon className="h-4 w-4 text-[var(--text-tertiary)] group-hover:text-[var(--brand)]" />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">
          {label}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)]">{description}</p>
      </div>
      <ArrowRight className="h-3 w-3 text-[var(--text-quaternary)] group-hover:text-[var(--text-tertiary)]" />
    </Link>
  );
}

function statusBarColor(status: StepStatus): string {
  switch (status) {
    case "draft": return "var(--text-tertiary)";
    case "in_progress": return "var(--signal)";
    case "testing": return "var(--warning)";
    case "live": return "var(--success)";
    case "archived": return "var(--text-quaternary)";
  }
}

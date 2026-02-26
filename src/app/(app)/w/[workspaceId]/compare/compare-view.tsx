"use client";

import * as React from "react";
import Link from "next/link";
import {
  GitBranch,
  Route,
  Layers,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { MATURITY_LABELS, getMaturityColor } from "@/lib/maturity";
import { getPainColor } from "@/lib/pain";
import type {
  Tab,
  Section,
  Step,
  Connection,
  Stage,
  Touchpoint,
  TouchpointConnection,
} from "@/types/database";

interface CompareViewProps {
  workspaceId: string;
  processTab: Tab | null;
  journeyTab: Tab | null;
  processSections: Section[];
  processSteps: Step[];
  processConnections: Connection[];
  journeyStages: Stage[];
  journeyTouchpoints: Touchpoint[];
  journeyConnections: TouchpointConnection[];
}

function computeProcessStats(sections: Section[], steps: Step[]) {
  const scoredSteps = steps.filter((s) => s.maturity_score != null);
  const avgMaturity =
    scoredSteps.length > 0
      ? scoredSteps.reduce((sum, s) => sum + (s.maturity_score ?? 0), 0) / scoredSteps.length
      : null;
  return {
    sectionCount: sections.length,
    stepCount: steps.length,
    avgMaturity,
    scoredCount: scoredSteps.length,
  };
}

function computeJourneyStats(stages: Stage[], touchpoints: Touchpoint[]) {
  const painTouchpoints = touchpoints.filter((t) => t.pain_score != null);
  const avgPain =
    painTouchpoints.length > 0
      ? painTouchpoints.reduce((sum, t) => sum + (t.pain_score ?? 0), 0) / painTouchpoints.length
      : null;
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const t of touchpoints) {
    if (t.sentiment === "positive") sentimentCounts.positive++;
    else if (t.sentiment === "negative") sentimentCounts.negative++;
    else sentimentCounts.neutral++;
  }
  return {
    stageCount: stages.length,
    touchpointCount: touchpoints.length,
    avgPain,
    sentimentCounts,
    painScoredCount: painTouchpoints.length,
  };
}

export function CompareView({
  workspaceId,
  processTab,
  journeyTab,
  processSections,
  processSteps,
  processConnections,
  journeyStages,
  journeyTouchpoints,
  journeyConnections,
}: CompareViewProps) {
  const hasBoth = processTab !== null && journeyTab !== null;
  const hasNeither = processTab === null && journeyTab === null;

  // Stats
  const processStats = React.useMemo(
    () => computeProcessStats(processSections, processSteps),
    [processSections, processSteps]
  );
  const journeyStats = React.useMemo(
    () => computeJourneyStats(journeyStages, journeyTouchpoints),
    [journeyStages, journeyTouchpoints]
  );

  if (!hasBoth) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-surface)]">
          <Layers className="w-6 h-6 text-[var(--text-tertiary)]" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
            Comparison requires both canvas types
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-md">
            {hasNeither
              ? "Create a process canvas and a journey canvas to see a side-by-side comparison of your internal operations and customer experience."
              : processTab
                ? "Create a journey canvas tab to compare your process map with the customer journey."
                : "Create a process canvas tab to compare the customer journey with your internal operations."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">
          Process vs Journey Comparison
        </h1>
      </div>

      {/* Side-by-side panels */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Process side */}
        <div className="flex-1 flex flex-col border-r border-[var(--border-subtle)] min-w-0">
          <PanelHeader
            icon={GitBranch}
            label="Process Map"
            tabName={processTab.name}
            tabId={processTab.id}
            workspaceId={workspaceId}
            accentColor="var(--accent-blue)"
          />
          <div className="flex-1 overflow-auto p-4">
            <ProcessSummary
              stats={processStats}
              sections={processSections}
              steps={processSteps}
              connections={processConnections}
            />
          </div>
        </div>

        {/* Journey side */}
        <div className="flex-1 flex flex-col min-w-0">
          <PanelHeader
            icon={Route}
            label="Journey Map"
            tabName={journeyTab.name}
            tabId={journeyTab.id}
            workspaceId={workspaceId}
            accentColor="var(--brand)"
          />
          <div className="flex-1 overflow-auto p-4">
            <JourneySummary
              stats={journeyStats}
              stages={journeyStages}
              touchpoints={journeyTouchpoints}
              connections={journeyConnections}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Panel Header                                                                */
/* -------------------------------------------------------------------------- */

function PanelHeader({
  icon: Icon,
  label,
  tabName,
  tabId,
  workspaceId,
  accentColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tabName: string;
  tabId: string;
  workspaceId: string;
  accentColor: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
      <div className="flex items-center gap-2 min-w-0">
        <span style={{ color: accentColor }}><Icon className="h-4 w-4 shrink-0" /></span>
        <span className="text-sm font-medium text-[var(--text-primary)] truncate">
          {label}
        </span>
        <span className="text-xs text-[var(--text-tertiary)] truncate">
          — {tabName}
        </span>
      </div>
      <Link
        href={`/w/${workspaceId}/${tabId}`}
        className="flex items-center gap-1 text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors shrink-0"
      >
        Open <ArrowRight className="h-3 w-3" />
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat Card                                                                   */
/* -------------------------------------------------------------------------- */

function StatCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-[var(--radius)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-3">
      <div className="text-xs text-[var(--text-tertiary)] mb-1">{label}</div>
      <div className="text-lg font-semibold text-[var(--text-primary)]">{value}</div>
      {detail && <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{detail}</div>}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Process Summary                                                             */
/* -------------------------------------------------------------------------- */

function ProcessSummary({
  stats,
  sections,
  steps,
  connections,
}: {
  stats: ReturnType<typeof computeProcessStats>;
  sections: Section[];
  steps: Step[];
  connections: Connection[];
}) {
  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Sections" value={stats.sectionCount} />
        <StatCard label="Steps" value={stats.stepCount} />
        <StatCard
          label="Avg Maturity"
          value={stats.avgMaturity != null ? stats.avgMaturity.toFixed(1) : "—"}
          detail={stats.avgMaturity != null ? MATURITY_LABELS[Math.round(stats.avgMaturity) as keyof typeof MATURITY_LABELS] : undefined}
        />
        <StatCard label="Connections" value={connections.length} />
      </div>

      {/* Section list */}
      {sections.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            Sections
          </h3>
          <div className="space-y-1">
            {sections.map((section) => {
              const sectionSteps = steps.filter((s) => s.section_id === section.id);
              const scored = sectionSteps.filter((s) => s.maturity_score != null);
              const avgMat = scored.length > 0
                ? scored.reduce((sum, s) => sum + (s.maturity_score ?? 0), 0) / scored.length
                : null;
              return (
                <div
                  key={section.id}
                  className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                >
                  <span className="text-sm text-[var(--text-primary)] truncate">{section.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {sectionSteps.length} step{sectionSteps.length !== 1 ? "s" : ""}
                    </span>
                    {avgMat != null && (
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded-sm"
                        style={{
                          backgroundColor: `${getMaturityColor(Math.round(avgMat))}20`,
                          color: getMaturityColor(Math.round(avgMat)),
                        }}
                      >
                        {avgMat.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Journey Summary                                                             */
/* -------------------------------------------------------------------------- */

function JourneySummary({
  stats,
  stages,
  touchpoints,
  connections,
}: {
  stats: ReturnType<typeof computeJourneyStats>;
  stages: Stage[];
  touchpoints: Touchpoint[];
  connections: TouchpointConnection[];
}) {
  const sentimentColors = {
    positive: "var(--accent-green)",
    neutral: "var(--text-tertiary)",
    negative: "var(--accent-red)",
  };

  return (
    <div className="space-y-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Stages" value={stats.stageCount} />
        <StatCard label="Touchpoints" value={stats.touchpointCount} />
        <StatCard
          label="Avg Pain"
          value={stats.avgPain != null ? stats.avgPain.toFixed(1) : "—"}
          detail={stats.avgPain != null ? `${stats.painScoredCount} scored` : undefined}
        />
        <StatCard label="Connections" value={connections.length} />
      </div>

      {/* Sentiment bar */}
      {stats.touchpointCount > 0 && (
        <div>
          <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            Sentiment Distribution
          </h3>
          <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-[var(--bg-surface)]">
            {(["positive", "neutral", "negative"] as const).map((s) => {
              const count = stats.sentimentCounts[s];
              const pct = (count / stats.touchpointCount) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={s}
                  className="h-full rounded-full"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: sentimentColors[s],
                    minWidth: count > 0 ? 4 : 0,
                  }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-1.5">
            {(["positive", "neutral", "negative"] as const).map((s) => (
              <span key={s} className="text-xs" style={{ color: sentimentColors[s] }}>
                {stats.sentimentCounts[s]} {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Stage list */}
      {stages.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide mb-2">
            Stages
          </h3>
          <div className="space-y-1">
            {stages.map((stage) => {
              const stageTouchpoints = touchpoints.filter((t) => t.stage_id === stage.id);
              const painScored = stageTouchpoints.filter((t) => t.pain_score != null);
              const avgPain = painScored.length > 0
                ? painScored.reduce((sum, t) => sum + (t.pain_score ?? 0), 0) / painScored.length
                : null;
              return (
                <div
                  key={stage.id}
                  className="flex items-center justify-between px-3 py-2 rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-[var(--text-tertiary)]" />
                    <span className="text-sm text-[var(--text-primary)] truncate">{stage.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[var(--text-tertiary)]">
                      {stageTouchpoints.length} tp{stageTouchpoints.length !== 1 ? "s" : ""}
                    </span>
                    {avgPain != null && (
                      <span
                        className="text-xs font-medium px-1.5 py-0.5 rounded-sm"
                        style={{
                          backgroundColor: `${getPainColor(Math.round(avgPain))}20`,
                          color: getPainColor(Math.round(avgPain)),
                        }}
                      >
                        {avgPain.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

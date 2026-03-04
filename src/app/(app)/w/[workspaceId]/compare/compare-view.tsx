"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Panel,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  GitBranch,
  Route,
  Layers,
  ArrowRight,
  Link2,
  FileDown,
  Loader2,
} from "lucide-react";
import { StepNode } from "@/components/canvas/step-node";
import { SectionNode } from "@/components/canvas/section-node";
import { StageNode } from "@/components/canvas/stage-node";
import { TouchpointNode } from "@/components/canvas/touchpoint-node";
import { Button } from "@/components/ui/button";
import { createTab } from "@/lib/api/client";
import { toastError } from "@/lib/api/toast-helpers";
import type {
  Tab,
  Section,
  Step,
  Connection,
  Stage,
  Touchpoint,
  TouchpointConnection,
} from "@/types/database";
import type { StepNodeData, SectionNodeData, StageNodeData, TouchpointNodeData } from "@/types/canvas";
import { MATURITY_LABELS } from "@/lib/maturity";
import { getPainColor } from "@/lib/pain";

/* -------------------------------------------------------------------------- */
/* Node type registrations (stable references — defined outside component)     */
/* -------------------------------------------------------------------------- */

const processNodeTypes = {
  step: StepNode,
  section: SectionNode,
};

const journeyNodeTypes = {
  stage: StageNode,
  touchpoint: TouchpointNode,
};

/* -------------------------------------------------------------------------- */
/* Node/edge builders (read-only — no selection, no heat map)                  */
/* -------------------------------------------------------------------------- */

function buildProcessNodes(sections: Section[], steps: Step[], matchedSectionIds: Set<string>): Node[] {
  const sectionNodes: Node<SectionNodeData>[] = (sections ?? []).filter(Boolean).map((section) => {
    const sectionSteps = steps.filter((s) => s.section_id === section.id);
    const scored = sectionSteps.filter((s) => s.maturity_score != null);
    const avg = scored.length > 0
      ? scored.reduce((sum, s) => sum + s.maturity_score!, 0) / scored.length
      : null;
    const withTarget = sectionSteps.filter((s) => s.target_maturity != null);
    const avgTarget = withTarget.length > 0
      ? withTarget.reduce((sum, s) => sum + s.target_maturity!, 0) / withTarget.length
      : null;
    const isMatched = matchedSectionIds.has(section.id);
    return {
      id: `section-${section.id}`,
      type: "section" as const,
      position: { x: section.position_x, y: section.position_y },
      data: { section, averageMaturity: avg, averageTargetMaturity: avgTarget, heatMapMode: false },
      style: {
        width: section.width,
        height: section.height,
        ...(isMatched ? { boxShadow: MATCH_GLOW, borderRadius: "var(--radius-lg)" } : {}),
      },
    };
  });

  const stepNodes: Node<StepNodeData>[] = (steps ?? []).filter(Boolean).map((step) => ({
    id: `step-${step.id}`,
    type: "step" as const,
    position: { x: step.position_x, y: step.position_y },
    data: { step, selected: false, heatMapMode: false },
    parentId: step.section_id ? `section-${step.section_id}` : undefined,
    extent: step.section_id ? ("parent" as const) : undefined,
  }));

  return [...sectionNodes, ...stepNodes];
}

function buildProcessEdges(connections: Connection[]): Edge[] {
  return (connections ?? []).filter(Boolean).map((conn) => ({
    id: `edge-${conn.id}`,
    source: `step-${conn.source_step_id}`,
    target: `step-${conn.target_step_id}`,
    type: "default",
  }));
}

function buildJourneyCanvasNodes(stages: Stage[], touchpoints: Touchpoint[], matchedStageIds: Set<string>): Node[] {
  const stageNodes: Node<StageNodeData>[] = (stages ?? []).filter(Boolean).map((stage) => {
    const stageTps = touchpoints.filter((t) => t.stage_id === stage.id);
    const withPain = stageTps.filter((t) => t.pain_score != null);
    const avgPain = withPain.length > 0
      ? withPain.reduce((sum, t) => sum + t.pain_score!, 0) / withPain.length
      : null;
    const isMatched = matchedStageIds.has(stage.id);
    return {
      id: `stage-${stage.id}`,
      type: "stage" as const,
      position: { x: stage.position_x, y: stage.position_y },
      data: { stage, averagePainScore: avgPain, heatMapMode: false },
      style: {
        width: stage.width,
        height: stage.height,
        ...(isMatched ? { boxShadow: MATCH_GLOW, borderRadius: "var(--radius-lg)" } : {}),
      },
    };
  });

  const tpNodes: Node<TouchpointNodeData>[] = (touchpoints ?? []).filter(Boolean).map((tp) => ({
    id: `tp-${tp.id}`,
    type: "touchpoint" as const,
    position: { x: tp.position_x, y: tp.position_y },
    data: { touchpoint: tp, selected: false, heatMapMode: false },
    parentId: tp.stage_id ? `stage-${tp.stage_id}` : undefined,
    extent: tp.stage_id ? ("parent" as const) : undefined,
  }));

  return [...stageNodes, ...tpNodes];
}

function buildJourneyCanvasEdges(connections: TouchpointConnection[]): Edge[] {
  return (connections ?? []).filter(Boolean).map((conn) => ({
    id: `edge-${conn.id}`,
    source: `tp-${conn.source_touchpoint_id}`,
    target: `tp-${conn.target_touchpoint_id}`,
    type: "default",
  }));
}

/* -------------------------------------------------------------------------- */
/* Name matching — case-insensitive alignment between sections and stages      */
/* -------------------------------------------------------------------------- */

interface NameMatch {
  sectionId: string;
  sectionName: string;
  stageId: string;
  stageName: string;
}

function computeNameMatches(sections: Section[], stages: Stage[]): NameMatch[] {
  const matches: NameMatch[] = [];
  const usedStageIds = new Set<string>();

  for (const section of sections) {
    const sectionNorm = section.name.trim().toLowerCase();
    if (!sectionNorm) continue;

    for (const stage of stages) {
      if (usedStageIds.has(stage.id)) continue;
      const stageNorm = stage.name.trim().toLowerCase();
      if (!stageNorm) continue;

      if (sectionNorm === stageNorm) {
        matches.push({
          sectionId: section.id,
          sectionName: section.name,
          stageId: stage.id,
          stageName: stage.name,
        });
        usedStageIds.add(stage.id);
        break; // one match per section
      }
    }
  }

  return matches;
}

const MATCH_GLOW = "0 0 0 2px var(--brand), 0 0 12px rgba(20,184,166,0.25)";

/* -------------------------------------------------------------------------- */
/* Stats helpers                                                               */
/* -------------------------------------------------------------------------- */

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
  };
}

/* -------------------------------------------------------------------------- */
/* Props                                                                       */
/* -------------------------------------------------------------------------- */

interface CompareViewProps {
  workspaceId: string;
  workspaceName: string;
  processTab: Tab | null;
  journeyTab: Tab | null;
  processSections: Section[];
  processSteps: Step[];
  processConnections: Connection[];
  journeyStages: Stage[];
  journeyTouchpoints: Touchpoint[];
  journeyConnections: TouchpointConnection[];
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                              */
/* -------------------------------------------------------------------------- */

export function CompareView({
  workspaceId,
  workspaceName,
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

  const router = useRouter();
  const [creating, setCreating] = React.useState(false);
  const [creatingProcess, setCreatingProcess] = React.useState(false);

  const handleCreateJourneyTab = React.useCallback(async () => {
    setCreating(true);
    try {
      const newTab = await createTab({ workspace_id: workspaceId, name: "Journey", canvas_type: "journey" });
      router.push(`/w/${workspaceId}/${newTab.id}`);
    } catch (err) {
      toastError("Failed to create journey tab", { error: err });
      setCreating(false);
    }
  }, [workspaceId, router]);

  const handleCreateProcessTab = React.useCallback(async () => {
    setCreatingProcess(true);
    try {
      const newTab = await createTab({ workspace_id: workspaceId, name: "Process", canvas_type: "process" });
      router.push(`/w/${workspaceId}/${newTab.id}`);
    } catch (err) {
      toastError("Failed to create process tab", { error: err });
      setCreatingProcess(false);
    }
  }, [workspaceId, router]);

  const processCanvasRef = React.useRef<HTMLDivElement>(null);
  const journeyCanvasRef = React.useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = React.useState(false);

  const processStats = React.useMemo(
    () => computeProcessStats(processSections, processSteps),
    [processSections, processSteps]
  );
  const journeyStats = React.useMemo(
    () => computeJourneyStats(journeyStages, journeyTouchpoints),
    [journeyStages, journeyTouchpoints]
  );
  const nameMatches = React.useMemo(
    () => computeNameMatches(processSections, journeyStages),
    [processSections, journeyStages]
  );
  const matchedSectionIds = React.useMemo(
    () => new Set(nameMatches.map((m) => m.sectionId)),
    [nameMatches]
  );
  const matchedStageIds = React.useMemo(
    () => new Set(nameMatches.map((m) => m.stageId)),
    [nameMatches]
  );

  const handleExportPdf = React.useCallback(async () => {
    if (!processCanvasRef.current || !journeyCanvasRef.current || !processTab || !journeyTab) return;
    setExporting(true);
    try {
      const { exportComparisonPdf } = await import("@/lib/export/comparison-pdf");
      await exportComparisonPdf({
        workspaceName,
        processTabName: processTab.name,
        journeyTabName: journeyTab.name,
        sections: processSections,
        steps: processSteps,
        stages: journeyStages,
        touchpoints: journeyTouchpoints,
        nameMatches: nameMatches.map((m) => ({ sectionName: m.sectionName, stageName: m.stageName })),
        processCanvasElement: processCanvasRef.current,
        journeyCanvasElement: journeyCanvasRef.current,
      });
    } catch (err) {
      console.error("Comparison PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [workspaceName, processTab, journeyTab, processSections, processSteps, journeyStages, journeyTouchpoints, nameMatches]);

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
        <div className="flex gap-3">
          {processTab === null && (
            <Button onClick={handleCreateProcessTab} loading={creatingProcess}>
              Create Process Tab
            </Button>
          )}
          {journeyTab === null && (
            <Button onClick={handleCreateJourneyTab} loading={creating}>
              Create Journey Tab
            </Button>
          )}
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
        <button
          onClick={handleExportPdf}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[var(--radius)] bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-active)] transition-colors disabled:opacity-50"
          aria-label="Export comparison as PDF"
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <FileDown className="h-3.5 w-3.5" />
          )}
          Export PDF
        </button>
      </div>

      {/* Alignment matches bar */}
      {nameMatches.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-1.5 text-[var(--brand)]">
            <Link2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">
              {nameMatches.length} alignment{nameMatches.length !== 1 ? "s" : ""} found
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {nameMatches.map((m) => (
              <span
                key={m.sectionId}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium text-[var(--text-primary)] bg-[rgba(20,184,166,0.12)] border border-[rgba(20,184,166,0.25)]"
              >
                {m.sectionName}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Side-by-side canvases */}
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
          <div ref={processCanvasRef} className="flex-1 min-h-0">
            <ReadOnlyProcessCanvas
              sections={processSections}
              steps={processSteps}
              connections={processConnections}
              stats={processStats}
              matchedSectionIds={matchedSectionIds}
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
          <div ref={journeyCanvasRef} className="flex-1 min-h-0">
            <ReadOnlyJourneyCanvas
              stages={journeyStages}
              touchpoints={journeyTouchpoints}
              connections={journeyConnections}
              stats={journeyStats}
              matchedStageIds={matchedStageIds}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Read-Only Process Canvas                                                    */
/* -------------------------------------------------------------------------- */

function ReadOnlyProcessCanvas({
  sections,
  steps,
  connections,
  stats,
  matchedSectionIds,
}: {
  sections: Section[];
  steps: Step[];
  connections: Connection[];
  stats: ReturnType<typeof computeProcessStats>;
  matchedSectionIds: Set<string>;
}) {
  const nodes = React.useMemo(() => buildProcessNodes(sections, steps, matchedSectionIds), [sections, steps, matchedSectionIds]);
  const edges = React.useMemo(() => buildProcessEdges(connections), [connections]);

  const isEmpty = sections.length === 0 && steps.length === 0;

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={processNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={null}
        className="bg-[var(--bg-app)]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.04)" />
        <Controls
          showInteractive={false}
          className="!bg-[var(--bg-surface)] !border-[var(--border-subtle)] !rounded-[var(--radius-md)]"
        />

        {/* Compact stats overlay */}
        <Panel position="top-right">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-[var(--radius)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <StatsItem label="Sections" value={stats.sectionCount} />
            <StatsItem label="Steps" value={stats.stepCount} />
            {stats.avgMaturity != null && (
              <StatsItem
                label="Maturity"
                value={stats.avgMaturity.toFixed(1)}
                detail={MATURITY_LABELS[Math.round(stats.avgMaturity) as keyof typeof MATURITY_LABELS]}
              />
            )}
          </div>
        </Panel>
      </ReactFlow>

      {/* Empty state */}
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-[var(--text-tertiary)]">No process steps mapped yet</p>
        </div>
      )}
    </ReactFlowProvider>
  );
}

/* -------------------------------------------------------------------------- */
/* Read-Only Journey Canvas                                                    */
/* -------------------------------------------------------------------------- */

function ReadOnlyJourneyCanvas({
  stages,
  touchpoints,
  connections,
  stats,
  matchedStageIds,
}: {
  stages: Stage[];
  touchpoints: Touchpoint[];
  connections: TouchpointConnection[];
  stats: ReturnType<typeof computeJourneyStats>;
  matchedStageIds: Set<string>;
}) {
  const nodes = React.useMemo(() => buildJourneyCanvasNodes(stages, touchpoints, matchedStageIds), [stages, touchpoints, matchedStageIds]);
  const edges = React.useMemo(() => buildJourneyCanvasEdges(connections), [connections]);

  const isEmpty = stages.length === 0 && touchpoints.length === 0;

  const sentimentColors = {
    positive: "var(--accent-green)",
    neutral: "var(--text-tertiary)",
    negative: "var(--accent-red)",
  };

  return (
    <ReactFlowProvider>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={journeyNodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={null}
        className="bg-[var(--bg-app)]"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.04)" />
        <Controls
          showInteractive={false}
          className="!bg-[var(--bg-surface)] !border-[var(--border-subtle)] !rounded-[var(--radius-md)]"
        />

        {/* Compact stats overlay */}
        <Panel position="top-right">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-[var(--radius)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <StatsItem label="Stages" value={stats.stageCount} />
            <StatsItem label="Touchpoints" value={stats.touchpointCount} />
            {stats.avgPain != null && (
              <StatsItem
                label="Pain"
                value={stats.avgPain.toFixed(1)}
                color={getPainColor(Math.round(stats.avgPain))}
              />
            )}
          </div>
        </Panel>

        {/* Sentiment bar */}
        {stats.touchpointCount > 0 && (
          <Panel position="bottom-right">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">Sentiment</span>
              {(["positive", "neutral", "negative"] as const).map((s) => {
                const count = stats.sentimentCounts[s];
                if (count === 0) return null;
                return (
                  <span key={s} className="text-[10px] font-medium" style={{ color: sentimentColors[s] }}>
                    {count} {s}
                  </span>
                );
              })}
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Empty state */}
      {isEmpty && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-sm text-[var(--text-tertiary)]">No journey touchpoints mapped yet</p>
        </div>
      )}
    </ReactFlowProvider>
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
/* Stats Item (compact inline stat for overlay)                                */
/* -------------------------------------------------------------------------- */

function StatsItem({ label, value, detail, color }: { label: string; value: string | number; detail?: string; color?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wide">{label}</span>
      <span className="text-xs font-semibold text-[var(--text-primary)]" style={color ? { color } : undefined}>
        {value}
      </span>
      {detail && <span className="text-[10px] text-[var(--text-tertiary)]">{detail}</span>}
    </div>
  );
}

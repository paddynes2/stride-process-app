"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Panel,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Thermometer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepNode } from "@/components/canvas/step-node";
import { SectionNode } from "@/components/canvas/section-node";
import type { Step, Section } from "@/types/database";
import type { StepNodeData, SectionNodeData } from "@/types/canvas";
import { MATURITY_LEVELS } from "@/lib/maturity";

const nodeTypes = {
  step: StepNode,
  section: SectionNode,
};

interface TabData {
  id: string;
  name: string;
  position: number;
  sections: Array<{
    id: string;
    name: string;
    summary: string | null;
    position_x: number;
    position_y: number;
    width: number;
    height: number;
  }>;
  steps: Array<{
    id: string;
    name: string;
    section_id: string | null;
    position_x: number;
    position_y: number;
    status: string;
    step_type: string | null;
    executor: string;
    maturity_score: number | null;
    target_maturity: number | null;
  }>;
  connections: Array<{
    id: string;
    source_step_id: string;
    target_step_id: string;
  }>;
}

interface PublicCanvasViewProps {
  shareData: {
    workspace: { id: string; name: string };
    tabs: TabData[];
  };
}

function computeSectionMaturity(
  sectionId: string,
  steps: TabData["steps"]
): { avg: number | null; avgTarget: number | null } {
  const sectionSteps = (steps ?? []).filter((s) => s.section_id === sectionId);
  const withMaturity = sectionSteps.filter((s) => s.maturity_score != null);
  const withTarget = sectionSteps.filter((s) => s.target_maturity != null);
  const avg =
    withMaturity.length > 0
      ? withMaturity.reduce((sum, s) => sum + s.maturity_score!, 0) / withMaturity.length
      : null;
  const avgTarget =
    withTarget.length > 0
      ? withTarget.reduce((sum, s) => sum + s.target_maturity!, 0) / withTarget.length
      : null;
  return { avg, avgTarget };
}

function buildNodes(
  sections: TabData["sections"],
  steps: TabData["steps"],
  heatMapMode: boolean
): Node[] {
  const sectionNodes: Node<SectionNodeData>[] = (sections ?? [])
    .filter(Boolean)
    .map((section) => {
      const { avg, avgTarget } = computeSectionMaturity(section.id, steps);
      return {
        id: `section-${section.id}`,
        type: "section",
        position: { x: section.position_x, y: section.position_y },
        data: {
          section: section as unknown as Section,
          averageMaturity: avg,
          averageTargetMaturity: avgTarget,
          heatMapMode,
        },
        style: { width: section.width, height: section.height },
        draggable: false,
        selectable: false,
      };
    });

  const stepNodes: Node<StepNodeData>[] = (steps ?? []).filter(Boolean).map((step) => ({
    id: `step-${step.id}`,
    type: "step",
    position: { x: step.position_x, y: step.position_y },
    data: {
      step: step as unknown as Step,
      selected: false,
      heatMapMode,
    },
    parentId: step.section_id ? `section-${step.section_id}` : undefined,
    extent: step.section_id ? ("parent" as const) : undefined,
    draggable: false,
    selectable: false,
  }));

  return [...sectionNodes, ...stepNodes];
}

function buildEdges(connections: TabData["connections"]): Edge[] {
  return (connections ?? []).filter(Boolean).map((conn) => ({
    id: `edge-${conn.id}`,
    source: `step-${conn.source_step_id}`,
    target: `step-${conn.target_step_id}`,
    type: "default",
  }));
}

export function PublicCanvasView({ shareData }: PublicCanvasViewProps) {
  const { workspace, tabs } = shareData;
  const sortedTabs = React.useMemo(
    () => [...tabs].sort((a, b) => a.position - b.position),
    [tabs]
  );

  const [activeTabId, setActiveTabId] = React.useState<string>(
    sortedTabs[0]?.id ?? ""
  );
  const [heatMapMode, setHeatMapMode] = React.useState(false);

  const activeTab = sortedTabs.find((t) => t.id === activeTabId) ?? sortedTabs[0];

  const nodes = React.useMemo(
    () => (activeTab ? buildNodes(activeTab.sections, activeTab.steps, heatMapMode) : []),
    [activeTab, heatMapMode]
  );

  const edges = React.useMemo(
    () => (activeTab ? buildEdges(activeTab.connections) : []),
    [activeTab]
  );

  if (!activeTab) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <p className="text-[var(--text-secondary)]">No process data available.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--brand)]">Stride</span>
          <span className="text-[var(--text-quaternary)]">/</span>
          <h1 className="text-sm font-medium text-[var(--text-primary)]">
            {workspace.name}
          </h1>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">Read-only view</span>
      </header>

      {/* Tab bar (only if multiple tabs) */}
      {sortedTabs.length > 1 && (
        <div className="flex gap-1 px-6 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          {sortedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
                tab.id === activeTabId
                  ? "bg-[var(--bg-surface-active)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag
          zoomOnScroll
          deleteKeyCode={null}
          className="bg-[var(--bg-app)]"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="rgba(255,255,255,0.04)"
          />
          <Controls
            showInteractive={false}
            className="!bg-[var(--bg-surface)] !border-[var(--border-subtle)] !rounded-[var(--radius-md)]"
          />
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "section") return "rgba(255,255,255,0.06)";
              return "var(--brand)";
            }}
            maskColor="rgba(10,10,11,0.75)"
            className="!bg-[var(--bg-surface)] !border-[var(--border-subtle)]"
          />

          {/* Heat map toggle */}
          <Panel position="top-left" className="flex gap-1.5">
            <Button
              variant={heatMapMode ? "default" : "secondary"}
              size="sm"
              onClick={() => setHeatMapMode((prev) => !prev)}
              title="Toggle maturity heat map"
            >
              <Thermometer className="h-3.5 w-3.5" />
              Heat Map
            </Button>
          </Panel>

          {/* Heat map legend */}
          {heatMapMode && (
            <Panel position="bottom-left">
              <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mr-1">
                  Maturity
                </span>
                {MATURITY_LEVELS.map(({ level, color }) => (
                  <div key={level} className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[10px] text-[var(--text-secondary)]">
                      {level}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

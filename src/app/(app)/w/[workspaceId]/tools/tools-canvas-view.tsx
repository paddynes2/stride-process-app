"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeChange,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Square, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToolNode } from "@/components/canvas/tool-node";
import { ToolSectionNode } from "@/components/canvas/tool-section-node";
import {
  createTool,
  updateTool,
  createToolSection,
  updateToolSection,
} from "@/lib/api/client";
import type { Tool, ToolSection } from "@/types/database";
import type { ToolNodeData, ToolSectionNodeData } from "@/types/canvas";
import { ToolDetailPanel } from "@/components/panels/tool-detail-panel";
import { ToolSectionDetailPanel } from "@/components/panels/tool-section-detail-panel";
import { ToolAnalysisView } from "./tool-analysis-view";
import type { AnalysisStep, StepToolData } from "./tool-analysis-view";

const nodeTypes = {
  tool: ToolNode,
  "tool-section": ToolSectionNode,
};

// Compute toolId → sectionId map from spatial containment
function computeToolSectionMap(
  tools: Tool[],
  toolSections: ToolSection[]
): Record<string, string | null> {
  const map: Record<string, string | null> = {};
  for (const tool of tools) {
    map[tool.id] = null;
    for (const ts of toolSections) {
      if (
        tool.position_x >= ts.position_x &&
        tool.position_x <= ts.position_x + ts.width &&
        tool.position_y >= ts.position_y &&
        tool.position_y <= ts.position_y + ts.height
      ) {
        map[tool.id] = ts.id;
        break;
      }
    }
  }
  return map;
}

function buildToolNodes(
  tools: Tool[],
  toolSections: ToolSection[],
  toolSectionMap: Record<string, string | null>,
  selectedToolId: string | null,
  selectedSectionId: string | null,
  onResizeEnd: (sectionId: string, width: number, height: number) => void
): Node[] {
  const sectionNodes: Node<ToolSectionNodeData>[] = (toolSections ?? [])
    .filter(Boolean)
    .map((ts) => ({
      id: `tool-section-${ts.id}`,
      type: "tool-section",
      position: { x: ts.position_x, y: ts.position_y },
      data: { toolSection: ts, onResizeEnd } as ToolSectionNodeData,
      style: { width: ts.width, height: ts.height },
      selected: ts.id === selectedSectionId,
    }));

  const toolNodes: Node<ToolNodeData>[] = (tools ?? [])
    .filter(Boolean)
    .map((tool) => {
      const sectionId = toolSectionMap[tool.id] ?? null;
      const section = sectionId
        ? toolSections.find((ts) => ts.id === sectionId) ?? null
        : null;
      const position = section
        ? {
            x: tool.position_x - section.position_x,
            y: tool.position_y - section.position_y,
          }
        : { x: tool.position_x, y: tool.position_y };

      return {
        id: `tool-${tool.id}`,
        type: "tool",
        position,
        data: { tool, selected: tool.id === selectedToolId } as ToolNodeData,
        parentId: sectionId ? `tool-section-${sectionId}` : undefined,
        selected: tool.id === selectedToolId,
      };
    });

  // Section nodes must come before tool nodes so parentId refs are valid
  return [...sectionNodes, ...toolNodes];
}

interface ToolsCanvasViewProps {
  workspaceId: string;
  initialTools: Tool[];
  initialToolSections: ToolSection[];
  initialSteps: AnalysisStep[];
  initialStepTools: StepToolData[];
}

export function ToolsCanvasView({
  workspaceId,
  initialTools,
  initialToolSections,
  initialSteps,
  initialStepTools,
}: ToolsCanvasViewProps) {
  const [tools, setTools] = React.useState<Tool[]>(initialTools);
  const [toolSections, setToolSections] =
    React.useState<ToolSection[]>(initialToolSections);
  const [steps] = React.useState<AnalysisStep[]>(initialSteps);
  const [stepTools] = React.useState<StepToolData[]>(initialStepTools);

  // toolId → sectionId | null (derived from spatial containment, kept in sync on drag)
  const [toolSectionMap, setToolSectionMap] = React.useState<
    Record<string, string | null>
  >(() => computeToolSectionMap(initialTools, initialToolSections));

  const [selectedToolId, setSelectedToolId] = React.useState<string | null>(
    null
  );
  const [selectedSectionId, setSelectedSectionId] = React.useState<
    string | null
  >(null);
  const [showAnalysis, setShowAnalysis] = React.useState(false);

  // Stable resize callback passed through node data
  const handleSectionResizeEnd = React.useCallback(
    (sectionId: string, width: number, height: number) => {
      updateToolSection(sectionId, { width, height }).catch(() => {});
      setToolSections((prev) =>
        prev.map((ts) => (ts.id === sectionId ? { ...ts, width, height } : ts))
      );
    },
    []
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, , onEdgesChange] = useEdgesState<Edge>([]);

  // Sync external state → React Flow nodes
  React.useEffect(() => {
    setNodes(
      buildToolNodes(
        tools,
        toolSections,
        toolSectionMap,
        selectedToolId,
        selectedSectionId,
        handleSectionResizeEnd
      )
    );
  }, [
    tools,
    toolSections,
    toolSectionMap,
    selectedToolId,
    selectedSectionId,
    setNodes,
    handleSectionResizeEnd,
  ]);

  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      for (const change of changes) {
        if (
          change.type === "position" &&
          change.dragging === false &&
          change.position
        ) {
          const pos = change.position;
          const nodeId = change.id;

          if (nodeId.startsWith("tool-")) {
            const toolId = nodeId.replace("tool-", "");
            const currentSectionId = toolSectionMap[toolId] ?? null;
            const currentSection = currentSectionId
              ? toolSections.find((ts) => ts.id === currentSectionId) ?? null
              : null;

            // Convert relative position to absolute
            const absX = currentSection
              ? pos.x + currentSection.position_x
              : pos.x;
            const absY = currentSection
              ? pos.y + currentSection.position_y
              : pos.y;

            // Check containment in current toolSections state
            let newSectionId: string | null = null;
            for (const ts of toolSections) {
              if (
                absX >= ts.position_x &&
                absX <= ts.position_x + ts.width &&
                absY >= ts.position_y &&
                absY <= ts.position_y + ts.height
              ) {
                newSectionId = ts.id;
                break;
              }
            }

            if (newSectionId !== currentSectionId) {
              setToolSectionMap((prev) => ({
                ...prev,
                [toolId]: newSectionId,
              }));
            }

            // Persist absolute position
            updateTool(toolId, {
              position_x: absX,
              position_y: absY,
            }).catch(() => {});
            setTools((prev) =>
              prev.map((t) =>
                t.id === toolId
                  ? { ...t, position_x: absX, position_y: absY }
                  : t
              )
            );
          } else if (nodeId.startsWith("tool-section-")) {
            const sectionId = nodeId.replace("tool-section-", "");
            const oldSection = toolSections.find((ts) => ts.id === sectionId);
            const dx = pos.x - (oldSection?.position_x ?? 0);
            const dy = pos.y - (oldSection?.position_y ?? 0);

            // Persist section position
            updateToolSection(sectionId, {
              position_x: pos.x,
              position_y: pos.y,
            }).catch(() => {});
            setToolSections((prev) =>
              prev.map((ts) =>
                ts.id === sectionId
                  ? { ...ts, position_x: pos.x, position_y: pos.y }
                  : ts
              )
            );

            // Update absolute positions of tools inside this section
            const toolsInSection = Object.entries(toolSectionMap).filter(
              ([, secId]) => secId === sectionId
            );
            for (const [toolId] of toolsInSection) {
              const tool = tools.find((t) => t.id === toolId);
              if (tool) {
                const newX = tool.position_x + dx;
                const newY = tool.position_y + dy;
                updateTool(toolId, {
                  position_x: newX,
                  position_y: newY,
                }).catch(() => {});
                setTools((prev) =>
                  prev.map((t) =>
                    t.id === toolId
                      ? { ...t, position_x: newX, position_y: newY }
                      : t
                  )
                );
              }
            }
          }
        }
      }
    },
    [onNodesChange, toolSectionMap, toolSections, tools]
  );

  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("tool-")) {
        setSelectedToolId(node.id.replace("tool-", ""));
        setSelectedSectionId(null);
      } else if (node.id.startsWith("tool-section-")) {
        setSelectedSectionId(node.id.replace("tool-section-", ""));
        setSelectedToolId(null);
      }
    },
    []
  );

  const handlePaneClick = React.useCallback(() => {
    setSelectedToolId(null);
    setSelectedSectionId(null);
  }, []);

  const handleToggleAnalysis = React.useCallback(() => {
    setShowAnalysis((prev) => {
      if (!prev) {
        setSelectedToolId(null);
        setSelectedSectionId(null);
      }
      return !prev;
    });
  }, []);

  const handleSelectToolFromAnalysis = React.useCallback((toolId: string) => {
    setSelectedToolId(toolId);
    setSelectedSectionId(null);
    setShowAnalysis(false);
  }, []);

  const handleAddTool = React.useCallback(async () => {
    try {
      const tool = await createTool({
        workspace_id: workspaceId,
        name: "New Tool",
        position_x: 100 + Math.random() * 400,
        position_y: 100 + Math.random() * 300,
        status: "considering",
      });
      setTools((prev) => [...prev, tool]);
      setToolSectionMap((prev) => ({ ...prev, [tool.id]: null }));
      setSelectedToolId(tool.id);
      setSelectedSectionId(null);
    } catch {
      // silent — user can retry by clicking again
    }
  }, [workspaceId]);

  const handleAddToolSection = React.useCallback(async () => {
    try {
      const SECTION_WIDTH = 400;
      const SECTION_HEIGHT = 300;
      const SECTION_GAP = 50;
      const newX = 50;
      const newY =
        toolSections.length > 0
          ? Math.max(...toolSections.map((s) => s.position_y + s.height)) + SECTION_GAP
          : 50;
      const ts = await createToolSection({
        workspace_id: workspaceId,
        name: "New Group",
        position_x: newX,
        position_y: newY,
        width: SECTION_WIDTH,
        height: SECTION_HEIGHT,
      });
      setToolSections((prev) => [...prev, ts]);
    } catch {
      // silent
    }
  }, [workspaceId, toolSections]);

  const handleToolUpdate = React.useCallback((updated: Tool) => {
    setTools((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }, []);

  const handleToolDelete = React.useCallback((id: string) => {
    setTools((prev) => prev.filter((t) => t.id !== id));
    setToolSectionMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedToolId(null);
  }, []);

  const handleToolSectionUpdate = React.useCallback((updated: ToolSection) => {
    setToolSections((prev) => prev.map((ts) => (ts.id === updated.id ? updated : ts)));
  }, []);

  const handleToolSectionDelete = React.useCallback((id: string) => {
    setToolSections((prev) => prev.filter((ts) => ts.id !== id));
    setToolSectionMap((prev) => {
      const next = { ...prev };
      for (const toolId of Object.keys(next)) {
        if (next[toolId] === id) next[toolId] = null;
      }
      return next;
    });
    setSelectedSectionId(null);
  }, []);

  // Summary stats
  const totalMonthly = tools.reduce(
    (sum, t) => sum + (t.cost_per_month ?? 0),
    0
  );
  const totalAnnual = totalMonthly * 12;
  const activeCount = tools.filter((t) => t.status === "active").length;
  const consideringCount = tools.filter(
    (t) => t.status === "considering"
  ).length;
  const cancelledCount = tools.filter((t) => t.status === "cancelled").length;

  const nothingSelected = selectedToolId === null && selectedSectionId === null;
  const selectedTool = selectedToolId ? (tools.find((t) => t.id === selectedToolId) ?? null) : null;
  const selectedSection = selectedSectionId ? (toolSections.find((ts) => ts.id === selectedSectionId) ?? null) : null;
  const selectedSectionToolCount = selectedSectionId
    ? Object.values(toolSectionMap).filter((sId) => sId === selectedSectionId).length
    : 0;

  return (
    <div className="flex h-full">
      <h1 className="sr-only">Tools</h1>
      {/* Main content: canvas or analysis view */}
      {showAnalysis ? (
        <ToolAnalysisView
          workspaceId={workspaceId}
          tools={tools}
          steps={steps}
          stepTools={stepTools}
          onSelectTool={handleSelectToolFromAnalysis}
        />
      ) : (
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
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
                if (node.type === "tool-section")
                  return "rgba(255,255,255,0.06)";
                return "var(--brand)";
              }}
              maskColor="rgba(10,10,11,0.75)"
              className="!bg-[var(--bg-surface)] !border-[var(--border-subtle)]"
            />

            {/* Toolbar */}
            <Panel position="top-left" className="flex gap-1.5">
              <Button variant="secondary" size="sm" onClick={handleAddTool}>
                <Plus className="h-3.5 w-3.5" />
                Add Tool
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddToolSection}
              >
                <Square className="h-3.5 w-3.5" />
                Add Tool Section
              </Button>
            </Panel>
          </ReactFlow>

          {/* Empty state overlay */}
          {tools.length === 0 && toolSections.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="pointer-events-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center max-w-sm">
                <Square className="h-8 w-8 text-[var(--text-quaternary)] mx-auto mb-3" />
                <p className="text-[14px] text-[var(--text-secondary)] mb-1">
                  No tools yet
                </p>
                <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
                  Add tools to map your tech stack, or create groups to organize
                  them
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" onClick={handleAddTool}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Tool
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAddToolSection}
                  >
                    <Square className="h-3.5 w-3.5" />
                    Add Tool Section
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tool detail panel — shown when a tool node is selected */}
      {selectedTool && !showAnalysis && (
        <div
          className="border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0 flex flex-col"
          style={{ width: "var(--panel-width)" }}
        >
          <ToolDetailPanel
            tool={selectedTool}
            onUpdate={handleToolUpdate}
            onDelete={handleToolDelete}
            onClose={handlePaneClick}
          />
        </div>
      )}

      {/* Tool section detail panel — shown when a section node is selected */}
      {selectedSection && !showAnalysis && (
        <div
          className="border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0 flex flex-col"
          style={{ width: "var(--panel-width)" }}
        >
          <ToolSectionDetailPanel
            toolSection={selectedSection}
            toolCount={selectedSectionToolCount}
            onUpdate={handleToolSectionUpdate}
            onDelete={handleToolSectionDelete}
            onClose={handlePaneClick}
          />
        </div>
      )}

      {/* Summary sidebar — shown when nothing selected or in analysis mode */}
      {(nothingSelected || showAnalysis) && (
        <div
          className="border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex-shrink-0 overflow-y-auto"
          style={{ width: "var(--panel-width)" }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Tools Summary
              </h2>
              <button
                onClick={handleToggleAnalysis}
                aria-label={showAnalysis ? "Back to canvas" : "Tool Analysis"}
                title={showAnalysis ? "Back to canvas" : "Tool Analysis"}
                className={
                  showAnalysis
                    ? "flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--accent-blue)]/15 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/25 transition-colors"
                    : "flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium bg-[var(--bg-surface-active)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                }
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {showAnalysis ? "Canvas" : "Analysis"}
              </button>
            </div>

            {/* Cost summary */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Monthly cost
                </span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  ${totalMonthly.toLocaleString()}/mo
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Annual cost
                </span>
                <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                  ${totalAnnual.toLocaleString()}/yr
                </span>
              </div>
            </div>

            <div className="border-t border-[var(--border-subtle)] pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-3">
                By Status
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--success)]" />
                    <span className="text-[12px] text-[var(--text-secondary)]">
                      Active
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">
                    {activeCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--warning)]" />
                    <span className="text-[12px] text-[var(--text-secondary)]">
                      Considering
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">
                    {consideringCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--text-tertiary)]" />
                    <span className="text-[12px] text-[var(--text-secondary)]">
                      Cancelled
                    </span>
                  </div>
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">
                    {cancelledCount}
                  </span>
                </div>
              </div>
            </div>

            {tools.length > 0 && (
              <div className="border-t border-[var(--border-subtle)] pt-4 mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)] mb-3">
                  Total
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text-secondary)]">
                    All tools
                  </span>
                  <span className="text-[12px] font-medium text-[var(--text-primary)]">
                    {tools.length}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  type Connection as FlowConnection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Square, Thermometer, FileDown, ImageDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepNode } from "./step-node";
import { SectionNode } from "./section-node";
import {
  createStep,
  updateStep,
  deleteStep,
  createSection,
  updateSection,
  deleteSection,
  createConnection,
  deleteConnection as apiDeleteConnection,
} from "@/lib/api/client";
import type { Section, Step, Connection } from "@/types/database";
import type { StepNodeData, SectionNodeData } from "@/types/canvas";
import { toastError } from "@/lib/api/toast-helpers";
import { MATURITY_LEVELS } from "@/lib/maturity";

const nodeTypes = {
  step: StepNode,
  section: SectionNode,
};

interface FlowCanvasProps {
  workspaceId: string;
  tabId: string;
  sections: Section[];
  steps: Step[];
  connections: Connection[];
  selectedStepId: string | null;
  selectedSectionId: string | null;
  annotatedIds?: Set<string>;
  annotationColor?: string | null;
  onStepSelect: (id: string | null) => void;
  onSectionSelect: (id: string | null) => void;
  onStepCreate: (step: Step) => void;
  onStepUpdate: (step: Step) => void;
  onStepDelete: (id: string) => void;
  onSectionCreate: (section: Section) => void;
  onSectionUpdate: (section: Section) => void;
  onSectionDelete: (id: string) => void;
  onConnectionCreate: (conn: Connection) => void;
  onConnectionDelete: (id: string) => void;
  onExportPdf?: (canvasElement: HTMLElement) => void;
  onExportPng?: (canvasElement: HTMLElement) => Promise<void>;
}

function computeSectionMaturity(sectionId: string, steps: Step[]): { avg: number | null; avgTarget: number | null } {
  const sectionSteps = (steps ?? []).filter((s) => s.section_id === sectionId);
  const withMaturity = sectionSteps.filter((s) => s.maturity_score != null);
  const withTarget = sectionSteps.filter((s) => s.target_maturity != null);
  const avg = withMaturity.length > 0
    ? withMaturity.reduce((sum, s) => sum + s.maturity_score!, 0) / withMaturity.length
    : null;
  const avgTarget = withTarget.length > 0
    ? withTarget.reduce((sum, s) => sum + s.target_maturity!, 0) / withTarget.length
    : null;
  return { avg, avgTarget };
}

function buildNodes(sections: Section[], steps: Step[], selectedStepId: string | null, selectedSectionId: string | null, heatMapMode: boolean, annotatedIds?: Set<string>, annotationColor?: string | null): Node[] {
  const sectionNodes: Node<SectionNodeData>[] = (sections ?? []).filter(Boolean).map((section) => {
    const { avg, avgTarget } = computeSectionMaturity(section.id, steps);
    return {
      id: `section-${section.id}`,
      type: "section",
      position: { x: section.position_x, y: section.position_y },
      data: { section, averageMaturity: avg, averageTargetMaturity: avgTarget, heatMapMode, annotationColor: annotatedIds?.has(section.id) ? annotationColor : null },
      style: { width: section.width, height: section.height },
      selected: section.id === selectedSectionId,
    };
  });

  const stepNodes: Node<StepNodeData>[] = (steps ?? []).filter(Boolean).map((step) => ({
    id: `step-${step.id}`,
    type: "step",
    position: { x: step.position_x, y: step.position_y },
    data: { step, selected: step.id === selectedStepId, heatMapMode, annotationColor: annotatedIds?.has(step.id) ? annotationColor : null },
    parentId: step.section_id ? `section-${step.section_id}` : undefined,
    extent: step.section_id ? "parent" as const : undefined,
    selected: step.id === selectedStepId,
  }));

  return [...sectionNodes, ...stepNodes];
}

function buildEdges(connections: Connection[]): Edge[] {
  return (connections ?? []).filter(Boolean).map((conn) => ({
    id: `edge-${conn.id}`,
    source: `step-${conn.source_step_id}`,
    target: `step-${conn.target_step_id}`,
    type: "default",
  }));
}

function PngExportButton({
  wrapperRef,
  onExportPng,
}: {
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  onExportPng: (el: HTMLElement) => Promise<void>;
}) {
  const { fitView, getViewport, setViewport } = useReactFlow();
  const [exporting, setExporting] = React.useState(false);

  const handleClick = React.useCallback(async () => {
    if (!wrapperRef.current || exporting) return;
    setExporting(true);

    const viewport = getViewport();
    fitView({ padding: 0.1 });

    // Wait for render to settle after fitView
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

    try {
      await onExportPng(wrapperRef.current);
    } finally {
      setViewport(viewport);
      setExporting(false);
    }
  }, [wrapperRef, onExportPng, exporting, fitView, getViewport, setViewport]);

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={exporting}
      title="Export canvas as PNG"
    >
      {exporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <ImageDown className="h-3.5 w-3.5" />
      )}
      {exporting ? "Exporting\u2026" : "Export PNG"}
    </Button>
  );
}

export function FlowCanvas({
  workspaceId,
  tabId,
  sections,
  steps,
  connections,
  selectedStepId,
  selectedSectionId,
  annotatedIds,
  annotationColor,
  onStepSelect,
  onSectionSelect,
  onStepCreate,
  onStepUpdate,
  onStepDelete,
  onSectionCreate,
  onSectionUpdate,
  onSectionDelete,
  onConnectionCreate,
  onConnectionDelete,
  onExportPdf,
  onExportPng,
}: FlowCanvasProps) {
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [heatMapMode, setHeatMapMode] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);

  const initialNodes = React.useMemo(
    () => buildNodes(sections, steps, selectedStepId, selectedSectionId, heatMapMode, annotatedIds, annotationColor),
    [sections, steps, selectedStepId, selectedSectionId, heatMapMode, annotatedIds, annotationColor]
  );
  const initialEdges = React.useMemo(() => buildEdges(connections), [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external state → React Flow state
  React.useEffect(() => {
    setNodes(buildNodes(sections, steps, selectedStepId, selectedSectionId, heatMapMode, annotatedIds, annotationColor));
  }, [sections, steps, selectedStepId, selectedSectionId, heatMapMode, annotatedIds, annotationColor, setNodes]);

  React.useEffect(() => {
    setEdges(buildEdges(connections));
  }, [connections, setEdges]);

  // Handle node position changes (drag end → persist)
  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      for (const change of changes) {
        if (change.type === "position" && change.dragging === false && change.position) {
          const nodeId = change.id;
          if (nodeId.startsWith("step-")) {
            const stepId = nodeId.replace("step-", "");
            updateStep(stepId, {
              position_x: change.position.x,
              position_y: change.position.y,
            }).then((updated) => onStepUpdate(updated)).catch(() => {});
          } else if (nodeId.startsWith("section-")) {
            const sectionId = nodeId.replace("section-", "");
            updateSection(sectionId, {
              position_x: change.position.x,
              position_y: change.position.y,
            }).then((updated) => onSectionUpdate(updated)).catch(() => {});
          }
        }
      }
    },
    [onNodesChange, onStepUpdate, onSectionUpdate]
  );

  // Handle edge changes (delete)
  const handleEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      for (const change of changes) {
        if (change.type === "remove") {
          const connId = change.id.replace("edge-", "");
          apiDeleteConnection(connId)
            .then(() => onConnectionDelete(connId))
            .catch((err) => toastError("Failed to delete connection", {
              error: err,
              retry: () => apiDeleteConnection(connId).then(() => onConnectionDelete(connId)),
            }));
        }
      }
    },
    [onEdgesChange, onConnectionDelete]
  );

  // Handle new connections
  const handleConnect = React.useCallback(
    async (connection: FlowConnection) => {
      if (!connection.source || !connection.target) return;

      const sourceStepId = connection.source.replace("step-", "");
      const targetStepId = connection.target.replace("step-", "");

      try {
        const conn = await createConnection({
          workspace_id: workspaceId,
          tab_id: tabId,
          source_step_id: sourceStepId,
          target_step_id: targetStepId,
        });
        onConnectionCreate(conn);
      } catch (err) {
        toastError("Failed to create connection", {
          error: err,
          retry: () => handleConnect(connection),
        });
      }
    },
    [workspaceId, tabId, onConnectionCreate]
  );

  // Handle node selection
  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("step-")) {
        onStepSelect(node.id.replace("step-", ""));
      } else if (node.id.startsWith("section-")) {
        onSectionSelect(node.id.replace("section-", ""));
      }
    },
    [onStepSelect, onSectionSelect]
  );

  const handlePaneClick = React.useCallback(() => {
    onStepSelect(null);
    onSectionSelect(null);
  }, [onStepSelect, onSectionSelect]);

  // Add step
  const handleAddStep = React.useCallback(async () => {
    try {
      const step = await createStep({
        workspace_id: workspaceId,
        tab_id: tabId,
        name: "Untitled",
        position_x: 100 + Math.random() * 400,
        position_y: 100 + Math.random() * 300,
      });
      onStepCreate(step);
      onStepSelect(step.id);
    } catch (err) {
      toastError("Failed to create step", { error: err, retry: handleAddStep });
    }
  }, [workspaceId, tabId, onStepCreate, onStepSelect]);

  // Add section
  const handleAddSection = React.useCallback(async () => {
    try {
      const section = await createSection({
        workspace_id: workspaceId,
        tab_id: tabId,
        name: "New Section",
        position_x: 50 + Math.random() * 200,
        position_y: 50 + Math.random() * 200,
      });
      onSectionCreate(section);
    } catch (err) {
      toastError("Failed to create section", { error: err, retry: handleAddSection });
    }
  }, [workspaceId, tabId, onSectionCreate]);

  // Handle delete key
  const handleKeyDown = React.useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        // Don't delete if user is typing in an input
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

        if (selectedStepId) {
          try {
            await deleteStep(selectedStepId);
            onStepDelete(selectedStepId);
          } catch (err) {
            toastError("Failed to delete step", { error: err });
          }
        } else if (selectedSectionId) {
          try {
            await deleteSection(selectedSectionId);
            onSectionDelete(selectedSectionId);
          } catch (err) {
            toastError("Failed to delete section", { error: err });
          }
        }
      }

      // N = new step
      if (event.key === "n" && !event.metaKey && !event.ctrlKey) {
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        handleAddStep();
      }

      // S = new section (only if not in an input)
      if (event.key === "s" && !event.metaKey && !event.ctrlKey) {
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        event.preventDefault();
        handleAddSection();
      }
    },
    [selectedStepId, selectedSectionId, onStepDelete, onSectionDelete, handleAddStep, handleAddSection]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleExportPdf = React.useCallback(async () => {
    if (!onExportPdf || !wrapperRef.current || exporting) return;
    setExporting(true);
    try {
      await onExportPdf(wrapperRef.current);
    } finally {
      setExporting(false);
    }
  }, [onExportPdf, exporting]);

  return (
    <div ref={wrapperRef} className="w-full h-full relative">
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={handleNodesChange}
      onEdgesChange={handleEdgesChange}
      onConnect={handleConnect}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      deleteKeyCode={null} // We handle delete ourselves
      className="bg-[var(--bg-app)]"
    >
      <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.04)" />
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

      {/* Toolbar */}
      <Panel position="top-left" className="flex gap-1.5">
        <Button variant="secondary" size="sm" onClick={handleAddStep}>
          <Plus className="h-3.5 w-3.5" />
          Step
        </Button>
        <Button variant="secondary" size="sm" onClick={handleAddSection}>
          <Square className="h-3.5 w-3.5" />
          Section
        </Button>
        <Button
          variant={heatMapMode ? "default" : "secondary"}
          size="sm"
          onClick={() => setHeatMapMode((prev) => !prev)}
          title="Toggle maturity heat map"
        >
          <Thermometer className="h-3.5 w-3.5" />
          Heat Map
        </Button>
        {onExportPdf && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
            disabled={exporting}
            title="Export workspace as PDF"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="h-3.5 w-3.5" />
            )}
            {exporting ? "Exporting…" : "Export PDF"}
          </Button>
        )}
        {onExportPng && (
          <PngExportButton wrapperRef={wrapperRef} onExportPng={onExportPng} />
        )}
      </Panel>

      {/* Heat map legend */}
      {heatMapMode && (
        <Panel position="bottom-left">
          <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <span className="text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide mr-1">Maturity</span>
            {MATURITY_LEVELS.map(({ level, color }) => (
              <div key={level} className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                <span className="text-[10px] text-[var(--text-secondary)]">{level}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </ReactFlow>

    {/* Empty state overlay */}
    {sections.length === 0 && steps.length === 0 && (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="pointer-events-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center max-w-sm">
          <Square className="h-8 w-8 text-[var(--text-quaternary)] mx-auto mb-3" />
          <p className="text-[14px] text-[var(--text-secondary)] mb-1">
            Your canvas is empty
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
            Add a section to group related steps, or add a step to start mapping your process
          </p>
          <div className="flex items-center justify-center gap-2">
            <Button size="sm" onClick={handleAddSection}>
              <Square className="h-3.5 w-3.5" />
              Add Section
            </Button>
            <Button variant="secondary" size="sm" onClick={handleAddStep}>
              <Plus className="h-3.5 w-3.5" />
              Add Step
            </Button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

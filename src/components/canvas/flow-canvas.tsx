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
  type Connection as FlowConnection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Square, MousePointer } from "lucide-react";
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
import { toast } from "sonner";

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
}

function buildNodes(sections: Section[], steps: Step[], selectedStepId: string | null, selectedSectionId: string | null): Node[] {
  const sectionNodes: Node<SectionNodeData>[] = sections.map((section) => ({
    id: `section-${section.id}`,
    type: "section",
    position: { x: section.position_x, y: section.position_y },
    data: { section },
    style: { width: section.width, height: section.height },
    selected: section.id === selectedSectionId,
  }));

  const stepNodes: Node<StepNodeData>[] = steps.map((step) => ({
    id: `step-${step.id}`,
    type: "step",
    position: { x: step.position_x, y: step.position_y },
    data: { step, selected: step.id === selectedStepId },
    parentId: step.section_id ? `section-${step.section_id}` : undefined,
    extent: step.section_id ? "parent" as const : undefined,
    selected: step.id === selectedStepId,
  }));

  return [...sectionNodes, ...stepNodes];
}

function buildEdges(connections: Connection[]): Edge[] {
  return connections.map((conn) => ({
    id: `edge-${conn.id}`,
    source: `step-${conn.source_step_id}`,
    target: `step-${conn.target_step_id}`,
    type: "default",
  }));
}

export function FlowCanvas({
  workspaceId,
  tabId,
  sections,
  steps,
  connections,
  selectedStepId,
  selectedSectionId,
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
}: FlowCanvasProps) {
  const initialNodes = React.useMemo(
    () => buildNodes(sections, steps, selectedStepId, selectedSectionId),
    [sections, steps, selectedStepId, selectedSectionId]
  );
  const initialEdges = React.useMemo(() => buildEdges(connections), [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external state → React Flow state
  React.useEffect(() => {
    setNodes(buildNodes(sections, steps, selectedStepId, selectedSectionId));
  }, [sections, steps, selectedStepId, selectedSectionId, setNodes]);

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
            .catch(() => toast.error("Failed to delete connection"));
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
      } catch {
        toast.error("Failed to create connection");
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
  const handleAddStep = async () => {
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
    } catch {
      toast.error("Failed to create step");
    }
  };

  // Add section
  const handleAddSection = async () => {
    try {
      const section = await createSection({
        workspace_id: workspaceId,
        tab_id: tabId,
        name: "New Section",
        position_x: 50 + Math.random() * 200,
        position_y: 50 + Math.random() * 200,
      });
      onSectionCreate(section);
    } catch {
      toast.error("Failed to create section");
    }
  };

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
          } catch {
            toast.error("Failed to delete step");
          }
        } else if (selectedSectionId) {
          try {
            await deleteSection(selectedSectionId);
            onSectionDelete(selectedSectionId);
          } catch {
            toast.error("Failed to delete section");
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
    [selectedStepId, selectedSectionId, onStepDelete, onSectionDelete]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
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
      </Panel>
    </ReactFlow>
  );
}

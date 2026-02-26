"use client";

import * as React from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection as FlowConnection,
  type NodeChange,
  type EdgeChange,
  type Node,
  type Edge,
  BackgroundVariant,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, Layers, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StageNode } from "@/components/canvas/stage-node";
import { TouchpointNode } from "@/components/canvas/touchpoint-node";
import {
  createStage,
  updateStage,
  deleteStage,
  createTouchpoint,
  updateTouchpoint,
  deleteTouchpoint,
  createTouchpointConnection,
  deleteTouchpointConnection,
} from "@/lib/api/client";
import type { Stage, Touchpoint, TouchpointConnection } from "@/types/database";
import type { StageNodeData, TouchpointNodeData } from "@/types/canvas";
import { toastError } from "@/lib/api/toast-helpers";

const nodeTypes = {
  stage: StageNode,
  touchpoint: TouchpointNode,
};

interface JourneyCanvasViewProps {
  workspaceId: string;
  tabId: string;
  initialStages: Stage[];
  initialTouchpoints: Touchpoint[];
  initialConnections: TouchpointConnection[];
}

function buildJourneyNodes(
  stages: Stage[],
  touchpoints: Touchpoint[],
  selectedStageId: string | null,
  selectedTouchpointId: string | null
): Node[] {
  const stageNodes: Node<StageNodeData>[] = (stages ?? []).filter(Boolean).map((stage) => ({
    id: `stage-${stage.id}`,
    type: "stage",
    position: { x: stage.position_x, y: stage.position_y },
    data: { stage },
    style: { width: stage.width, height: stage.height },
    selected: stage.id === selectedStageId,
  }));

  const touchpointNodes: Node<TouchpointNodeData>[] = (touchpoints ?? []).filter(Boolean).map((tp) => ({
    id: `tp-${tp.id}`,
    type: "touchpoint",
    position: { x: tp.position_x, y: tp.position_y },
    data: { touchpoint: tp, selected: tp.id === selectedTouchpointId },
    parentId: tp.stage_id ? `stage-${tp.stage_id}` : undefined,
    extent: tp.stage_id ? "parent" as const : undefined,
    selected: tp.id === selectedTouchpointId,
  }));

  return [...stageNodes, ...touchpointNodes];
}

function buildJourneyEdges(connections: TouchpointConnection[]): Edge[] {
  return (connections ?? []).filter(Boolean).map((conn) => ({
    id: `edge-${conn.id}`,
    source: `tp-${conn.source_touchpoint_id}`,
    target: `tp-${conn.target_touchpoint_id}`,
    type: "default",
  }));
}

export function JourneyCanvasView({
  workspaceId,
  tabId,
  initialStages,
  initialTouchpoints,
  initialConnections,
}: JourneyCanvasViewProps) {
  const [stages, setStages] = React.useState(initialStages);
  const [touchpoints, setTouchpoints] = React.useState(initialTouchpoints);
  const [connections, setConnections] = React.useState(initialConnections);
  const [selectedStageId, setSelectedStageId] = React.useState<string | null>(null);
  const [selectedTouchpointId, setSelectedTouchpointId] = React.useState<string | null>(null);

  const initialNodes = React.useMemo(
    () => buildJourneyNodes(stages, touchpoints, selectedStageId, selectedTouchpointId),
    [stages, touchpoints, selectedStageId, selectedTouchpointId]
  );
  const initialEdges = React.useMemo(() => buildJourneyEdges(connections), [connections]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external state → React Flow state
  React.useEffect(() => {
    setNodes(buildJourneyNodes(stages, touchpoints, selectedStageId, selectedTouchpointId));
  }, [stages, touchpoints, selectedStageId, selectedTouchpointId, setNodes]);

  React.useEffect(() => {
    setEdges(buildJourneyEdges(connections));
  }, [connections, setEdges]);

  // Handle node position changes (drag end → persist)
  const handleNodesChange = React.useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      for (const change of changes) {
        if (change.type === "position" && change.dragging === false && change.position) {
          const nodeId = change.id;
          if (nodeId.startsWith("tp-")) {
            const tpId = nodeId.replace("tp-", "");
            updateTouchpoint(tpId, {
              position_x: change.position.x,
              position_y: change.position.y,
            })
              .then((updated) => setTouchpoints((prev) => prev.map((t) => (t.id === updated.id ? updated : t))))
              .catch(() => {});
          } else if (nodeId.startsWith("stage-")) {
            const stageId = nodeId.replace("stage-", "");
            updateStage(stageId, {
              position_x: change.position.x,
              position_y: change.position.y,
            })
              .then((updated) => setStages((prev) => prev.map((s) => (s.id === updated.id ? updated : s))))
              .catch(() => {});
          }
        }
      }
    },
    [onNodesChange]
  );

  // Handle edge changes (delete)
  const handleEdgesChange = React.useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      for (const change of changes) {
        if (change.type === "remove") {
          const connId = change.id.replace("edge-", "");
          deleteTouchpointConnection(connId)
            .then(() => setConnections((prev) => prev.filter((c) => c.id !== connId)))
            .catch((err) =>
              toastError("Failed to delete connection", {
                error: err,
                retry: () =>
                  deleteTouchpointConnection(connId).then(() =>
                    setConnections((prev) => prev.filter((c) => c.id !== connId))
                  ),
              })
            );
        }
      }
    },
    [onEdgesChange]
  );

  // Handle new connections
  const handleConnect = React.useCallback(
    async (connection: FlowConnection) => {
      if (!connection.source || !connection.target) return;

      const sourceTpId = connection.source.replace("tp-", "");
      const targetTpId = connection.target.replace("tp-", "");

      try {
        const conn = await createTouchpointConnection({
          workspace_id: workspaceId,
          tab_id: tabId,
          source_touchpoint_id: sourceTpId,
          target_touchpoint_id: targetTpId,
        });
        setConnections((prev) => [...prev, conn]);
      } catch (err) {
        toastError("Failed to create connection", { error: err });
      }
    },
    [workspaceId, tabId]
  );

  // Handle node selection
  const handleNodeClick = React.useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith("tp-")) {
        setSelectedTouchpointId(node.id.replace("tp-", ""));
        setSelectedStageId(null);
      } else if (node.id.startsWith("stage-")) {
        setSelectedStageId(node.id.replace("stage-", ""));
        setSelectedTouchpointId(null);
      }
    },
    []
  );

  const handlePaneClick = React.useCallback(() => {
    setSelectedTouchpointId(null);
    setSelectedStageId(null);
  }, []);

  // Add touchpoint
  const handleAddTouchpoint = async () => {
    try {
      const offset = touchpoints.length;
      const tp = await createTouchpoint({
        workspace_id: workspaceId,
        tab_id: tabId,
        name: "Untitled",
        position_x: 100 + (offset % 5) * 220,
        position_y: 100 + Math.floor(offset / 5) * 120,
      });
      setTouchpoints((prev) => [...prev, tp]);
      setSelectedTouchpointId(tp.id);
    } catch (err) {
      toastError("Failed to create touchpoint", { error: err, retry: handleAddTouchpoint });
    }
  };

  // Add stage
  const handleAddStage = async () => {
    try {
      const stage = await createStage({
        workspace_id: workspaceId,
        tab_id: tabId,
        name: `Stage ${stages.length + 1}`,
        position_x: 50 + stages.length * 350,
        position_y: 50,
        width: 300,
        height: 400,
      });
      setStages((prev) => [...prev, stage]);
    } catch (err) {
      toastError("Failed to create stage", { error: err, retry: handleAddStage });
    }
  };

  // Handle delete key
  const handleKeyDown = React.useCallback(
    async (event: KeyboardEvent) => {
      if (event.key === "Delete" || event.key === "Backspace") {
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;

        if (selectedTouchpointId) {
          try {
            await deleteTouchpoint(selectedTouchpointId);
            setTouchpoints((prev) => prev.filter((t) => t.id !== selectedTouchpointId));
            setConnections((prev) =>
              prev.filter(
                (c) =>
                  c.source_touchpoint_id !== selectedTouchpointId &&
                  c.target_touchpoint_id !== selectedTouchpointId
              )
            );
            setSelectedTouchpointId(null);
          } catch (err) {
            toastError("Failed to delete touchpoint", { error: err });
          }
        } else if (selectedStageId) {
          try {
            await deleteStage(selectedStageId);
            setStages((prev) => prev.filter((s) => s.id !== selectedStageId));
            // Orphan touchpoints that were in this stage
            setTouchpoints((prev) =>
              prev.map((t) => (t.stage_id === selectedStageId ? { ...t, stage_id: null } : t))
            );
            setSelectedStageId(null);
          } catch (err) {
            toastError("Failed to delete stage", { error: err });
          }
        }
      }

      // N = new touchpoint
      if (event.key === "n" && !event.metaKey && !event.ctrlKey) {
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        handleAddTouchpoint();
      }

      // S = new stage
      if (event.key === "s" && !event.metaKey && !event.ctrlKey) {
        const target = event.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        event.preventDefault();
        handleAddStage();
      }
    },
    [selectedTouchpointId, selectedStageId, handleAddTouchpoint, handleAddStage]
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const isEmpty = stages.length === 0 && touchpoints.length === 0;

  return (
    <div className="flex h-full">
      <div className="flex-1 relative">
        <div className="w-full h-full relative">
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
            deleteKeyCode={null}
            className="bg-[var(--bg-app)]"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255,255,255,0.04)" />
            <Controls
              showInteractive={false}
              className="!bg-[var(--bg-surface)] !border-[var(--border-subtle)] !rounded-[var(--radius-md)]"
            />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === "stage") return "rgba(255,255,255,0.06)";
                return "var(--brand)";
              }}
              maskColor="rgba(10,10,11,0.75)"
              className="!bg-[var(--bg-surface)] !border-[var(--border-subtle)]"
            />

            {/* Toolbar */}
            <Panel position="top-left" className="flex gap-1.5">
              <Button variant="secondary" size="sm" onClick={handleAddTouchpoint}>
                <Plus className="h-3.5 w-3.5" />
                Touchpoint
              </Button>
              <Button variant="secondary" size="sm" onClick={handleAddStage}>
                <Layers className="h-3.5 w-3.5" />
                Stage
              </Button>
            </Panel>
          </ReactFlow>

          {/* Empty state overlay */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="pointer-events-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-8 text-center max-w-sm">
                <Route className="h-8 w-8 text-[var(--text-quaternary)] mx-auto mb-3" />
                <p className="text-[14px] text-[var(--text-secondary)] mb-1">
                  Your journey canvas is empty
                </p>
                <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
                  Add a stage to group touchpoints, or add a touchpoint to start mapping the customer journey
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Button size="sm" onClick={handleAddStage}>
                    <Layers className="h-3.5 w-3.5" />
                    Add Stage
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleAddTouchpoint}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Touchpoint
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary panel */}
      <div
        className="border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-y-auto p-4"
        style={{ width: "var(--panel-width)" }}
      >
        <h2 className="text-base font-semibold text-[var(--text-primary)] mb-3">Journey Summary</h2>
        <div className="space-y-2 text-[var(--text-sm)]">
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Stages</span>
            <span className="text-[var(--text-primary)] font-medium">{stages.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Touchpoints</span>
            <span className="text-[var(--text-primary)] font-medium">{touchpoints.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--text-secondary)]">Connections</span>
            <span className="text-[var(--text-primary)] font-medium">{connections.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

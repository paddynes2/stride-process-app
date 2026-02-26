"use client";

import * as React from "react";
import { Route, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createStage } from "@/lib/api/client";
import type { Stage, Touchpoint, TouchpointConnection } from "@/types/database";
import { toastError } from "@/lib/api/toast-helpers";

interface JourneyCanvasViewProps {
  workspaceId: string;
  tabId: string;
  initialStages: Stage[];
  initialTouchpoints: Touchpoint[];
  initialConnections: TouchpointConnection[];
}

export function JourneyCanvasView({
  workspaceId,
  tabId,
  initialStages,
  initialTouchpoints,
  initialConnections,
}: JourneyCanvasViewProps) {
  const [stages, setStages] = React.useState(initialStages);
  const touchpoints = initialTouchpoints;
  const connections = initialConnections;

  const handleAddStage = async () => {
    try {
      const stage = await createStage({
        workspace_id: workspaceId,
        tab_id: tabId,
        name: `Stage ${stages.length + 1}`,
        position_x: 100 + stages.length * 350,
        position_y: 100,
        width: 300,
        height: 400,
      });
      setStages((prev) => [...prev, stage]);
    } catch (err) {
      toastError("Failed to create stage", { error: err });
    }
  };

  const isEmpty = stages.length === 0 && touchpoints.length === 0;

  return (
    <div className="flex h-full">
      <div className="flex-1 relative bg-[var(--bg-app)]">
        {isEmpty ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <Route className="h-8 w-8 text-[var(--text-tertiary)]" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
                Journey Canvas
              </h2>
              <p className="text-[var(--text-sm)] text-[var(--text-secondary)] max-w-sm">
                Map your customer journey by adding stages and touchpoints. Each stage represents a phase of the experience.
              </p>
            </div>
            <Button onClick={handleAddStage}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add first stage
            </Button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-[var(--text-sm)] text-[var(--text-secondary)]">
                Journey canvas rendering coming soon.
              </p>
              <p className="text-[var(--text-sm)] text-[var(--text-tertiary)] mt-1">
                {stages.length} stage{stages.length !== 1 ? "s" : ""}, {touchpoints.length} touchpoint{touchpoints.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary panel placeholder */}
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

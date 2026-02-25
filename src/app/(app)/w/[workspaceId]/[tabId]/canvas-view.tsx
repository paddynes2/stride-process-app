"use client";

import * as React from "react";
import { FlowCanvas } from "@/components/canvas/flow-canvas";
import { StepDetailPanel } from "@/components/panels/step-detail-panel";
import { SectionDetailPanel } from "@/components/panels/section-detail-panel";
import { WorkspaceSummaryPanel } from "@/components/panels/workspace-summary-panel";
import type { Section, Step, Connection } from "@/types/database";

interface CanvasViewProps {
  workspaceId: string;
  tabId: string;
  initialSections: Section[];
  initialSteps: Step[];
  initialConnections: Connection[];
}

export function CanvasView({
  workspaceId,
  tabId,
  initialSections,
  initialSteps,
  initialConnections,
}: CanvasViewProps) {
  const [sections, setSections] = React.useState(initialSections);
  const [steps, setSteps] = React.useState(initialSteps);
  const [connections, setConnections] = React.useState(initialConnections);
  const [selectedStepId, setSelectedStepId] = React.useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string | null>(null);

  const selectedStep = selectedStepId ? steps.find((s) => s.id === selectedStepId) ?? null : null;
  const selectedSection = selectedSectionId ? sections.find((s) => s.id === selectedSectionId) ?? null : null;

  const handleStepSelect = (stepId: string | null) => {
    setSelectedStepId(stepId);
    if (stepId) setSelectedSectionId(null);
  };

  const handleSectionSelect = (sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    if (sectionId) setSelectedStepId(null);
  };

  const handleStepUpdate = (updated: Step) => {
    setSteps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleStepCreate = (step: Step) => {
    setSteps((prev) => [...prev, step]);
  };

  const handleStepDelete = (stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    setConnections((prev) =>
      prev.filter((c) => c.source_step_id !== stepId && c.target_step_id !== stepId)
    );
    if (selectedStepId === stepId) setSelectedStepId(null);
  };

  const handleSectionCreate = (section: Section) => {
    setSections((prev) => [...prev, section]);
  };

  const handleSectionUpdate = (updated: Section) => {
    setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  };

  const handleSectionDelete = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    // Orphan steps that were in this section
    setSteps((prev) =>
      prev.map((s) => (s.section_id === sectionId ? { ...s, section_id: null } : s))
    );
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  };

  const handleConnectionCreate = (connection: Connection) => {
    setConnections((prev) => [...prev, connection]);
  };

  const handleConnectionDelete = (connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  };

  const showPanel = selectedStep || selectedSection;

  return (
    <div className="flex h-full">
      {/* Canvas */}
      <div className="flex-1 relative">
        <FlowCanvas
          workspaceId={workspaceId}
          tabId={tabId}
          sections={sections}
          steps={steps}
          connections={connections}
          selectedStepId={selectedStepId}
          selectedSectionId={selectedSectionId}
          onStepSelect={handleStepSelect}
          onSectionSelect={handleSectionSelect}
          onStepCreate={handleStepCreate}
          onStepUpdate={handleStepUpdate}
          onStepDelete={handleStepDelete}
          onSectionCreate={handleSectionCreate}
          onSectionUpdate={handleSectionUpdate}
          onSectionDelete={handleSectionDelete}
          onConnectionCreate={handleConnectionCreate}
          onConnectionDelete={handleConnectionDelete}
        />
      </div>

      {/* Detail Panel */}
      {showPanel && (
        <div
          className="border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] overflow-y-auto"
          style={{ width: "var(--panel-width)" }}
        >
          {selectedStep && (
            <StepDetailPanel
              step={selectedStep}
              onUpdate={handleStepUpdate}
              onDelete={handleStepDelete}
              onClose={() => setSelectedStepId(null)}
            />
          )}
          {selectedSection && !selectedStep && (
            <SectionDetailPanel
              section={selectedSection}
              steps={steps.filter((s) => s.section_id === selectedSection.id)}
              onUpdate={handleSectionUpdate}
              onDelete={handleSectionDelete}
              onClose={() => setSelectedSectionId(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

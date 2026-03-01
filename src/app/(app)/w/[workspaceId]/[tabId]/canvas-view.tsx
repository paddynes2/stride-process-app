"use client";

import * as React from "react";
import { FlowCanvas } from "@/components/canvas/flow-canvas";
import { StepDetailPanel } from "@/components/panels/step-detail-panel";
import { SectionDetailPanel } from "@/components/panels/section-detail-panel";
import { WorkspaceSummaryPanel } from "@/components/panels/workspace-summary-panel";
import { AnnotationPanel } from "@/components/panels/annotation-panel";
import { CommentPanel } from "@/components/panels/comment-panel";
import { useWorkspace } from "@/lib/context/workspace-context";
import { useCanvasExport } from "@/hooks/use-canvas-export";
import { fetchAnnotations } from "@/lib/api/client";
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

  const { workspace, activePerspective } = useWorkspace();
  const { handleExportPdf, handleExportPng } = useCanvasExport({
    workspaceName: workspace.name,
    sections,
    steps,
    connections,
  });

  // Fetch annotated element IDs for the active perspective
  const [annotatedIds, setAnnotatedIds] = React.useState<Set<string>>(new Set());
  const refreshAnnotatedIds = React.useCallback(() => {
    if (!activePerspective) return;
    fetchAnnotations(activePerspective.id)
      .then((annotations) => {
        setAnnotatedIds(new Set(annotations.map((a) => a.annotatable_id)));
      })
      .catch(() => {});
  }, [activePerspective]);

  React.useEffect(() => {
    if (!activePerspective) {
      setAnnotatedIds(new Set());
      return;
    }
    refreshAnnotatedIds();
  }, [activePerspective, refreshAnnotatedIds]);

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
          annotatedIds={activePerspective ? annotatedIds : undefined}
          annotationColor={activePerspective?.color}
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
          onExportPdf={handleExportPdf}
          onExportPng={handleExportPng}
        />
      </div>

      {/* Detail Panel / Summary Panel */}
      <div
        className="border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col overflow-hidden"
        style={{ width: "var(--panel-width)" }}
      >
        <div className="flex-1 min-h-0 overflow-y-auto">
          {selectedStep && (
            <StepDetailPanel
              step={selectedStep}
              workspaceId={workspaceId}
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
          {!selectedStep && !selectedSection && (
            <WorkspaceSummaryPanel
              sections={sections}
              steps={steps}
              connections={connections}
            />
          )}
        </div>
        {activePerspective && selectedStep && (
          <AnnotationPanel
            perspectiveId={activePerspective.id}
            perspectiveName={activePerspective.name}
            perspectiveColor={activePerspective.color}
            annotatableType="step"
            annotatableId={selectedStep.id}
            onAnnotationChange={refreshAnnotatedIds}
          />
        )}
        {activePerspective && selectedSection && !selectedStep && (
          <AnnotationPanel
            perspectiveId={activePerspective.id}
            perspectiveName={activePerspective.name}
            perspectiveColor={activePerspective.color}
            annotatableType="section"
            annotatableId={selectedSection.id}
            onAnnotationChange={refreshAnnotatedIds}
          />
        )}
        {selectedStep && (
          <CommentPanel commentableType="step" commentableId={selectedStep.id} />
        )}
        {selectedSection && !selectedStep && (
          <CommentPanel commentableType="section" commentableId={selectedSection.id} />
        )}
      </div>
    </div>
  );
}

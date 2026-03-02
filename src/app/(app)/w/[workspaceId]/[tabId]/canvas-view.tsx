"use client";

import * as React from "react";
import { FlowCanvas } from "@/components/canvas/flow-canvas";
import { StepDetailPanel } from "@/components/panels/step-detail-panel";
import { SectionDetailPanel } from "@/components/panels/section-detail-panel";
import { WorkspaceSummaryPanel } from "@/components/panels/workspace-summary-panel";
import { AnnotationPanel } from "@/components/panels/annotation-panel";
import { CommentPanel } from "@/components/panels/comment-panel";
import { TaskPanel } from "@/components/panels/task-panel";
import { ColoringPanel } from "@/components/canvas/coloring-panel";
import { useWorkspace } from "@/lib/context/workspace-context";
import { useCanvasExport } from "@/hooks/use-canvas-export";
import { fetchAnnotations, fetchComments, fetchAllTasks, fetchColoringRules } from "@/lib/api/client";
import { CommentCountsContext, TaskCountsContext, ColoringTintContext } from "@/types/canvas";
import type { Section, Step, Connection, ColoringRule } from "@/types/database";
import { Paintbrush } from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Fetch all workspace comments once to compute per-entity unresolved counts for badges
  const [commentCounts, setCommentCounts] = React.useState<Map<string, number>>(new Map());
  React.useEffect(() => {
    let cancelled = false;
    fetchComments(workspaceId, { is_resolved: false })
      .then((comments) => {
        if (cancelled) return;
        const counts = new Map<string, number>();
        for (const c of comments) {
          if (c.parent_id === null) {
            counts.set(c.commentable_id, (counts.get(c.commentable_id) ?? 0) + 1);
          }
        }
        setCommentCounts(counts);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workspaceId]);

  // Fetch all workspace tasks once to compute per-step completion counts for badges
  const [taskCounts, setTaskCounts] = React.useState<Map<string, { completed: number; total: number }>>(new Map());
  React.useEffect(() => {
    let cancelled = false;
    fetchAllTasks(workspaceId)
      .then((tasks) => {
        if (cancelled) return;
        const counts = new Map<string, { completed: number; total: number }>();
        for (const t of tasks) {
          const prev = counts.get(t.step_id) ?? { completed: 0, total: 0 };
          counts.set(t.step_id, {
            completed: prev.completed + (t.is_completed ? 1 : 0),
            total: prev.total + 1,
          });
        }
        setTaskCounts(counts);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workspaceId]);

  // Fetch workspace coloring rules for step background tint
  const [coloringRules, setColoringRules] = React.useState<ColoringRule[]>([]);
  const [showColoringPanel, setShowColoringPanel] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchColoringRules(workspaceId)
      .then((rules) => {
        if (!cancelled) setColoringRules(rules);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workspaceId]);

  // Evaluate coloring rules against each step in position order (last match wins).
  // heatMapMode precedence is handled inside StepNode — when heatMap is active,
  // the maturity tint is used instead. Here we just compute the tint map from rules.
  const coloringTints = React.useMemo(() => {
    const map = new Map<string, string>();
    const activeRules = (coloringRules ?? []).filter((r) => r.is_active);
    for (const step of steps ?? []) {
      for (const rule of activeRules) {
        let matches = false;
        switch (rule.criteria_type) {
          case "status":
            matches = step.status === rule.criteria_value;
            break;
          case "executor":
            matches = step.executor === rule.criteria_value;
            break;
          case "step_type":
            matches = step.step_type === rule.criteria_value;
            break;
          case "maturity_below":
            matches =
              step.maturity_score !== null &&
              step.maturity_score < parseInt(rule.criteria_value, 10);
            break;
          case "maturity_above":
            matches =
              step.maturity_score !== null &&
              step.maturity_score > parseInt(rule.criteria_value, 10);
            break;
          case "has_role":
            // Requires additional data fetch — skip visual evaluation for now
            break;
        }
        if (matches) {
          map.set(step.id, rule.color); // last matching rule wins (rules ordered by position)
        }
      }
    }
    return map;
  }, [coloringRules, steps]);

  return (
    <ColoringTintContext.Provider value={coloringTints}>
    <TaskCountsContext.Provider value={taskCounts}>
    <CommentCountsContext.Provider value={commentCounts}>
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

          {/* Coloring rules button + panel — top-right overlay, away from react-flow toolbar */}
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1">
            <button
              onClick={() => setShowColoringPanel((p) => !p)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] border text-[12px] font-medium",
                "bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-colors",
                showColoringPanel
                  ? "border-[var(--accent-blue)] text-[var(--accent-blue)]"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
              )}
              aria-label="Toggle coloring rules"
            >
              <Paintbrush className="h-3.5 w-3.5" />
              Color
            </button>
            {showColoringPanel && (
              <ColoringPanel
                workspaceId={workspaceId}
                rules={coloringRules}
                onRulesChange={setColoringRules}
              />
            )}
          </div>
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
          {selectedStep && (
            activePerspective ? (
              <AnnotationPanel
                perspectiveId={activePerspective.id}
                perspectiveName={activePerspective.name}
                perspectiveColor={activePerspective.color}
                annotatableType="step"
                annotatableId={selectedStep.id}
                onAnnotationChange={refreshAnnotatedIds}
              />
            ) : (
              <div className="border-t border-[var(--border-subtle)] px-4 py-3 text-sm text-white/55 text-center">
                Select a perspective to add annotations
              </div>
            )
          )}
          {selectedSection && !selectedStep && (
            activePerspective ? (
              <AnnotationPanel
                perspectiveId={activePerspective.id}
                perspectiveName={activePerspective.name}
                perspectiveColor={activePerspective.color}
                annotatableType="section"
                annotatableId={selectedSection.id}
                onAnnotationChange={refreshAnnotatedIds}
              />
            ) : (
              <div className="border-t border-[var(--border-subtle)] px-4 py-3 text-sm text-white/55 text-center">
                Select a perspective to add annotations
              </div>
            )
          )}
          {selectedStep && (
            <TaskPanel workspaceId={workspaceId} stepId={selectedStep.id} />
          )}
          {selectedStep && (
            <CommentPanel commentableType="step" commentableId={selectedStep.id} />
          )}
          {selectedSection && !selectedStep && (
            <CommentPanel commentableType="section" commentableId={selectedSection.id} />
          )}
        </div>
      </div>
    </CommentCountsContext.Provider>
    </TaskCountsContext.Provider>
    </ColoringTintContext.Provider>
  );
}

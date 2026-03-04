"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { fetchAnnotations, fetchComments, fetchAllTasks, fetchColoringRules, fetchTemplates, deployTemplate, deleteTemplate, createSection, createStep, fetchTouchpoints, fetchPerspectives, fetchStepRolesBatch, fetchStepToolsByStep, fetchTools, fetchImprovementIdeas } from "@/lib/api/client";
import type { ExportConfig } from "@/components/panels/export-pdf-dialog";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { CommentCountsContext, TaskCountsContext, ColoringTintContext } from "@/types/canvas";
import type { Section, Step, Connection, ColoringRule, Template, AIAnalysisResult } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
} from "@/components/ui/dialog";
// NOTE (BUG-023): The custom DialogTitle in ui/dialog.tsx wraps a plain <h2> (not
// DialogPrimitive.Title), so Radix cannot register it for a11y. We import
// DialogPrimitive.Title directly here to fix the console.error in this dialog.
// section-detail-panel.tsx has the same underlying issue but is not owned by this task.
import { STARTER_TEMPLATES } from "@/lib/templates";
import { Paintbrush, LayoutTemplate, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/api/toast-helpers";
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

  const { workspace, tabs, perspectives, activePerspective } = useWorkspace();
  const { handleExportPng } = useCanvasExport({
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

  // Template browser state
  const router = useRouter();
  const [showTemplateDialog, setShowTemplateDialog] = React.useState(false);
  const [dbTemplates, setDbTemplates] = React.useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = React.useState(false);
  const [templateError, setTemplateError] = React.useState<string | null>(null);
  const [deployingKey, setDeployingKey] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!showTemplateDialog) return;
    let cancelled = false;
    setLoadingTemplates(true);
    setTemplateError(null);
    fetchTemplates(workspaceId)
      .then((templates) => { if (!cancelled) setDbTemplates(templates); })
      .catch((err) => { if (!cancelled) setTemplateError(err instanceof Error ? err.message : "Failed to load templates"); })
      .finally(() => { if (!cancelled) setLoadingTemplates(false); });
    return () => { cancelled = true; };
  }, [showTemplateDialog, workspaceId]);

  const handleDeployTemplate = async (key: string, templateId: string | null, starterIndex: number | null) => {
    setDeployingKey(key);
    const maxY = sections.length > 0 ? Math.max(...sections.map((s) => s.position_y)) : -200;
    const deployX = 100;
    const deployY = sections.length > 0 ? maxY + 300 : 100;
    try {
      if (templateId !== null) {
        await deployTemplate(templateId, { tab_id: tabId, position_x: deployX, position_y: deployY });
      } else if (starterIndex !== null) {
        const starter = STARTER_TEMPLATES[starterIndex];
        const newSection = await createSection({ workspace_id: workspaceId, tab_id: tabId, name: starter.template_data.section.name, position_x: deployX, position_y: deployY });
        await Promise.all(starter.template_data.steps.map((step) =>
          createStep({ workspace_id: workspaceId, tab_id: tabId, section_id: newSection.id, name: step.name, position_x: deployX + step.position_x, position_y: deployY + step.position_y })
        ));
      }
      toast.success("Template deployed");
      setShowTemplateDialog(false);
      router.refresh();
    } catch (err) {
      toastError("Failed to deploy template", { error: err });
    } finally {
      setDeployingKey(null);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    setDeletingId(templateId);
    try {
      await deleteTemplate(templateId);
      setDbTemplates((prev) => prev.filter((t) => t.id !== templateId));
      toast.success("Template deleted");
    } catch (err) {
      toastError("Failed to delete template", { error: err });
    } finally {
      setDeletingId(null);
    }
  };

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

  // Availability flags for export dialog sections
  const [hasTools, setHasTools] = React.useState(false);
  const [hasImprovements, setHasImprovements] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    fetchTools(workspaceId)
      .then((tools) => { if (!cancelled) setHasTools(tools.length > 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workspaceId]);

  React.useEffect(() => {
    let cancelled = false;
    fetchImprovementIdeas(workspaceId)
      .then((ideas) => { if (!cancelled) setHasImprovements(ideas.length > 0); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [workspaceId]);

  const sectionAvailability = React.useMemo(() => {
    const hasJourneyTab = tabs.some((t) => t.canvas_type === "journey");
    const hasAiInsights = !!(workspace.settings?.last_analysis_at);
    const hasPerspectives = perspectives.length > 0;
    const hasPrioritizationScores = steps.some(
      (s) => s.effort_score != null || s.impact_score != null
    );
    return {
      canvasSnapshot: true,
      dataTable: true,
      gapAnalysis: true,
      costAnalysis: true,
      executiveSummary: true,
      journeyMap: hasJourneyTab,
      journeySentiment: hasJourneyTab,
      perspectiveComparison: hasPerspectives,
      prioritizationMatrix: hasPrioritizationScores,
      toolLandscape: hasTools,
      improvements: hasImprovements,
      aiInsights: hasAiInsights,
    };
  }, [tabs, perspectives, steps, workspace.settings, hasTools, hasImprovements]);

  // Enhanced PDF export handler — orchestrates base + new sections
  const handleEnhancedExportPdf = React.useCallback(
    async (canvasElement: HTMLElement, config: ExportConfig) => {
      try {
        const [{ createWorkspacePdf }, { renderExecutiveSummary, renderJourneyMap, renderJourneySentiment, renderPerspectiveComparison, renderPrioritizationMatrix, renderToolLandscape, renderImprovements, renderAIInsights, renderTableOfContents }] = await Promise.all([
          import("@/lib/export/pdf"),
          import("@/lib/export/enhanced-pdf-sections"),
        ]);

        // Fetch step roles if needed for cost or executive summary sections
        const stepIds = steps.map((s) => s.id);
        const needsRoles = config.costAnalysis || config.executiveSummary;
        const stepRoles =
          needsRoles && stepIds.length > 0 ? await fetchStepRolesBatch(stepIds) : [];

        // Fetch step tools for cost analysis (parallel fetch, ignore per-step failures)
        const stepToolsRaw =
          config.costAnalysis && stepIds.length > 0
            ? (await Promise.allSettled(stepIds.map((id) => fetchStepToolsByStep(id))))
                .flatMap((r) => r.status === "fulfilled" ? r.value : [])
            : [];

        // Mask step data for disabled base sections (matches use-canvas-export.ts logic)
        let exportSteps = steps;
        let exportStepRoles = stepRoles;
        let exportStepTools = stepToolsRaw;
        if (!config.dataTable && !config.gapAnalysis && !config.costAnalysis) {
          exportSteps = [];
        } else {
          if (!config.gapAnalysis) {
            exportSteps = exportSteps.map((s) => ({
              ...s,
              maturity_score: null,
              target_maturity: null,
            }));
          }
          if (!config.costAnalysis) {
            exportStepRoles = [];
            exportStepTools = [];
            exportSteps = exportSteps.map((s) => ({
              ...s,
              time_minutes: null,
              frequency_per_month: null,
            }));
          }
        }

        // Build base PDF without footer (skipFooter=true)
        const { pdf, sections: basePdfSections } = await createWorkspacePdf(
          {
            workspaceName: workspace.name,
            sections,
            steps: exportSteps,
            connections,
            canvasElement: config.canvasSnapshot ? canvasElement : null,
            stepRoles: exportStepRoles,
            stepTools: exportStepTools,
          },
          true,
        );

        // Collect TOC entries (base sections + enhanced sections)
        const tocEntries = [...basePdfSections];

        // Executive Summary
        if (config.executiveSummary) {
          const sectionPage = pdf.getNumberOfPages() + 1;
          renderExecutiveSummary(pdf, { sections, steps, stepRoles });
          tocEntries.push({ name: "Executive Summary", page: sectionPage });
        }

        // Journey Map and/or Journey Sentiment — fetch data once for both
        if (config.journeyMap || config.journeySentiment) {
          const supabase = createSupabaseClient();
          const [touchpoints, stagesResult] = await Promise.all([
            fetchTouchpoints(workspaceId),
            supabase
              .from("stages")
              .select("*")
              .eq("workspace_id", workspaceId)
              .order("created_at", { ascending: true }),
          ]);
          const stages = stagesResult.data ?? [];

          if (config.journeyMap) {
            const sectionPage = pdf.getNumberOfPages() + 1;
            await renderJourneyMap(pdf, { stages, touchpoints, canvasElement: null });
            tocEntries.push({ name: "Journey Map", page: sectionPage });
          }
          if (config.journeySentiment) {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderJourneySentiment(pdf, { stages, touchpoints });
            tocEntries.push({ name: "Journey Sentiment", page: sectionPage });
          }
        }

        // Perspective Comparison
        if (config.perspectiveComparison) {
          const perspectives = await fetchPerspectives(workspaceId);
          const allAnnotations =
            perspectives.length > 0
              ? (await Promise.all(perspectives.map((p) => fetchAnnotations(p.id)))).flat()
              : [];
          if (perspectives.length > 0) {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderPerspectiveComparison(pdf, {
              perspectives,
              annotations: allAnnotations,
              steps,
              sections,
            });
            tocEntries.push({ name: "Perspective Comparison", page: sectionPage });
          } else {
            renderPerspectiveComparison(pdf, {
              perspectives,
              annotations: allAnnotations,
              steps,
              sections,
            });
          }
        }

        // Prioritization Matrix
        if (config.prioritizationMatrix) {
          const sectionPage = pdf.getNumberOfPages() + 1;
          renderPrioritizationMatrix(pdf, { steps, sections });
          tocEntries.push({ name: "Prioritization Matrix", page: sectionPage });
        }

        // Tool Landscape
        if (config.toolLandscape) {
          const tools = await fetchTools(workspaceId);
          const sectionPage = pdf.getNumberOfPages() + 1;
          renderToolLandscape(pdf, { tools });
          tocEntries.push({ name: "Tool Landscape", page: sectionPage });
        }

        // Improvements
        if (config.improvements) {
          const ideas = await fetchImprovementIdeas(workspaceId);
          const sectionPage = pdf.getNumberOfPages() + 1;
          renderImprovements(pdf, { ideas });
          tocEntries.push({ name: "Improvements", page: sectionPage });
        }

        // AI Insights — cached in workspace.settings.last_analysis
        if (config.aiInsights) {
          const analysis = workspace.settings.last_analysis as AIAnalysisResult | undefined;
          if (analysis) {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderAIInsights(pdf, { analysis });
            tocEntries.push({ name: "AI Insights", page: sectionPage });
          }
        }

        // Table of Contents — render last, move to page 2
        // All current section pages (at 2+) will shift to 3+ when TOC is inserted at 2
        if (tocEntries.length > 0) {
          const adjustedEntries = tocEntries.map((e) => ({ name: e.name, page: e.page + 1 }));
          renderTableOfContents(pdf, adjustedEntries);
          const tocPage = pdf.getNumberOfPages();
          pdf.movePage(tocPage, 2);
        }

        // Add footer to all pages except title page (page 1)
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const totalPages = pdf.getNumberOfPages();
        for (let i = 2; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFontSize(7);
          pdf.setTextColor(255, 255, 255, 50);
          pdf.text(
            `${workspace.name} \u2014 Page ${i} of ${totalPages}`,
            pageWidth / 2,
            pageHeight - 5,
            { align: "center" },
          );
          pdf.setTextColor(20, 184, 166, 80);
          pdf.text("Stride", pageWidth - 15, pageHeight - 5, { align: "right" });
        }

        const safeFilename = workspace.name
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .replace(/\s+/g, "-");
        pdf.save(`${safeFilename}-process-report.pdf`);
        toast.success("PDF exported successfully");
      } catch (err) {
        toastError("Failed to export PDF", { error: err });
      }
    },
    [workspace, sections, steps, connections, workspaceId],
  );

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
            onExportPdf={handleEnhancedExportPdf}
            onExportPng={handleExportPng}
            sectionAvailability={sectionAvailability}
          />

          {/* Coloring rules + Templates buttons — top-right overlay */}
          <div className="absolute top-2.5 right-2.5 z-10 flex flex-col items-end gap-1">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowTemplateDialog(true)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--radius-md)] border text-[12px] font-medium",
                  "bg-[var(--bg-surface)] shadow-[var(--shadow-sm)] transition-colors",
                  "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]"
                )}
                aria-label="Browse templates"
              >
                <LayoutTemplate className="h-3.5 w-3.5" />
                Templates
              </button>
              <div className="relative">
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
                {coloringRules.some((r) => r.is_active) && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-[#14B8A6] pointer-events-none" />
                )}
              </div>
            </div>
            {showColoringPanel && (
              <ColoringPanel
                workspaceId={workspaceId}
                rules={coloringRules}
                onRulesChange={setColoringRules}
              />
            )}
          </div>

          {/* Template browser dialog */}
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogPrimitive.Title className="text-[16px] font-semibold text-[var(--text-primary)] tracking-[-0.01em]">Templates</DialogPrimitive.Title>
                <DialogDescription>Deploy a template to add a new section to the canvas</DialogDescription>
              </DialogHeader>
              {loadingTemplates ? (
                <div className="grid grid-cols-2 gap-3 py-2">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-[var(--bg-surface-secondary)] rounded-[var(--radius-md)] animate-pulse" />
                  ))}
                </div>
              ) : (
                // IMP-036: starters always visible; error message at top only hides DB templates
                <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto py-1">
                  {templateError && (
                    <p className="col-span-2 text-[13px] text-red-400 py-2 text-center">{templateError}</p>
                  )}
                  {!templateError && dbTemplates.length === 0 && STARTER_TEMPLATES.length === 0 && (
                    <p className="col-span-2 text-[13px] text-[var(--text-tertiary)] py-6 text-center">
                      No templates yet. Save a section as a template to get started.
                    </p>
                  )}
                  {!templateError && dbTemplates.map((t) => (
                    <div key={`db-${t.id}`} className="bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 flex flex-col gap-2">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{t.name}</p>
                          {t.description && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{t.description}</p>}
                        </div>
                        <button onClick={() => handleDeleteTemplate(t.id)} disabled={deletingId === t.id} aria-label="Delete template" className="p-0.5 text-[var(--text-tertiary)] hover:text-red-400 flex-shrink-0 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        <div className="flex items-center gap-1.5">
                          {t.category && <Badge variant="secondary">{t.category}</Badge>}
                          <span className="text-[10px] text-[var(--text-tertiary)]">{t.template_data.steps.length} step{t.template_data.steps.length !== 1 ? "s" : ""}</span>
                        </div>
                        <Button size="sm" onClick={() => handleDeployTemplate(`db-${t.id}`, t.id, null)} disabled={deployingKey === `db-${t.id}`}>
                          {deployingKey === `db-${t.id}` ? "Deploying…" : "Deploy"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {STARTER_TEMPLATES.map((t, i) => (
                    <div key={`starter-${i}`} className="bg-[var(--bg-surface-secondary)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 flex flex-col gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{t.name}</p>
                        {t.description && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{t.description}</p>}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-auto">
                        <div className="flex items-center gap-1.5">
                          {t.category && <Badge variant="secondary">{t.category}</Badge>}
                          <span className="text-[10px] text-[var(--text-tertiary)]">{t.template_data.steps.length} step{t.template_data.steps.length !== 1 ? "s" : ""}</span>
                        </div>
                        <Button size="sm" onClick={() => handleDeployTemplate(`starter-${i}`, null, i)} disabled={deployingKey === `starter-${i}`}>
                          {deployingKey === `starter-${i}` ? "Deploying…" : "Deploy"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
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

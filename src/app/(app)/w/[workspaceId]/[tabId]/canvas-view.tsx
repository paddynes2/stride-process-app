"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlowCanvas } from "@/components/canvas/flow-canvas";
const StepDetailPanel = React.lazy(() =>
  import("@/components/panels/step-detail-panel").then((m) => ({ default: m.StepDetailPanel }))
);
const SectionDetailPanel = React.lazy(() =>
  import("@/components/panels/section-detail-panel").then((m) => ({ default: m.SectionDetailPanel }))
);
const WorkspaceSummaryPanel = React.lazy(() =>
  import("@/components/panels/workspace-summary-panel").then((m) => ({ default: m.WorkspaceSummaryPanel }))
);
const AnnotationPanel = React.lazy(() =>
  import("@/components/panels/annotation-panel").then((m) => ({ default: m.AnnotationPanel }))
);
const CommentPanel = React.lazy(() =>
  import("@/components/panels/comment-panel").then((m) => ({ default: m.CommentPanel }))
);
const TaskPanel = React.lazy(() =>
  import("@/components/panels/task-panel").then((m) => ({ default: m.TaskPanel }))
);
import { ColoringPanel } from "@/components/canvas/coloring-panel";
import { useWorkspace } from "@/lib/context/workspace-context";
import { useCanvasExport } from "@/hooks/use-canvas-export";
import { fetchAnnotations, fetchComments, fetchAllTasks, fetchColoringRules, fetchTemplates, deployTemplate, deleteTemplate, createSection, createStep, fetchTouchpoints, fetchPerspectives, fetchStepRolesBatch, fetchStepToolsByStep, fetchTools, fetchImprovementIdeas, updateWorkspace } from "@/lib/api/client";
import type { ExportConfig } from "@/components/panels/export-pdf-dialog";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import { CommentCountsContext, TaskCountsContext, ColoringTintContext, PortalNavigateContext } from "@/types/canvas";
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
import { Paintbrush, LayoutTemplate, Trash2, PanelRightClose, PanelRightOpen } from "lucide-react";
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
  const searchParams = useSearchParams();
  const focusNodeId = searchParams.get("focusNode");
  const [sections, setSections] = React.useState(initialSections);
  const [steps, setSteps] = React.useState(initialSteps);
  const [connections, setConnections] = React.useState(initialConnections);
  const [selectedStepId, setSelectedStepId] = React.useState<string | null>(null);
  const [selectedSectionId, setSelectedSectionId] = React.useState<string | null>(null);

  const selectedStep = selectedStepId ? steps.find((s) => s.id === selectedStepId) ?? null : null;
  const selectedSection = selectedSectionId ? sections.find((s) => s.id === selectedSectionId) ?? null : null;

  const handleStepSelect = React.useCallback((stepId: string | null) => {
    setSelectedStepId(stepId);
    if (stepId) {
      setSelectedSectionId(null);
      setPanelCollapsed(false);
    }
  }, []);

  const handleSectionSelect = React.useCallback((sectionId: string | null) => {
    setSelectedSectionId(sectionId);
    if (sectionId) {
      setSelectedStepId(null);
      setPanelCollapsed(false);
    }
  }, []);

  const handleStepUpdate = React.useCallback((updated: Step) => {
    setSteps((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const handleStepCreate = React.useCallback((step: Step) => {
    setSteps((prev) => [...prev, step]);
  }, []);

  const handleStepDelete = React.useCallback((stepId: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== stepId));
    setConnections((prev) =>
      prev.filter((c) => c.source_step_id !== stepId && c.target_step_id !== stepId)
    );
    if (selectedStepId === stepId) setSelectedStepId(null);
  }, [selectedStepId]);

  const handleSectionCreate = React.useCallback((section: Section) => {
    setSections((prev) => [...prev, section]);
  }, []);

  const handleSectionUpdate = React.useCallback((updated: Section) => {
    setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
  }, []);

  const handleSectionDelete = React.useCallback((sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    // Orphan steps that were in this section
    setSteps((prev) =>
      prev.map((s) => (s.section_id === sectionId ? { ...s, section_id: null } : s))
    );
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  }, [selectedSectionId]);

  const handleConnectionCreate = React.useCallback((connection: Connection) => {
    setConnections((prev) => [...prev, connection]);
  }, []);

  const handleConnectionDelete = React.useCallback((connectionId: string) => {
    setConnections((prev) => prev.filter((c) => c.id !== connectionId));
  }, []);

  const { workspace, tabs, perspectives, activePerspective } = useWorkspace();
  const tab = tabs.find((t) => t.id === tabId);
  const { handleExportPng } = useCanvasExport({
    workspaceName: workspace.name,
    sections,
    steps,
    connections,
  });

  // Compute the set of entity IDs on this tab so we can filter annotations
  const tabEntityIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const s of sections) ids.add(s.id);
    for (const s of steps) ids.add(s.id);
    return ids;
  }, [sections, steps]);

  // Fetch annotated element IDs for the active perspective, filtered to current tab
  const [annotatedIds, setAnnotatedIds] = React.useState<Set<string>>(new Set());
  const refreshAnnotatedIds = React.useCallback(() => {
    if (!activePerspective) return;
    fetchAnnotations(activePerspective.id)
      .then((annotations) => {
        const filtered = annotations.filter((a) => tabEntityIds.has(a.annotatable_id));
        setAnnotatedIds(new Set(filtered.map((a) => a.annotatable_id)));
      })
      .catch(() => {});
  }, [activePerspective, tabEntityIds]);

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

  const handlePortalNavigate = React.useCallback((targetTabId: string, targetStepId?: string | null) => {
    const url = `/w/${workspaceId}/${targetTabId}${targetStepId ? `?focusNode=${targetStepId}` : ""}`;
    router.push(url);
  }, [workspaceId, router]);

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

  // Fetch step-role assignments to determine which steps have roles (for coloring rules)
  const [stepsWithRoles, setStepsWithRoles] = React.useState<Set<string>>(new Set());
  React.useEffect(() => {
    const stepIds = steps.map((s) => s.id);
    if (stepIds.length === 0) {
      setStepsWithRoles(new Set());
      return;
    }
    let cancelled = false;
    fetchStepRolesBatch(stepIds)
      .then((stepRoles) => {
        if (cancelled) return;
        setStepsWithRoles(new Set(stepRoles.map((sr) => sr.step_id)));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [steps]);

  // Fetch workspace coloring rules for step background tint
  const [coloringRules, setColoringRules] = React.useState<ColoringRule[]>([]);
  const [showColoringPanel, setShowColoringPanel] = React.useState(false);
  const [panelCollapsed, setPanelCollapsed] = React.useState(false);

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
            matches = stepsWithRoles.has(step.id);
            break;
        }
        if (matches) {
          map.set(step.id, rule.color); // last matching rule wins (rules ordered by position)
        }
      }
    }
    return map;
  }, [coloringRules, steps, stepsWithRoles]);

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
    const hasAiInsights = !!(workspace.settings?.last_analysis_at && workspace.settings?.last_analysis);
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
      processNarrative: true,
      keyFindings: true,
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
        const [pdfMod, enhancedMod, themeMod] = await Promise.all([
          import("@/lib/export/pdf"),
          import("@/lib/export/enhanced-pdf-sections"),
          import("@/lib/export/pdf-theme"),
        ]);
        const { createWorkspacePdf, renderBaseCanvasSnapshot, renderBaseStepDetails, renderBaseGapAnalysis, renderBaseCostSummary } = pdfMod;
        const { renderExecutiveSummary, renderJourneyMap, renderJourneySentiment, renderPerspectiveComparison, renderPrioritizationMatrix, renderToolLandscape, renderImprovements, renderAIInsights, renderProcessNarrative, renderKeyFindings, renderTableOfContents, renderPhasedRoadmap, renderDecisionsBlock } = enhancedMod;
        const { resetFontState, renderFooter } = themeMod;

        // Fetch step roles if needed for cost or executive summary sections
        const stepIds = steps.map((s) => s.id);
        const needsRoles = config.costAnalysis || config.executiveSummary;
        const stepRoles =
          needsRoles && stepIds.length > 0 ? await fetchStepRolesBatch(stepIds) : [];

        // Fetch step tools for cost analysis, executive summary, and tool landscape (parallel fetch, ignore per-step failures)
        const needsTools = config.costAnalysis || config.executiveSummary || config.toolLandscape;
        const stepToolsRaw =
          needsTools && stepIds.length > 0
            ? (await Promise.allSettled(stepIds.map((id) => fetchStepToolsByStep(id))))
                .flatMap((r) => r.status === "fulfilled" ? r.value : [])
            : [];

        // Fetch improvements for cost summary, roadmap, and improvements sections
        const needsImprovements = config.costAnalysis || config.prioritizationMatrix || config.improvements;
        const allImprovements = needsImprovements
          ? await fetchImprovementIdeas(workspaceId).catch(() => [] as Awaited<ReturnType<typeof fetchImprovementIdeas>>)
          : [];

        // Fetch comments for process narrative, key findings, and decisions sections
        const allComments = (config.processNarrative || config.keyFindings)
          ? await fetchComments(workspaceId)
          : [];

        // R8: Detect baseline/review mode from workspace.settings
        const settings = workspace.settings as Record<string, unknown>;
        const previousScores = settings.previous_scores as Array<{ step_id: string; maturity: number; date: string }> | undefined;
        const baselineDate = settings.baseline_date as string | undefined;
        const reviewNumber = (settings.review_number as number) ?? 0;
        const reviewIntervalDays = (settings.review_interval_days as number) ?? 90;

        const today = new Date().toISOString().slice(0, 10);
        const baselineData = (baselineDate && previousScores && previousScores.length > 0)
          ? { baseline_date: baselineDate, review_interval_days: reviewIntervalDays, previous_scores: previousScores, review_number: reviewNumber }
          : { baseline_date: today, review_interval_days: reviewIntervalDays, previous_scores: [] as Array<{ step_id: string; maturity: number; date: string }>, review_number: 0 };

        // Build base PDF (title page only) without footer (skipFooter=true)
        // skipFooter=true also skips internal section rendering — we call them individually below
        const { pdf, sections: basePdfSections } = await createWorkspacePdf(
          {
            workspaceName: workspace.name,
            sections,
            steps,
            connections,
            canvasElement,
          },
          true,
        );

        // Safely render a section — catches errors so one failure doesn't kill the export
        const sectionErrors: string[] = [];
        const safeRender = async (name: string, fn: () => void | Promise<void>) => {
          try {
            await fn();
          } catch (err) {
            console.error(`[PDF] Section "${name}" failed:`, err);
            sectionErrors.push(name);
            resetFontState(pdf);
          }
        };

        // Collect TOC entries (base sections + enhanced sections)
        const tocEntries = [...basePdfSections];

        // ══════════════════════════════════════════════════════════════════
        // R3: Report section order — actionable content first, reference last
        // ══════════════════════════════════════════════════════════════════

        // ── FRONT MATTER (what to do) ──

        // 1. Executive Summary + Rubric (R1) + Composite Score (P1)
        if (config.executiveSummary) {
          await safeRender("Executive Summary", () => {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderExecutiveSummary(pdf, { sections, steps, stepRoles, stepTools: stepToolsRaw, baselineData });
            tocEntries.push({ name: "Executive Summary", page: sectionPage });
          });
        }

        // 2. Decisions & Actions (R3 — moved forward from Key Findings, P5 first action, P7 zero-state)
        if (config.keyFindings && allComments.some((c) => c.category === "decision" && !c.is_resolved)) {
          await safeRender("Decisions & Actions", () => {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderDecisionsBlock(pdf, { comments: allComments, steps, sections });
            tocEntries.push({ name: "Decisions & Actions", page: sectionPage });
          });
        }

        // 3. Prioritization Matrix (moved forward)
        if (config.prioritizationMatrix) {
          await safeRender("Prioritization Matrix", () => {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderPrioritizationMatrix(pdf, { steps, sections });
            tocEntries.push({ name: "Prioritization Matrix", page: sectionPage });
          });
        }

        // 4. Phased Roadmap (R5 — new, after prioritization matrix)
        if (config.prioritizationMatrix) {
          await safeRender("Phased Roadmap", () => {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderPhasedRoadmap(pdf, { steps, sections, improvements: allImprovements.length > 0 ? allImprovements : null });
            tocEntries.push({ name: "Phased Roadmap", page: sectionPage });
          });
        }

        // ── NARRATIVE (the client's voice) ──

        // 5. Process Walkthrough
        if (config.processNarrative) {
          await safeRender("Process Walkthrough", () => {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderProcessNarrative(pdf, { sections, steps, comments: allComments });
            tocEntries.push({ name: "Process Walkthrough", page: sectionPage });
          });
        }

        // 6. Key Findings — pain points (decisions already rendered on page 2)
        if (config.keyFindings) {
          const hasPainPoints = allComments.some((c) => c.category === "pain_point" && !c.is_resolved);
          if (hasPainPoints) {
            await safeRender("Key Findings", () => {
              const sectionPage = pdf.getNumberOfPages() + 1;
              renderKeyFindings(pdf, { comments: allComments, steps, sections });
              tocEntries.push({ name: "Key Findings & Decisions", page: sectionPage });
            });
          }
        }

        // ── ANALYSIS (supporting evidence) ──

        // 7. Gap Analysis
        if (config.gapAnalysis) {
          await safeRender("Gap Analysis", () => renderBaseGapAnalysis(pdf, steps, sections, tocEntries, baselineData));
        }

        // 8. Cost Summary
        if (config.costAnalysis) {
          const revConfig = (workspace.avg_order_value || workspace.monthly_inquiries || workspace.close_rate || workspace.reorder_rate)
            ? { avg_order_value: workspace.avg_order_value ?? 0, monthly_inquiries: workspace.monthly_inquiries ?? 0, close_rate: workspace.close_rate ?? 0, reorder_rate: workspace.reorder_rate ?? 0 }
            : null;
          await safeRender("Cost Summary", () => renderBaseCostSummary(pdf, steps, sections, stepRoles, stepToolsRaw, tocEntries, revConfig, allImprovements.length > 0 ? allImprovements : null));
        }

        // 9. Journey Map and/or Journey Sentiment
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
            await safeRender("Journey Map", async () => {
              const sectionPage = pdf.getNumberOfPages() + 1;
              await renderJourneyMap(pdf, { stages, touchpoints, canvasElement: null });
              tocEntries.push({ name: "Journey Map", page: sectionPage });
            });
          }
          if (config.journeySentiment) {
            await safeRender("Journey Sentiment", () => {
              const sectionPage = pdf.getNumberOfPages() + 1;
              renderJourneySentiment(pdf, { stages, touchpoints });
              tocEntries.push({ name: "Journey Sentiment", page: sectionPage });
            });
          }
        }

        // 10. Perspective Comparison
        if (config.perspectiveComparison) {
          await safeRender("Perspective Comparison", async () => {
            const perspectives = await fetchPerspectives(workspaceId);
            const allAnnotations =
              perspectives.length > 0
                ? (await Promise.all(perspectives.map((p) => fetchAnnotations(p.id)))).flat()
                : [];
            if (perspectives.length >= 2) {
              const sectionPage = pdf.getNumberOfPages() + 1;
              renderPerspectiveComparison(pdf, {
                perspectives,
                annotations: allAnnotations,
                steps,
                sections,
              });
              tocEntries.push({ name: "Perspective Comparison", page: sectionPage });
            }
          });
        }

        // 11. Process Map (visual reference)
        if (config.canvasSnapshot) {
          await safeRender("Process Map", () => renderBaseCanvasSnapshot(pdf, canvasElement, tocEntries, sections, steps));
        }

        // 12. Improvements
        if (config.improvements) {
          await safeRender("Improvements", () => {
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderImprovements(pdf, { ideas: allImprovements });
            tocEntries.push({ name: "Improvements", page: sectionPage });
          });
        }

        // 13. AI Insights
        if (config.aiInsights) {
          const analysis = workspace.settings.last_analysis as AIAnalysisResult | undefined;
          if (analysis) {
            await safeRender("AI Insights", () => {
              const sectionPage = pdf.getNumberOfPages() + 1;
              renderAIInsights(pdf, { analysis });
              tocEntries.push({ name: "AI Insights", page: sectionPage });
            });
          }
        }

        // ── APPENDIX (reference data — moved to back per R3) ──

        // APP-A: Step Details (full table)
        if (config.dataTable) {
          await safeRender("Step Details", () => renderBaseStepDetails(pdf, steps, sections, tocEntries));
        }

        // APP-B: Tool Landscape (R7: with step mapping)
        if (config.toolLandscape) {
          await safeRender("Tool Landscape", async () => {
            const tools = await fetchTools(workspaceId);
            // R7: Build step-tool counts from already-fetched step tools
            const stepToolCounts = new Map<string, number>();
            for (const st of stepToolsRaw) {
              const toolId = st.tool?.id;
              if (toolId) stepToolCounts.set(toolId, (stepToolCounts.get(toolId) ?? 0) + 1);
            }
            const sectionPage = pdf.getNumberOfPages() + 1;
            renderToolLandscape(pdf, { tools, stepToolCounts: stepToolCounts.size > 0 ? stepToolCounts : undefined, totalSteps: steps.length });
            tocEntries.push({ name: "Tool Landscape", page: sectionPage });
          });
        }

        // Table of Contents — render last, move to page 2
        if (tocEntries.length > 0) {
          const adjustedEntries = tocEntries.map((e) => ({ name: e.name, page: e.page + 1 }));
          renderTableOfContents(pdf, adjustedEntries);
          const tocPage = pdf.getNumberOfPages();
          pdf.movePage(tocPage, 2);
        }

        // Footer — uses shared theme function (no hardcoded color values)
        renderFooter(pdf, workspace.name, baselineData);

        // Warn about failed sections
        if (sectionErrors.length > 0) {
          console.warn(`[PDF] ${sectionErrors.length} section(s) failed: ${sectionErrors.join(", ")}`);
        }

        const safeFilename = workspace.name
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .replace(/\s+/g, "-");
        pdf.save(`${safeFilename}-process-report.pdf`);

        // R8: Auto-save current maturity scores as baseline for next review
        const scoredSteps = steps.filter((s) => s.maturity_score != null);
        if (scoredSteps.length > 0) {
          const newPreviousScores = scoredSteps.map((s) => ({
            step_id: s.id,
            maturity: s.maturity_score!,
            date: today,
          }));
          const newSettings = {
            ...settings,
            previous_scores: newPreviousScores,
            baseline_date: settings.baseline_date ?? today,
            review_number: baselineData.previous_scores.length > 0 ? (baselineData.review_number + 1) : 0,
            review_interval_days: settings.review_interval_days ?? 90,
          };
          updateWorkspace(workspaceId, { settings: newSettings }).catch((err) => {
            console.warn("[PDF] Failed to save baseline scores:", err);
          });
        }

        toast.success("PDF exported successfully");
      } catch (err) {
        toastError("Failed to export PDF", { error: err });
      }
    },
    [workspace, sections, steps, connections, workspaceId],
  );

  return (
    <PortalNavigateContext.Provider value={handlePortalNavigate}>
    <ColoringTintContext.Provider value={coloringTints}>
    <TaskCountsContext.Provider value={taskCounts}>
    <CommentCountsContext.Provider value={commentCounts}>
      <div className="flex h-full">
        <h1 className="sr-only">{tab?.name || workspace.name}</h1>
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
            focusNodeId={focusNodeId}
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

        {/* Panel collapse toggle */}
        <button
          onClick={() => setPanelCollapsed((p) => !p)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center w-5 h-10 bg-[var(--bg-surface)] border border-r-0 border-[var(--border-subtle)] rounded-l-md text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-all"
          style={{ right: panelCollapsed ? 0 : "var(--panel-width)" }}
          aria-label={panelCollapsed ? "Expand panel" : "Collapse panel"}
        >
          {panelCollapsed ? <PanelRightOpen className="h-3.5 w-3.5" /> : <PanelRightClose className="h-3.5 w-3.5" />}
        </button>

        {/* Detail Panel / Summary Panel */}
        <div
          className={cn(
            "border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-col overflow-y-auto transition-[width,min-width] duration-200 ease-in-out",
            panelCollapsed && "border-l-0"
          )}
          style={{ width: panelCollapsed ? 0 : "var(--panel-width)", minWidth: panelCollapsed ? 0 : "var(--panel-width)", overflow: panelCollapsed ? "hidden" : undefined }}
        >
          <React.Suspense fallback={null}>
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
          </React.Suspense>
        </div>
      </div>
    </CommentCountsContext.Provider>
    </TaskCountsContext.Provider>
    </ColoringTintContext.Provider>
    </PortalNavigateContext.Provider>
  );
}

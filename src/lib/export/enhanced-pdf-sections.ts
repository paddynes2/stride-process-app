import { jsPDF } from "jspdf";
import type { Section, Step, Stage, Touchpoint, Perspective, PerspectiveAnnotation, Tool, ImprovementIdea, AIAnalysisResult, Comment } from "@/types/database";
import { MATURITY_COLORS } from "@/lib/maturity";
import { PAIN_COLORS } from "@/lib/pain";
import {
  T,
  SENTIMENT_COLORS,
  AUTOMATION_READINESS_SCALE,
  hexToRgb,
  truncate,
  capitalize,
  stripHtml,
  formatStatus,
  formatCurrency,
  safeDivide,
  safeMax,
  setPageBg,
  drawSectionTitle,
  drawSubheading,
  drawBodyText,
  drawTableHeaderRow,
  drawStripeRow,
  newTablePageClean,
  drawStatCard,
  addCleanPage,
  ensureSpace,
  buildStepRolesMap,
  buildStepToolsMap,
  computeStepMonthlyCost,
  shouldBreakTable,
  resetFontState,
  withTimeout,
  computeCompositeScore,
  deriveGapType,
  derivePhase,
  PHASE_META,
  buildPreviousScoreMap,
  formatDelta,
} from "./pdf-theme";
import type { StepRoleForExport, StepToolForExport, BaselineData } from "./pdf-theme";

// Re-export for canvas-view orchestrator compatibility
export type { StepRoleForExport } from "./pdf-theme";

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface ExecutiveSummaryData {
  sections: Section[];
  steps: Step[];
  stepRoles: StepRoleForExport[];
  stepTools?: StepToolForExport[];
  baselineData?: BaselineData | null;
}

export interface JourneyMapData {
  stages: Stage[];
  touchpoints: Touchpoint[];
  canvasElement: HTMLElement | null;
}

export interface JourneySentimentData {
  stages: Stage[];
  touchpoints: Touchpoint[];
}

export interface PerspectiveComparisonData {
  perspectives: Perspective[];
  annotations: PerspectiveAnnotation[];
  steps: Step[];
  sections: Section[];
}

export interface ProcessNarrativeData {
  sections: Section[];
  steps: Step[];
  comments: Comment[];
}

export interface KeyFindingsData {
  comments: Comment[];
  steps: Step[];
  sections: Section[];
}

// ── Executive Summary ───────────────────────────────────────────────────────

export function renderExecutiveSummary(pdf: jsPDF, data: ExecutiveSummaryData): void {
  const { y: startY, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  let y = drawSectionTitle(pdf, "Executive Summary", margin, startY);

  // Compute metrics
  const scoredSteps = data.steps.filter((s) => s.maturity_score != null);
  const avgMaturity = scoredSteps.length > 0
    ? scoredSteps.reduce((sum, s) => sum + s.maturity_score!, 0) / scoredSteps.length
    : null;
  const stepsWithTarget = data.steps.filter((s) => s.maturity_score != null && s.target_maturity != null);
  const stepsBelowTarget = stepsWithTarget.filter((s) => s.maturity_score! < s.target_maturity!).length;
  const totalMonthlyHours = data.steps.reduce((sum, s) => {
    if (s.time_minutes && s.frequency_per_month) return sum + (s.time_minutes * s.frequency_per_month) / 60;
    return sum;
  }, 0);
  const rolesMap = buildStepRolesMap(data.stepRoles);
  const toolsMap = buildStepToolsMap(data.stepTools ?? []);
  const totalMonthlyCost = data.steps.reduce((sum, s) => sum + computeStepMonthlyCost(s, rolesMap, toolsMap), 0);
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  // ── P1: Composite Score (headline metric) + R8 delta ──
  const composite = computeCompositeScore(data.steps);
  const prevMap = data.baselineData ? buildPreviousScoreMap(data.baselineData.previous_scores) : null;
  const isReviewMode = prevMap != null && prevMap.size > 0;

  // Compute previous composite for delta
  let prevComposite: { score: number } | null = null;
  if (isReviewMode && data.baselineData) {
    const prevScored = data.baselineData.previous_scores.filter((s) => s.maturity != null);
    if (prevScored.length > 0) {
      prevComposite = { score: prevScored.reduce((sum, s) => sum + s.maturity, 0) / prevScored.length };
    }
  }

  if (composite) {
    const matLabel = composite.score >= 4 ? "Strong" : composite.score >= 3 ? "Moderate" : composite.score >= 2 ? "Developing" : "Early-stage";

    // Large score display
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(36);
    pdf.setTextColor(...T.navy);

    // R8: Show delta in review mode: "1.9 → 3.1"
    if (isReviewMode && prevComposite) {
      const prevStr = prevComposite.score.toFixed(1);
      pdf.text(prevStr, margin, y + 10);
      const prevW = pdf.getTextWidth(prevStr);
      pdf.setFontSize(20);
      pdf.setTextColor(...T.muted);
      pdf.text(" \u2192 ", margin + prevW, y + 10);
      const arrowW = pdf.getTextWidth(" \u2192 ");
      pdf.setFontSize(36);
      pdf.setTextColor(...T.navy);
      pdf.text(composite.score.toFixed(1), margin + prevW + arrowW, y + 10);
      const scoreW = prevW + arrowW + pdf.getTextWidth(composite.score.toFixed(1));

      // Delta badge
      const d = formatDelta(Math.round(composite.score * 10) / 10, Math.round(prevComposite.score * 10) / 10);
      const deltaVal = composite.score - prevComposite.score;
      pdf.setFontSize(14);
      pdf.setTextColor(d.color[0], d.color[1], d.color[2]);
      pdf.text(`(${deltaVal >= 0 ? "+" : ""}${deltaVal.toFixed(1)})`, margin + scoreW + 4, y + 10);

      // Target and gap to the right
      const metaX = margin + scoreW + 40;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      pdf.text(`Target: ${composite.target.toFixed(1)}`, metaX, y + 2);
      pdf.text(`Gap: ${composite.gap.toFixed(1)}`, metaX, y + 7);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.teal);
      pdf.text(matLabel, metaX, y + 12);
    } else {
      pdf.text(`${composite.score.toFixed(1)}`, margin, y + 10);
      const scoreW = pdf.getTextWidth(`${composite.score.toFixed(1)}`);

      pdf.setFontSize(14);
      pdf.setTextColor(...T.muted);
      pdf.text("/ 5.0", margin + scoreW + 2, y + 10);

      // Target and gap to the right
      const metaX = margin + scoreW + 30;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      pdf.text(`Target: ${composite.target.toFixed(1)}`, metaX, y + 2);
      pdf.text(`Gap: ${composite.gap.toFixed(1)}`, metaX, y + 7);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.teal);
      pdf.text(matLabel, metaX, y + 12);
    }

    // Label
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.small);
    pdf.setTextColor(...T.muted);
    pdf.text("STRIDE AUTOMATION READINESS SCORE", margin, y + 16);

    y += 22;
  }

  // Business Context paragraph
  {
    const liveSteps = data.steps.filter((s) => s.status === "live").length;
    const draftSteps = data.steps.filter((s) => s.status === "draft").length;
    const inProgressSteps = data.steps.filter((s) => s.status === "in_progress").length;

    const para: string[] = [];
    para.push(`This report presents the findings of a comprehensive process audit covering ${data.sections.length} operational phases and ${data.steps.length} individual steps.`);

    const statusParts: string[] = [];
    if (liveSteps > 0) statusParts.push(`${liveSteps} are live`);
    if (inProgressSteps > 0) statusParts.push(`${inProgressSteps} in progress`);
    if (draftSteps > 0) statusParts.push(`${draftSteps} remain in draft`);
    if (statusParts.length > 0) para.push(`Of these, ${statusParts.join(", ")}.`);

    if (avgMaturity != null) {
      const label = avgMaturity >= 4 ? "strong" : avgMaturity >= 3 ? "moderate" : avgMaturity >= 2 ? "developing" : "early-stage";
      para.push(`Overall process maturity stands at ${avgMaturity.toFixed(1)}/5 (${label}), with ${stepsBelowTarget} step${stepsBelowTarget !== 1 ? "s" : ""} falling short of target.`);
    }

    y = drawBodyText(pdf, para.join(" "), margin, y, contentWidth);
  }

  // Key Finding
  {
    const gapStepsAll = stepsWithTarget
      .map((s) => ({ ...s, gap: s.target_maturity! - s.maturity_score! }))
      .filter((s) => s.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    if (gapStepsAll.length > 0) {
      const topGap = gapStepsAll[0];
      const topGapSection = topGap.section_id ? sectionMap.get(topGap.section_id) : null;
      const finding: string[] = [];
      finding.push(`The most critical gap is "${topGap.name}"${topGapSection ? ` (${topGapSection})` : ""}, scoring ${topGap.maturity_score}/5 against a target of ${topGap.target_maturity} \u2014 a ${topGap.gap}-point deficit.`);
      if (gapStepsAll.length > 1) {
        const others = gapStepsAll.slice(1, 4).map((s) => `"${s.name}" (${s.gap}pt gap)`);
        finding.push(`Other priority gaps: ${others.join(", ")}.`);
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      const findingLines = pdf.splitTextToSize(finding.join(" "), contentWidth - 12);
      const boxH = findingLines.length * T.lineH + 10;

      pdf.setFillColor(...T.tealBg);
      pdf.roundedRect(margin, y - 2, contentWidth, boxH, 1.5, 1.5, "F");
      pdf.setFillColor(...T.teal);
      pdf.rect(margin, y - 2, 2.5, boxH, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.tealDark);
      pdf.text("KEY FINDING", margin + 6, y + 2);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      pdf.text(findingLines, margin + 6, y + 7);
      y += boxH + T.paraGap;
    }
  }

  // Effort & Cost paragraph
  if (totalMonthlyHours > 0) {
    const costPara: string[] = [];
    costPara.push(`The process consumes approximately ${totalMonthlyHours.toFixed(1)} hours per month.`);
    if (totalMonthlyCost > 0) {
      costPara.push(`At current rates, this costs an estimated $${formatCurrency(totalMonthlyCost)}/month ($${formatCurrency(totalMonthlyCost * 12)} annually).`);
    }
    const sectionEfforts = data.sections.map((section) => {
      const sSteps = data.steps.filter((s) => s.section_id === section.id);
      const hrs = sSteps.reduce((sum, s) => (s.time_minutes && s.frequency_per_month ? sum + (s.time_minutes * s.frequency_per_month) / 60 : sum), 0);
      return { name: section.name, hours: hrs };
    }).sort((a, b) => b.hours - a.hours);
    if (sectionEfforts.length > 0 && sectionEfforts[0].hours > 0 && totalMonthlyHours > 0) {
      const pct = Math.round(safeDivide(sectionEfforts[0].hours, totalMonthlyHours) * 100);
      costPara.push(`"${sectionEfforts[0].name}" consumes ${pct}% of total effort \u2014 the primary target for efficiency gains.`);
    }

    y = drawBodyText(pdf, costPara.join(" "), margin, y, contentWidth);
  }

  // Metric cards row
  const metrics: { label: string; value: string; variant: "navy" | "teal" | "default" }[] = [
    { label: "PHASES", value: String(data.sections.length), variant: "navy" },
    { label: "STEPS", value: String(data.steps.length), variant: "navy" },
    { label: "AVG MATURITY", value: avgMaturity != null ? avgMaturity.toFixed(1) : "\u2014", variant: "teal" },
    { label: "BELOW TARGET", value: String(stepsBelowTarget), variant: "default" },
    { label: "MONTHLY HOURS", value: totalMonthlyHours > 0 ? `${totalMonthlyHours.toFixed(1)}h` : "\u2014", variant: "default" },
    { label: "MONTHLY COST", value: totalMonthlyCost > 0 ? `$${formatCurrency(totalMonthlyCost)}` : "\u2014", variant: "teal" },
  ];

  const cardW = 40;
  const cardGap = 3;
  const cardH = 16;
  metrics.forEach((m, i) => {
    drawStatCard(pdf, margin + i * (cardW + cardGap), y, cardW, cardH, m.value, m.label, m.variant);
  });
  y += cardH + T.paraGap + 2;

  // Recommended approach
  {
    const quickWins = data.steps.filter((s) => s.effort_score != null && s.impact_score != null && s.effort_score <= 2 && s.impact_score >= 4);
    if ((quickWins.length > 0 || stepsBelowTarget > 0) && y < pageHeight - margin - 25) {
      y = drawSubheading(pdf, "Recommended Approach", margin, y);
      const recParts: string[] = [];
      if (quickWins.length > 0) {
        const names = quickWins.slice(0, 3).map((s) => `"${s.name}"`);
        recParts.push(`Begin with the ${quickWins.length} identified quick win${quickWins.length !== 1 ? "s" : ""} (${names.join(", ")}${quickWins.length > 3 ? ", ..." : ""}) \u2014 high-impact improvements requiring minimal effort.`);
      }
      if (stepsBelowTarget > 0) {
        recParts.push(`Then systematically address the ${stepsBelowTarget} steps below target maturity, prioritising by gap size.`);
      }
      recParts.push("A phased approach reduces execution risk while delivering measurable progress at each stage.");
      y = drawBodyText(pdf, recParts.join(" "), margin, y, contentWidth);
    }
  }

  // ── R1: Automation Readiness Scale (rubric table) ──
  {
    const rubricH = AUTOMATION_READINESS_SCALE.length * 9 + 18;
    // Check if it fits on current page; if not, add a new page (still part of exec summary)
    const layout = ensureSpace(pdf, y, rubricH, pageHeight, margin);
    if (layout) { y = layout.y; }

    y = drawSubheading(pdf, "Stride Automation Readiness Scale", margin, y);

    // Column widths
    const rubricCols = [
      { label: "Level", width: 16 },
      { label: "Label", width: 38 },
      { label: "Definition", width: contentWidth * 0.42 },
      { label: "Observable Indicator", width: contentWidth - 16 - 38 - contentWidth * 0.42 },
    ];

    y = drawTableHeaderRow(pdf, rubricCols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    for (let ri = 0; ri < AUTOMATION_READINESS_SCALE.length; ri++) {
      const row = AUTOMATION_READINESS_SCALE[ri];
      drawStripeRow(pdf, ri, margin, y, contentWidth);

      let colX = margin + 2;

      // Level number (centered in a teal circle)
      pdf.setFillColor(...T.teal);
      pdf.circle(colX + 4, y + 2, 2.5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(row.level), colX + 4, y + 3, { align: "center" });
      colX += rubricCols[0].width;

      // Label
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.tableSize);
      pdf.setTextColor(...T.navy);
      pdf.text(row.label, colX, y + 3);
      colX += rubricCols[1].width;

      // Definition — may need wrapping
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.tiny);
      pdf.setTextColor(...T.body);
      const defLines = pdf.splitTextToSize(row.definition, rubricCols[2].width - 4);
      pdf.text(defLines.slice(0, 2), colX, y + 3);
      colX += rubricCols[2].width;

      // Observable Indicator
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(T.tiny);
      pdf.setTextColor(...T.muted);
      const indLines = pdf.splitTextToSize(row.indicator, rubricCols[3].width - 4);
      pdf.text(indLines.slice(0, 2), colX, y + 3);

      y += 9;
    }

    // P2: Non-linear note + target methodology
    y += 2;
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(T.tiny);
    pdf.setTextColor(...T.muted);
    pdf.text("Levels describe maturity states, not a required sequence. AI implementation frequently advances steps from Level 1 directly to Level 4.", margin, y);
    y += 3.5;
    pdf.text("Targets were set collaboratively during the mapping session based on business impact, current volume, and implementation feasibility.", margin, y);
    y += T.paraGap;
  }
}

// ── Process Narrative ───────────────────────────────────────────────────────

export function renderProcessNarrative(pdf: jsPDF, data: ProcessNarrativeData): void {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Process Walkthrough", margin, y);

  y = drawBodyText(
    pdf,
    "This section provides a detailed walkthrough of each phase in the process, documenting step-level operations, current maturity, and observations captured during the mapping exercise.",
    margin, y, contentWidth,
  );

  const sortedSections = [...data.sections].sort((a, b) => a.position_y - b.position_y || a.position_x - b.position_x);

  // Build step comments map
  const stepComments = new Map<string, typeof data.comments>();
  for (const c of data.comments) {
    if (c.commentable_type !== "step") continue;
    const existing = stepComments.get(c.commentable_id) ?? [];
    existing.push(c);
    stepComments.set(c.commentable_id, existing);
  }

  for (const section of sortedSections) {
    const sectionSteps = data.steps
      .filter((s) => s.section_id === section.id)
      .sort((a, b) => a.position_y - b.position_y || a.position_x - b.position_x);

    if (sectionSteps.length === 0) continue;

    // Check space for section header
    if (y > pageHeight - margin - 30) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    // Phase header — navy banner bar
    pdf.setFillColor(...T.navy);
    pdf.rect(margin, y, contentWidth, 8, "F");
    pdf.setFillColor(...T.teal);
    pdf.rect(margin, y + 8, contentWidth, 0.8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h2);
    pdf.setTextColor(255, 255, 255);
    pdf.text(truncate(section.name, 70), margin + 4, y + 5.5);
    y += 12;

    // Phase summary line
    const liveCount = sectionSteps.filter((s) => s.status === "live").length;
    const draftCount = sectionSteps.filter((s) => s.status === "draft").length;
    const sectionScored = sectionSteps.filter((s) => s.maturity_score != null);
    const sectionAvg = sectionScored.length > 0
      ? (sectionScored.reduce((sum, s) => sum + s.maturity_score!, 0) / sectionScored.length).toFixed(1)
      : null;

    const summaryParts: string[] = [`${sectionSteps.length} step${sectionSteps.length !== 1 ? "s" : ""}`];
    if (liveCount > 0) summaryParts.push(`${liveCount} live`);
    if (draftCount > 0) summaryParts.push(`${draftCount} draft`);
    if (sectionAvg) summaryParts.push(`avg maturity ${sectionAvg}/5`);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.small);
    pdf.setTextColor(...T.muted);
    pdf.text(summaryParts.join("  \u00B7  "), margin, y);
    y += 5;

    // Steps within section
    for (const step of sectionSteps) {
      const comments = stepComments.get(step.id) ?? [];
      const notes = step.notes ? stripHtml(step.notes) : "";
      // Split notes at the RENDER font size (bodySize) — not the current font
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      const noteLines = notes ? pdf.splitTextToSize(notes, contentWidth - 8) : [];
      const commentBlocks = comments
        .filter((c) => !c.is_resolved)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(0, 5);

      // Estimate height
      let blockH = 6; // name
      blockH += 4; // status line
      if (noteLines.length > 0) blockH += noteLines.length * 3.8 + 3;
      for (const c of commentBlocks) {
        const cText = stripHtml(c.content ?? "");
        const isHero = c.category === "decision" || c.category === "pain_point";
        if (isHero) {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(T.bodySize);
          const cLines = pdf.splitTextToSize(cText, contentWidth - 20);
          blockH += 6 + cLines.length * 4 + 3;
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(T.small);
          const cLines = pdf.splitTextToSize(cText, contentWidth - 14);
          blockH += 4 + cLines.length * 3.5;
        }
      }
      blockH += 5; // gap

      if (y + blockH > pageHeight - margin) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.muted);
        pdf.text(`${truncate(section.name, 50)} (continued)`, margin, y);
        y += 6;
      }

      // Step name
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.h3);
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(step.name, 80), margin + 2, y + 3);
      y += 6;

      // Status metadata line
      const statusParts: string[] = [formatStatus(step.status)];
      if (step.executor !== "empty") {
        const executorLabels: Record<string, string> = { person: "Manual", automation: "Automated", ai_agent: "AI Agent" };
        statusParts.push(executorLabels[step.executor] ?? step.executor);
      }
      if (step.maturity_score != null) statusParts.push(`Maturity: ${step.maturity_score}/5`);
      if (step.target_maturity != null) statusParts.push(`Target: ${step.target_maturity}/5`);
      if (step.time_minutes && step.frequency_per_month) {
        const hrs = (step.time_minutes * step.frequency_per_month / 60).toFixed(1);
        statusParts.push(`${hrs}h/mo`);
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.muted);
      pdf.text(truncate(statusParts.join("  \u00B7  "), 100), margin + 2, y + 1);
      y += 4;

      // Notes (full paragraph)
      if (noteLines.length > 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.bodySize);
        pdf.setTextColor(...T.body);
        pdf.text(noteLines, margin + 4, y + 2);
        y += noteLines.length * 3.8 + 3;
      }

      // Comments as callout quotes
      const categoryColors: Record<string, readonly [number, number, number]> = {
        decision: T.blue,
        pain_point: T.red,
        idea: T.green,
        question: T.amber,
        note: T.muted,
      };
      const categoryIcons: Record<string, string> = {
        decision: "\u2714",
        pain_point: "\u26A0",
        idea: "\u2605",
        question: "?",
        note: "\u2022",
      };

      for (const c of commentBlocks) {
        const cText = stripHtml(c.content ?? "");
        const isHero = c.category === "decision" || c.category === "pain_point";
        const tagColor = categoryColors[c.category] ?? T.muted;
        const icon = categoryIcons[c.category] ?? "\u2022";

        if (isHero) {
          const heroTextWidth = contentWidth - 20;
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(T.bodySize);
          const cLines = pdf.splitTextToSize(cText, heroTextWidth);
          const calloutH = cLines.length * 4 + 10;

          if (c.category === "decision") {
            pdf.setFillColor(239, 246, 255);
          } else {
            pdf.setFillColor(254, 242, 242);
          }
          pdf.roundedRect(margin + 2, y - 1, contentWidth - 2, calloutH, 2, 2, "F");

          pdf.setFillColor(...tagColor);
          pdf.rect(margin + 2, y - 1, 3, calloutH, "F");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(T.small);
          pdf.setTextColor(...tagColor);
          pdf.text(`${icon}  ${capitalize(c.category.replace(/_/g, " ")).toUpperCase()}`, margin + 8, y + 3.5);
          y += 6;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(T.bodySize);
          pdf.setTextColor(...T.navy);
          pdf.text(cLines, margin + 8, y + 1);
          y += cLines.length * 4 + 3;
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(T.small);
          const cLines = pdf.splitTextToSize(cText, contentWidth - 14);
          const calloutH = cLines.length * 3.5 + 6;
          pdf.setFillColor(...T.surface);
          pdf.roundedRect(margin + 4, y - 0.5, contentWidth - 6, calloutH, 1, 1, "F");

          pdf.setFillColor(...tagColor);
          pdf.rect(margin + 4, y - 0.5, 2, calloutH, "F");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(7);
          pdf.setTextColor(...tagColor);
          pdf.text(capitalize(c.category.replace(/_/g, " ")), margin + 9, y + 3);
          y += 4;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(T.small);
          pdf.setTextColor(...T.body);
          pdf.text(cLines, margin + 9, y + 1);
          y += cLines.length * 3.5 + 1;
        }
      }

      // Subtle separator
      pdf.setDrawColor(...T.border);
      pdf.setLineWidth(0.15);
      pdf.line(margin + 2, y + 2, margin + contentWidth * 0.3, y + 2);
      y += 5;
    }

    y += 3;
  }

  // Unsectioned steps
  const unsectioned = data.steps.filter((s) => !s.section_id);
  if (unsectioned.length > 0) {
    if (y > pageHeight - margin - 20) {
      ({ y } = addCleanPage(pdf));
    }
    y = drawSubheading(pdf, "Unsectioned Steps", T.margin, y);
    for (const step of unsectioned) {
      if (y > pageHeight - margin - 10) {
        ({ y } = addCleanPage(pdf));
      }
      const unsecName = truncate(step.name, 60);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.navy);
      pdf.text(unsecName, T.margin + 2, y + 2);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.muted);
      pdf.text(formatStatus(step.status), T.margin + 2 + pdf.getTextWidth(unsecName) + 4, y + 2);
      y += 6;
    }
  }
}

// ── Key Findings & Decisions ────────────────────────────────────────────────

export function renderKeyFindings(pdf: jsPDF, data: KeyFindingsData): void {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Key Findings & Decisions", margin, y);

  const decisions = data.comments.filter((c) => c.category === "decision" && !c.is_resolved);
  const painPoints = data.comments.filter((c) => c.category === "pain_point" && !c.is_resolved);
  const stepMap = new Map(data.steps.map((s) => [s.id, s]));
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  y = drawBodyText(
    pdf,
    `During the process mapping exercise, ${decisions.length} decision${decisions.length !== 1 ? "s" : ""} and ${painPoints.length} pain point${painPoints.length !== 1 ? "s" : ""} were recorded. These represent the most important observations to act on.`,
    margin, y, contentWidth,
  );

  // Decisions
  if (decisions.length > 0) {
    y = drawSubheading(pdf, "Decisions", margin, y);

    for (const c of decisions) {
      const step = c.commentable_type === "step" ? stepMap.get(c.commentable_id) : null;
      const sectionName = step?.section_id ? sectionMap.get(step.section_id) : null;
      const context = step ? truncate(`${step.name}${sectionName ? ` \u2014 ${sectionName}` : ""}`, 80) : "";
      const text = stripHtml(c.content ?? "");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      const textLines = pdf.splitTextToSize(text, contentWidth - 12);
      const blockH = textLines.length * 3.8 + (context ? 8 : 4);

      if (y + blockH > pageHeight - margin) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.muted);
        pdf.text("Key Findings & Decisions (continued)", margin, y);
        y += 6;
      }

      pdf.setFillColor(...T.blue);
      pdf.rect(margin, y, 2, blockH - 2, "F");

      if (context) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.navy);
        pdf.text(context, margin + 6, y + 3);
        y += 5;
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      pdf.text(textLines, margin + 6, y + 2);
      y += textLines.length * 3.8 + T.paraGap;
    }

    y += 2;
  }

  // Pain Points
  if (painPoints.length > 0) {
    if (y > pageHeight - margin - 20) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    y = drawSubheading(pdf, "Pain Points", margin, y);

    for (const c of painPoints) {
      const step = c.commentable_type === "step" ? stepMap.get(c.commentable_id) : null;
      const sectionName = step?.section_id ? sectionMap.get(step.section_id) : null;
      const context = step ? truncate(`${step.name}${sectionName ? ` \u2014 ${sectionName}` : ""}`, 80) : "";
      const text = stripHtml(c.content ?? "");
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      const textLines = pdf.splitTextToSize(text, contentWidth - 12);
      const blockH = textLines.length * 3.8 + (context ? 8 : 4);

      if (y + blockH > pageHeight - margin) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.muted);
        pdf.text("Pain Points (continued)", margin, y);
        y += 6;
      }

      pdf.setFillColor(...T.red);
      pdf.rect(margin, y, 2, blockH - 2, "F");

      if (context) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.navy);
        pdf.text(context, margin + 6, y + 3);
        y += 5;
      }

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      pdf.text(textLines, margin + 6, y + 2);
      y += textLines.length * 3.8 + T.paraGap;
    }
  }
}

// ── Journey Map ─────────────────────────────────────────────────────────────

export async function renderJourneyMap(pdf: jsPDF, data: JourneyMapData): Promise<void> {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Journey Map", margin, y);
  const stageMap = new Map(data.stages.map((s) => [s.id, s.name]));

  if (data.canvasElement) {
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await withTimeout(
        toPng(data.canvasElement, {
          backgroundColor: "#ffffff",
          pixelRatio: 2,
          filter: (node) => {
            if (node instanceof HTMLElement) {
              const cl = node.classList;
              if (cl?.contains("react-flow__controls") || cl?.contains("react-flow__minimap") || cl?.contains("react-flow__panel")) return false;
            }
            return true;
          },
        }),
        30_000,
        "Journey canvas snapshot",
      );
      const avH = pageHeight - y - margin;
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = dataUrl; });
      if (img.width > 0 && img.height > 0) {
        const imgAspect = img.width / img.height;
        const boxAspect = safeDivide(contentWidth, avH);
        let imgW: number, imgH: number;
        if (imgAspect > boxAspect) { imgW = contentWidth; imgH = safeDivide(contentWidth, imgAspect); }
        else { imgH = avH; imgW = avH * imgAspect; }
        pdf.setDrawColor(...T.border);
        pdf.setLineWidth(0.3);
        pdf.rect(margin, y, imgW, imgH, "S");
        pdf.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
      }
    } catch {
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.muted);
      pdf.text("Journey canvas snapshot unavailable.", margin, y + 10);
    }
  } else if (data.stages.length > 0) {
    y = drawBodyText(pdf, "The journey map visualises the customer experience across each stage. Below is a summary of stages and their associated touchpoints.", margin, y, contentWidth);

    const cols = [
      { label: "Stage", width: 65 },
      { label: "Owner", width: 45 },
      { label: "Channel", width: 45 },
      { label: "Touchpoints", width: 30 },
      { label: "Avg Pain", width: 30 },
      { label: "Touchpoint Names", width: contentWidth - 65 - 45 - 45 - 30 - 30 },
    ];

    y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    const sortedStages = [...data.stages].sort((a, b) => a.position_x - b.position_x);
    for (let si = 0; si < sortedStages.length; si++) {
      const stage = sortedStages[si];
      if (shouldBreakTable(y, pageHeight, margin, sortedStages.length - si)) {
        y = newTablePageClean(pdf, "Journey Map", cols, margin, contentWidth);
      }
      drawStripeRow(pdf, si, margin, y, contentWidth);
      const stageTps = data.touchpoints.filter((tp) => tp.stage_id === stage.id);
      const painScored = stageTps.filter((tp) => tp.pain_score != null);
      const avgPain = painScored.length > 0
        ? (painScored.reduce((sum, tp) => sum + tp.pain_score!, 0) / painScored.length).toFixed(1)
        : "\u2014";

      let colX = margin + 2;
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(stage.name, 38), colX, y + 3);
      colX += cols[0].width;
      pdf.setTextColor(...T.muted);
      pdf.text(truncate(stage.owner ?? "\u2014", 25), colX, y + 3);
      colX += cols[1].width;
      pdf.text(truncate(stage.channel ?? "\u2014", 25), colX, y + 3);
      colX += cols[2].width;
      pdf.setTextColor(...T.navy);
      pdf.text(String(stageTps.length), colX, y + 3);
      colX += cols[3].width;
      pdf.setTextColor(...T.muted);
      pdf.text(avgPain, colX, y + 3);
      colX += cols[4].width;
      pdf.setTextColor(...T.faint);
      const tpNames = stageTps.map((tp) => tp.name).join(", ") || "\u2014";
      const lastColW = cols[5].width - 4;
      let displayNames = tpNames;
      let truncIter = 0;
      while (pdf.getTextWidth(displayNames) > lastColW && displayNames.length > 10 && truncIter < 200) {
        displayNames = displayNames.slice(0, displayNames.length - 4) + "\u2026";
        truncIter++;
      }
      pdf.text(displayNames, colX, y + 3);
      y += 6.5;
    }
  } else {
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.muted);
    pdf.text("No journey data available.", margin, y + 10);
  }

  if (data.touchpoints.length === 0) return;

  // Touchpoint details page
  ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
  y = drawSectionTitle(pdf, "Touchpoint Details", margin, y);

  y = drawBodyText(pdf, "Each touchpoint represents a moment where the customer interacts with the business. Pain scores (1\u20135) indicate friction level, gain scores indicate perceived value.", margin, y, contentWidth);

  const hasNotes = data.touchpoints.some((tp) => tp.notes && tp.notes.trim());
  const tpCols = hasNotes
    ? [
        { label: "Touchpoint", width: 65 },
        { label: "Stage", width: 50 },
        { label: "Sentiment", width: 30 },
        { label: "Pain", width: 22 },
        { label: "Gain", width: 22 },
        { label: "Emotion", width: 45 },
        { label: "Notes", width: contentWidth - 65 - 50 - 30 - 22 - 22 - 45 },
      ]
    : [
        { label: "Touchpoint", width: 75 },
        { label: "Stage", width: 55 },
        { label: "Sentiment", width: 30 },
        { label: "Pain", width: 22 },
        { label: "Gain", width: 22 },
        { label: "Emotion", width: contentWidth - 75 - 55 - 30 - 22 - 22 },
      ];

  y = drawTableHeaderRow(pdf, tpCols, margin, contentWidth, y);

  const sortedTps = [...data.touchpoints].sort((a, b) => {
    const sa = a.stage_id ? stageMap.get(a.stage_id) ?? "" : "";
    const sb = b.stage_id ? stageMap.get(b.stage_id) ?? "" : "";
    if (sa !== sb) return sa.localeCompare(sb);
    return a.name.localeCompare(b.name);
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.tableSize);

  for (let rowIndex = 0; rowIndex < sortedTps.length; rowIndex++) {
    const tp = sortedTps[rowIndex];
    if (shouldBreakTable(y, pageHeight, margin, sortedTps.length - rowIndex)) {
      y = newTablePageClean(pdf, "Touchpoint Details", tpCols, margin, contentWidth);
    }
    drawStripeRow(pdf, rowIndex, margin, y, contentWidth);
    let colX = margin + 2;

    pdf.setTextColor(...T.navy);
    pdf.text(truncate(tp.name, 38), colX, y + 3);
    colX += tpCols[0].width;

    pdf.setTextColor(...T.muted);
    pdf.text(truncate(tp.stage_id ? stageMap.get(tp.stage_id) ?? "\u2014" : "\u2014", 28), colX, y + 3);
    colX += tpCols[1].width;

    if (tp.sentiment) {
      const sColor = SENTIMENT_COLORS[tp.sentiment] ?? "#6B7280";
      const [r, g, b] = hexToRgb(sColor);
      pdf.setFillColor(r, g, b);
      pdf.circle(colX + 1.5, y + 2, 1.2, "F");
      pdf.setTextColor(...T.navy);
      pdf.text(capitalize(tp.sentiment), colX + 5, y + 3);
    } else {
      pdf.setTextColor(...T.faint);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += tpCols[2].width;

    if (tp.pain_score != null) {
      const painColor = PAIN_COLORS[tp.pain_score];
      if (painColor) {
        const [r, g, b] = hexToRgb(painColor);
        pdf.setFillColor(r, g, b);
        pdf.circle(colX + 1.5, y + 2, 1.2, "F");
      }
      pdf.setTextColor(...T.navy);
      pdf.text(String(tp.pain_score), colX + 5, y + 3);
    } else {
      pdf.setTextColor(...T.faint);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += tpCols[3].width;

    if (tp.gain_score != null) {
      pdf.setTextColor(...T.green);
      pdf.text(String(tp.gain_score), colX, y + 3);
    } else {
      pdf.setTextColor(...T.faint);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += tpCols[4].width;

    pdf.setTextColor(...T.body);
    const emotionParts: string[] = [];
    if (tp.customer_emotion) emotionParts.push(tp.customer_emotion);
    const emotionText = emotionParts.join(" \u2014 ") || "\u2014";
    const emotionTrunc = hasNotes ? 26 : 36;
    pdf.text(truncate(emotionText, emotionTrunc), colX, y + 3);

    if (hasNotes) {
      colX += tpCols[5].width;
      pdf.setTextColor(...T.faint);
      pdf.text(truncate(tp.notes ?? "\u2014", 18), colX, y + 3);
    }

    y += 6.5;
  }
}

// ── Journey Sentiment ───────────────────────────────────────────────────────

export function renderJourneySentiment(pdf: jsPDF, data: JourneySentimentData): void {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Journey Sentiment", margin, y);

  const stageMap = new Map(data.stages.map((s) => [s.id, s.name]));
  const tps = data.touchpoints.filter((tp) => tp.sentiment || tp.pain_score != null);

  if (tps.length === 0) {
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.muted);
    pdf.text("No sentiment data available.", margin, y + 10);
    return;
  }

  // Sentiment narrative
  const positive = tps.filter((tp) => tp.sentiment === "positive").length;
  const neutral = tps.filter((tp) => tp.sentiment === "neutral").length;
  const negative = tps.filter((tp) => tp.sentiment === "negative").length;

  const sentimentTotal = positive + neutral + negative || 1;
  y = drawBodyText(
    pdf,
    `Across ${tps.length} touchpoints with sentiment data: ${positive} positive (${Math.round(safeDivide(positive, sentimentTotal) * 100)}%), ${neutral} neutral (${Math.round(safeDivide(neutral, sentimentTotal) * 100)}%), and ${negative} negative (${Math.round(safeDivide(negative, sentimentTotal) * 100)}%). Negative touchpoints represent the highest-priority experience improvements.`,
    margin, y, contentWidth,
  );

  // Sentiment distribution bar
  const barWidth = contentWidth * 0.6;
  const barH = 6;
  const total = positive + neutral + negative || 1;
  let bx = margin;
  if (positive > 0) {
    const w = safeDivide(positive, total) * barWidth;
    pdf.setFillColor(22, 163, 74);
    pdf.roundedRect(bx, y, w, barH, 1, 1, "F");
    bx += w;
  }
  if (neutral > 0) {
    const w = safeDivide(neutral, total) * barWidth;
    pdf.setFillColor(107, 114, 128);
    pdf.rect(bx, y, w, barH, "F");
    bx += w;
  }
  if (negative > 0) {
    const w = safeDivide(negative, total) * barWidth;
    pdf.setFillColor(220, 38, 38);
    pdf.roundedRect(bx, y, w, barH, 1, 1, "F");
  }
  y += barH + 3;

  // Legend
  pdf.setFontSize(7);
  const legendItems = [
    { label: `Positive: ${positive}`, color: [22, 163, 74] as [number, number, number] },
    { label: `Neutral: ${neutral}`, color: [107, 114, 128] as [number, number, number] },
    { label: `Negative: ${negative}`, color: [220, 38, 38] as [number, number, number] },
  ];
  let lx = margin;
  for (const item of legendItems) {
    pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
    pdf.circle(lx + 1.5, y + 1, 1.2, "F");
    pdf.setTextColor(...T.body);
    pdf.text(item.label, lx + 4, y + 2);
    lx += 40;
  }
  y += 8;

  // Summary cards
  const scoredTps = tps.filter((tp) => tp.pain_score != null);
  const avgPain = scoredTps.length > 0
    ? (scoredTps.reduce((sum, tp) => sum + tp.pain_score!, 0) / scoredTps.length).toFixed(1)
    : "\u2014";
  const maxPain = safeMax(scoredTps.map((tp) => tp.pain_score!));
  const highPain = scoredTps.filter((tp) => tp.pain_score! >= 4).length;

  const sentStats: { label: string; value: string; variant: "navy" | "teal" | "default" }[] = [
    { label: "TOUCHPOINTS", value: String(tps.length), variant: "navy" },
    { label: "HIGH PAIN (4-5)", value: String(highPain), variant: highPain > 0 ? "default" : "teal" },
    { label: "AVG PAIN", value: avgPain, variant: "default" },
    { label: "MAX PAIN", value: String(maxPain), variant: "default" },
  ];

  const cardW = 42;
  const cardGap = 4;
  sentStats.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (cardW + cardGap), y, cardW, 16, stat.value, stat.label, stat.variant);
  });
  y += 22;

  // ── Sentiment Curve ──
  const curveData = tps
    .filter((tp) => tp.pain_score != null)
    .sort((a, b) => {
      const stageIndexA = data.stages.findIndex((s) => s.id === a.stage_id);
      const stageIndexB = data.stages.findIndex((s) => s.id === b.stage_id);
      if (stageIndexA !== stageIndexB) return stageIndexA - stageIndexB;
      return 0;
    });

  if (curveData.length >= 2) {
    const chartH = 40;
    const chartW = contentWidth;
    const chartX = margin;
    const chartY = y;

    // Background
    pdf.setFillColor(...T.surface);
    pdf.roundedRect(chartX, chartY, chartW, chartH, 2, 2, "F");

    // Grid lines (pain 1-5)
    pdf.setDrawColor(...T.border);
    pdf.setLineWidth(0.15);
    for (let p = 1; p <= 5; p++) {
      const gy = chartY + chartH - ((p - 0.5) / 5) * chartH;
      pdf.setLineDashPattern([1, 2], 0);
      pdf.line(chartX + 12, gy, chartX + chartW - 4, gy);
      pdf.setLineDashPattern([], 0);
      pdf.setFontSize(6);
      pdf.setTextColor(...T.faint);
      pdf.text(String(p), chartX + 8, gy + 1.5, { align: "right" });
    }

    // Y-axis label
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...T.muted);
    pdf.text("Pain", chartX + 2, chartY + chartH / 2, { angle: 90, align: "center" });

    // Plot the curve
    const pointSpacing = safeDivide(chartW - 20, curveData.length - 1);
    const points: { x: number; y: number; sentiment: string; name: string }[] = curveData.map((tp, i) => ({
      x: chartX + 14 + i * pointSpacing,
      y: chartY + chartH - ((tp.pain_score! - 0.5) / 5) * chartH,
      sentiment: tp.sentiment ?? "neutral",
      name: tp.name,
    }));

    // Draw connecting line
    pdf.setDrawColor(...T.muted);
    pdf.setLineWidth(0.6);
    for (let i = 0; i < points.length - 1; i++) {
      pdf.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
    }

    // Draw points with sentiment color
    for (const pt of points) {
      const sColor = SENTIMENT_COLORS[pt.sentiment] ?? "#6B7280";
      const [r, g, b] = hexToRgb(sColor);
      pdf.setFillColor(255, 255, 255);
      pdf.circle(pt.x, pt.y, 2.2, "F");
      pdf.setFillColor(r, g, b);
      pdf.circle(pt.x, pt.y, 1.6, "F");
    }

    // X-axis labels (rotated 45° for legibility)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(5);
    pdf.setTextColor(...T.muted);
    const maxLabels = Math.min(points.length, Math.floor(chartW / 16));
    const labelStep = Math.max(1, Math.floor(safeDivide(points.length, maxLabels)));
    for (let i = 0; i < points.length; i += labelStep) {
      pdf.text(truncate(points[i].name, 15), points[i].x, chartY + chartH + 2.5, { angle: 45 });
    }

    y = chartY + chartH + 14;
  }

  // ── Top Pain / Top Gain callouts (R7 condensed highlights) ──
  const topPain = [...tps].filter((tp) => tp.pain_score != null).sort((a, b) => (b.pain_score ?? 0) - (a.pain_score ?? 0)).slice(0, 3);
  const topGain = [...tps].filter((tp) => tp.sentiment === "positive").sort((a, b) => (a.pain_score ?? 5) - (b.pain_score ?? 5)).slice(0, 2);

  if (topPain.length > 0 || topGain.length > 0) {
    if (y + 30 > pageHeight - margin) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    // Top Pain Points
    if (topPain.length > 0) {
      y = drawSubheading(pdf, "Highest Pain Points", margin, y);
      for (const tp of topPain) {
        const stage = tp.stage_id ? stageMap.get(tp.stage_id) ?? "" : "";
        const emotion = tp.customer_emotion ? ` \u2014 "${truncate(tp.customer_emotion, 40)}"` : "";
        pdf.setFillColor(...T.red);
        pdf.rect(margin, y, 2, 5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.navy);
        pdf.text(`${truncate(tp.name, 40)} (Pain: ${tp.pain_score ?? "?"})`, margin + 5, y + 3);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.tiny);
        pdf.setTextColor(...T.muted);
        pdf.text(`${stage}${emotion}`, margin + 5, y + 7);
        y += 10;
      }
      y += 2;
    }

    // Top Gains
    if (topGain.length > 0) {
      y = drawSubheading(pdf, "Strongest Positive Touchpoints", margin, y);
      for (const tp of topGain) {
        const stage = tp.stage_id ? stageMap.get(tp.stage_id) ?? "" : "";
        const emotion = tp.customer_emotion ? ` \u2014 "${truncate(tp.customer_emotion, 40)}"` : "";
        pdf.setFillColor(...T.green);
        pdf.rect(margin, y, 2, 5, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.navy);
        pdf.text(truncate(tp.name, 40), margin + 5, y + 3);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.tiny);
        pdf.setTextColor(...T.muted);
        pdf.text(`${stage}${emotion}`, margin + 5, y + 7);
        y += 10;
      }
    }
  }

  // ── Condensed sentiment table — top 8 by pain only (R7: full table to appendix) ──
  const sortedByPain = [...tps].sort((a, b) => (b.pain_score ?? 0) - (a.pain_score ?? 0));
  const condensedRows = sortedByPain.slice(0, 8);

  if (condensedRows.length > 0) {
    y += 4;

    const sentCols = [
      { label: "Touchpoint", width: 70 },
      { label: "Stage", width: 55 },
      { label: "Pain", width: 22 },
      { label: "Sentiment", width: 30 },
      { label: "Emotion", width: 55 },
      { label: "", width: contentWidth - 70 - 55 - 22 - 30 - 55 },
    ];

    if (y + 20 > pageHeight - margin) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    if (sortedByPain.length > 8) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.muted);
      pdf.text(`Showing top 8 of ${sortedByPain.length} touchpoints by pain score.`, margin, y);
      y += 4;
    }

    y = drawTableHeaderRow(pdf, sentCols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    for (let ri = 0; ri < condensedRows.length; ri++) {
      const tp = condensedRows[ri];
      if (shouldBreakTable(y, pageHeight, margin, condensedRows.length - ri)) {
        y = newTablePageClean(pdf, "Journey Sentiment", sentCols, margin, contentWidth);
      }
      drawStripeRow(pdf, ri, margin, y, contentWidth);

      let colX = margin + 2;
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(tp.name, 40), colX, y + 3);
      colX += sentCols[0].width;

      pdf.setTextColor(...T.muted);
      pdf.text(truncate(tp.stage_id ? stageMap.get(tp.stage_id) ?? "\u2014" : "\u2014", 32), colX, y + 3);
      colX += sentCols[1].width;

      if (tp.pain_score != null) {
        const painColor = PAIN_COLORS[tp.pain_score];
        if (painColor) {
          const [r, g, b] = hexToRgb(painColor);
          pdf.setFillColor(r, g, b);
          pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        }
        pdf.setTextColor(...T.navy);
        pdf.text(String(tp.pain_score), colX + 5, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += sentCols[2].width;

      if (tp.sentiment) {
        const sColor = SENTIMENT_COLORS[tp.sentiment] ?? "#6B7280";
        const [r, g, b] = hexToRgb(sColor);
        pdf.setFillColor(r, g, b);
        pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        pdf.setTextColor(...T.navy);
        pdf.text(capitalize(tp.sentiment), colX + 5, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += sentCols[3].width;

      pdf.setTextColor(...T.body);
      const emotionText = tp.customer_emotion ? tp.customer_emotion : "\u2014";
      pdf.text(truncate(emotionText, 32), colX, y + 3);
      colX += sentCols[4].width;

      // Sentiment bar
      if (tp.pain_score != null && maxPain > 0) {
        const barMaxW = sentCols[5].width - 4;
        const barW = safeDivide(tp.pain_score, maxPain) * barMaxW;
        const sColor = SENTIMENT_COLORS[tp.sentiment ?? "neutral"] ?? "#6B7280";
        const [r, g, b] = hexToRgb(sColor);
        pdf.setFillColor(r, g, b);
        pdf.roundedRect(colX, y + 0.5, barW, 3, 1, 1, "F");
      }

      y += 6.5;
    }
  }
}

// ── Perspective Comparison ──────────────────────────────────────────────────

export function renderPerspectiveComparison(pdf: jsPDF, data: PerspectiveComparisonData): void {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Perspective Comparison", margin, y);

  if (data.perspectives.length < 2) {
    y = drawBodyText(pdf, "Perspective comparison requires at least two perspectives. Add perspectives to enable this analysis.", margin, y, contentWidth);
    return;
  }

  const [pA, pB] = data.perspectives;
  y = drawBodyText(
    pdf,
    `Comparing "${pA.name}" vs "${pB.name}" \u2014 this analysis highlights where the two perspectives diverge on step maturity, revealing blind spots and misaligned expectations.`,
    margin, y, contentWidth,
  );

  const stepMap = new Map(data.steps.map((s) => [s.id, s]));

  // Build comparison by annotatable element
  type ByElement = { stepName: string; ratingA?: number; ratingB?: number; contentA?: string; contentB?: string };
  const byElement = new Map<string, ByElement>();

  for (const ann of data.annotations) {
    const key = `${ann.annotatable_type}:${ann.annotatable_id}`;
    let resolvedName: string | undefined;
    if (ann.annotatable_type === "step") {
      resolvedName = stepMap.get(ann.annotatable_id)?.name;
    }
    if (!resolvedName) continue;
    const existing = byElement.get(key) ?? { stepName: resolvedName };

    if (ann.perspective_id === pA.id) {
      existing.ratingA = ann.rating ?? undefined;
      if (ann.content) existing.contentA = stripHtml(ann.content);
    } else if (ann.perspective_id === pB.id) {
      existing.ratingB = ann.rating ?? undefined;
      if (ann.content) existing.contentB = stripHtml(ann.content);
    }
    byElement.set(key, existing);
  }

  // R7: Check population density — if < 60% populated, condense
  const allEntries = [...byElement.values()];
  const totalCells = allEntries.length * 2; // two perspectives per element
  const populatedCells = allEntries.reduce((sum, e) => sum + (e.ratingA != null ? 1 : 0) + (e.ratingB != null ? 1 : 0), 0);
  const populationRatio = totalCells > 0 ? safeDivide(populatedCells, totalCells) : 0;
  const isCondensed = populationRatio < 0.6;

  if (isCondensed) {
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(T.small);
    pdf.setTextColor(...T.muted);
    pdf.text(`${Math.round(populationRatio * 100)}% of comparison cells populated \u2014 showing dual-observation rows only.`, margin, y);
    y += 5;
  }

  // Rating comparison table
  const entries = allEntries
    .filter((e) => {
      // In condensed mode, only show rows where BOTH perspectives have observations
      if (isCondensed) return e.ratingA != null && e.ratingB != null;
      return e.ratingA != null || e.ratingB != null;
    })
    .sort((a, b) => {
      const divA = (a.ratingA != null && a.ratingB != null) ? Math.abs(a.ratingA - a.ratingB) : 0;
      const divB = (b.ratingA != null && b.ratingB != null) ? Math.abs(b.ratingA - b.ratingB) : 0;
      return divB - divA;
    });

  if (entries.length > 0) {
    const cols = [
      { label: "Element", width: contentWidth - 50 - 50 - 40 },
      { label: truncate(pA.name, 25), width: 50 },
      { label: truncate(pB.name, 25), width: 50 },
      { label: "Divergence", width: 40 },
    ];

    y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    for (let ri = 0; ri < entries.length; ri++) {
      const e = entries[ri];
      if (shouldBreakTable(y, pageHeight, margin, entries.length - ri)) {
        y = newTablePageClean(pdf, "Perspective Comparison", cols, margin, contentWidth);
      }
      drawStripeRow(pdf, ri, margin, y, contentWidth);

      let colX = margin + 2;
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(e.stepName, 55), colX, y + 3);
      colX += cols[0].width;

      if (e.ratingA != null) {
        const color = MATURITY_COLORS[e.ratingA];
        if (color) {
          const [r, g, b] = hexToRgb(color);
          pdf.setFillColor(r, g, b);
          pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        }
        pdf.setTextColor(...T.navy);
        pdf.text(String(e.ratingA), colX + 5, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += cols[1].width;

      if (e.ratingB != null) {
        const color = MATURITY_COLORS[e.ratingB];
        if (color) {
          const [r, g, b] = hexToRgb(color);
          pdf.setFillColor(r, g, b);
          pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        }
        pdf.setTextColor(...T.navy);
        pdf.text(String(e.ratingB), colX + 5, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += cols[2].width;

      if (e.ratingA != null && e.ratingB != null) {
        const div = Math.abs(e.ratingA - e.ratingB);
        const divColor = div >= 2 ? T.red : div >= 1 ? T.amber : T.muted;
        pdf.setTextColor(divColor[0], divColor[1], divColor[2]);
        pdf.text(String(div), colX, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }

      y += 6.5;
    }
  }

  // Annotation Details — side-by-side layout (flows below comparison table)
  // R7: Skip annotation details in condensed mode (low population)
  const annotatedEntries = isCondensed ? [] : [...byElement.values()].filter((e) => e.contentA || e.contentB);
  if (annotatedEntries.length > 0) {
    // Need ~60mm for section title + intro + perspective labels + first card
    const annotationHeaderSpace = 60;
    if (y + annotationHeaderSpace > pageHeight - margin) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    } else {
      y += T.paraGap;
    }
    y = drawSectionTitle(pdf, "Annotation Details", margin, y);
    y = drawBodyText(pdf, "Observations recorded during the perspective assessment, showing how each viewpoint interprets the same process element.", margin, y, contentWidth);

    const colW = (contentWidth - 6) / 2;
    const colAX = margin;
    const colBX = margin + colW + 6;

    // Perspective labels
    {
      const [rA, gA, bA] = hexToRgb(pA.color);
      pdf.setFillColor(rA, gA, bA);
      pdf.roundedRect(colAX, y, colW, 6, 1, 1, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.small);
      pdf.setTextColor(255, 255, 255);
      pdf.text(pA.name, colAX + 4, y + 4);

      const [rB, gB, bB] = hexToRgb(pB.color);
      pdf.setFillColor(rB, gB, bB);
      pdf.roundedRect(colBX, y, colW, 6, 1, 1, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(pB.name, colBX + 4, y + 4);
      y += 10;
    }

    for (const entry of annotatedEntries) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      const linesA = entry.contentA ? pdf.splitTextToSize(entry.contentA, colW - 8) : [];
      const linesB = entry.contentB ? pdf.splitTextToSize(entry.contentB, colW - 8) : [];
      const hA = linesA.length * 3.8 + 4;
      const hB = linesB.length * 3.8 + 4;
      const blockH = 8 + Math.max(hA, hB) + 4;

      if (y + blockH > pageHeight - margin) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
        // Re-render perspective column labels on continuation page
        const [rcA, gcA, bcA] = hexToRgb(pA.color);
        pdf.setFillColor(rcA, gcA, bcA);
        pdf.roundedRect(colAX, y, colW, 6, 1, 1, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.small);
        pdf.setTextColor(255, 255, 255);
        pdf.text(pA.name, colAX + 4, y + 4);
        const [rcB, gcB, bcB] = hexToRgb(pB.color);
        pdf.setFillColor(rcB, gcB, bcB);
        pdf.roundedRect(colBX, y, colW, 6, 1, 1, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.text(pB.name, colBX + 4, y + 4);
        y += 10;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.h3);
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(entry.stepName, 80), margin, y + 3);
      y += 7;

      const cardH = Math.max(hA, hB);

      pdf.setFillColor(...T.surface);
      pdf.roundedRect(colAX, y, colW, cardH, 1, 1, "F");
      const [rA, gA, bA] = hexToRgb(pA.color);
      pdf.setFillColor(rA, gA, bA);
      pdf.rect(colAX, y, 2, cardH, "F");

      pdf.setFillColor(...T.surface);
      pdf.roundedRect(colBX, y, colW, cardH, 1, 1, "F");
      const [rB, gB, bB] = hexToRgb(pB.color);
      pdf.setFillColor(rB, gB, bB);
      pdf.rect(colBX, y, 2, cardH, "F");

      if (linesA.length > 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.bodySize);
        pdf.setTextColor(...T.body);
        pdf.text(linesA, colAX + 5, y + 4);
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.faint);
        pdf.text("No observation recorded", colAX + 5, y + 4);
      }

      if (linesB.length > 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.bodySize);
        pdf.setTextColor(...T.body);
        pdf.text(linesB, colBX + 5, y + 4);
      } else {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.faint);
        pdf.text("No observation recorded", colBX + 5, y + 4);
      }

      y += cardH + 4;
    }
  }
}

// ── Prioritization Matrix ───────────────────────────────────────────────────

export function renderPrioritizationMatrix(pdf: jsPDF, data: { steps: Step[]; sections: Section[] }): void {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Prioritization Matrix", margin, y);

  const scored = data.steps.filter((s) => s.effort_score != null && s.impact_score != null);

  if (scored.length === 0) {
    y = drawBodyText(pdf, "No steps have effort and impact scores. Add scores to enable prioritisation.", margin, y, contentWidth);
    return;
  }

  const getQuadrant = (effort: number, impact: number) => {
    if (effort <= 2 && impact >= 4) return "Quick Win";
    if (effort >= 4 && impact >= 4) return "Major Project";
    if (effort <= 2 && impact <= 2) return "Fill In";
    return "Thankless Task";
  };

  const quickWins = scored.filter((s) => getQuadrant(s.effort_score!, s.impact_score!) === "Quick Win").length;
  const majorProjects = scored.filter((s) => getQuadrant(s.effort_score!, s.impact_score!) === "Major Project").length;
  const thankless = scored.filter((s) => getQuadrant(s.effort_score!, s.impact_score!) === "Thankless Task").length;

  y = drawBodyText(
    pdf,
    `${scored.length} steps scored for effort and impact. ${quickWins} quick wins identified (low effort, high impact) \u2014 these should be addressed first. ${majorProjects} major projects require significant investment. ${thankless > 0 ? `${thankless} thankless task${thankless !== 1 ? "s" : ""} may warrant deprioritisation.` : ""}`,
    margin, y, contentWidth,
  );

  // Summary cards
  const priStats: { label: string; value: string; variant: "navy" | "teal" | "default" }[] = [
    { label: "SCORED STEPS", value: String(scored.length), variant: "navy" },
    { label: "QUICK WINS", value: String(quickWins), variant: "teal" },
    { label: "MAJOR PROJECTS", value: String(majorProjects), variant: "default" },
    { label: "THANKLESS TASKS", value: String(thankless), variant: "default" },
  ];
  const priCardW = 42;
  const priCardGap = 4;
  priStats.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (priCardW + priCardGap), y, priCardW, 16, stat.value, stat.label, stat.variant);
  });
  y += 22;

  // ── 2×2 Scatter Plot ──
  let plotAvailH = pageHeight - y - margin - 10;
  if (plotAvailH < 40) {
    ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    plotAvailH = pageHeight - y - margin - 10;
  }
  const plotSize = Math.min(contentWidth * 0.55, plotAvailH);
  const plotX = margin;
  const plotY = y;
  const legendX = plotX + plotSize + 16;

  // Quadrant background fills
  const halfPlot = plotSize / 2;
  pdf.setFillColor(240, 253, 244);
  pdf.rect(plotX, plotY, halfPlot, halfPlot, "F");
  pdf.setFillColor(239, 246, 255);
  pdf.rect(plotX + halfPlot, plotY, halfPlot, halfPlot, "F");
  pdf.setFillColor(255, 251, 235);
  pdf.rect(plotX, plotY + halfPlot, halfPlot, halfPlot, "F");
  pdf.setFillColor(254, 242, 242);
  pdf.rect(plotX + halfPlot, plotY + halfPlot, halfPlot, halfPlot, "F");

  // Axis lines
  pdf.setDrawColor(...T.border);
  pdf.setLineWidth(0.3);
  pdf.rect(plotX, plotY, plotSize, plotSize, "S");
  pdf.setLineDashPattern([1.5, 1.5], 0);
  pdf.line(plotX + halfPlot, plotY, plotX + halfPlot, plotY + plotSize);
  pdf.line(plotX, plotY + halfPlot, plotX + plotSize, plotY + halfPlot);
  pdf.setLineDashPattern([], 0);

  // Axis labels
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  pdf.setTextColor(...T.navy);
  pdf.text("EFFORT", plotX + plotSize / 2, plotY + plotSize + 5, { align: "center" });
  pdf.text("IMPACT", plotX - 3, plotY + plotSize / 2, { angle: 90, align: "center" });

  // Quadrant labels
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.setTextColor(...T.green);
  pdf.text("Quick Win", plotX + halfPlot * 0.5, plotY + 4, { align: "center" });
  pdf.setTextColor(...T.blue);
  pdf.text("Major Project", plotX + halfPlot * 1.5, plotY + 4, { align: "center" });
  pdf.setTextColor(...T.amber);
  pdf.text("Fill In", plotX + halfPlot * 0.5, plotY + plotSize - 2, { align: "center" });
  pdf.setTextColor(...T.red);
  pdf.text("Thankless Task", plotX + halfPlot * 1.5, plotY + plotSize - 2, { align: "center" });

  // Plot points
  const qColors: Record<string, readonly [number, number, number]> = {
    "Quick Win": T.green,
    "Major Project": T.blue,
    "Fill In": T.amber,
    "Thankless Task": T.red,
  };

  const plotted = new Map<string, number>();
  for (const step of scored) {
    const effort = step.effort_score!;
    const impact = step.impact_score!;
    const key = `${effort}-${impact}`;
    const count = plotted.get(key) ?? 0;
    plotted.set(key, count + 1);

    // Radial jitter — spread overlapping points in a spiral pattern
    const angle = count * (Math.PI * 2 / 6);
    const radius = count > 0 ? 2.5 + count * 1.8 : 0;
    const jitterX = Math.cos(angle) * radius;
    const jitterY = Math.sin(angle) * radius;
    const cx = plotX + ((effort - 0.5) / 5) * plotSize + jitterX;
    const cy = plotY + plotSize - ((impact - 0.5) / 5) * plotSize + jitterY;

    const quadrant = getQuadrant(effort, impact);
    const color = qColors[quadrant] ?? T.muted;
    pdf.setFillColor(...color);
    pdf.circle(
      Math.min(Math.max(cx, plotX + 2), plotX + plotSize - 2),
      Math.min(Math.max(cy, plotY + 2), plotY + plotSize - 2),
      1.6, "F",
    );
  }

  // ── Legend (right side) ──
  let ly = plotY;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.h2);
  pdf.setTextColor(...T.navy);
  pdf.text("Steps by Quadrant", legendX, ly);
  ly += 5;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  pdf.setTextColor(...T.muted);
  pdf.text("E = Effort (1\u20135)   I = Impact (1\u20135)", legendX, ly);
  ly += 5;

  const quadrantOrder: Record<string, number> = { "Quick Win": 0, "Major Project": 1, "Fill In": 2, "Thankless Task": 3 };
  const sorted = [...scored].sort((a, b) => {
    const qA = quadrantOrder[getQuadrant(a.effort_score!, a.impact_score!)] ?? 9;
    const qB = quadrantOrder[getQuadrant(b.effort_score!, b.impact_score!)] ?? 9;
    if (qA !== qB) return qA - qB;
    return b.impact_score! - a.impact_score!;
  });

  const legendWidth = contentWidth - (legendX - margin);
  let currentQuadrant = "";
  for (const step of sorted) {
    if (ly > plotY + plotSize - 2) break;

    const quadrant = getQuadrant(step.effort_score!, step.impact_score!);
    if (quadrant !== currentQuadrant) {
      currentQuadrant = quadrant;
      const color = qColors[quadrant] ?? T.muted;
      pdf.setFillColor(...color);
      pdf.circle(legendX + 1.5, ly - 0.8, 1.2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.navy);
      pdf.text(quadrant, legendX + 5, ly);
      ly += 4.5;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tiny);
    pdf.setTextColor(...T.body);
    pdf.text(truncate(step.name, Math.floor(legendWidth / 1.6)), legendX + 3, ly);
    pdf.setTextColor(...T.muted);
    pdf.text(`E${step.effort_score} I${step.impact_score}`, legendX + legendWidth - 2, ly, { align: "right" });
    ly += 3.8;
  }
}

// ── Tool Landscape ──────────────────────────────────────────────────────────

export function renderToolLandscape(pdf: jsPDF, data: { tools: Tool[]; stepToolCounts?: Map<string, number>; totalSteps?: number }): void {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Tool Landscape", margin, y);

  if (data.tools.length === 0) {
    y = drawBodyText(pdf, "No tools have been added to this workspace.", margin, y, contentWidth);
    return;
  }

  const activeTools = data.tools.filter((t) => t.status === "active");
  const totalCost = data.tools.reduce((sum, t) => sum + (t.cost_per_month ?? 0), 0);
  const considering = data.tools.filter((t) => t.status === "considering").length;
  const hasStepMapping = data.stepToolCounts != null && data.stepToolCounts.size > 0;

  // R7: Count tools with zero step support and steps with zero tool support
  const zeroStepTools = hasStepMapping ? data.tools.filter((t) => (data.stepToolCounts!.get(t.id) ?? 0) === 0).length : 0;

  const narrativeParts = [`The process relies on ${data.tools.length} tools: ${activeTools.length} active${considering > 0 ? `, ${considering} under consideration` : ""}. Total monthly tooling cost: $${formatCurrency(totalCost)}.`];
  if (hasStepMapping && zeroStepTools > 0) {
    narrativeParts.push(`${zeroStepTools} tool${zeroStepTools !== 1 ? "s are" : " is"} not linked to any process step \u2014 potential waste or uncaptured usage.`);
  }
  y = drawBodyText(pdf, narrativeParts.join(" "), margin, y, contentWidth);

  const toolStats: { label: string; value: string; variant: "navy" | "teal" | "default" }[] = [
    { label: "TOTAL TOOLS", value: String(data.tools.length), variant: "navy" },
    { label: "ACTIVE", value: String(activeTools.length), variant: "teal" },
    { label: "CONSIDERING", value: String(considering), variant: "default" },
    { label: "MONTHLY COST", value: `$${formatCurrency(totalCost)}`, variant: "default" },
  ];
  if (hasStepMapping && zeroStepTools > 0) {
    toolStats.push({ label: "UNUSED TOOLS", value: String(zeroStepTools), variant: "default" });
  }
  const toolCardW = 42;
  toolStats.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (toolCardW + 4), y, toolCardW, 16, stat.value, stat.label, stat.variant);
  });
  y += 22;

  // R7: Add "Steps" column when step-tool mapping available
  const cols = hasStepMapping
    ? [
        { label: "Tool", width: 55 },
        { label: "Category", width: 40 },
        { label: "Vendor", width: 42 },
        { label: "Steps", width: 22 },
        { label: "Status", width: 30 },
        { label: "Monthly Cost", width: contentWidth - 55 - 40 - 42 - 22 - 30 },
      ]
    : [
        { label: "Tool", width: 60 },
        { label: "Category", width: 45 },
        { label: "Vendor", width: 50 },
        { label: "Status", width: 35 },
        { label: "Monthly Cost", width: contentWidth - 60 - 45 - 50 - 35 },
      ];

  y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.tableSize);

  const sortedTools = [...data.tools].sort((a, b) => {
    if (a.status !== b.status) return a.status === "active" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  for (let ri = 0; ri < sortedTools.length; ri++) {
    const tool = sortedTools[ri];
    if (shouldBreakTable(y, pageHeight, margin, sortedTools.length - ri)) {
      y = newTablePageClean(pdf, "Tool Landscape", cols, margin, contentWidth);
    }
    drawStripeRow(pdf, ri, margin, y, contentWidth);

    let colX = margin + 2;
    pdf.setTextColor(...T.navy);
    pdf.text(truncate(tool.name, hasStepMapping ? 30 : 35), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(...T.muted);
    pdf.text(truncate(tool.category ?? "\u2014", hasStepMapping ? 22 : 25), colX, y + 3);
    colX += cols[1].width;

    pdf.text(truncate(tool.vendor ?? "\u2014", hasStepMapping ? 24 : 28), colX, y + 3);
    colX += cols[2].width;

    // Steps column (R7)
    if (hasStepMapping) {
      const stepCount = data.stepToolCounts!.get(tool.id) ?? 0;
      if (stepCount === 0) {
        pdf.setTextColor(...T.red);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.tableSize);
        pdf.text("0", colX, y + 3);
        pdf.setFont("helvetica", "normal");
      } else {
        pdf.setTextColor(...T.navy);
        pdf.text(String(stepCount), colX, y + 3);
      }
      colX += cols[3].width;
    }

    const statusColIdx = hasStepMapping ? 4 : 3;
    const costColIdx = hasStepMapping ? 5 : 4;

    const statusColor = tool.status === "active" ? T.green : tool.status === "considering" ? T.amber : T.muted;
    pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    pdf.circle(colX + 1.5, y + 2, 1.2, "F");
    pdf.setTextColor(...T.navy);
    pdf.text(capitalize(tool.status ?? "\u2014"), colX + 5, y + 3);
    colX += cols[statusColIdx].width;

    if (tool.cost_per_month) {
      pdf.setTextColor(...T.navy);
      pdf.text(`$${formatCurrency(tool.cost_per_month)}`, colX, y + 3);
    } else if (tool.status === "considering") {
      pdf.setTextColor(...T.faint);
      pdf.text("TBD", colX, y + 3);
    } else {
      pdf.setTextColor(...T.faint);
      pdf.text("\u2014", colX, y + 3);
    }

    y += 6.5;
  }
}

// ── Improvements ────────────────────────────────────────────────────────────

export function renderImprovements(pdf: jsPDF, data: { ideas: ImprovementIdea[] }): void {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Improvement Opportunities", margin, y);

  if (data.ideas.length === 0) {
    y = drawBodyText(pdf, "No improvement ideas have been captured.", margin, y, contentWidth);
    return;
  }

  const highPriority = data.ideas.filter((i) => i.priority === "high" || i.priority === "critical").length;

  y = drawBodyText(
    pdf,
    `${data.ideas.length} improvement opportunities have been identified. ${highPriority > 0 ? `${highPriority} are flagged as high or critical priority and should be addressed in the next improvement cycle.` : "Each is listed below with its current priority and status."}`,
    margin, y, contentWidth,
  );

  const priorityColors: Record<string, readonly [number, number, number]> = {
    critical: T.red,
    high: [234, 88, 12] as const,
    medium: T.amber,
    low: T.green,
  };

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedIdeas = [...data.ideas].sort((a, b) => {
    const pa = priorityOrder[a.priority ?? "medium"] ?? 2;
    const pb = priorityOrder[b.priority ?? "medium"] ?? 2;
    return pa - pb;
  });

  const badgeSize = 7;
  const cardIndent = badgeSize + 6;
  const cardContentW = contentWidth - cardIndent - 4;

  for (let idx = 0; idx < sortedIdeas.length; idx++) {
    const idea = sortedIdeas[idx];
    const desc = idea.description ? stripHtml(idea.description) : "";
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    const descLines = desc ? pdf.splitTextToSize(desc, cardContentW) : [];
    const blockH = 14 + (descLines.length > 0 ? descLines.length * 3.8 + 3 : 0);

    if (y + blockH > pageHeight - margin) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    const pColor = priorityColors[idea.priority ?? "medium"] ?? T.muted;

    pdf.setFillColor(...pColor);
    pdf.circle(margin + badgeSize / 2, y + badgeSize / 2, badgeSize / 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(idx + 1), margin + badgeSize / 2, y + badgeSize / 2 + 1.2, { align: "center" });

    const cardX = margin + cardIndent;
    const cardH = blockH - 2;
    pdf.setFillColor(...T.surface);
    pdf.roundedRect(cardX, y - 1, cardContentW + 4, cardH, 1.5, 1.5, "F");

    pdf.setFillColor(...pColor);
    pdf.rect(cardX, y - 1, 2, cardH, "F");

    // Strip leading "#N " from title if present (badge already shows sequential number)
    const cleanTitle = idea.title.replace(/^#\d+\s*/, "");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h3);
    pdf.setTextColor(...T.navy);
    pdf.text(truncate(cleanTitle, 70), cardX + 5, y + 4);

    const meta: string[] = [];
    if (idea.priority) meta.push(capitalize(idea.priority));
    if (idea.status) meta.push(formatStatus(idea.status));
    if (meta.length > 0) {
      const metaText = meta.join(" \u00B7 ");
      const titleEndX = cardX + 5 + pdf.getTextWidth(truncate(cleanTitle, 70)) + 4;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6.5);
      pdf.setTextColor(...pColor);
      pdf.text(metaText, titleEndX, y + 4);
    }
    y += 8;

    if (descLines.length > 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      pdf.text(descLines, cardX + 5, y + 1);
      y += descLines.length * 3.8 + 2;
    }

    y += T.paraGap;
  }
}

// ── AI Insights ─────────────────────────────────────────────────────────────

export function renderAIInsights(pdf: jsPDF, data: { analysis: AIAnalysisResult }): void {
  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "AI Analysis", margin, y);

  const a = data.analysis;

  if (a.bottlenecks && a.bottlenecks.length > 0) {
    y = drawSubheading(pdf, "Bottlenecks", margin, y);
    for (const b of a.bottlenecks) {
      if (y > pageHeight - margin - 15) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      pdf.setFillColor(...T.red);
      pdf.rect(margin, y, 2, 4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(b.title ?? "Unknown step", 70), margin + 5, y + 3);
      y += 5;

      if (b.description) {
        y = drawBodyText(pdf, b.description, margin + 5, y, contentWidth - 5);
      }
    }
  }

  if (a.redundancies && a.redundancies.length > 0) {
    if (y > pageHeight - margin - 20) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }
    y = drawSubheading(pdf, "Redundancies", margin, y);
    for (const r of a.redundancies) {
      if (y > pageHeight - margin - 15) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      pdf.setFillColor(...T.amber);
      pdf.rect(margin, y, 2, 4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(r.title ?? "Unknown", 70), margin + 5, y + 3);
      y += 5;

      if (r.description) {
        y = drawBodyText(pdf, r.description, margin + 5, y, contentWidth - 5);
      }
    }
  }

  if (a.maturity_recommendations && a.maturity_recommendations.length > 0) {
    if (y > pageHeight - margin - 20) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }
    y = drawSubheading(pdf, "Recommendations", margin, y);
    for (let i = 0; i < a.maturity_recommendations.length; i++) {
      const rec = a.maturity_recommendations[i];
      if (y > pageHeight - margin - 15) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.teal);
      pdf.text(`${i + 1}.`, margin, y + 2);
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(rec.title ?? `Recommendation ${i + 1}`, 70), margin + 6, y + 2);
      y += 5;

      if (rec.description) {
        y = drawBodyText(pdf, rec.description, margin + 6, y, contentWidth - 6);
      }
    }
  }

  if (a.automation_candidates && a.automation_candidates.length > 0) {
    if (y > pageHeight - margin - 20) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }
    y = drawSubheading(pdf, "Automation Opportunities", margin, y);
    for (const opp of a.automation_candidates) {
      if (y > pageHeight - margin - 15) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      pdf.setFillColor(...T.teal);
      pdf.circle(margin + 1.5, y + 2, 1.2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(opp.title ?? "Unknown", 70), margin + 5, y + 3);
      y += 5;

      if (opp.description) {
        y = drawBodyText(pdf, opp.description, margin + 5, y, contentWidth - 5);
      }
    }
  }
}

// ── Table of Contents ───────────────────────────────────────────────────────

export function renderTableOfContents(
  pdf: jsPDF,
  entries: { name: string; page: number }[],
): void {
  pdf.addPage("a4", "landscape");
  setPageBg(pdf);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = T.margin;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.h1);
  pdf.setTextColor(...T.navy);
  pdf.text("Table of Contents", margin, y);
  y += 3;
  pdf.setFillColor(...T.teal);
  pdf.rect(margin, y, Math.min(pdf.getTextWidth("Table of Contents") + 8, 120), 0.8, "F");
  y += 12;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (i % 2 === 0) {
      pdf.setFillColor(...T.surface);
      pdf.rect(margin, y - 3, contentWidth, 8, "F");
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...T.navy);
    pdf.text(entry.name, margin + 2, y);

    const nameW = pdf.getTextWidth(entry.name);
    const pageNumStr = String(entry.page);
    const pageNumW = pdf.getTextWidth(pageNumStr);
    const leaderStart = margin + 2 + nameW + 4;
    const leaderEnd = margin + contentWidth - pageNumW - 4;

    if (leaderStart < leaderEnd) {
      pdf.setFontSize(6);
      pdf.setTextColor(...T.faint);
      let dotX = leaderStart;
      while (dotX < leaderEnd) {
        pdf.text(".", dotX, y);
        dotX += 2.5;
      }
    }

    pdf.setFontSize(10);
    pdf.setTextColor(...T.teal);
    pdf.setFont("helvetica", "bold");
    pdf.text(pageNumStr, margin + contentWidth - 2, y, { align: "right" });
    pdf.setFont("helvetica", "normal");

    y += 8;
  }
}

// ── Phased Roadmap (R5 + P4) ──────────────────────────────────────────────

export interface RoadmapData {
  steps: Step[];
  sections: Section[];
}

export function renderPhasedRoadmap(pdf: jsPDF, data: RoadmapData): void {
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  // Collect steps with gaps and assign phases
  const roadmapItems = data.steps
    .map((s) => {
      const phase = derivePhase(s);
      if (phase == null) return null;
      const gapType = deriveGapType(s);
      return {
        name: s.name,
        section: s.section_id ? sectionMap.get(s.section_id) ?? "" : "",
        phase,
        current: s.maturity_score ?? 0,
        target: s.target_maturity ?? 0,
        gap: (s.target_maturity ?? 0) - (s.maturity_score ?? 0),
        gapType,
        impact: s.impact_score ?? 0,
        effort: s.effort_score ?? 0,
        isOverride: s.phase_override != null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null)
    .sort((a, b) => {
      if (a.phase !== b.phase) return a.phase - b.phase;
      return b.impact - a.impact;
    });

  if (roadmapItems.length === 0) return;

  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Phased Implementation Roadmap", margin, y);

  // Narrative
  const phase0Count = roadmapItems.filter((i) => i.phase === 0).length;
  const phase1Count = roadmapItems.filter((i) => i.phase === 1).length;
  const phase2Count = roadmapItems.filter((i) => i.phase === 2).length;
  y = drawBodyText(
    pdf,
    `${roadmapItems.length} steps require improvement, sequenced into three phases: ${phase0Count} quick wins (Phase 0), ${phase1Count} development items (Phase 1), and ${phase2Count} longer-term items (Phase 2). Phase assignment is derived from gap type and impact, with consultant overrides where strategic context warrants it.`,
    margin, y, contentWidth,
  );

  // Render by phase
  for (const phaseMeta of PHASE_META) {
    const phaseItems = roadmapItems.filter((i) => i.phase === phaseMeta.phase);
    if (phaseItems.length === 0) continue;

    // Phase header banner
    if (y + 30 > pageHeight - margin) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    // Navy banner with phase label
    pdf.setFillColor(...T.navy);
    pdf.rect(margin, y, contentWidth, 8, "F");
    pdf.setFillColor(phaseMeta.color[0], phaseMeta.color[1], phaseMeta.color[2]);
    pdf.rect(margin, y + 8, contentWidth, 1, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h3);
    pdf.setTextColor(255, 255, 255);
    pdf.text(`${phaseMeta.label}  \u2014  ${phaseMeta.timeline}`, margin + 4, y + 5.5);

    // Item count on right
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.small);
    pdf.text(`${phaseItems.length} item${phaseItems.length !== 1 ? "s" : ""}`, margin + contentWidth - 4, y + 5.5, { align: "right" });
    y += 11;

    // Table for this phase
    const cols = [
      { label: "Step", width: 70 },
      { label: "Section", width: 45 },
      { label: "Current \u2192 Target", width: 35 },
      { label: "Type", width: 28 },
      { label: "Expected Outcome", width: contentWidth - 70 - 45 - 35 - 28 },
    ];

    y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    for (let ri = 0; ri < phaseItems.length; ri++) {
      const item = phaseItems[ri];

      if (shouldBreakTable(y, pageHeight, margin, phaseItems.length - ri)) {
        ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.muted);
        pdf.text(`${phaseMeta.label} (continued)`, margin, y);
        y += 5;
        y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.tableSize);
      }

      drawStripeRow(pdf, ri, margin, y, contentWidth);
      let colX = margin + 2;

      // Step name (with override badge)
      pdf.setTextColor(...T.navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.tableSize);
      const nameStr = truncate(item.name, 40) + (item.isOverride ? " \u25CF" : "");
      pdf.text(nameStr, colX, y + 3);
      if (item.isOverride) {
        // Tiny override dot in blue
        const nameW = pdf.getTextWidth(truncate(item.name, 40) + " ");
        pdf.setFillColor(...T.blue);
        pdf.circle(colX + nameW + 1, y + 2, 0.8, "F");
      }
      colX += cols[0].width;

      // Section
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...T.muted);
      pdf.text(truncate(item.section, 26), colX, y + 3);
      colX += cols[1].width;

      // Current → Target
      pdf.setTextColor(...T.navy);
      pdf.text(`${item.current} \u2192 ${item.target}`, colX, y + 3);
      colX += cols[2].width;

      // Gap Type
      if (item.gapType === "discipline") {
        pdf.setTextColor(...T.green);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.tiny);
        pdf.text("DISCIPLINE", colX, y + 3);
      } else if (item.gapType === "complexity") {
        pdf.setTextColor(...T.amber);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.tiny);
        pdf.text("COMPLEXITY", colX, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.tableSize);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += cols[3].width;

      // Expected outcome
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.tiny);
      pdf.setTextColor(...T.body);
      const outcome = item.gapType === "discipline"
        ? `Process/training fix — close +${item.gap} gap with existing tools`
        : `Tooling/redesign — reduce gap from +${item.gap} via integration or automation`;
      pdf.text(truncate(outcome, 60), colX, y + 3);

      y += 6.5;
    }

    y += 3;
  }

  // Footer explanation
  if (y + 20 > pageHeight - margin) {
    ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
  }
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(T.small);
  pdf.setTextColor(...T.muted);
  const footerLines = pdf.splitTextToSize(
    "Phase 0 items require no engineering — they are configuration, templates, and triggers that can be implemented with existing tools. Phase 1 items require custom development. Phase 2 items are sequenced after Phase 1 dependencies are in place.",
    contentWidth,
  );
  pdf.text(footerLines, margin, y);
  y += footerLines.length * 3.5 + 4;

  // Override legend (if any overrides exist)
  const hasOverrides = roadmapItems.some((i) => i.isOverride);
  if (hasOverrides) {
    pdf.setFillColor(...T.blue);
    pdf.circle(margin + 2, y - 0.5, 0.8, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tiny);
    pdf.setTextColor(...T.muted);
    pdf.text("= phase manually overridden by consultant", margin + 5, y);
  }
}

// ── Decisions & Actions Block (R3 + P5 + P7) ─────────────────────────────

export interface DecisionsData {
  comments: Comment[];
  steps: Step[];
  sections: Section[];
}

export function renderDecisionsBlock(pdf: jsPDF, data: DecisionsData): void {
  const decisions = data.comments.filter((c) => c.category === "decision" && !c.is_resolved);

  // P7: Skip entirely when no decisions
  if (decisions.length === 0) return;

  const stepMap = new Map(data.steps.map((s) => [s.id, s]));
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  let { y, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Decisions & Actions", margin, y);

  y = drawBodyText(
    pdf,
    `${decisions.length} strategic decision${decisions.length !== 1 ? "s were" : " was"} confirmed during the mapping session. These represent commitments that shape the implementation roadmap.`,
    margin, y, contentWidth,
  );

  // Render each decision
  for (const c of decisions) {
    const step = c.commentable_type === "step" ? stepMap.get(c.commentable_id) : null;
    const sectionName = step?.section_id ? sectionMap.get(step.section_id) : null;
    const context = step ? truncate(`${step.name}${sectionName ? ` \u2014 ${sectionName}` : ""}`, 80) : "";
    const text = stripHtml(c.content ?? "");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    const textLines = pdf.splitTextToSize(text, contentWidth - 12);
    const blockH = textLines.length * 3.8 + (context ? 8 : 4);

    if (y + blockH > pageHeight - margin) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.muted);
      pdf.text("Decisions & Actions (continued)", margin, y);
      y += 6;
    }

    pdf.setFillColor(...T.blue);
    pdf.rect(margin, y, 2, blockH - 2, "F");

    if (context) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.navy);
      pdf.text(context, margin + 6, y + 3);
      y += 5;
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.body);
    pdf.text(textLines, margin + 6, y + 2);
    y += textLines.length * 3.8 + T.paraGap;
  }

  // P5: First Action line
  // Find Phase 0 item with highest impact, then lowest effort
  const phase0Items = data.steps
    .map((s) => ({ step: s, phase: derivePhase(s) }))
    .filter((item): item is { step: Step; phase: number } => item.phase === 0)
    .sort((a, b) => {
      const impactDiff = (b.step.impact_score ?? 0) - (a.step.impact_score ?? 0);
      if (impactDiff !== 0) return impactDiff;
      return (a.step.effort_score ?? 5) - (b.step.effort_score ?? 5);
    });

  // Fallback: lowest-effort Phase 1 item
  const firstAction = phase0Items[0]?.step ?? data.steps
    .map((s) => ({ step: s, phase: derivePhase(s) }))
    .filter((item): item is { step: Step; phase: number } => item.phase === 1)
    .sort((a, b) => (a.step.effort_score ?? 5) - (b.step.effort_score ?? 5))
    [0]?.step;

  if (firstAction) {
    y += 4;
    if (y + 16 > pageHeight - margin) {
      ({ y, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    // First Action hero card
    pdf.setFillColor(...T.tealBg);
    pdf.setDrawColor(...T.teal);
    pdf.setLineWidth(0.5);
    pdf.roundedRect(margin, y, contentWidth, 14, 2, 2, "FD");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.small);
    pdf.setTextColor(...T.tealDark);
    pdf.text("FIRST ACTION", margin + 4, y + 5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.body);
    const gType = deriveGapType(firstAction);
    const outcomeText = gType === "discipline"
      ? "Can be completed with existing tools — no engineering required."
      : "Requires development — highest-impact starting point.";
    pdf.text(`Implement: ${truncate(firstAction.name, 50)}. ${outcomeText}`, margin + 4, y + 11);
  }
}

import { jsPDF } from "jspdf";
import type { Section, Step, Stage, Touchpoint, Perspective, PerspectiveAnnotation, Tool, ImprovementIdea, AIAnalysisResult, Comment } from "@/types/database";
import { MATURITY_COLORS } from "@/lib/maturity";
import { PAIN_COLORS } from "@/lib/pain";

// ── Swiss Editorial Theme ───────────────────────────────────────────────────
const T = {
  navy: [23, 37, 84] as const,
  body: [51, 65, 85] as const,
  muted: [100, 116, 139] as const,
  faint: [148, 163, 184] as const,
  teal: [13, 148, 136] as const,
  tealDark: [17, 94, 89] as const,
  tealBg: [240, 253, 250] as const,
  surface: [248, 250, 252] as const,
  tableHead: [241, 245, 249] as const,
  tableStripe: [248, 250, 252] as const,
  border: [226, 232, 240] as const,
  cardBorder: [203, 213, 225] as const,
  white: [255, 255, 255] as const,
  red: [220, 38, 38] as const,
  green: [22, 163, 74] as const,
  blue: [37, 99, 235] as const,
  amber: [217, 119, 6] as const,
  margin: 20,
  h1: 16,
  h2: 12,
  h3: 10.5,
  bodySize: 9.5,
  small: 8,
  tiny: 7,
  tableSize: 8,
  tableHeadSize: 7.5,
  lineH: 4.2,
  paraGap: 6,
} as const;

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#16A34A",
  neutral: "#6B7280",
  negative: "#DC2626",
};

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface StepRoleForExport {
  step_id: string;
  role: { hourly_rate: number | null };
}

export interface ExecutiveSummaryData {
  sections: Section[];
  steps: Step[];
  stepRoles: StepRoleForExport[];
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

// ── Helpers ─────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [100, 100, 100];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function setPageBg(pdf: jsPDF) {
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pdf.setFillColor(...T.white);
  pdf.rect(0, 0, w, h, "F");
}

function addCleanPage(pdf: jsPDF): { y: number; pageWidth: number; pageHeight: number; margin: number; contentWidth: number } {
  pdf.addPage("a4", "landscape");
  setPageBg(pdf);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = T.margin;
  return { y: margin, pageWidth, pageHeight, margin, contentWidth: pageWidth - margin * 2 };
}

function drawSectionTitle(pdf: jsPDF, title: string, margin: number, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.h1);
  pdf.setTextColor(...T.navy);
  pdf.text(title, margin, y);
  y += 2;
  pdf.setFillColor(...T.teal);
  pdf.rect(margin, y, 40, 0.6, "F");
  return y + 6;
}

function drawSubheading(pdf: jsPDF, title: string, margin: number, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.h2);
  pdf.setTextColor(...T.navy);
  pdf.text(title, margin, y);
  return y + 5;
}

function drawBodyText(pdf: jsPDF, text: string, margin: number, y: number, contentWidth: number): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.bodySize);
  pdf.setTextColor(...T.body);
  const lines = pdf.splitTextToSize(text, contentWidth);
  pdf.text(lines, margin, y);
  return y + lines.length * T.lineH + T.paraGap;
}

function drawTableHeaderRow(
  pdf: jsPDF,
  cols: { label: string; width: number }[],
  margin: number,
  contentWidth: number,
  y: number,
): number {
  pdf.setFillColor(...T.tableHead);
  pdf.rect(margin, y, contentWidth, 7, "F");
  pdf.setDrawColor(...T.border);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y + 7, margin + contentWidth, y + 7);
  let hX = margin + 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.tableHeadSize);
  pdf.setTextColor(...T.muted);
  for (const col of cols) {
    if (col.label) pdf.text(col.label.toUpperCase(), hX, y + 4.5);
    hX += col.width;
  }
  return y + 8;
}

function drawStripeRow(pdf: jsPDF, rowIndex: number, margin: number, y: number, contentWidth: number) {
  if (rowIndex % 2 === 0) {
    pdf.setFillColor(...T.tableStripe);
    pdf.rect(margin, y - 1.5, contentWidth, 6.5, "F");
  }
  pdf.setDrawColor(...T.border);
  pdf.setLineWidth(0.1);
  pdf.line(margin, y + 5, margin + contentWidth, y + 5);
}

function newTablePageClean(
  pdf: jsPDF,
  title: string,
  cols: { label: string; width: number }[],
  margin: number,
  contentWidth: number,
): number {
  pdf.addPage("a4", "landscape");
  setPageBg(pdf);
  let y = margin;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.small);
  pdf.setTextColor(...T.muted);
  pdf.text(`${title} (continued)`, margin, y);
  y += 5;
  y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.tableSize);
  return y;
}

function drawStatCard(pdf: jsPDF, x: number, y: number, w: number, h: number, value: string, label: string) {
  pdf.setDrawColor(...T.cardBorder);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, w, h, 1.5, 1.5, "S");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...T.navy);
  pdf.text(value, x + w / 2, y + h * 0.55, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6);
  pdf.setTextColor(...T.muted);
  pdf.text(label, x + w / 2, y + h * 0.85, { align: "center" });
}

function buildRolesMap(stepRoles: StepRoleForExport[]): Map<string, StepRoleForExport[]> {
  const map = new Map<string, StepRoleForExport[]>();
  for (const sr of stepRoles) {
    const existing = map.get(sr.step_id);
    if (existing) existing.push(sr);
    else map.set(sr.step_id, [sr]);
  }
  return map;
}

function computeStepCost(step: Step, rolesMap: Map<string, StepRoleForExport[]>): number {
  if (!step.time_minutes || !step.frequency_per_month) return 0;
  const monthlyHours = (step.time_minutes * step.frequency_per_month) / 60;
  const roles = rolesMap.get(step.id) ?? [];
  const withRate = roles.filter((r) => r.role.hourly_rate != null);
  if (withRate.length === 0) return 0;
  const avgRate = withRate.reduce((sum, r) => sum + Number(r.role.hourly_rate), 0) / withRate.length;
  return monthlyHours * avgRate;
}

// ── Executive Summary ───────────────────────────────────────────────────────

export function renderExecutiveSummary(pdf: jsPDF, data: ExecutiveSummaryData): void {
  const { y: startY, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
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
  const rolesMap = buildRolesMap(data.stepRoles);
  const totalMonthlyCost = data.steps.reduce((sum, s) => sum + computeStepCost(s, rolesMap), 0);
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

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
      // Teal accent callout box
      pdf.setFillColor(...T.tealBg);
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
      // Left accent bar
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
      const pct = Math.round((sectionEfforts[0].hours / totalMonthlyHours) * 100);
      costPara.push(`"${sectionEfforts[0].name}" consumes ${pct}% of total effort \u2014 the primary target for efficiency gains.`);
    }

    y = drawBodyText(pdf, costPara.join(" "), margin, y, contentWidth);
  }

  // Metric cards row
  const metrics = [
    { label: "PHASES", value: String(data.sections.length) },
    { label: "STEPS", value: String(data.steps.length) },
    { label: "AVG MATURITY", value: avgMaturity != null ? avgMaturity.toFixed(1) : "\u2014" },
    { label: "BELOW TARGET", value: String(stepsBelowTarget) },
    { label: "MONTHLY HOURS", value: totalMonthlyHours > 0 ? `${totalMonthlyHours.toFixed(1)}h` : "\u2014" },
    { label: "MONTHLY COST", value: totalMonthlyCost > 0 ? `$${formatCurrency(totalMonthlyCost)}` : "\u2014" },
  ];

  const cardW = 40;
  const cardGap = 3;
  const cardH = 14;
  metrics.forEach((m, i) => {
    drawStatCard(pdf, margin + i * (cardW + cardGap), y, cardW, cardH, m.value, m.label);
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
}

// ── Process Narrative ───────────────────────────────────────────────────────

export function renderProcessNarrative(pdf: jsPDF, data: ProcessNarrativeData): void {
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
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
      ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    // Phase header with teal accent
    pdf.setFillColor(...T.teal);
    pdf.rect(margin, y, contentWidth, 0.6, "F");
    y += 4;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h2);
    pdf.setTextColor(...T.navy);
    pdf.text(section.name, margin, y + 2);
    y += 6;

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
      // Split notes at the RENDER font size (bodySize 9.5pt) — not the current font
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
      // Split comments at the RENDER font size (small 8pt)
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.small);
      for (const c of commentBlocks) {
        const cText = stripHtml(c.content);
        const cLines = pdf.splitTextToSize(cText, contentWidth - 14);
        blockH += 4 + cLines.length * 3.5;
      }
      blockH += 5; // gap

      if (y + blockH > pageHeight - margin) {
        ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
        // Continuation header
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.muted);
        pdf.text(`${section.name} (continued)`, margin, y);
        y += 6;
      }

      // Step name
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.h3);
      pdf.setTextColor(...T.navy);
      pdf.text(step.name, margin + 2, y + 3);
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
      pdf.text(statusParts.join("  \u00B7  "), margin + 2, y + 1);
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
      for (const c of commentBlocks) {
        const cText = stripHtml(c.content);
        const cLines = pdf.splitTextToSize(cText, contentWidth - 14);

        const categoryColors: Record<string, readonly [number, number, number]> = {
          decision: T.blue,
          pain_point: T.red,
          idea: T.green,
          question: T.amber,
          note: T.muted,
        };
        const tagColor = categoryColors[c.category] ?? T.muted;

        // Left accent bar
        pdf.setFillColor(...tagColor);
        pdf.rect(margin + 5, y + 0.5, 1.5, cLines.length * 3.5 + 3, "F");

        // Category label
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(...tagColor);
        pdf.text(capitalize(c.category.replace(/_/g, " ")), margin + 9, y + 3);
        y += 4;

        // Comment text
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.body);
        pdf.text(cLines, margin + 9, y + 1);
        y += cLines.length * 3.5;
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
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.navy);
      pdf.text(step.name, T.margin + 2, y + 2);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.muted);
      pdf.text(formatStatus(step.status), T.margin + 2 + pdf.getTextWidth(step.name) + 4, y + 2);
      y += 6;
    }
  }
}

// ── Key Findings & Decisions ────────────────────────────────────────────────

export function renderKeyFindings(pdf: jsPDF, data: KeyFindingsData): void {
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Key Findings & Decisions", margin, y);

  const decisions = data.comments.filter((c) => c.category === "decision" && !c.is_resolved);
  const painPoints = data.comments.filter((c) => c.category === "pain_point" && !c.is_resolved);
  const stepMap = new Map(data.steps.map((s) => [s.id, s]));
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  // Intro
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
      const context = step ? `${step.name}${sectionName ? ` \u2014 ${sectionName}` : ""}` : "";
      const text = stripHtml(c.content);
      const textLines = pdf.splitTextToSize(text, contentWidth - 12);
      const blockH = textLines.length * 3.8 + (context ? 8 : 4);

      if (y + blockH > pageHeight - margin) {
        ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.muted);
        pdf.text("Key Findings & Decisions (continued)", margin, y);
        y += 6;
      }

      // Left accent bar
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
      ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    y = drawSubheading(pdf, "Pain Points", margin, y);

    for (const c of painPoints) {
      const step = c.commentable_type === "step" ? stepMap.get(c.commentable_id) : null;
      const sectionName = step?.section_id ? sectionMap.get(step.section_id) : null;
      const context = step ? `${step.name}${sectionName ? ` \u2014 ${sectionName}` : ""}` : "";
      const text = stripHtml(c.content);
      const textLines = pdf.splitTextToSize(text, contentWidth - 12);
      const blockH = textLines.length * 3.8 + (context ? 8 : 4);

      if (y + blockH > pageHeight - margin) {
        ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
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
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Journey Map", margin, y);
  const stageMap = new Map(data.stages.map((s) => [s.id, s.name]));

  if (data.canvasElement) {
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(data.canvasElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            const cl = node.classList;
            if (cl?.contains("react-flow__controls") || cl?.contains("react-flow__minimap") || cl?.contains("react-flow__panel")) return false;
          }
          return true;
        },
      });
      const avH = pageHeight - y - margin;
      const img = new Image();
      await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = dataUrl; });
      const imgAspect = img.width / img.height;
      const boxAspect = contentWidth / avH;
      let imgW: number, imgH: number;
      if (imgAspect > boxAspect) { imgW = contentWidth; imgH = contentWidth / imgAspect; }
      else { imgH = avH; imgW = avH * imgAspect; }
      pdf.setDrawColor(...T.border);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, y, imgW, imgH, "S");
      pdf.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
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
      if (y > pageHeight - margin - 5) {
        y = newTablePageClean(pdf, "Journey Map", cols, margin, contentWidth);
      }
      drawStripeRow(pdf, si, margin, y, contentWidth);
      const stageTps = data.touchpoints.filter((tp) => tp.stage_id === stage.id);
      const avgPain = stageTps.filter((tp) => tp.pain_score != null).length > 0
        ? (stageTps.filter((tp) => tp.pain_score != null).reduce((sum, tp) => sum + tp.pain_score!, 0) / stageTps.filter((tp) => tp.pain_score != null).length).toFixed(1)
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
      // Truncate based on actual column pixel width, not character count
      const lastColW = cols[5].width - 4;
      let displayNames = tpNames;
      while (pdf.getTextWidth(displayNames) > lastColW && displayNames.length > 10) {
        displayNames = displayNames.slice(0, displayNames.length - 4) + "\u2026";
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
  ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
  y = drawSectionTitle(pdf, "Touchpoint Details", margin, y);

  y = drawBodyText(pdf, "Each touchpoint represents a moment where the customer interacts with the business. Pain scores (1\u20135) indicate friction level, gain scores indicate perceived value.", margin, y, contentWidth);

  const cols = [
    { label: "Touchpoint", width: 65 },
    { label: "Stage", width: 50 },
    { label: "Sentiment", width: 30 },
    { label: "Pain", width: 22 },
    { label: "Gain", width: 22 },
    { label: "Emotion", width: 45 },
    { label: "Notes", width: contentWidth - 65 - 50 - 30 - 22 - 22 - 45 },
  ];

  y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);

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
    if (y > pageHeight - margin - 5) {
      y = newTablePageClean(pdf, "Touchpoint Details", cols, margin, contentWidth);
    }
    drawStripeRow(pdf, rowIndex, margin, y, contentWidth);
    let colX = margin + 2;

    pdf.setTextColor(...T.navy);
    pdf.text(truncate(tp.name, 38), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(...T.muted);
    pdf.text(truncate(tp.stage_id ? stageMap.get(tp.stage_id) ?? "\u2014" : "\u2014", 28), colX, y + 3);
    colX += cols[1].width;

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
    colX += cols[2].width;

    // Pain with color
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
    colX += cols[3].width;

    if (tp.gain_score != null) {
      pdf.setTextColor(...T.green);
      pdf.text(String(tp.gain_score), colX, y + 3);
    } else {
      pdf.setTextColor(...T.faint);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += cols[4].width;

    // Emotion + customer_emotion
    pdf.setTextColor(...T.body);
    const emotionParts: string[] = [];
    if (tp.customer_emotion) emotionParts.push(tp.customer_emotion);
    const emotionText = emotionParts.join(" \u2014 ") || "\u2014";
    pdf.text(truncate(emotionText, 26), colX, y + 3);
    colX += cols[5].width;

    pdf.setTextColor(...T.faint);
    pdf.text(truncate(tp.notes ?? "\u2014", 18), colX, y + 3);

    y += 6.5;
  }
}

// ── Journey Sentiment ───────────────────────────────────────────────────────

export function renderJourneySentiment(pdf: jsPDF, data: JourneySentimentData): void {
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
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

  y = drawBodyText(
    pdf,
    `Across ${tps.length} touchpoints with sentiment data: ${positive} positive (${Math.round((positive / tps.length) * 100)}%), ${neutral} neutral (${Math.round((neutral / tps.length) * 100)}%), and ${negative} negative (${Math.round((negative / tps.length) * 100)}%). Negative touchpoints represent the highest-priority experience improvements.`,
    margin, y, contentWidth,
  );

  // Sentiment distribution bar
  const barWidth = contentWidth * 0.6;
  const barH = 6;
  const total = positive + neutral + negative || 1;
  let bx = margin;
  if (positive > 0) {
    const w = (positive / total) * barWidth;
    pdf.setFillColor(22, 163, 74);
    pdf.roundedRect(bx, y, w, barH, 1, 1, "F");
    bx += w;
  }
  if (neutral > 0) {
    const w = (neutral / total) * barWidth;
    pdf.setFillColor(107, 114, 128);
    pdf.rect(bx, y, w, barH, "F");
    bx += w;
  }
  if (negative > 0) {
    const w = (negative / total) * barWidth;
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
  const maxPain = scoredTps.length > 0 ? Math.max(...scoredTps.map((tp) => tp.pain_score!)) : 0;
  const highPain = scoredTps.filter((tp) => tp.pain_score! >= 4).length;

  const stats = [
    { label: "TOUCHPOINTS", value: String(tps.length) },
    { label: "HIGH PAIN (4-5)", value: String(highPain) },
    { label: "AVG PAIN", value: avgPain },
    { label: "MAX PAIN", value: String(maxPain) },
  ];

  const cardW = 42;
  const cardGap = 4;
  stats.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (cardW + cardGap), y, cardW, 14, stat.value, stat.label);
  });
  y += 20;

  // Sentiment table sorted by pain
  const sortedByPain = [...tps].sort((a, b) => (b.pain_score ?? 0) - (a.pain_score ?? 0));

  const cols = [
    { label: "Touchpoint", width: 70 },
    { label: "Stage", width: 55 },
    { label: "Pain", width: 22 },
    { label: "Sentiment", width: 30 },
    { label: "Emotion", width: 55 },
    { label: "", width: contentWidth - 70 - 55 - 22 - 30 - 55 },
  ];

  y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.tableSize);

  for (let ri = 0; ri < sortedByPain.length; ri++) {
    const tp = sortedByPain[ri];
    if (y > pageHeight - margin - 5) {
      y = newTablePageClean(pdf, "Journey Sentiment", cols, margin, contentWidth);
    }
    drawStripeRow(pdf, ri, margin, y, contentWidth);

    let colX = margin + 2;
    pdf.setTextColor(...T.navy);
    pdf.text(truncate(tp.name, 40), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(...T.muted);
    pdf.text(truncate(tp.stage_id ? stageMap.get(tp.stage_id) ?? "\u2014" : "\u2014", 32), colX, y + 3);
    colX += cols[1].width;

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
    colX += cols[2].width;

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
    colX += cols[3].width;

    // Emotion + bar
    pdf.setTextColor(...T.body);
    const emotionText = tp.customer_emotion
      ? tp.customer_emotion
      : "\u2014";
    pdf.text(truncate(emotionText, 32), colX, y + 3);
    colX += cols[4].width;

    // Sentiment bar
    if (tp.pain_score != null && maxPain > 0) {
      const barMaxW = cols[5].width - 4;
      const barW = (tp.pain_score / maxPain) * barMaxW;
      const sColor = SENTIMENT_COLORS[tp.sentiment ?? "neutral"] ?? "#6B7280";
      const [r, g, b] = hexToRgb(sColor);
      pdf.setFillColor(r, g, b);
      pdf.roundedRect(colX, y + 0.5, barW, 3, 1, 1, "F");
    }

    y += 6.5;
  }
}

// ── Perspective Comparison ──────────────────────────────────────────────────

export function renderPerspectiveComparison(pdf: jsPDF, data: PerspectiveComparisonData): void {
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
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
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  // Build comparison by annotatable element
  type ByElement = { stepName: string; ratingA?: number; ratingB?: number; contentA?: string; contentB?: string };
  const byElement = new Map<string, ByElement>();

  for (const ann of data.annotations) {
    const key = `${ann.annotatable_type}:${ann.annotatable_id}`;
    // Resolve name: steps by lookup, other types by their ID
    let resolvedName: string | undefined;
    if (ann.annotatable_type === "step") {
      resolvedName = stepMap.get(ann.annotatable_id)?.name;
    }
    // Skip annotations we can't resolve to a human-readable name
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

  // Rating comparison table
  const entries = [...byElement.values()]
    .filter((e) => e.ratingA != null || e.ratingB != null)
    .sort((a, b) => {
      const divA = (a.ratingA != null && a.ratingB != null) ? Math.abs(a.ratingA - a.ratingB) : 0;
      const divB = (b.ratingA != null && b.ratingB != null) ? Math.abs(b.ratingA - b.ratingB) : 0;
      return divB - divA;
    });

  if (entries.length > 0) {
    const cols = [
      { label: "Element", width: contentWidth - 50 - 50 - 40 },
      { label: pA.name, width: 50 },
      { label: pB.name, width: 50 },
      { label: "Divergence", width: 40 },
    ];

    y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    for (let ri = 0; ri < entries.length; ri++) {
      const e = entries[ri];
      if (y > pageHeight - margin - 5) {
        y = newTablePageClean(pdf, "Perspective Comparison", cols, margin, contentWidth);
      }
      drawStripeRow(pdf, ri, margin, y, contentWidth);

      let colX = margin + 2;
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(e.stepName, 55), colX, y + 3);
      colX += cols[0].width;

      // Rating A with color
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

      // Rating B with color
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

  // Annotation Details page
  const annotatedEntries = [...byElement.values()].filter((e) => e.contentA || e.contentB);
  if (annotatedEntries.length > 0) {
    ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    y = drawSectionTitle(pdf, "Annotation Details", margin, y);
    y = drawBodyText(pdf, "Observations recorded during the perspective assessment, showing how each viewpoint interprets the same process element.", margin, y, contentWidth);

    for (const entry of annotatedEntries) {
      // Estimate height
      let blockH = 8;
      if (entry.contentA) {
        const lA = pdf.splitTextToSize(entry.contentA, contentWidth - 12);
        blockH += lA.length * 3.5 + 6;
      }
      if (entry.contentB) {
        const lB = pdf.splitTextToSize(entry.contentB, contentWidth - 12);
        blockH += lB.length * 3.5 + 6;
      }

      if (y + blockH > pageHeight - margin) {
        ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      // Element name
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.h3);
      pdf.setTextColor(...T.navy);
      pdf.text(entry.stepName, margin, y + 3);
      y += 7;

      // Perspective A content
      if (entry.contentA) {
        const [r, g, b] = hexToRgb(pA.color);
        pdf.setFillColor(r, g, b);
        pdf.rect(margin + 3, y, 1.5, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.small);
        pdf.setTextColor(r, g, b);
        pdf.text(pA.name, margin + 7, y + 3);
        y += 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.bodySize);
        pdf.setTextColor(...T.body);
        const linesA = pdf.splitTextToSize(entry.contentA, contentWidth - 12);
        pdf.text(linesA, margin + 7, y + 1);
        y += linesA.length * 3.5 + 2;
      }

      // Perspective B content
      if (entry.contentB) {
        const [r, g, b] = hexToRgb(pB.color);
        pdf.setFillColor(r, g, b);
        pdf.rect(margin + 3, y, 1.5, 4, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.small);
        pdf.setTextColor(r, g, b);
        pdf.text(pB.name, margin + 7, y + 3);
        y += 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.bodySize);
        pdf.setTextColor(...T.body);
        const linesB = pdf.splitTextToSize(entry.contentB, contentWidth - 12);
        pdf.text(linesB, margin + 7, y + 1);
        y += linesB.length * 3.5 + 2;
      }

      y += T.paraGap;
    }
  }
}

// ── Prioritization Matrix ───────────────────────────────────────────────────

export function renderPrioritizationMatrix(pdf: jsPDF, data: { steps: Step[]; sections: Section[] }): void {
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Prioritization Matrix", margin, y);

  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));
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
  const stats = [
    { label: "SCORED STEPS", value: String(scored.length) },
    { label: "QUICK WINS", value: String(quickWins) },
    { label: "MAJOR PROJECTS", value: String(majorProjects) },
    { label: "THANKLESS TASKS", value: String(thankless) },
  ];
  const cardW = 42;
  const cardGap = 4;
  stats.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (cardW + cardGap), y, cardW, 14, stat.value, stat.label);
  });
  y += 20;

  // Sort: Quick Wins first, then by impact desc
  const quadrantOrder: Record<string, number> = { "Quick Win": 0, "Major Project": 1, "Fill In": 2, "Thankless Task": 3 };
  const sorted = [...scored].sort((a, b) => {
    const qA = quadrantOrder[getQuadrant(a.effort_score!, a.impact_score!)] ?? 9;
    const qB = quadrantOrder[getQuadrant(b.effort_score!, b.impact_score!)] ?? 9;
    if (qA !== qB) return qA - qB;
    return b.impact_score! - a.impact_score!;
  });

  const cols = [
    { label: "Step", width: 80 },
    { label: "Section", width: 60 },
    { label: "Effort", width: 25 },
    { label: "Impact", width: 25 },
    { label: "Quadrant", width: contentWidth - 80 - 60 - 25 - 25 },
  ];

  y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.tableSize);

  for (let ri = 0; ri < sorted.length; ri++) {
    const step = sorted[ri];
    if (y > pageHeight - margin - 5 && (sorted.length - ri) > 3) {
      y = newTablePageClean(pdf, "Prioritization Matrix", cols, margin, contentWidth);
    }
    drawStripeRow(pdf, ri, margin, y, contentWidth);

    let colX = margin + 2;
    pdf.setTextColor(...T.navy);
    pdf.text(truncate(step.name, 48), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(...T.muted);
    pdf.text(truncate(step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014", 35), colX, y + 3);
    colX += cols[1].width;

    pdf.setTextColor(...T.navy);
    pdf.text(String(step.effort_score), colX, y + 3);
    colX += cols[2].width;

    pdf.text(String(step.impact_score), colX, y + 3);
    colX += cols[3].width;

    const quadrant = getQuadrant(step.effort_score!, step.impact_score!);
    const qColors: Record<string, readonly [number, number, number]> = {
      "Quick Win": T.green,
      "Major Project": T.blue,
      "Fill In": T.amber,
      "Thankless Task": T.red,
    };
    const qColor = qColors[quadrant] ?? T.muted;
    pdf.setFillColor(...qColor);
    pdf.circle(colX + 1.5, y + 2, 1.2, "F");
    pdf.setTextColor(...T.navy);
    pdf.text(quadrant, colX + 5, y + 3);

    y += 6.5;
  }
}

// ── Tool Landscape ──────────────────────────────────────────────────────────

export function renderToolLandscape(pdf: jsPDF, data: { tools: Tool[] }): void {
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "Tool Landscape", margin, y);

  if (data.tools.length === 0) {
    y = drawBodyText(pdf, "No tools have been added to this workspace.", margin, y, contentWidth);
    return;
  }

  const activeTools = data.tools.filter((t) => t.status === "active");
  const totalCost = data.tools.reduce((sum, t) => sum + (t.cost_per_month ?? 0), 0);
  const considering = data.tools.filter((t) => t.status === "considering").length;

  y = drawBodyText(
    pdf,
    `The process relies on ${data.tools.length} tools: ${activeTools.length} active${considering > 0 ? `, ${considering} under consideration` : ""}. Total monthly tooling cost: $${formatCurrency(totalCost)}.`,
    margin, y, contentWidth,
  );

  const stats = [
    { label: "TOTAL TOOLS", value: String(data.tools.length) },
    { label: "ACTIVE", value: String(activeTools.length) },
    { label: "CONSIDERING", value: String(considering) },
    { label: "MONTHLY COST", value: `$${formatCurrency(totalCost)}` },
  ];
  const cardW = 42;
  stats.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (cardW + 4), y, cardW, 14, stat.value, stat.label);
  });
  y += 20;

  const cols = [
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
    if (y > pageHeight - margin - 5) {
      y = newTablePageClean(pdf, "Tool Landscape", cols, margin, contentWidth);
    }
    drawStripeRow(pdf, ri, margin, y, contentWidth);

    let colX = margin + 2;
    pdf.setTextColor(...T.navy);
    pdf.text(truncate(tool.name, 35), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(...T.muted);
    pdf.text(truncate(tool.category ?? "\u2014", 25), colX, y + 3);
    colX += cols[1].width;

    pdf.text(truncate(tool.vendor ?? "\u2014", 28), colX, y + 3);
    colX += cols[2].width;

    const statusColor = tool.status === "active" ? T.green : tool.status === "considering" ? T.amber : T.muted;
    pdf.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    pdf.circle(colX + 1.5, y + 2, 1.2, "F");
    pdf.setTextColor(...T.navy);
    pdf.text(capitalize(tool.status ?? "\u2014"), colX + 5, y + 3);
    colX += cols[3].width;

    pdf.setTextColor(...T.navy);
    pdf.text(tool.cost_per_month ? `$${formatCurrency(tool.cost_per_month)}` : "\u2014", colX, y + 3);

    y += 6.5;
  }
}

// ── Improvements ────────────────────────────────────────────────────────────

export function renderImprovements(pdf: jsPDF, data: { ideas: ImprovementIdea[] }): void {
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
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

  for (const idea of data.ideas) {
    const desc = idea.description ? stripHtml(idea.description) : "";
    // Split description at the RENDER font size (bodySize 9.5pt)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    const descLines = desc ? pdf.splitTextToSize(desc, contentWidth - 8) : [];
    const blockH = 10 + (descLines.length > 0 ? descLines.length * 3.8 + 3 : 0);

    if (y + blockH > pageHeight - margin) {
      ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }

    // Idea title with priority indicator
    const pColor = priorityColors[idea.priority ?? "medium"] ?? T.muted;
    pdf.setFillColor(...pColor);
    pdf.circle(margin + 2, y + 2, 1.5, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h3);
    pdf.setTextColor(...T.navy);
    pdf.text(truncate(idea.title, 80), margin + 6, y + 3);
    y += 5;

    // Priority + status metadata on its own line
    const meta: string[] = [];
    if (idea.priority) meta.push(capitalize(idea.priority));
    if (idea.status) meta.push(formatStatus(idea.status));
    if (meta.length > 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.muted);
      pdf.text(meta.join(" \u00B7 "), margin + 6, y + 2);
    }
    y += 4;

    // Description
    if (descLines.length > 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      pdf.text(descLines, margin + 6, y + 1);
      y += descLines.length * 3.8 + 2;
    }

    // Separator
    pdf.setDrawColor(...T.border);
    pdf.setLineWidth(0.15);
    pdf.line(margin, y + 1, margin + contentWidth * 0.25, y + 1);
    y += T.paraGap;
  }
}

// ── AI Insights ─────────────────────────────────────────────────────────────

export function renderAIInsights(pdf: jsPDF, data: { analysis: AIAnalysisResult }): void {
  let { y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf);
  y = drawSectionTitle(pdf, "AI Analysis", margin, y);

  const a = data.analysis;

  // Bottlenecks
  if (a.bottlenecks && a.bottlenecks.length > 0) {
    y = drawSubheading(pdf, "Bottlenecks", margin, y);
    for (const b of a.bottlenecks) {
      if (y > pageHeight - margin - 15) {
        ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      pdf.setFillColor(...T.red);
      pdf.rect(margin, y, 2, 4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.navy);
      pdf.text(b.title ?? "Unknown step", margin + 5, y + 3);
      y += 5;

      if (b.description) {
        y = drawBodyText(pdf, b.description, margin + 5, y, contentWidth - 5);
      }
    }
  }

  // Redundancies
  if (a.redundancies && a.redundancies.length > 0) {
    if (y > pageHeight - margin - 20) {
      ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }
    y = drawSubheading(pdf, "Redundancies", margin, y);
    for (const r of a.redundancies) {
      if (y > pageHeight - margin - 15) {
        ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      pdf.setFillColor(...T.amber);
      pdf.rect(margin, y, 2, 4, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.navy);
      pdf.text(r.title ?? "Unknown", margin + 5, y + 3);
      y += 5;

      if (r.description) {
        y = drawBodyText(pdf, r.description, margin + 5, y, contentWidth - 5);
      }
    }
  }

  // Maturity Recommendations
  if (a.maturity_recommendations && a.maturity_recommendations.length > 0) {
    if (y > pageHeight - margin - 20) {
      ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }
    y = drawSubheading(pdf, "Recommendations", margin, y);
    for (let i = 0; i < a.maturity_recommendations.length; i++) {
      const rec = a.maturity_recommendations[i];
      if (y > pageHeight - margin - 15) {
        ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.teal);
      pdf.text(`${i + 1}.`, margin, y + 2);
      pdf.setTextColor(...T.navy);
      pdf.text(rec.title ?? `Recommendation ${i + 1}`, margin + 6, y + 2);
      y += 5;

      if (rec.description) {
        y = drawBodyText(pdf, rec.description, margin + 6, y, contentWidth - 6);
      }
    }
  }

  // Automation Candidates
  if (a.automation_candidates && a.automation_candidates.length > 0) {
    if (y > pageHeight - margin - 20) {
      ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
    }
    y = drawSubheading(pdf, "Automation Opportunities", margin, y);
    for (const opp of a.automation_candidates) {
      if (y > pageHeight - margin - 15) {
        ({ y, pageWidth, pageHeight, margin, contentWidth } = addCleanPage(pdf));
      }

      pdf.setFillColor(...T.teal);
      pdf.circle(margin + 1.5, y + 2, 1.2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.navy);
      pdf.text(opp.title ?? "Unknown", margin + 5, y + 3);
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
  y += 2;
  pdf.setFillColor(...T.teal);
  pdf.rect(margin, y, 40, 0.6, "F");
  y += 10;

  for (const entry of entries) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.navy);
    pdf.text(entry.name, margin, y);

    // Dotted leader
    const nameW = pdf.getTextWidth(entry.name);
    const pageNumStr = String(entry.page);
    const pageNumW = pdf.getTextWidth(pageNumStr);
    const leaderStart = margin + nameW + 3;
    const leaderEnd = margin + contentWidth - pageNumW - 3;

    pdf.setFontSize(6);
    pdf.setTextColor(...T.faint);
    let dotX = leaderStart;
    while (dotX < leaderEnd) {
      pdf.text(".", dotX, y);
      dotX += 2;
    }

    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.muted);
    pdf.text(pageNumStr, margin + contentWidth, y, { align: "right" });

    // Subtle separator
    pdf.setDrawColor(...T.border);
    pdf.setLineWidth(0.1);
    pdf.line(margin, y + 2, margin + contentWidth, y + 2);

    y += 7;
  }
}

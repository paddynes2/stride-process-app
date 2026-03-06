import { jsPDF } from "jspdf";
import type { Section, Step, Stage, Touchpoint, Perspective, PerspectiveAnnotation, Tool, ImprovementIdea, AIAnalysisResult, Comment } from "@/types/database";
import { MATURITY_COLORS } from "@/lib/maturity";
import { PAIN_COLORS } from "@/lib/pain";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22C55E",
  neutral: "#6B7280",
  negative: "#EF4444",
};

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [255, 255, 255];
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

function drawTableHeader(
  pdf: jsPDF,
  cols: { label: string; width: number }[],
  marginVal: number,
  contentWidth: number,
  y: number,
): number {
  pdf.setFillColor(20, 20, 21);
  pdf.rect(marginVal, y, contentWidth, 7, "F");
  let hX = marginVal + 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255, 76);
  for (const col of cols) {
    if (col.label) pdf.text(col.label.toUpperCase(), hX, y + 4.5);
    hX += col.width;
  }
  return y + 7;
}

function newTablePage(
  pdf: jsPDF,
  title: string,
  cols: { label: string; width: number }[],
  marginVal: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number,
): number {
  pdf.addPage("a4", "landscape");
  let y = marginVal;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(`${title} (continued)`, marginVal, y);
  y += 5;
  y = drawTableHeader(pdf, cols, marginVal, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  return y;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

// ── Executive Summary ─────────────────────────────────────────────────────────

export function renderExecutiveSummary(pdf: jsPDF, data: ExecutiveSummaryData): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  pdf.addPage("a4", "landscape");
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Executive Summary", margin, y);
  y += 10;

  // Compute metrics
  const scoredSteps = data.steps.filter((s) => s.maturity_score != null);
  const avgMaturity =
    scoredSteps.length > 0
      ? scoredSteps.reduce((sum, s) => sum + s.maturity_score!, 0) / scoredSteps.length
      : null;
  const stepsWithTarget = data.steps.filter(
    (s) => s.maturity_score != null && s.target_maturity != null,
  );
  const stepsBelowTarget = stepsWithTarget.filter(
    (s) => s.maturity_score! < s.target_maturity!,
  ).length;
  const totalMonthlyHours = data.steps.reduce((sum, s) => {
    if (s.time_minutes && s.frequency_per_month)
      return sum + (s.time_minutes * s.frequency_per_month) / 60;
    return sum;
  }, 0);
  const rolesMap = buildRolesMap(data.stepRoles);
  const totalMonthlyCost = data.steps.reduce((sum, s) => sum + computeStepCost(s, rolesMap), 0);

  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  // ── Business Context (narrative paragraph) ──
  {
    const liveSteps = data.steps.filter((s) => s.status === "live").length;
    const draftSteps = data.steps.filter((s) => s.status === "draft").length;
    const testingSteps = data.steps.filter((s) => s.status === "testing").length;
    const inProgressSteps = data.steps.filter((s) => s.status === "in_progress").length;

    const para: string[] = [];
    para.push(`This report documents a process spanning ${data.sections.length} distinct phase${data.sections.length !== 1 ? "s" : ""} and ${data.steps.length} operational step${data.steps.length !== 1 ? "s" : ""}.`);

    if (liveSteps > 0 || draftSteps > 0) {
      const statusParts: string[] = [];
      if (liveSteps > 0) statusParts.push(`${liveSteps} live`);
      if (inProgressSteps > 0) statusParts.push(`${inProgressSteps} in progress`);
      if (testingSteps > 0) statusParts.push(`${testingSteps} in testing`);
      if (draftSteps > 0) statusParts.push(`${draftSteps} still in draft`);
      para.push(`Of these steps, ${statusParts.join(", ")}.`);
    }

    if (avgMaturity != null) {
      const maturityLabel = avgMaturity >= 4 ? "strong" : avgMaturity >= 3 ? "moderate" : avgMaturity >= 2 ? "developing" : "early-stage";
      para.push(`The overall process maturity is ${maturityLabel} at ${avgMaturity.toFixed(1)} out of 5.`);
      if (stepsBelowTarget > 0) {
        para.push(`${stepsBelowTarget} step${stepsBelowTarget !== 1 ? "s fall" : " falls"} short of ${stepsBelowTarget !== 1 ? "their" : "its"} target maturity, representing the primary opportunities for improvement.`);
      }
    }

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 180);
    const paraLines = pdf.splitTextToSize(para.join(" "), contentWidth);
    pdf.text(paraLines, margin, y);
    y += paraLines.length * 3.5 + 4;
  }

  // ── Key Finding (narrative paragraph) ──
  {
    const gapStepsAll = stepsWithTarget
      .map((s) => ({ ...s, gap: s.target_maturity! - s.maturity_score! }))
      .filter((s) => s.gap > 0)
      .sort((a, b) => b.gap - a.gap);

    if (gapStepsAll.length > 0) {
      const topGap = gapStepsAll[0];
      const topGapSection = topGap.section_id ? sectionMap.get(topGap.section_id) : null;
      const finding: string[] = [];
      finding.push(`The largest maturity gap is in "${topGap.name}"${topGapSection ? ` (${topGapSection})` : ""}, scoring ${topGap.maturity_score}/5 against a target of ${topGap.target_maturity} — a gap of ${topGap.gap} point${topGap.gap !== 1 ? "s" : ""}.`);
      if (gapStepsAll.length > 1) {
        const others = gapStepsAll.slice(1, 4).map((s) => `"${s.name}" (gap: ${s.gap})`);
        finding.push(`Other notable gaps include ${others.join(", ")}.`);
      }
      finding.push("Closing these gaps should be the focus of the next improvement cycle.");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(20, 184, 166);
      pdf.text("Key Finding", margin, y);
      y += 4;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255, 180);
      const findingLines = pdf.splitTextToSize(finding.join(" "), contentWidth);
      pdf.text(findingLines, margin, y);
      y += findingLines.length * 3.5 + 4;
    }
  }

  // ── Effort & Cost (narrative paragraph) ──
  if (totalMonthlyHours > 0) {
    const costPara: string[] = [];
    costPara.push(`The process consumes approximately ${totalMonthlyHours.toFixed(1)} hours per month across all steps.`);
    if (totalMonthlyCost > 0) {
      costPara.push(`At current staffing rates, this translates to an estimated monthly cost of $${formatCurrency(totalMonthlyCost)} ($${formatCurrency(totalMonthlyCost * 12)} annualised).`);
    }
    // Identify highest-cost section
    const sectionEfforts = data.sections.map((section) => {
      const sSteps = data.steps.filter((s) => s.section_id === section.id);
      const hrs = sSteps.reduce((sum, s) => (s.time_minutes && s.frequency_per_month ? sum + (s.time_minutes * s.frequency_per_month) / 60 : sum), 0);
      return { name: section.name, hours: hrs };
    }).sort((a, b) => b.hours - a.hours);
    if (sectionEfforts.length > 0 && sectionEfforts[0].hours > 0) {
      const pct = Math.round((sectionEfforts[0].hours / totalMonthlyHours) * 100);
      costPara.push(`"${sectionEfforts[0].name}" accounts for ${pct}% of total effort (${sectionEfforts[0].hours.toFixed(1)}h/month) and is the natural starting point for efficiency gains.`);
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(20, 184, 166);
    pdf.text("Effort & Cost", margin, y);
    y += 4;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 180);
    const costLines = pdf.splitTextToSize(costPara.join(" "), contentWidth);
    pdf.text(costLines, margin, y);
    y += costLines.length * 3.5 + 4;
  }

  // ── Metric Cards ──
  const metrics = [
    { label: "SECTIONS", value: String(data.sections.length) },
    { label: "STEPS", value: String(data.steps.length) },
    { label: "AVG MATURITY", value: avgMaturity != null ? avgMaturity.toFixed(1) : "\u2014" },
    { label: "BELOW TARGET", value: String(stepsBelowTarget) },
    { label: "MONTHLY HOURS", value: totalMonthlyHours > 0 ? `${totalMonthlyHours.toFixed(1)}h` : "\u2014" },
    { label: "MONTHLY COST", value: totalMonthlyCost > 0 ? `$${formatCurrency(totalMonthlyCost)}` : "\u2014" },
  ];

  const cardCols = 3;
  const cardGap = 5;
  const cardW = (contentWidth - (cardCols - 1) * cardGap) / cardCols;
  const cardH = 18;

  metrics.forEach((m, i) => {
    const col = i % cardCols;
    const row = Math.floor(i / cardCols);
    const x = margin + col * (cardW + cardGap);
    const cardY = y + row * (cardH + cardGap);
    pdf.setFillColor(20, 20, 21);
    pdf.roundedRect(x, cardY, cardW, cardH, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text(m.value, x + cardW / 2, cardY + 10, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(m.label, x + cardW / 2, cardY + 15, { align: "center" });
  });

  y += Math.ceil(metrics.length / cardCols) * (cardH + cardGap) + 4;

  // ── Recommended Phasing (narrative) ──
  {
    const quickWins = data.steps.filter((s) => s.effort_score != null && s.impact_score != null && s.effort_score <= 2 && s.impact_score >= 4);
    if (quickWins.length > 0 || stepsWithTarget.length > 0) {
      // Only render if there's room, otherwise skip (we're already on the summary page)
      if (y < pageHeight - margin - 30) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(20, 184, 166);
        pdf.text("Recommended Approach", margin, y);
        y += 4;

        const recParts: string[] = [];
        if (quickWins.length > 0) {
          const names = quickWins.slice(0, 3).map((s) => `"${s.name}"`);
          recParts.push(`Start with the ${quickWins.length} quick win${quickWins.length !== 1 ? "s" : ""} identified (${names.join(", ")}${quickWins.length > 3 ? "..." : ""}) — these are high-impact, low-effort improvements that build momentum.`);
        }
        if (stepsBelowTarget > 0) {
          recParts.push(`Then address the ${stepsBelowTarget} steps below target maturity, prioritising those with the largest gaps.`);
        }
        recParts.push("A phased approach reduces risk and lets you measure improvement at each stage.");

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255, 180);
        const recLines = pdf.splitTextToSize(recParts.join(" "), contentWidth);
        pdf.text(recLines, margin, y);
      }
    }
  }
}

// ── Journey Map ───────────────────────────────────────────────────────────────

export async function renderJourneyMap(pdf: jsPDF, data: JourneyMapData): Promise<void> {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const stageMap = new Map(data.stages.map((s) => [s.id, s.name]));

  // Canvas snapshot page
  pdf.addPage("a4", "landscape");
  let y = margin;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Journey Map", margin, y);
  y += 8;

  if (data.canvasElement) {
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(data.canvasElement, {
        backgroundColor: "#0a0a0b",
        pixelRatio: 2,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            const cl = node.classList;
            if (
              cl?.contains("react-flow__controls") ||
              cl?.contains("react-flow__minimap") ||
              cl?.contains("react-flow__panel")
            )
              return false;
          }
          return true;
        },
      });
      const avH = pageHeight - y - margin;
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });
      const imgAspect = img.width / img.height;
      const boxAspect = contentWidth / avH;
      let imgW: number;
      let imgH: number;
      if (imgAspect > boxAspect) {
        imgW = contentWidth;
        imgH = contentWidth / imgAspect;
      } else {
        imgH = avH;
        imgW = avH * imgAspect;
      }
      pdf.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
    } catch {
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text("Canvas snapshot unavailable", margin, y + 10);
    }
  } else if (data.stages.length > 0) {
    // No canvas element available — render a data-driven stage→touchpoint table
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 100);
    pdf.text("Journey canvas snapshot not available. Showing stage overview from data.", margin, y);
    y += 6;

    const stageOverviewCols = [
      { label: "Stage", width: 65 },
      { label: "Owner", width: 45 },
      { label: "Channel", width: 45 },
      { label: "Touchpoints", width: 30 },
      { label: "Avg Pain", width: 30 },
      { label: "Touchpoint Names", width: contentWidth - 65 - 45 - 45 - 30 - 30 },
    ];

    y = drawTableHeader(pdf, stageOverviewCols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);

    const sortedStages = [...data.stages].sort((a, b) => a.position_x - b.position_x);
    for (let si = 0; si < sortedStages.length; si++) {
      const stage = sortedStages[si];
      if (y > pageHeight - margin - 5) {
        y = newTablePage(pdf, "Journey Map — Stages", stageOverviewCols, margin, contentWidth, pageWidth, pageHeight);
      }
      if (si % 2 === 0) {
        pdf.setFillColor(14, 14, 15);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }
      const stageTps = data.touchpoints.filter((tp) => tp.stage_id === stage.id);
      const avgPain = stageTps.filter((tp) => tp.pain_score != null).length > 0
        ? (stageTps.filter((tp) => tp.pain_score != null).reduce((sum, tp) => sum + tp.pain_score!, 0) / stageTps.filter((tp) => tp.pain_score != null).length).toFixed(1)
        : "\u2014";

      let colX = margin + 2;
      pdf.setTextColor(255, 255, 255);
      pdf.text(truncate(stage.name, 38), colX, y + 3);
      colX += stageOverviewCols[0].width;

      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(truncate(stage.owner ?? "\u2014", 25), colX, y + 3);
      colX += stageOverviewCols[1].width;

      pdf.text(truncate(stage.channel ?? "\u2014", 25), colX, y + 3);
      colX += stageOverviewCols[2].width;

      pdf.setTextColor(255, 255, 255);
      pdf.text(String(stageTps.length), colX, y + 3);
      colX += stageOverviewCols[3].width;

      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(avgPain, colX, y + 3);
      colX += stageOverviewCols[4].width;

      pdf.setTextColor(255, 255, 255, 76);
      pdf.text(truncate(stageTps.map((tp) => tp.name).join(", ") || "\u2014", 50), colX, y + 3);

      y += 6;
    }
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text("No journey data available.", margin, y + 10);
  }

  if (data.touchpoints.length === 0) return;

  // Touchpoint details page
  pdf.addPage("a4", "landscape");
  y = margin;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Touchpoint Details", margin, y);
  y += 8;

  const cols = [
    { label: "Touchpoint", width: 65 },
    { label: "Stage", width: 55 },
    { label: "Sentiment", width: 30 },
    { label: "Pain", width: 22 },
    { label: "Gain", width: 22 },
    { label: "Emotion", width: 45 },
    { label: "Notes", width: contentWidth - 65 - 55 - 30 - 22 - 22 - 45 },
  ];

  y = drawTableHeader(pdf, cols, margin, contentWidth, y);

  const sortedTps = [...data.touchpoints].sort((a, b) => {
    const sa = a.stage_id ? stageMap.get(a.stage_id) ?? "" : "";
    const sb = b.stage_id ? stageMap.get(b.stage_id) ?? "" : "";
    if (sa !== sb) return sa.localeCompare(sb);
    return a.name.localeCompare(b.name);
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  for (let rowIndex = 0; rowIndex < sortedTps.length; rowIndex++) {
    const tp = sortedTps[rowIndex];
    if (y > pageHeight - margin - 5) {
      y = newTablePage(pdf, "Touchpoint Details", cols, margin, contentWidth, pageWidth, pageHeight);
    }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(14, 14, 15);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    }
    let colX = margin + 2;

    pdf.setTextColor(255, 255, 255);
    pdf.text(truncate(tp.name, 38), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(
      truncate(tp.stage_id ? stageMap.get(tp.stage_id) ?? "\u2014" : "\u2014", 32),
      colX,
      y + 3,
    );
    colX += cols[1].width;

    if (tp.sentiment) {
      const sColor = SENTIMENT_COLORS[tp.sentiment] ?? "#6B7280";
      const [r, g, b] = hexToRgb(sColor);
      pdf.setFillColor(r, g, b);
      pdf.circle(colX + 1.5, y + 2, 1.2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(capitalize(tp.sentiment), colX + 5, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += cols[2].width;

    if (tp.pain_score != null) {
      const pColor = PAIN_COLORS[tp.pain_score] ?? "#6B7280";
      const [r, g, b] = hexToRgb(pColor);
      pdf.setFillColor(r, g, b);
      pdf.circle(colX + 1.5, y + 2, 1.2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(tp.pain_score), colX + 5, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text("\u2014", colX + 5, y + 3);
    }
    colX += cols[3].width;

    if (tp.gain_score != null) {
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(tp.gain_score), colX + 5, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text("\u2014", colX + 5, y + 3);
    }
    colX += cols[4].width;

    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(truncate(tp.customer_emotion ?? "\u2014", 25), colX, y + 3);
    colX += cols[5].width;

    const notesText = tp.notes
      ? tp.notes
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim()
      : "\u2014";
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(truncate(notesText, 20), colX, y + 3);

    y += 6;
  }
}

// ── Journey Sentiment ─────────────────────────────────────────────────────────

export function renderJourneySentiment(pdf: jsPDF, data: JourneySentimentData): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  const stageMap = new Map(data.stages.map((s) => [s.id, s.name]));

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const tp of data.touchpoints) {
    if (tp.sentiment === "positive") sentimentCounts.positive++;
    else if (tp.sentiment === "negative") sentimentCounts.negative++;
    else if (tp.sentiment === "neutral") sentimentCounts.neutral++;
  }

  const painTouchpoints = [...data.touchpoints]
    .filter((tp) => tp.pain_score != null)
    .sort((a, b) => (b.pain_score ?? 0) - (a.pain_score ?? 0));
  const avgPain =
    painTouchpoints.length > 0
      ? painTouchpoints.reduce((sum, tp) => sum + tp.pain_score!, 0) / painTouchpoints.length
      : null;

  pdf.addPage("a4", "landscape");
  let y = margin;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Journey Sentiment", margin, y);
  y += 10;

  // Sentiment distribution bar
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 140);
  pdf.text("SENTIMENT DISTRIBUTION", margin, y);
  y += 5;

  const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
  if (total > 0) {
    const sentimentBarWidth = 120;
    let barX = margin;
    const segments = [
      { key: "positive", count: sentimentCounts.positive, color: SENTIMENT_COLORS.positive },
      { key: "neutral", count: sentimentCounts.neutral, color: SENTIMENT_COLORS.neutral },
      { key: "negative", count: sentimentCounts.negative, color: SENTIMENT_COLORS.negative },
    ];
    for (const seg of segments) {
      if (seg.count === 0) continue;
      const segW = (seg.count / total) * sentimentBarWidth;
      const [r, g, b] = hexToRgb(seg.color);
      pdf.setFillColor(r, g, b);
      pdf.roundedRect(barX, y, segW, 4, 1, 1, "F");
      barX += segW;
    }
    y += 8;
    pdf.setFontSize(7);
    segments.forEach((seg, idx) => {
      const [r, g, b] = hexToRgb(seg.color);
      pdf.setFillColor(r, g, b);
      pdf.circle(margin + idx * 45, y, 1.2, "F");
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(
        `${capitalize(seg.key)}: ${seg.count} (${Math.round((seg.count / total) * 100)}%)`,
        margin + idx * 45 + 3,
        y + 1,
      );
    });
    y += 8;
  } else {
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text("No sentiment data", margin, y + 3);
    y += 8;
  }

  if (painTouchpoints.length === 0) return;

  // Pain summary cards
  const highPainCount = painTouchpoints.filter((tp) => (tp.pain_score ?? 0) >= 4).length;
  const cards = [
    { label: "Touchpoints Scored", value: String(painTouchpoints.length) },
    { label: "High Pain (4-5)", value: String(highPainCount) },
    { label: "Avg Pain", value: avgPain != null ? avgPain.toFixed(1) : "\u2014" },
    { label: "Max Pain", value: String(painTouchpoints[0]?.pain_score ?? "\u2014") },
  ];
  const cardW = 50;
  const cardGap = 5;
  cards.forEach((stat, i) => {
    const x = margin + i * (cardW + cardGap);
    pdf.setFillColor(20, 20, 21);
    pdf.roundedRect(x, y, cardW, 16, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text(stat.value, x + cardW / 2, y + 9, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(stat.label.toUpperCase(), x + cardW / 2, y + 14, { align: "center" });
  });
  y += 22;

  // Pain ranking table
  const cols = [
    { label: "Touchpoint", width: 70 },
    { label: "Stage", width: 60 },
    { label: "Pain", width: 25 },
    { label: "Sentiment", width: 30 },
    { label: "Emotion", width: 50 },
    { label: "", width: contentWidth - 70 - 60 - 25 - 30 - 50 },
  ];
  y = drawTableHeader(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  const maxPain = painTouchpoints[0]?.pain_score ?? 5;
  for (let rowIndex = 0; rowIndex < painTouchpoints.length; rowIndex++) {
    const tp = painTouchpoints[rowIndex];
    if (y > pageHeight - margin - 5) {
      y = newTablePage(pdf, "Pain Point Ranking", cols, margin, contentWidth, pageWidth, pageHeight);
    }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(14, 14, 15);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    }
    let colX = margin + 2;

    pdf.setTextColor(255, 255, 255);
    pdf.text(truncate(tp.name, 40), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(
      truncate(tp.stage_id ? stageMap.get(tp.stage_id) ?? "\u2014" : "\u2014", 35),
      colX,
      y + 3,
    );
    colX += cols[1].width;

    const painScore = tp.pain_score ?? 0;
    const pColor = PAIN_COLORS[painScore] ?? "#6B7280";
    const [pr, pg, pb] = hexToRgb(pColor);
    pdf.setFillColor(pr, pg, pb);
    pdf.circle(colX + 1.5, y + 2, 1.2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(painScore), colX + 5, y + 3);
    colX += cols[2].width;

    if (tp.sentiment) {
      const sColor = SENTIMENT_COLORS[tp.sentiment] ?? "#6B7280";
      const [sr, sg, sb] = hexToRgb(sColor);
      pdf.setFillColor(sr, sg, sb);
      pdf.circle(colX + 1.5, y + 2, 1.2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(capitalize(tp.sentiment), colX + 5, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += cols[3].width;

    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(truncate(tp.customer_emotion ?? "\u2014", 28), colX, y + 3);
    colX += cols[4].width;

    if (painScore > 0 && maxPain > 0) {
      const barMaxW = cols[5].width - 4;
      const barW = (painScore / maxPain) * barMaxW;
      pdf.setFillColor(pr, pg, pb);
      pdf.roundedRect(colX, y + 0.5, barW, 3, 1, 1, "F");
    }
    y += 6;
  }
}

// ── Prioritization Matrix ─────────────────────────────────────────────────────

export interface PrioritizationMatrixData {
  steps: Step[];
  sections: Section[];
}

export function renderPrioritizationMatrix(pdf: jsPDF, data: PrioritizationMatrixData): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const scoredSteps = data.steps.filter((s) => s.effort_score != null && s.impact_score != null);

  pdf.addPage("a4", "landscape");
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Prioritization Matrix", margin, y);
  y += 12;

  const getQuadrant = (effort: number, impact: number): string => {
    const highImpact = impact >= 4;
    const lowEffort = effort <= 2;
    if (highImpact && lowEffort) return "Quick Win";
    if (highImpact && !lowEffort) return "Major Project";
    if (!highImpact && lowEffort) return "Fill In";
    return "Thankless Task";
  };

  const cards = [
    { label: "Scored Steps", value: String(scoredSteps.length) },
    { label: "Quick Wins", value: String(scoredSteps.filter((s) => getQuadrant(s.effort_score!, s.impact_score!) === "Quick Win").length) },
    { label: "Major Projects", value: String(scoredSteps.filter((s) => getQuadrant(s.effort_score!, s.impact_score!) === "Major Project").length) },
    { label: "Thankless Tasks", value: String(scoredSteps.filter((s) => getQuadrant(s.effort_score!, s.impact_score!) === "Thankless Task").length) },
  ];

  const cardCols = 4;
  const cardGap = 5;
  const cardW = (contentWidth - (cardCols - 1) * cardGap) / cardCols;
  const cardH = 18;

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + cardGap);
    pdf.setFillColor(20, 20, 21);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text(card.value, x + cardW / 2, y + 10, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(card.label.toUpperCase(), x + cardW / 2, y + 15, { align: "center" });
  });

  y += cardH + 8;

  if (scoredSteps.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text("No steps have been scored for effort and impact.", margin, y + 10);
    return;
  }

  const quadrantOrder = ["Quick Win", "Major Project", "Fill In", "Thankless Task"];
  const sortedSteps = [...scoredSteps].sort((a, b) => {
    const qa = getQuadrant(a.effort_score!, a.impact_score!);
    const qb = getQuadrant(b.effort_score!, b.impact_score!);
    if (qa !== qb) return quadrantOrder.indexOf(qa) - quadrantOrder.indexOf(qb);
    return (b.impact_score ?? 0) - (a.impact_score ?? 0);
  });

  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  const cols = [
    { label: "Step", width: 90 },
    { label: "Section", width: 70 },
    { label: "Effort", width: 22 },
    { label: "Impact", width: 22 },
    { label: "Quadrant", width: contentWidth - 90 - 70 - 22 - 22 },
  ];

  y = drawTableHeader(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  for (let rowIndex = 0; rowIndex < sortedSteps.length; rowIndex++) {
    const step = sortedSteps[rowIndex];
    if (y > pageHeight - margin - 5) {
      y = newTablePage(pdf, "Prioritization Matrix", cols, margin, contentWidth, pageWidth, pageHeight);
    }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(14, 14, 15);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    }
    let colX = margin + 2;

    pdf.setTextColor(255, 255, 255);
    pdf.text(truncate(step.name, 52), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(255, 255, 255, 140);
    const secName = step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014";
    pdf.text(truncate(secName, 40), colX, y + 3);
    colX += cols[1].width;

    pdf.setTextColor(255, 255, 255);
    pdf.text(String(step.effort_score), colX + 5, y + 3);
    colX += cols[2].width;

    pdf.text(String(step.impact_score), colX + 5, y + 3);
    colX += cols[3].width;

    const quadrant = getQuadrant(step.effort_score!, step.impact_score!);
    const quadrantColor =
      quadrant === "Quick Win" ? "#22C55E" :
      quadrant === "Major Project" ? "#3B82F6" :
      quadrant === "Fill In" ? "#EAB308" : "#6B7280";
    const [qr, qg, qb] = hexToRgb(quadrantColor);
    pdf.setFillColor(qr, qg, qb);
    pdf.circle(colX + 1.5, y + 2, 1.2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.text(quadrant, colX + 5, y + 3);

    y += 6;
  }
}

// ── Tool Landscape ─────────────────────────────────────────────────────────────

export interface ToolLandscapeData {
  tools: Tool[];
}

const TOOL_STATUS_COLORS: Record<string, string> = {
  active: "#22C55E",
  considering: "#EAB308",
  cancelled: "#EF4444",
};

export function renderToolLandscape(pdf: jsPDF, data: ToolLandscapeData): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  pdf.addPage("a4", "landscape");
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Tool Landscape", margin, y);
  y += 12;

  const active = data.tools.filter((t) => t.status === "active");
  const considering = data.tools.filter((t) => t.status === "considering");
  const totalMonthlyCost = active.reduce((sum, t) => sum + (t.cost_per_month ?? 0), 0);

  const cards = [
    { label: "Total Tools", value: String(data.tools.length) },
    { label: "Active", value: String(active.length) },
    { label: "Considering", value: String(considering.length) },
    { label: "Monthly Cost", value: totalMonthlyCost > 0 ? `$${formatCurrency(totalMonthlyCost)}` : "\u2014" },
  ];

  const cardCols = 4;
  const cardGap = 5;
  const cardW = (contentWidth - (cardCols - 1) * cardGap) / cardCols;
  const cardH = 18;

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + cardGap);
    pdf.setFillColor(20, 20, 21);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text(card.value, x + cardW / 2, y + 10, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(card.label.toUpperCase(), x + cardW / 2, y + 15, { align: "center" });
  });

  y += cardH + 8;

  if (data.tools.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text("No tools have been added to this workspace.", margin, y + 10);
    return;
  }

  const statusOrder: Record<string, number> = { active: 0, considering: 1, cancelled: 2 };
  const sortedTools = [...data.tools].sort((a, b) => {
    const sa = statusOrder[a.status] ?? 99;
    const sb = statusOrder[b.status] ?? 99;
    if (sa !== sb) return sa - sb;
    return a.name.localeCompare(b.name);
  });

  const cols = [
    { label: "Tool", width: 75 },
    { label: "Category", width: 45 },
    { label: "Vendor", width: 45 },
    { label: "Status", width: 35 },
    { label: "Monthly Cost", width: contentWidth - 75 - 45 - 45 - 35 },
  ];

  y = drawTableHeader(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  for (let rowIndex = 0; rowIndex < sortedTools.length; rowIndex++) {
    const tool = sortedTools[rowIndex];
    if (y > pageHeight - margin - 5) {
      y = newTablePage(pdf, "Tool Landscape", cols, margin, contentWidth, pageWidth, pageHeight);
    }
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(14, 14, 15);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    }
    let colX = margin + 2;

    pdf.setTextColor(255, 255, 255);
    pdf.text(truncate(tool.name, 44), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(truncate(tool.category ?? "\u2014", 26), colX, y + 3);
    colX += cols[1].width;

    pdf.text(truncate(tool.vendor ?? "\u2014", 26), colX, y + 3);
    colX += cols[2].width;

    const statusColor = TOOL_STATUS_COLORS[tool.status] ?? "#6B7280";
    const [sr, sg, sb] = hexToRgb(statusColor);
    pdf.setFillColor(sr, sg, sb);
    pdf.circle(colX + 1.5, y + 2, 1.2, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.text(capitalize(tool.status), colX + 5, y + 3);
    colX += cols[3].width;

    if (tool.cost_per_month != null && tool.cost_per_month > 0) {
      pdf.setTextColor(255, 255, 255);
      pdf.text(`$${formatCurrency(tool.cost_per_month)}`, colX, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text("\u2014", colX, y + 3);
    }

    y += 6;
  }
}

// ── Improvements ──────────────────────────────────────────────────────────────

export interface ImprovementsData {
  ideas: ImprovementIdea[];
}

const IMPROVEMENT_STATUS_COLORS: Record<string, string> = {
  proposed: "#6B7280",
  approved: "#3B82F6",
  in_progress: "#F97316",
  completed: "#22C55E",
  rejected: "#EF4444",
};

const IMPROVEMENT_PRIORITY_COLORS: Record<string, string> = {
  critical: "#EF4444",
  high: "#F97316",
  medium: "#EAB308",
  low: "#6B7280",
};

export function renderImprovements(pdf: jsPDF, data: ImprovementsData): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  pdf.addPage("a4", "landscape");
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Improvement Ideas", margin, y);
  y += 12;

  const criticalCount = data.ideas.filter((i) => i.priority === "critical").length;
  const highCount = data.ideas.filter((i) => i.priority === "high").length;
  const inProgressCount = data.ideas.filter((i) => i.status === "in_progress").length;
  const completedCount = data.ideas.filter((i) => i.status === "completed").length;

  // Summary narrative
  {
    const summaryParts: string[] = [];
    summaryParts.push(`${data.ideas.length} improvement idea${data.ideas.length !== 1 ? "s have" : " has"} been identified across this process.`);
    if (criticalCount > 0 || highCount > 0) {
      summaryParts.push(`Of these, ${criticalCount} ${criticalCount === 1 ? "is" : "are"} critical priority and ${highCount} ${highCount === 1 ? "is" : "are"} high priority.`);
    }
    if (inProgressCount > 0) summaryParts.push(`${inProgressCount} ${inProgressCount === 1 ? "is" : "are"} currently in progress.`);
    if (completedCount > 0) summaryParts.push(`${completedCount} ${completedCount === 1 ? "has" : "have"} been completed.`);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 180);
    const summaryLines = pdf.splitTextToSize(summaryParts.join(" "), contentWidth);
    pdf.text(summaryLines, margin, y);
    y += summaryLines.length * 3.5 + 6;
  }

  if (data.ideas.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text("No improvement ideas have been recorded.", margin, y + 10);
    return;
  }

  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<string, number> = { in_progress: 0, approved: 1, proposed: 2, completed: 3, rejected: 4 };
  const sortedIdeas = [...data.ideas].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 99;
    const pb = priorityOrder[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    const sa = statusOrder[a.status] ?? 99;
    const sb = statusOrder[b.status] ?? 99;
    return sa - sb;
  });

  // Render each idea as a block with full description
  for (const idea of sortedIdeas) {
    // Estimate block height: title(5) + status line(4) + description lines + gap(6)
    const desc = idea.description ? stripHtml(idea.description) : "";
    const descLines = desc ? pdf.splitTextToSize(desc, contentWidth - 4) : [];
    const blockHeight = 5 + 4 + (descLines.length > 0 ? descLines.length * 3.5 + 2 : 0) + 6;

    if (y + blockHeight > pageHeight - margin) {
      pdf.addPage("a4", "landscape");
      pdf.setFillColor(10, 10, 11);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      y = margin;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255, 100);
      pdf.text("Improvement Ideas (continued)", margin, y);
      y += 6;
    }

    // Title with priority color dot
    const priorityColor = IMPROVEMENT_PRIORITY_COLORS[idea.priority] ?? "#6B7280";
    const [pr, pg, pb] = hexToRgb(priorityColor);
    pdf.setFillColor(pr, pg, pb);
    pdf.circle(margin + 1.5, y + 1, 1.5, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.text(idea.title, margin + 5, y + 2.5);
    y += 5;

    // Status + Priority line
    const statusColor = IMPROVEMENT_STATUS_COLORS[idea.status] ?? "#6B7280";
    const [sr, sg, sb] = hexToRgb(statusColor);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setFillColor(sr, sg, sb);
    pdf.circle(margin + 5 + 1, y + 1, 1, "F");
    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(`${capitalize(idea.status.replace(/_/g, " "))}  \u00B7  ${capitalize(idea.priority)} priority`, margin + 5 + 4, y + 2);
    y += 4;

    // Full description
    if (descLines.length > 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(255, 255, 255, 160);
      pdf.text(descLines, margin + 5, y + 2);
      y += descLines.length * 3.5 + 2;
    }

    // Separator line
    pdf.setDrawColor(255, 255, 255, 15);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y + 2, margin + contentWidth, y + 2);
    y += 6;
  }
}

// ── AI Insights ───────────────────────────────────────────────────────────────

export interface AIInsightsData {
  analysis: AIAnalysisResult;
}

const SEVERITY_COLORS: Record<string, string> = {
  high: "#EF4444",
  medium: "#F97316",
  low: "#EAB308",
};

export function renderAIInsights(pdf: jsPDF, data: AIInsightsData): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const categories = [
    { label: "Bottlenecks", insights: data.analysis.bottlenecks ?? [] },
    { label: "Redundancies", insights: data.analysis.redundancies ?? [] },
    { label: "Automation Candidates", insights: data.analysis.automation_candidates ?? [] },
    { label: "Maturity Recommendations", insights: data.analysis.maturity_recommendations ?? [] },
  ];

  const totalInsights = categories.reduce((sum, c) => sum + c.insights.length, 0);
  const highSeverityCount = categories.reduce(
    (sum, c) => sum + c.insights.filter((i) => i.severity === "high").length,
    0,
  );

  pdf.addPage("a4", "landscape");
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("AI Insights", margin, y);
  y += 12;

  const cards = [
    { label: "Total Insights", value: String(totalInsights) },
    { label: "Bottlenecks", value: String(data.analysis.bottlenecks?.length ?? 0) },
    { label: "High Severity", value: String(highSeverityCount) },
    { label: "Auto Candidates", value: String(data.analysis.automation_candidates?.length ?? 0) },
  ];

  const cardCols = 4;
  const cardGap = 5;
  const cardW = (contentWidth - (cardCols - 1) * cardGap) / cardCols;
  const cardH = 18;

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + cardGap);
    pdf.setFillColor(20, 20, 21);
    pdf.roundedRect(x, y, cardW, cardH, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text(card.value, x + cardW / 2, y + 10, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(card.label.toUpperCase(), x + cardW / 2, y + 15, { align: "center" });
  });

  y += cardH + 8;

  if (totalInsights === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(
      "No AI analysis results available. Run AI analysis to generate insights.",
      margin,
      y + 10,
    );
    return;
  }

  const cols = [
    { label: "Category", width: 55 },
    { label: "Title", width: 80 },
    { label: "Severity", width: 28 },
    { label: "Description", width: contentWidth - 55 - 80 - 28 },
  ];

  y = drawTableHeader(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  let rowIndex = 0;
  for (const cat of categories) {
    for (const insight of cat.insights) {
      if (y > pageHeight - margin - 5) {
        y = newTablePage(pdf, "AI Insights", cols, margin, contentWidth, pageWidth, pageHeight);
      }
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(14, 14, 15);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }
      let colX = margin + 2;

      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(truncate(cat.label, 32), colX, y + 3);
      colX += cols[0].width;

      pdf.setTextColor(255, 255, 255);
      pdf.text(truncate(insight.title, 46), colX, y + 3);
      colX += cols[1].width;

      const sevColor = SEVERITY_COLORS[insight.severity] ?? "#6B7280";
      const [sr, sg, sb] = hexToRgb(sevColor);
      pdf.setFillColor(sr, sg, sb);
      pdf.circle(colX + 1.5, y + 2, 1.2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(capitalize(insight.severity), colX + 5, y + 3);
      colX += cols[2].width;

      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(truncate(insight.description, 60), colX, y + 3);

      y += 6;
      rowIndex++;
    }
  }
}

// ── Perspective Comparison ────────────────────────────────────────────────────

export function renderPerspectiveComparison(
  pdf: jsPDF,
  data: PerspectiveComparisonData,
): void {
  if (data.perspectives.length === 0) return;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const perspA = data.perspectives[0];
  const perspB = data.perspectives.length >= 2 ? data.perspectives[1] : null;

  // Build element name map from steps and sections
  const elementNames = new Map<string, string>();
  (data.steps ?? []).forEach((s) => elementNames.set(s.id, s.name));
  (data.sections ?? []).forEach((s) => elementNames.set(s.id, s.name));

  // Group annotations by element (ratings + content)
  const byElement = new Map<string, { ratingA: number | null; ratingB: number | null; contentA: string | null; contentB: string | null }>();
  for (const ann of data.annotations) {
    if (!elementNames.has(ann.annotatable_id)) continue;
    const prev = byElement.get(ann.annotatable_id) ?? { ratingA: null, ratingB: null, contentA: null, contentB: null };
    if (ann.perspective_id === perspA.id) {
      prev.ratingA = ann.rating;
      if (ann.content) prev.contentA = stripHtml(ann.content);
    }
    if (perspB && ann.perspective_id === perspB.id) {
      prev.ratingB = ann.rating;
      if (ann.content) prev.contentB = stripHtml(ann.content);
    }
    byElement.set(ann.annotatable_id, prev);
  }

  const rows = [...byElement.entries()]
    .filter(([, v]) => v.ratingA != null || v.ratingB != null)
    .map(([id, v]) => ({
      name: elementNames.get(id) ?? id,
      ratingA: v.ratingA,
      ratingB: v.ratingB,
      contentA: v.contentA,
      contentB: v.contentB,
      divergence:
        v.ratingA != null && v.ratingB != null ? Math.abs(v.ratingA - v.ratingB) : null,
    }))
    .sort((a, b) => (b.divergence ?? -1) - (a.divergence ?? -1));

  pdf.addPage("a4", "landscape");
  let y = margin;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Perspective Comparison", margin, y);
  y += 6;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 140);
  pdf.text(
    `Comparing: ${perspA.name} vs ${perspB ? perspB.name : "(no second perspective)"}`,
    margin,
    y,
  );
  y += 8;

  if (rows.length === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(
      "No annotated elements found for the selected perspectives.",
      margin,
      y,
    );
    return;
  }

  const perspAColW = 35;
  const perspBColW = perspB ? 35 : 0;
  const divergenceColW = perspB ? 30 : 0;
  const nameColW = contentWidth - perspAColW - perspBColW - divergenceColW;

  const cols = [
    { label: "Element", width: nameColW },
    { label: perspA.name, width: perspAColW },
    ...(perspB
      ? [
          { label: perspB.name, width: perspBColW },
          { label: "Divergence", width: divergenceColW },
        ]
      : []),
  ];

  y = drawTableHeader(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    if (y > pageHeight - margin - 5) {
      y = newTablePage(
        pdf,
        "Perspective Comparison",
        cols,
        margin,
        contentWidth,
        pageWidth,
        pageHeight,
      );
    }

    const isHighDivergence = row.divergence != null && row.divergence >= 2;
    if (isHighDivergence) {
      pdf.setFillColor(80, 20, 20);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    } else if (rowIndex % 2 === 0) {
      pdf.setFillColor(14, 14, 15);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    }

    let colX = margin + 2;

    pdf.setTextColor(255, 255, 255);
    pdf.text(truncate(row.name, Math.floor(nameColW / 2.2)), colX, y + 3);
    colX += nameColW;

    if (row.ratingA != null) {
      const mColor =
        MATURITY_COLORS[Math.max(1, Math.min(5, Math.round(row.ratingA)))] ?? "#6B7280";
      const [r, g, b] = hexToRgb(mColor);
      pdf.setFillColor(r, g, b);
      pdf.circle(colX + 1.5, y + 2, 1.2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(row.ratingA), colX + 5, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += perspAColW;

    if (perspB) {
      if (row.ratingB != null) {
        const mColor =
          MATURITY_COLORS[Math.max(1, Math.min(5, Math.round(row.ratingB)))] ?? "#6B7280";
        const [r, g, b] = hexToRgb(mColor);
        pdf.setFillColor(r, g, b);
        pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(row.ratingB), colX + 5, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += perspBColW;

      if (row.divergence != null) {
        pdf.setTextColor(row.divergence >= 2 ? 239 : 255, row.divergence >= 2 ? 68 : 255, row.divergence >= 2 ? 68 : 255, row.divergence >= 2 ? 255 : 140);
        pdf.text(String(row.divergence), colX, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("\u2014", colX, y + 3);
      }
    }

    y += 6;
  }

  // ── Annotation Content Details ──
  const rowsWithContent = rows.filter((r) => r.contentA || r.contentB);
  if (rowsWithContent.length > 0) {
    // New page for annotation details
    pdf.addPage("a4", "landscape");
    pdf.setFillColor(10, 10, 11);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");
    y = margin;

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Annotation Details", margin, y);
    y += 5;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 140);
    pdf.text("Observations recorded during perspective assessment", margin, y);
    y += 8;

    for (const row of rowsWithContent) {
      const contentsToRender: { perspName: string; content: string; color: string }[] = [];
      if (row.contentA) contentsToRender.push({ perspName: perspA.name, content: row.contentA, color: perspA.color ?? "#3B82F6" });
      if (row.contentB && perspB) contentsToRender.push({ perspName: perspB.name, content: row.contentB, color: perspB.color ?? "#F97316" });

      let blockH = 5; // element name
      for (const c of contentsToRender) {
        const cLines = pdf.splitTextToSize(c.content, contentWidth - 14);
        blockH += 3 + cLines.length * 3.2;
      }
      blockH += 4;

      if (y + blockH > pageHeight - margin) {
        pdf.addPage("a4", "landscape");
        pdf.setFillColor(10, 10, 11);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        y = margin;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255, 100);
        pdf.text("Annotation Details (continued)", margin, y);
        y += 6;
      }

      // Element name
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(row.name, margin + 2, y + 2.5);
      y += 5;

      for (const c of contentsToRender) {
        const [cr, cg, cb] = hexToRgb(c.color);
        const cLines = pdf.splitTextToSize(c.content, contentWidth - 14);

        // Perspective label + quote bar
        pdf.setFillColor(cr, cg, cb);
        pdf.rect(margin + 4, y, 0.8, cLines.length * 3.2 + 3, "F");
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6.5);
        pdf.setTextColor(cr, cg, cb);
        pdf.text(c.perspName, margin + 8, y + 2);
        y += 3;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255, 170);
        pdf.text(cLines, margin + 8, y + 1);
        y += cLines.length * 3.2;
      }

      // Separator
      pdf.setDrawColor(255, 255, 255, 15);
      pdf.setLineWidth(0.2);
      pdf.line(margin, y + 1, margin + contentWidth, y + 1);
      y += 4;
    }
  }
}

// ── Process Narrative ─────────────────────────────────────────────────────────

export function renderProcessNarrative(pdf: jsPDF, data: ProcessNarrativeData): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const sectionMap = new Map(data.sections.map((s) => [s.id, s]));

  // Group steps by section, sorted by section position then step position
  const sortedSections = [...data.sections].sort((a, b) => a.position_y - b.position_y || a.position_x - b.position_x);

  // Build step-to-comments map (only step comments)
  const stepComments = new Map<string, typeof data.comments>();
  for (const c of data.comments) {
    if (c.commentable_type !== "step") continue;
    const existing = stepComments.get(c.commentable_id) ?? [];
    existing.push(c);
    stepComments.set(c.commentable_id, existing);
  }

  pdf.addPage("a4", "landscape");
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Process Walkthrough", margin, y);
  y += 5;

  // Intro
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255, 160);
  const introText = `This section walks through each phase of the process in order, documenting what each step does, its current status, and any notes or observations captured during the mapping exercise.`;
  const introLines = pdf.splitTextToSize(introText, contentWidth);
  pdf.text(introLines, margin, y);
  y += introLines.length * 3.5 + 6;

  for (const section of sortedSections) {
    const sectionSteps = data.steps
      .filter((s) => s.section_id === section.id)
      .sort((a, b) => a.position_y - b.position_y || a.position_x - b.position_x);

    if (sectionSteps.length === 0) continue;

    // Estimate minimum space for section header
    if (y > pageHeight - margin - 25) {
      pdf.addPage("a4", "landscape");
      pdf.setFillColor(10, 10, 11);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      y = margin;
    }

    // Section header with accent line
    pdf.setFillColor(20, 184, 166);
    pdf.rect(margin, y, contentWidth, 0.5, "F");
    y += 3;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(section.name, margin, y + 3);
    y += 5;

    // Section summary
    const liveCount = sectionSteps.filter((s) => s.status === "live").length;
    const draftCount = sectionSteps.filter((s) => s.status === "draft").length;
    const sectionScored = sectionSteps.filter((s) => s.maturity_score != null);
    const sectionAvg = sectionScored.length > 0
      ? (sectionScored.reduce((sum, s) => sum + s.maturity_score!, 0) / sectionScored.length).toFixed(1)
      : null;

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255, 140);
    const summaryParts: string[] = [`${sectionSteps.length} step${sectionSteps.length !== 1 ? "s" : ""}`];
    if (liveCount > 0) summaryParts.push(`${liveCount} live`);
    if (draftCount > 0) summaryParts.push(`${draftCount} draft`);
    if (sectionAvg) summaryParts.push(`avg maturity ${sectionAvg}/5`);
    pdf.text(summaryParts.join("  \u00B7  "), margin, y + 2);
    y += 6;

    // Steps within section
    for (const step of sectionSteps) {
      const comments = stepComments.get(step.id) ?? [];
      const notes = step.notes ? stripHtml(step.notes) : "";
      const noteLines = notes ? pdf.splitTextToSize(notes, contentWidth - 10) : [];
      const commentBlocks = comments
        .filter((c) => !c.is_resolved)
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .slice(0, 5);

      // Estimate height for this step block
      let blockH = 5; // step name line
      blockH += 4; // status line
      if (noteLines.length > 0) blockH += noteLines.length * 3.2 + 3;
      for (const c of commentBlocks) {
        const cText = stripHtml(c.content);
        const cLines = pdf.splitTextToSize(cText, contentWidth - 16);
        blockH += 3 + cLines.length * 3;
      }
      blockH += 4; // gap

      if (y + blockH > pageHeight - margin) {
        pdf.addPage("a4", "landscape");
        pdf.setFillColor(10, 10, 11);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        y = margin;
        // Continuation header
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255, 100);
        pdf.text(`${section.name} (continued)`, margin, y);
        y += 6;
      }

      // Step name with status badge
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(255, 255, 255);
      pdf.text(step.name, margin + 3, y + 3);
      y += 5;

      // Status + executor + maturity inline
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
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255, 120);
      pdf.text(statusParts.join("  \u00B7  "), margin + 3, y + 2);
      y += 4;

      // Notes (full render)
      if (noteLines.length > 0) {
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(255, 255, 255, 170);
        pdf.text(noteLines, margin + 5, y + 2);
        y += noteLines.length * 3.2 + 3;
      }

      // Comments as indented quotes
      for (const c of commentBlocks) {
        const cText = stripHtml(c.content);
        const cLines = pdf.splitTextToSize(cText, contentWidth - 16);

        // Category tag
        const categoryColors: Record<string, string> = {
          decision: "#3B82F6", pain_point: "#EF4444", idea: "#22C55E", question: "#EAB308", note: "#6B7280",
        };
        const tagColor = categoryColors[c.category] ?? "#6B7280";
        const [tr, tg, tb] = hexToRgb(tagColor);

        // Quote bar
        pdf.setFillColor(tr, tg, tb);
        pdf.rect(margin + 6, y + 0.5, 0.8, cLines.length * 3 + 1, "F");

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(6.5);
        pdf.setTextColor(tr, tg, tb);
        pdf.text(capitalize(c.category.replace(/_/g, " ")), margin + 9, y + 2);
        y += 3;
        pdf.setTextColor(255, 255, 255, 140);
        pdf.text(cLines, margin + 9, y + 1);
        y += cLines.length * 3;
      }

      y += 4;
    }

    y += 2;
  }

  // Unsectioned steps
  const unsectioned = data.steps.filter((s) => !s.section_id);
  if (unsectioned.length > 0) {
    if (y > pageHeight - margin - 20) {
      pdf.addPage("a4", "landscape");
      pdf.setFillColor(10, 10, 11);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      y = margin;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255, 140);
    pdf.text("Unsectioned Steps", margin, y + 3);
    y += 8;

    for (const step of unsectioned) {
      if (y > pageHeight - margin - 10) {
        pdf.addPage("a4", "landscape");
        pdf.setFillColor(10, 10, 11);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        y = margin;
      }
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.text(step.name, margin + 3, y + 3);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255, 120);
      pdf.text(formatStatus(step.status), margin + 3 + pdf.getTextWidth(step.name) + 4, y + 3);
      y += 7;
    }
  }
}

// ── Key Findings & Decisions ─────────────────────────────────────────────────

export function renderKeyFindings(pdf: jsPDF, data: KeyFindingsData): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Filter to decision and pain_point comments only
  const relevantComments = data.comments.filter(
    (c) => c.category === "decision" || c.category === "pain_point",
  );

  if (relevantComments.length === 0) return;

  // Build lookup maps
  const stepMap = new Map(data.steps.map((s) => [s.id, s]));
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));

  pdf.addPage("a4", "landscape");
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Key Findings & Decisions", margin, y);
  y += 5;

  const decisions = relevantComments.filter((c) => c.category === "decision");
  const painPoints = relevantComments.filter((c) => c.category === "pain_point");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255, 160);
  const introText = `During the process mapping exercise, ${decisions.length} decision${decisions.length !== 1 ? "s" : ""} and ${painPoints.length} pain point${painPoints.length !== 1 ? "s were" : " was"} recorded across the process. These represent the most important observations to act on.`;
  const introLines = pdf.splitTextToSize(introText, contentWidth);
  pdf.text(introLines, margin, y);
  y += introLines.length * 3.5 + 6;

  // Render decisions first, then pain points
  const groups: { label: string; color: string; items: Comment[] }[] = [
    { label: "Decisions", color: "#3B82F6", items: decisions },
    { label: "Pain Points", color: "#EF4444", items: painPoints },
  ];

  for (const group of groups) {
    if (group.items.length === 0) continue;

    if (y > pageHeight - margin - 20) {
      pdf.addPage("a4", "landscape");
      pdf.setFillColor(10, 10, 11);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      y = margin;
    }

    const [gr, gg, gb] = hexToRgb(group.color);

    // Group header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(gr, gg, gb);
    pdf.text(group.label, margin, y + 3);
    y += 7;

    for (const comment of group.items) {
      const content = stripHtml(comment.content);
      const contentLines = pdf.splitTextToSize(content, contentWidth - 14);

      // Context: which step this is attached to
      const step = comment.commentable_type === "step" ? stepMap.get(comment.commentable_id) : null;
      const stepName = step?.name;
      const sectionName = step?.section_id ? sectionMap.get(step.section_id) : null;
      const context = [stepName, sectionName].filter(Boolean).join(" \u2014 ");

      const blockH = (context ? 4 : 0) + contentLines.length * 3.2 + 5;
      if (y + blockH > pageHeight - margin) {
        pdf.addPage("a4", "landscape");
        pdf.setFillColor(10, 10, 11);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        y = margin;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(gr, gg, gb);
        pdf.text(`${group.label} (continued)`, margin, y);
        y += 6;
      }

      // Quote bar
      pdf.setFillColor(gr, gg, gb);
      pdf.rect(margin + 2, y, 0.8, contentLines.length * 3.2 + (context ? 4 : 0) + 1, "F");

      // Context line
      if (context) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255, 120);
        pdf.text(truncate(context, 80), margin + 6, y + 2);
        y += 4;
      }

      // Content
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(255, 255, 255, 180);
      pdf.text(contentLines, margin + 6, y + 2);
      y += contentLines.length * 3.2 + 5;
    }

    y += 3;
  }
}

// ── Table of Contents ─────────────────────────────────────────────────────────

export interface TocEntry {
  name: string;
  page: number;
}

export function renderTableOfContents(pdf: jsPDF, entries: TocEntry[]): void {
  if (entries.length === 0) return;

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  pdf.addPage("a4", "landscape");
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  let y = margin;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Table of Contents", margin, y);
  y += 6;

  // Brand accent line
  pdf.setFillColor(20, 184, 166);
  pdf.rect(margin, y, contentWidth, 0.5, "F");
  y += 10;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  for (const entry of entries) {
    if (y > pageHeight - margin - 8) {
      pdf.addPage("a4", "landscape");
      pdf.setFillColor(10, 10, 11);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      y = margin;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
    }

    const pageStr = `${entry.page}`;

    pdf.setTextColor(255, 255, 255);
    pdf.text(entry.name, margin, y);

    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(pageStr, pageWidth - margin, y, { align: "right" });

    // Dot leader
    const nameWidth = pdf.getTextWidth(entry.name);
    const pageNumWidth = pdf.getTextWidth(pageStr);
    const lineStart = margin + nameWidth + 4;
    const lineEnd = pageWidth - margin - pageNumWidth - 4;
    if (lineEnd > lineStart + 4) {
      pdf.setDrawColor(255, 255, 255, 25);
      pdf.setLineWidth(0.3);
      pdf.line(lineStart, y - 1, lineEnd, y - 1);
    }

    y += 9;
  }
}

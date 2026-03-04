import { jsPDF } from "jspdf";
import type { Section, Step, Stage, Touchpoint, Perspective, PerspectiveAnnotation } from "@/types/database";
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
  y += 12;

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

  const metrics = [
    { label: "TOTAL SECTIONS", value: String(data.sections.length) },
    { label: "TOTAL STEPS", value: String(data.steps.length) },
    { label: "AVG MATURITY", value: avgMaturity != null ? avgMaturity.toFixed(1) : "\u2014" },
    { label: "BELOW TARGET", value: String(stepsBelowTarget) },
    {
      label: "MONTHLY HOURS",
      value: totalMonthlyHours > 0 ? `${totalMonthlyHours.toFixed(1)}h` : "\u2014",
    },
    {
      label: "MONTHLY COST",
      value: totalMonthlyCost > 0 ? `$${formatCurrency(totalMonthlyCost)}` : "\u2014",
    },
  ];

  const cardCols = 3;
  const cardGap = 5;
  const cardW = (contentWidth - (cardCols - 1) * cardGap) / cardCols;
  const cardH = 20;

  metrics.forEach((m, i) => {
    const col = i % cardCols;
    const row = Math.floor(i / cardCols);
    const x = margin + col * (cardW + cardGap);
    const cardY = y + row * (cardH + cardGap);
    pdf.setFillColor(20, 20, 21);
    pdf.roundedRect(x, cardY, cardW, cardH, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(m.value, x + cardW / 2, cardY + 12, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(m.label, x + cardW / 2, cardY + 17, { align: "center" });
  });

  y += Math.ceil(metrics.length / cardCols) * (cardH + cardGap) + 6;

  // Top 3 gaps table
  const sectionMap = new Map(data.sections.map((s) => [s.id, s.name]));
  const gapSteps = stepsWithTarget
    .map((s) => ({ ...s, gap: s.target_maturity! - s.maturity_score! }))
    .filter((s) => s.gap > 0)
    .sort((a, b) => b.gap - a.gap)
    .slice(0, 3);

  if (gapSteps.length === 0) return;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Top Gaps", margin, y);
  y += 5;

  const cols = [
    { label: "Step", width: 100 },
    { label: "Section", width: 80 },
    { label: "Current", width: 35 },
    { label: "Target", width: 35 },
    { label: "Gap", width: contentWidth - 100 - 80 - 35 - 35 },
  ];

  y = drawTableHeader(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  for (let i = 0; i < gapSteps.length; i++) {
    const step = gapSteps[i];
    if (y > pageHeight - margin - 5) break;
    if (i % 2 === 0) {
      pdf.setFillColor(14, 14, 15);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    }
    let colX = margin + 2;
    pdf.setTextColor(255, 255, 255);
    pdf.text(truncate(step.name, 58), colX, y + 3);
    colX += cols[0].width;
    pdf.setTextColor(255, 255, 255, 140);
    const secName = step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014";
    pdf.text(truncate(secName, 45), colX, y + 3);
    colX += cols[1].width;
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(step.maturity_score), colX + 5, y + 3);
    colX += cols[2].width;
    pdf.text(String(step.target_maturity), colX + 5, y + 3);
    colX += cols[3].width;
    pdf.setTextColor(239, 68, 68);
    pdf.text(`+${step.gap}`, colX, y + 3);
    y += 6;
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
  } else {
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(
      "Journey canvas snapshot not available from process view.",
      margin,
      y + 10,
    );
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

  // Group annotations by element
  const byElement = new Map<string, { ratingA: number | null; ratingB: number | null }>();
  for (const ann of data.annotations) {
    if (!elementNames.has(ann.annotatable_id)) continue;
    const prev = byElement.get(ann.annotatable_id) ?? { ratingA: null, ratingB: null };
    if (ann.perspective_id === perspA.id) prev.ratingA = ann.rating;
    if (perspB && ann.perspective_id === perspB.id) prev.ratingB = ann.rating;
    byElement.set(ann.annotatable_id, prev);
  }

  const rows = [...byElement.entries()]
    .filter(([, v]) => v.ratingA != null || v.ratingB != null)
    .map(([id, v]) => ({
      name: elementNames.get(id) ?? id,
      ratingA: v.ratingA,
      ratingB: v.ratingB,
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
}

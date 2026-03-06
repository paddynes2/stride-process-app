import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import type { Section, Step, Connection } from "@/types/database";
import { MATURITY_COLORS } from "@/lib/maturity";

// ── McKinsey-style Theme ────────────────────────────────────────────────────
const T = {
  // Page
  bg: [255, 255, 255] as const,
  // Text
  navy: [23, 37, 84] as const,
  body: [51, 65, 85] as const,
  muted: [100, 116, 139] as const,
  faint: [148, 163, 184] as const,
  // Accent
  teal: [13, 148, 136] as const,
  tealLight: [204, 251, 241] as const,
  // Surfaces
  surface: [248, 250, 252] as const,
  tableHead: [241, 245, 249] as const,
  tableStripe: [248, 250, 252] as const,
  border: [226, 232, 240] as const,
  cardBorder: [203, 213, 225] as const,
  // Semantic
  red: [220, 38, 38] as const,
  green: [22, 163, 74] as const,
  // Fonts
  titleSize: 24,
  h1Size: 16,
  h2Size: 12,
  bodySize: 9.5,
  smallSize: 8,
  tinySize: 7,
  tableSize: 8,
  tableHeadSize: 7.5,
  // Layout
  margin: 20,
  lineHeight: 4.2,
  paraGap: 6,
} as const;

const GAP_COLORS: Record<number, string> = {
  0: "#6B7280",
  1: "#22C55E",
  2: "#84CC16",
  3: "#EAB308",
  4: "#F97316",
  5: "#EF4444",
};

interface StepRoleForExport {
  step_id: string;
  role: { hourly_rate: number | null };
}

interface StepToolForExport {
  step_id: string;
  tool: { cost_per_month: number | null };
}

interface ExportPdfOptions {
  workspaceName: string;
  sections: Section[];
  steps: Step[];
  connections: Connection[];
  canvasElement: HTMLElement | null;
  stepRoles?: StepRoleForExport[];
  stepTools?: StepToolForExport[];
}

export interface PdfSectionEntry {
  name: string;
  page: number;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function setPageBg(pdf: jsPDF) {
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pdf.setFillColor(...T.bg);
  pdf.rect(0, 0, w, h, "F");
}

function drawAccentLine(pdf: jsPDF, x: number, y: number, width: number) {
  pdf.setFillColor(...T.teal);
  pdf.rect(x, y, width, 0.6, "F");
}

function drawSectionTitle(pdf: jsPDF, title: string, margin: number, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.h1Size);
  pdf.setTextColor(...T.navy);
  pdf.text(title, margin, y);
  y += 2;
  drawAccentLine(pdf, margin, y, 40);
  return y + 6;
}

function drawTableHeaderRow(
  pdf: jsPDF,
  cols: { label: string; width: number }[],
  margin: number,
  contentWidth: number,
  y: number,
): number {
  // Header background
  pdf.setFillColor(...T.tableHead);
  pdf.rect(margin, y, contentWidth, 7, "F");
  // Bottom border
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
  pdf.setFontSize(T.smallSize);
  pdf.setTextColor(...T.muted);
  pdf.text(`${title} (continued)`, margin, y);
  y += 5;
  y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.tableSize);
  return y;
}

function drawStripeRow(pdf: jsPDF, rowIndex: number, margin: number, y: number, contentWidth: number) {
  if (rowIndex % 2 === 0) {
    pdf.setFillColor(...T.tableStripe);
    pdf.rect(margin, y - 1.5, contentWidth, 6.5, "F");
  }
  // Subtle row separator
  pdf.setDrawColor(...T.border);
  pdf.setLineWidth(0.15);
  pdf.line(margin, y + 5, margin + contentWidth, y + 5);
}

// ── Main Export ─────────────────────────────────────────────────────────────

export async function createWorkspacePdf(
  {
    workspaceName,
    sections,
    steps,
    connections,
    canvasElement,
    stepRoles = [],
    stepTools = [],
  }: ExportPdfOptions,
  skipFooter = false,
): Promise<{ pdf: jsPDF; sections: PdfSectionEntry[] }> {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin: number = T.margin;
  const contentWidth = pageWidth - margin * 2;
  let y: number = margin;

  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));
  const stepRolesMap = buildStepRolesMap(stepRoles);
  const stepToolsMap = buildStepToolsMap(stepTools);
  const sectionEntries: PdfSectionEntry[] = [];

  // ── Title Page ──────────────────────────────────────────────────────────
  setPageBg(pdf);

  // Top accent line
  drawAccentLine(pdf, margin, margin, contentWidth);

  y = margin + 6;

  // "PROCESS AUDIT REPORT" label
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(...T.teal);
  pdf.text("PROCESS AUDIT REPORT", margin, y);
  y += 12;

  // Workspace name
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.titleSize);
  pdf.setTextColor(...T.navy);
  const titleLines = pdf.splitTextToSize(workspaceName, contentWidth);
  pdf.text(titleLines, margin, y);
  y += titleLines.length * 10 + 4;

  // Date
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(...T.muted);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(dateStr, margin, y);
  y += 6;

  // Divider
  pdf.setDrawColor(...T.border);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, margin + 80, y);
  y += 8;

  // Summary paragraph
  const liveSteps = steps.filter((s) => s.status === "live").length;
  const draftSteps = steps.filter((s) => s.status === "draft").length;
  const scoredSteps = steps.filter((s) => s.maturity_score != null);
  const avgMat = scoredSteps.length > 0
    ? (scoredSteps.reduce((sum, s) => sum + s.maturity_score!, 0) / scoredSteps.length).toFixed(1)
    : null;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.bodySize);
  pdf.setTextColor(...T.body);
  const descParts: string[] = [];
  descParts.push(`This report documents a process comprising ${sections.length} phases and ${steps.length} steps connected by ${connections.length} dependencies.`);
  if (liveSteps > 0 || draftSteps > 0) {
    descParts.push(`${liveSteps} steps are live, ${draftSteps} in draft.`);
  }
  if (avgMat) {
    descParts.push(`Average maturity: ${avgMat}/5.`);
  }
  const descLines = pdf.splitTextToSize(descParts.join(" "), contentWidth * 0.6);
  pdf.text(descLines, margin, y);
  y += descLines.length * T.lineHeight + 12;

  // Summary stats - clean inline style
  const stats = [
    { label: "PHASES", value: String(sections.length) },
    { label: "STEPS", value: String(steps.length) },
    { label: "CONNECTIONS", value: String(connections.length) },
  ];

  const statW = 38;
  const statGap = 3;
  stats.forEach((stat, i) => {
    const x = margin + i * (statW + statGap);
    pdf.setDrawColor(...T.cardBorder);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, statW, 16, 1.5, 1.5, "S");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(...T.navy);
    pdf.text(stat.value, x + statW / 2, y + 8.5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...T.muted);
    pdf.text(stat.label, x + statW / 2, y + 13.5, { align: "center" });
  });

  // Bottom accent line
  drawAccentLine(pdf, margin, pageHeight - margin - 4, contentWidth);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...T.faint);
  pdf.text("Confidential", margin, pageHeight - margin);
  pdf.setTextColor(...T.teal);
  pdf.text("Stride", pageWidth - margin, pageHeight - margin, { align: "right" });

  // ── Canvas Snapshot Page ────────────────────────────────────────────────
  if (canvasElement !== null) {
    pdf.addPage("a4", "landscape");
    setPageBg(pdf);
    sectionEntries.push({ name: "Canvas Snapshot", page: pdf.getNumberOfPages() });
    y = margin;
    y = drawSectionTitle(pdf, "Process Map", margin, y);

    try {
      // Inject light-theme overrides so dark-themed nodes render white for PDF
      const lightStyle = document.createElement("style");
      lightStyle.setAttribute("data-pdf-export", "true");
      lightStyle.textContent = `
        .react-flow .react-flow__node,
        .react-flow .react-flow__node *,
        .react-flow [class*="group-node"],
        .react-flow [class*="section-node"],
        .react-flow [class*="step-node"] {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-color: #e2e8f0 !important;
        }
        .react-flow .react-flow__edge-path { stroke: #64748b !important; }
        .react-flow .react-flow__background { background-color: #ffffff !important; }
      `;
      document.head.appendChild(lightStyle);

      const dataUrl = await toPng(canvasElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        filter: (node) => {
          if (node instanceof HTMLElement) {
            const classList = node.classList;
            if (
              classList?.contains("react-flow__controls") ||
              classList?.contains("react-flow__minimap") ||
              classList?.contains("react-flow__panel")
            ) {
              return false;
            }
          }
          return true;
        },
      });

      // Remove light-theme overrides
      lightStyle.remove();

      const canvasAvailHeight = pageHeight - y - margin;
      const canvasAvailWidth = contentWidth;

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = dataUrl;
      });

      const imgAspect = img.width / img.height;
      const boxAspect = canvasAvailWidth / canvasAvailHeight;

      let imgW: number;
      let imgH: number;
      if (imgAspect > boxAspect) {
        imgW = canvasAvailWidth;
        imgH = canvasAvailWidth / imgAspect;
      } else {
        imgH = canvasAvailHeight;
        imgW = canvasAvailHeight * imgAspect;
      }

      // Light border around snapshot
      pdf.setDrawColor(...T.border);
      pdf.setLineWidth(0.3);
      pdf.rect(margin, y, imgW, imgH, "S");
      pdf.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
    } catch {
      // Ensure light-theme style is cleaned up on error
      document.querySelector('style[data-pdf-export]')?.remove();
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.muted);
      pdf.text("Canvas snapshot unavailable", margin, y + 10);
    }
  }

  // ── Step Details Page ───────────────────────────────────────────────────
  if (steps.length > 0) {
    pdf.addPage("a4", "landscape");
    setPageBg(pdf);
    sectionEntries.push({ name: "Step Details", page: pdf.getNumberOfPages() });
    y = margin;
    y = drawSectionTitle(pdf, "Step Details", margin, y);

    // Intro paragraph
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.body);
    const stepIntro = `The following table lists all ${steps.length} steps in this process, sorted by their position in the workflow. Maturity scores are rated 1-5, with gaps indicating the distance between current and target state.`;
    const stepIntroLines = pdf.splitTextToSize(stepIntro, contentWidth);
    pdf.text(stepIntroLines, margin, y);
    y += stepIntroLines.length * T.lineHeight + T.paraGap;

    const cols = [
      { label: "Step", width: 62 },
      { label: "Section", width: 50 },
      { label: "Status", width: 25 },
      { label: "Maturity", width: 24 },
      { label: "Target", width: 22 },
      { label: "Gap", width: 20 },
      { label: "Min/run", width: 22 },
      { label: "Freq/mo", width: 22 },
      { label: "Hrs/mo", width: 22 },
    ];

    y = drawTableHeaderRow(pdf, cols, margin, contentWidth, y);

    // Sort by flow order
    const sectionPositionMap = new Map(sections.map((s) => [s.id, { y: s.position_y, x: s.position_x }]));
    const sortedSteps = [...steps].sort((a, b) => {
      const secPosA = a.section_id ? sectionPositionMap.get(a.section_id) : null;
      const secPosB = b.section_id ? sectionPositionMap.get(b.section_id) : null;
      const secYA = secPosA?.y ?? Number.MAX_SAFE_INTEGER;
      const secYB = secPosB?.y ?? Number.MAX_SAFE_INTEGER;
      if (secYA !== secYB) return secYA - secYB;
      const secXA = secPosA?.x ?? Number.MAX_SAFE_INTEGER;
      const secXB = secPosB?.x ?? Number.MAX_SAFE_INTEGER;
      if (secXA !== secXB) return secXA - secXB;
      if (a.position_y !== b.position_y) return a.position_y - b.position_y;
      return a.position_x - b.position_x;
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    for (let rowIndex = 0; rowIndex < sortedSteps.length; rowIndex++) {
      const step = sortedSteps[rowIndex];
      const remainingRows = sortedSteps.length - rowIndex;

      if (y > pageHeight - margin - 5 && remainingRows > 3) {
        y = newTablePageClean(pdf, "Step Details", cols, margin, contentWidth);
      }

      drawStripeRow(pdf, rowIndex, margin, y, contentWidth);

      let colX = margin + 2;
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(step.name, 42), colX, y + 3);
      colX += cols[0].width;

      pdf.setTextColor(...T.muted);
      const sectionName = step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014";
      pdf.text(truncate(sectionName, 28), colX, y + 3);
      colX += cols[1].width;

      pdf.setTextColor(...T.body);
      pdf.text(formatStatus(step.status), colX, y + 3);
      colX += cols[2].width;

      if (step.maturity_score != null) {
        const color = MATURITY_COLORS[step.maturity_score];
        if (color) {
          const [r, g, b] = hexToRgb(color);
          pdf.setFillColor(r, g, b);
          pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        }
        pdf.setTextColor(...T.navy);
        pdf.text(String(step.maturity_score), colX + 5, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX + 5, y + 3);
      }
      colX += cols[3].width;

      if (step.target_maturity != null) {
        pdf.setTextColor(...T.navy);
        pdf.text(String(step.target_maturity), colX + 5, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX + 5, y + 3);
      }
      colX += cols[4].width;

      if (step.maturity_score != null && step.target_maturity != null) {
        const gap = step.target_maturity - step.maturity_score;
        if (gap > 0) {
          pdf.setTextColor(...T.red);
          pdf.text(`+${gap}`, colX, y + 3);
        } else if (gap === 0) {
          pdf.setTextColor(...T.faint);
          pdf.text("0", colX, y + 3);
        } else {
          pdf.setTextColor(...T.green);
          pdf.text(String(gap), colX, y + 3);
        }
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += cols[5].width;

      pdf.setTextColor(...T.muted);
      pdf.text(step.time_minutes ? String(step.time_minutes) : "\u2014", colX, y + 3);
      colX += cols[6].width;

      pdf.text(step.frequency_per_month ? String(step.frequency_per_month) : "\u2014", colX, y + 3);
      colX += cols[7].width;

      if (step.time_minutes && step.frequency_per_month) {
        const hrs = (step.time_minutes * step.frequency_per_month) / 60;
        pdf.setTextColor(...T.navy);
        pdf.text(hrs.toFixed(1), colX, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }

      y += 6.5;
    }
  }

  // ── Gap Analysis ────────────────────────────────────────────────────────
  const gapSteps = steps
    .filter((s) => s.maturity_score != null && s.target_maturity != null)
    .map((s) => ({ ...s, gap: s.target_maturity! - s.maturity_score! }))
    .sort((a, b) => b.gap - a.gap);

  if (gapSteps.length > 0) {
    pdf.addPage("a4", "landscape");
    setPageBg(pdf);
    sectionEntries.push({ name: "Gap Analysis", page: pdf.getNumberOfPages() });
    y = margin;
    y = drawSectionTitle(pdf, "Gap Analysis", margin, y);

    // Narrative
    const belowTargetCount = gapSteps.filter((s) => s.gap > 0).length;
    const avgGap = gapSteps.reduce((sum, s) => sum + s.gap, 0) / gapSteps.length;
    const maxGap = Math.max(...gapSteps.map((s) => s.gap));
    const topGapNames = gapSteps.filter((s) => s.gap > 0).slice(0, 3).map((s) => s.name);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.body);
    const gapNarr: string[] = [];
    gapNarr.push(`Of the ${gapSteps.length} scored steps, ${belowTargetCount} fall below their target maturity (average gap: ${avgGap.toFixed(1)}).`);
    if (topGapNames.length > 0) {
      gapNarr.push(`The widest gaps are in "${topGapNames.join('", "')}" — these represent the highest-priority improvement opportunities.`);
    }
    const gapNarrLines = pdf.splitTextToSize(gapNarr.join(" "), contentWidth);
    pdf.text(gapNarrLines, margin, y);
    y += gapNarrLines.length * T.lineHeight + T.paraGap;

    // Summary stats - inline
    const gapStats = [
      { label: "STEPS SCORED", value: String(gapSteps.length) },
      { label: "BELOW TARGET", value: String(belowTargetCount) },
      { label: "AVG GAP", value: avgGap.toFixed(1) },
      { label: "MAX GAP", value: String(maxGap) },
    ];

    const gapCardW = 42;
    const gapCardGap = 4;
    gapStats.forEach((stat, i) => {
      const x = margin + i * (gapCardW + gapCardGap);
      pdf.setDrawColor(...T.cardBorder);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, y, gapCardW, 14, 1.5, 1.5, "S");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...T.navy);
      pdf.text(stat.value, x + gapCardW / 2, y + 8, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(...T.muted);
      pdf.text(stat.label, x + gapCardW / 2, y + 12.5, { align: "center" });
    });
    y += 18;

    // Gap table
    const gapCols = [
      { label: "Step", width: 70 },
      { label: "Section", width: 60 },
      { label: "Current", width: 30 },
      { label: "Target", width: 30 },
      { label: "Gap", width: 25 },
      { label: "", width: contentWidth - 70 - 60 - 30 - 30 - 25 },
    ];

    y = drawTableHeaderRow(pdf, gapCols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    for (let rowIndex = 0; rowIndex < gapSteps.length; rowIndex++) {
      const step = gapSteps[rowIndex];
      const remainingGapRows = gapSteps.length - rowIndex;

      if (y > pageHeight - margin - 5 && remainingGapRows > 3) {
        y = newTablePageClean(pdf, "Gap Analysis", gapCols, margin, contentWidth);
      }

      drawStripeRow(pdf, rowIndex, margin, y, contentWidth);

      let colX = margin + 2;

      pdf.setTextColor(...T.navy);
      pdf.text(truncate(step.name, 40), colX, y + 3);
      colX += gapCols[0].width;

      pdf.setTextColor(...T.muted);
      const secName = step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014";
      pdf.text(truncate(secName, 35), colX, y + 3);
      colX += gapCols[1].width;

      if (step.maturity_score != null) {
        const color = MATURITY_COLORS[step.maturity_score];
        if (color) {
          const [r, g, b] = hexToRgb(color);
          pdf.setFillColor(r, g, b);
          pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        }
        pdf.setTextColor(...T.navy);
        pdf.text(String(step.maturity_score), colX + 5, y + 3);
      }
      colX += gapCols[2].width;

      pdf.setTextColor(...T.navy);
      pdf.text(String(step.target_maturity ?? ""), colX + 5, y + 3);
      colX += gapCols[3].width;

      const gapColor = getGapColor(step.gap);
      const [gr, gg, gb] = hexToRgb(gapColor);
      pdf.setTextColor(gr, gg, gb);
      pdf.text(step.gap > 0 ? `+${step.gap}` : String(step.gap), colX, y + 3);
      colX += gapCols[4].width;

      if (step.gap > 0 && maxGap > 0) {
        const barMaxWidth = gapCols[5].width - 4;
        const barWidth = (step.gap / maxGap) * barMaxWidth;
        pdf.setFillColor(gr, gg, gb);
        pdf.roundedRect(colX, y + 0.5, barWidth, 3, 1, 1, "F");
      }

      y += 6.5;
    }
  }

  // ── Cost Summary ────────────────────────────────────────────────────────
  const totalMonthlyHours = steps.reduce((sum, s) => {
    if (s.time_minutes && s.frequency_per_month) {
      return sum + (s.time_minutes * s.frequency_per_month) / 60;
    }
    return sum;
  }, 0);

  const totalMonthlyCost = steps.reduce((total, s) => {
    return total + computeStepMonthlyCost(s, stepRolesMap, stepToolsMap);
  }, 0);

  if (totalMonthlyHours > 0 || totalMonthlyCost > 0) {
    pdf.addPage("a4", "landscape");
    setPageBg(pdf);
    sectionEntries.push({ name: "Cost Summary", page: pdf.getNumberOfPages() });
    y = margin;
    y = drawSectionTitle(pdf, "Cost Summary", margin, y);

    // Narrative
    {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      const costNarrative: string[] = [];
      costNarrative.push(`The process requires approximately ${totalMonthlyHours.toFixed(1)} hours of effort per month across all phases.`);
      if (totalMonthlyCost > 0) {
        costNarrative.push(`At current staffing rates, this translates to an estimated monthly cost of $${formatCurrency(totalMonthlyCost)} ($${formatCurrency(totalMonthlyCost * 12)} annually).`);
      }
      const sectionCostsPre = sections.map((section) => {
        const sSteps = steps.filter((s) => s.section_id === section.id);
        const cost = sSteps.reduce((sum, s) => sum + computeStepMonthlyCost(s, stepRolesMap, stepToolsMap), 0);
        const hrs = sSteps.reduce((sum, s) => {
          if (s.time_minutes && s.frequency_per_month) return sum + (s.time_minutes * s.frequency_per_month) / 60;
          return sum;
        }, 0);
        return { name: section.name, cost, hours: hrs };
      }).filter((s) => s.cost > 0 || s.hours > 0);
      const topSection = [...sectionCostsPre].sort((a, b) => (b.cost || b.hours) - (a.cost || a.hours))[0];
      if (topSection) {
        const pct = totalMonthlyHours > 0 ? Math.round((topSection.hours / totalMonthlyHours) * 100) : 0;
        costNarrative.push(`"${topSection.name}" is the most resource-intensive phase, consuming ${pct}% of total effort. This is the natural starting point for efficiency improvements.`);
      }
      const costNarrLines = pdf.splitTextToSize(costNarrative.join(" "), contentWidth);
      pdf.text(costNarrLines, margin, y);
      y += costNarrLines.length * T.lineHeight + T.paraGap;
    }

    // Summary cards
    const costCardItems = [
      { label: "MONTHLY HOURS", value: `${totalMonthlyHours.toFixed(1)}h` },
    ];
    if (totalMonthlyCost > 0) {
      costCardItems.push({ label: "MONTHLY COST", value: `$${formatCurrency(totalMonthlyCost)}` });
      costCardItems.push({ label: "ANNUAL COST", value: `$${formatCurrency(totalMonthlyCost * 12)}` });
    }

    const costCardW = 55;
    const costCardGap = 4;
    costCardItems.forEach((stat, i) => {
      const x = margin + i * (costCardW + costCardGap);
      pdf.setDrawColor(...T.cardBorder);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(x, y, costCardW, 14, 1.5, 1.5, "S");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(13);
      pdf.setTextColor(...T.navy);
      pdf.text(stat.value, x + costCardW / 2, y + 8, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(...T.muted);
      pdf.text(stat.label, x + costCardW / 2, y + 12.5, { align: "center" });
    });
    y += 20;

    // Section cost breakdown
    const sectionCosts = sections.map((section) => {
      const sectionSteps = steps.filter((s) => s.section_id === section.id);
      const hrs = sectionSteps.reduce((sum, s) => {
        if (s.time_minutes && s.frequency_per_month) {
          return sum + (s.time_minutes * s.frequency_per_month) / 60;
        }
        return sum;
      }, 0);
      const cost = sectionSteps.reduce((sum, s) => sum + computeStepMonthlyCost(s, stepRolesMap, stepToolsMap), 0);
      return { name: section.name, stepCount: sectionSteps.length, hours: hrs, cost };
    }).filter((s) => s.hours > 0 || s.cost > 0);

    if (sectionCosts.length > 0) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.h2Size);
      pdf.setTextColor(...T.navy);
      pdf.text("By Phase", margin, y);
      y += 6;

      const costCols = [
        { label: "Phase", width: 80 },
        { label: "Steps", width: 30 },
        { label: "Hrs/month", width: 40 },
        { label: "Cost/month", width: 50 },
        { label: "", width: contentWidth - 80 - 30 - 40 - 50 },
      ];

      y = drawTableHeaderRow(pdf, costCols, margin, contentWidth, y);

      const sortedSectionCosts = [...sectionCosts].sort((a, b) => {
        if (a.cost !== b.cost) return b.cost - a.cost;
        return b.hours - a.hours;
      });

      const maxSectionVal = Math.max(...sortedSectionCosts.map((s) => s.cost || s.hours));

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.tableSize);

      for (let rowIndex = 0; rowIndex < sortedSectionCosts.length; rowIndex++) {
        const sec = sortedSectionCosts[rowIndex];

        if (y > pageHeight - margin - 5) {
          y = newTablePageClean(pdf, "Cost Summary", costCols, margin, contentWidth);
        }

        drawStripeRow(pdf, rowIndex, margin, y, contentWidth);

        let colX = margin + 2;

        pdf.setTextColor(...T.navy);
        pdf.text(truncate(sec.name, 45), colX, y + 3);
        colX += costCols[0].width;

        pdf.setTextColor(...T.muted);
        pdf.text(String(sec.stepCount), colX, y + 3);
        colX += costCols[1].width;

        pdf.setTextColor(...T.navy);
        pdf.text(sec.hours.toFixed(1), colX, y + 3);
        colX += costCols[2].width;

        if (sec.cost > 0) {
          pdf.text(`$${formatCurrency(sec.cost)}`, colX, y + 3);
        } else {
          pdf.setTextColor(...T.faint);
          pdf.text("\u2014", colX, y + 3);
        }
        colX += costCols[3].width;

        const barVal = sec.cost || sec.hours;
        if (barVal > 0 && maxSectionVal > 0) {
          const barMaxWidth = costCols[4].width - 4;
          const barWidth = (barVal / maxSectionVal) * barMaxWidth;
          pdf.setFillColor(...T.teal);
          pdf.roundedRect(colX, y + 0.5, barWidth, 3, 1, 1, "F");
        }

        y += 6.5;
      }
    }

    // Top 5 costliest steps
    const stepCosts = steps
      .map((s) => ({
        name: s.name,
        section: s.section_id ? sectionMap.get(s.section_id) ?? "" : "",
        hours: s.time_minutes && s.frequency_per_month ? (s.time_minutes * s.frequency_per_month) / 60 : 0,
        cost: computeStepMonthlyCost(s, stepRolesMap, stepToolsMap),
      }))
      .filter((s) => s.hours > 0 || s.cost > 0)
      .sort((a, b) => {
        if (a.cost !== b.cost) return b.cost - a.cost;
        return b.hours - a.hours;
      })
      .slice(0, 5);

    if (stepCosts.length > 0) {
      y += 6;

      if (y > pageHeight - margin - 40) {
        pdf.addPage("a4", "landscape");
        setPageBg(pdf);
        y = margin;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.h2Size);
      pdf.setTextColor(...T.navy);
      pdf.text("Top 5 Costliest Steps", margin, y);
      y += 6;

      const topCols = [
        { label: "Step", width: 80 },
        { label: "Section", width: 60 },
        { label: "Hrs/month", width: 40 },
        { label: "Cost/month", width: 50 },
      ];

      y = drawTableHeaderRow(pdf, topCols, margin, contentWidth, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.tableSize);

      for (let i = 0; i < stepCosts.length; i++) {
        const sc = stepCosts[i];

        drawStripeRow(pdf, i, margin, y, contentWidth);

        let colX = margin + 2;

        pdf.setTextColor(...T.navy);
        pdf.text(truncate(sc.name, 45), colX, y + 3);
        colX += topCols[0].width;

        pdf.setTextColor(...T.muted);
        pdf.text(truncate(sc.section, 35), colX, y + 3);
        colX += topCols[1].width;

        pdf.setTextColor(...T.navy);
        pdf.text(sc.hours.toFixed(1), colX, y + 3);
        colX += topCols[2].width;

        if (sc.cost > 0) {
          pdf.text(`$${formatCurrency(sc.cost)}`, colX, y + 3);
        } else {
          pdf.setTextColor(...T.faint);
          pdf.text("\u2014", colX, y + 3);
        }

        y += 6.5;
      }
    }
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  if (!skipFooter) {
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      // Bottom line
      pdf.setDrawColor(...T.border);
      pdf.setLineWidth(0.2);
      pdf.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

      pdf.setFontSize(7);
      pdf.setTextColor(...T.faint);
      pdf.text(
        `${workspaceName} \u2014 Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 4,
        { align: "center" },
      );
      pdf.setTextColor(...T.teal);
      pdf.text("Stride", pageWidth - margin, pageHeight - 4, { align: "right" });
    }
  }

  return { pdf, sections: sectionEntries };
}

export async function exportWorkspacePdf(opts: ExportPdfOptions): Promise<void> {
  const { pdf } = await createWorkspacePdf(opts);
  const safeFilename = opts.workspaceName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  pdf.save(`${safeFilename}-process-report.pdf`);
}

// ── Utility Functions ───────────────────────────────────────────────────────

function buildStepRolesMap(stepRoles: StepRoleForExport[]): Map<string, StepRoleForExport[]> {
  const map = new Map<string, StepRoleForExport[]>();
  for (const sr of stepRoles) {
    const existing = map.get(sr.step_id);
    if (existing) existing.push(sr);
    else map.set(sr.step_id, [sr]);
  }
  return map;
}

function buildStepToolsMap(stepTools: StepToolForExport[]): Map<string, StepToolForExport[]> {
  const map = new Map<string, StepToolForExport[]>();
  for (const st of stepTools) {
    const existing = map.get(st.step_id);
    if (existing) existing.push(st);
    else map.set(st.step_id, [st]);
  }
  return map;
}

function computeStepMonthlyCost(
  step: Step,
  rolesMap: Map<string, StepRoleForExport[]>,
  toolsMap: Map<string, StepToolForExport[]>,
): number {
  const tools = toolsMap.get(step.id) ?? [];
  const toolCost = tools.reduce((sum, st) => sum + (st.tool.cost_per_month ?? 0), 0);
  if (!step.time_minutes || !step.frequency_per_month) return toolCost;
  const monthlyHours = (step.time_minutes * step.frequency_per_month) / 60;
  const roles = rolesMap.get(step.id) ?? [];
  const rolesWithRate = roles.filter((sr) => sr.role.hourly_rate != null);
  if (rolesWithRate.length === 0) return toolCost;
  const avgRate = rolesWithRate.reduce((sum, sr) => sum + Number(sr.role.hourly_rate), 0) / rolesWithRate.length;
  return monthlyHours * avgRate + toolCost;
}

function getGapColor(gap: number): string {
  if (gap <= 0) return GAP_COLORS[0];
  if (gap >= 5) return GAP_COLORS[5];
  return GAP_COLORS[gap] ?? GAP_COLORS[3];
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [100, 100, 100];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import type { Section, Step, Connection, ImprovementIdea } from "@/types/database";
import { MATURITY_COLORS } from "@/lib/maturity";
import {
  T,
  GAP_COLORS,
  hexToRgb,
  truncate,
  formatStatus,
  formatCurrency,
  getGapColor,
  safeDivide,
  safeMax,
  setPageBg,
  drawAccentLine,
  drawSectionTitle,
  drawTableHeaderRow,
  drawStripeRow,
  newTablePageClean,
  drawStatCard,
  buildStepRolesMap,
  buildStepToolsMap,
  computeStepMonthlyCost,
  shouldBreakTable,
  withTimeout,
  renderFooter,
  deriveGapType,
  VALUE_TYPE_META,
  getRevenueTier,
  buildPreviousScoreMap,
  formatDelta,
  stripHtml,
} from "./pdf-theme";
import type { RevenueConfig, BaselineData } from "./pdf-theme";
import type { StepRoleForExport, StepToolForExport, PdfSectionEntry } from "./pdf-theme";

// Re-export shared types so existing consumers keep working
export type { StepRoleForExport, StepToolForExport, PdfSectionEntry } from "./pdf-theme";

// ── Interfaces ──────────────────────────────────────────────────────────────

interface ExportPdfOptions {
  workspaceName: string;
  sections: Section[];
  steps: Step[];
  connections: Connection[];
  canvasElement: HTMLElement | null;
  stepRoles?: StepRoleForExport[];
  stepTools?: StepToolForExport[];
}

// ── Extracted Base Sections ────────────────────────────────────────────────

export async function renderBaseCanvasSnapshot(
  pdf: jsPDF,
  canvasElement: HTMLElement | null,
  sectionEntries: PdfSectionEntry[],
  sections?: Section[],
  steps?: Step[],
): Promise<void> {
  if (canvasElement === null) return;

  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin: number = T.margin;
  const contentWidth = pdf.internal.pageSize.getWidth() - margin * 2;

  pdf.addPage("a4", "landscape");
  setPageBg(pdf);
  sectionEntries.push({ name: "Process Map", page: pdf.getNumberOfPages() });
  let y = margin;
  y = drawSectionTitle(pdf, "Process Map", margin, y);

  // Introductory context line
  if (sections && sections.length > 0 && steps) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.body);
    const introText = `Visual overview of the end-to-end process flow across ${sections.length} phase${sections.length !== 1 ? "s" : ""} and ${steps.length} steps.`;
    pdf.text(introText, margin, y);
    y += T.lineH + 3;
  }

  // Determine if we have room for a summary table below the image
  const hasSummaryData = sections && sections.length > 0 && steps;
  // Reserve space: summary needs ~8mm per section row + 20mm header/subheading
  const summaryReserve = hasSummaryData ? Math.min(sections!.length * 6.5 + 28, 70) : 0;
  const canvasMaxH = pageHeight - y - margin - summaryReserve;

  try {
    // Inject light-theme overrides so dark-themed nodes render white for PDF
    const lightStyle = document.createElement("style");
    lightStyle.setAttribute("data-pdf-export", "true");
    lightStyle.textContent = `
      .react-flow,
      .react-flow .react-flow__renderer,
      .react-flow .react-flow__viewport,
      .react-flow .react-flow__background { background-color: #ffffff !important; background: #ffffff !important; }
      .react-flow .react-flow__node,
      .react-flow .react-flow__node * {
        background-color: #ffffff !important;
        background: #ffffff !important;
        color: #1e293b !important;
        border-color: #cbd5e1 !important;
        fill: #1e293b !important;
      }
      .react-flow .react-flow__node [class*="badge"],
      .react-flow .react-flow__node [class*="status"],
      .react-flow .react-flow__node [class*="tag"],
      .react-flow .react-flow__node [class*="pill"] {
        background-color: #f1f5f9 !important;
        background: #f1f5f9 !important;
        color: #334155 !important;
        border-color: #e2e8f0 !important;
      }
      .react-flow .react-flow__edge path { stroke: #64748b !important; }
      .react-flow svg rect { fill: #ffffff !important; }
    `;
    document.head.appendChild(lightStyle);

    const dataUrl = await withTimeout(
      toPng(canvasElement, {
        backgroundColor: "#ffffff",
        pixelRatio: 3,
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
      }),
      30_000,
      "Canvas snapshot",
    );

    // Remove light-theme overrides
    lightStyle.remove();

    const canvasAvailHeight = canvasMaxH;
    const canvasAvailWidth = contentWidth;

    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = dataUrl;
    });

    if (img.width === 0 || img.height === 0) return;
    const imgAspect = img.width / img.height;
    const boxAspect = safeDivide(canvasAvailWidth, canvasAvailHeight);

    let imgW: number;
    let imgH: number;
    if (imgAspect > boxAspect) {
      imgW = canvasAvailWidth;
      imgH = safeDivide(canvasAvailWidth, imgAspect);
    } else {
      imgH = canvasAvailHeight;
      imgW = canvasAvailHeight * imgAspect;
    }

    // Light border around snapshot
    pdf.setDrawColor(...T.border);
    pdf.setLineWidth(0.3);
    pdf.rect(margin, y, imgW, imgH, "S");
    pdf.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
    y += imgH + 6;
  } catch {
    // Ensure light-theme style is cleaned up on error
    document.querySelector('style[data-pdf-export]')?.remove();
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.muted);
    pdf.text("Canvas snapshot unavailable", margin, y + 10);
    y += 16;
  }

  // ── Process Structure summary below the canvas image ──
  if (hasSummaryData) {
    const sortedSections = [...sections!].sort((a, b) => {
      if (a.position_y !== b.position_y) return a.position_y - b.position_y;
      return a.position_x - b.position_x;
    });

    // If not enough room on current page, add a new page
    const neededH = sortedSections.length * 6.5 + 20;
    if (y + neededH > pageHeight - 10) {
      pdf.addPage("a4", "landscape");
      setPageBg(pdf);
      y = margin;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h2);
    pdf.setTextColor(...T.navy);
    pdf.text("Process Structure", margin, y);
    y += 6;

    const structCols = [
      { label: "Phase", width: 72 },
      { label: "Steps", width: 24 },
      { label: "Live", width: 22 },
      { label: "Draft", width: 22 },
      { label: "Avg Maturity", width: 32 },
      { label: "Hrs/mo", width: 28 },
      { label: "", width: contentWidth - 72 - 24 - 22 - 22 - 32 - 28 },
    ];

    y = drawTableHeaderRow(pdf, structCols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    const maxSectionHrs = safeMax(sortedSections.map((sec) => {
      const sSteps = steps!.filter((s) => s.section_id === sec.id);
      return sSteps.reduce((sum, s) => {
        if (s.time_minutes && s.frequency_per_month) return sum + (s.time_minutes * s.frequency_per_month) / 60;
        return sum;
      }, 0);
    }));

    for (let ri = 0; ri < sortedSections.length; ri++) {
      const sec = sortedSections[ri];
      const sSteps = steps!.filter((s) => s.section_id === sec.id);
      const liveCount = sSteps.filter((s) => s.status === "live").length;
      const draftCount = sSteps.filter((s) => s.status === "draft").length;
      const scored = sSteps.filter((s) => s.maturity_score != null);
      const avgMat = scored.length > 0
        ? (scored.reduce((sum, s) => sum + s.maturity_score!, 0) / scored.length).toFixed(1)
        : "\u2014";
      const hrs = sSteps.reduce((sum, s) => {
        if (s.time_minutes && s.frequency_per_month) return sum + (s.time_minutes * s.frequency_per_month) / 60;
        return sum;
      }, 0);

      drawStripeRow(pdf, ri, margin, y, contentWidth);

      let colX = margin + 2;
      pdf.setTextColor(...T.navy);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.tableSize);
      pdf.text(truncate(sec.name, 42), colX, y + 3);
      colX += structCols[0].width;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...T.body);
      pdf.text(String(sSteps.length), colX, y + 3);
      colX += structCols[1].width;

      const liveColor = liveCount > 0 ? T.green : T.faint;
      pdf.setTextColor(liveColor[0], liveColor[1], liveColor[2]);
      pdf.text(liveCount > 0 ? String(liveCount) : "\u2014", colX, y + 3);
      colX += structCols[2].width;

      const draftColor = draftCount > 0 ? T.muted : T.faint;
      pdf.setTextColor(draftColor[0], draftColor[1], draftColor[2]);
      pdf.text(draftCount > 0 ? String(draftCount) : "\u2014", colX, y + 3);
      colX += structCols[3].width;

      if (scored.length > 0) {
        const matVal = parseFloat(avgMat);
        const matColor: readonly [number, number, number] = matVal >= 4 ? T.green : matVal >= 3 ? T.amber : T.red;
        pdf.setFillColor(matColor[0], matColor[1], matColor[2]);
        pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        pdf.setTextColor(...T.navy);
        pdf.text(avgMat, colX + 5, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX + 5, y + 3);
      }
      colX += structCols[4].width;

      pdf.setTextColor(...T.navy);
      pdf.text(hrs > 0 ? hrs.toFixed(1) : "\u2014", colX, y + 3);
      colX += structCols[5].width;

      // Effort bar
      if (hrs > 0 && maxSectionHrs > 0) {
        const barMaxW = structCols[6].width - 4;
        const barW = safeDivide(hrs, maxSectionHrs) * barMaxW;
        pdf.setFillColor(...T.teal);
        pdf.roundedRect(colX, y + 0.5, barW, 3, 1, 1, "F");
      }

      y += 6.5;
    }
  }
}

export function renderBaseStepDetails(
  pdf: jsPDF,
  steps: Step[],
  sections: Section[],
  sectionEntries: PdfSectionEntry[],
): void {
  if (steps.length === 0) return;

  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin: number = T.margin;
  const contentWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

  pdf.addPage("a4", "landscape");
  setPageBg(pdf);
  sectionEntries.push({ name: "Step Details", page: pdf.getNumberOfPages() });
  let y = margin;
  y = drawSectionTitle(pdf, "Step Details", margin, y);

  // Intro paragraph
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.bodySize);
  pdf.setTextColor(...T.body);
  const stepIntro = `The following table lists all ${steps.length} steps in this process, sorted by their position in the workflow. Maturity scores are rated 1-5, with gaps indicating the distance between current and target state.`;
  const stepIntroLines = pdf.splitTextToSize(stepIntro, contentWidth);
  pdf.text(stepIntroLines, margin, y);
  y += stepIntroLines.length * T.lineH + T.paraGap;

  const cols = [
    { label: "Step", width: 68 },
    { label: "Section", width: 48 },
    { label: "Status", width: 24 },
    { label: "Maturity", width: 22 },
    { label: "Target", width: 19 },
    { label: "Gap", width: 18 },
    { label: "Min/run", width: 20 },
    { label: "Freq/mo", width: 20 },
    { label: "Hrs/mo", width: contentWidth - 68 - 48 - 24 - 22 - 19 - 18 - 20 - 20 },
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

    if (shouldBreakTable(y, pageHeight, margin, sortedSteps.length - rowIndex)) {
      y = newTablePageClean(pdf, "Step Details", cols, margin, contentWidth);
    }

    drawStripeRow(pdf, rowIndex, margin, y, contentWidth);

    let colX = margin + 2;
    pdf.setTextColor(...T.navy);
    pdf.text(truncate(step.name, 48), colX, y + 3);
    colX += cols[0].width;

    pdf.setTextColor(...T.muted);
    const sectionName = step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014";
    pdf.text(truncate(sectionName, 30), colX, y + 3);
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

export function renderBaseGapAnalysis(
  pdf: jsPDF,
  steps: Step[],
  sections: Section[],
  sectionEntries: PdfSectionEntry[],
  baselineData?: BaselineData | null,
): void {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin: number = T.margin;
  const contentWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

  const gapSteps = steps
    .filter((s) => s.maturity_score != null && s.target_maturity != null)
    .map((s) => ({ ...s, gap: s.target_maturity! - s.maturity_score! }))
    .sort((a, b) => b.gap - a.gap);

  if (gapSteps.length === 0) return;

  pdf.addPage("a4", "landscape");
  setPageBg(pdf);
  sectionEntries.push({ name: "Gap Analysis", page: pdf.getNumberOfPages() });
  let y = margin;
  y = drawSectionTitle(pdf, "Gap Analysis", margin, y);

  // Narrative
  const belowTargetCount = gapSteps.filter((s) => s.gap > 0).length;
  const avgGap = safeDivide(gapSteps.reduce((sum, s) => sum + s.gap, 0), gapSteps.length);
  const maxGap = safeMax(gapSteps.map((s) => s.gap));
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
  y += gapNarrLines.length * T.lineH + T.paraGap;

  // Summary stats
  const gapStats = [
    { label: "STEPS SCORED", value: String(gapSteps.length) },
    { label: "BELOW TARGET", value: String(belowTargetCount) },
    { label: "AVG GAP", value: avgGap.toFixed(1) },
    { label: "MAX GAP", value: String(maxGap) },
  ];

  // R8: Delta summary when in review mode
  const prevMap = baselineData ? buildPreviousScoreMap(baselineData.previous_scores) : null;
  const isReviewMode = prevMap != null && prevMap.size > 0;
  let improved = 0;
  let unchanged = 0;
  let regressed = 0;
  if (isReviewMode) {
    for (const step of gapSteps) {
      const prev = prevMap.get(step.id);
      if (prev == null || step.maturity_score == null) continue;
      const delta = step.maturity_score - prev;
      if (delta > 0) improved++;
      else if (delta < 0) regressed++;
      else unchanged++;
    }
    gapStats.push({ label: "IMPROVED", value: String(improved) });
    gapStats.push({ label: "UNCHANGED", value: String(unchanged) });
  }

  const gapCardW = 42;
  const gapCardGap = 4;
  const gapCardH = 16;
  const gapCardVariants: ("navy" | "teal" | "default")[] = ["default", "navy", "teal", "default", "teal", "default"];
  gapStats.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (gapCardW + gapCardGap), y, gapCardW, gapCardH, stat.value, stat.label, gapCardVariants[i] ?? "default");
  });
  y += gapCardH + 4;

  // R8: Delta narrative
  if (isReviewMode) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.body);
    const deltaNarr = `Since baseline (${new Date(baselineData!.baseline_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}): ${improved} step${improved !== 1 ? "s" : ""} improved, ${unchanged} unchanged, ${regressed} regressed.`;
    const deltaLines = pdf.splitTextToSize(deltaNarr, contentWidth);
    pdf.text(deltaLines, margin, y);
    y += deltaLines.length * T.lineH + 4;
  }

  // ── Horizontal gap bar chart (top 10 gaps) ──
  const chartSteps = gapSteps.filter((s) => s.gap > 0).slice(0, 10);
  if (chartSteps.length > 0) {
    const labelW = 55;
    const barAreaW = contentWidth - labelW - 10;
    const rowH = 5;
    const chartH = chartSteps.length * rowH + 4;

    // Only render if it fits on the current page
    if (y + chartH + 8 < pageHeight - margin - 40) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.h2);
      pdf.setTextColor(...T.navy);
      pdf.text("Largest Gaps", margin, y);
      y += 5;

      for (let i = 0; i < chartSteps.length; i++) {
        const step = chartSteps[i];
        const rowY = y + i * rowH;

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.tiny);
        pdf.setTextColor(...T.body);
        pdf.text(truncate(step.name, 35), margin, rowY + 3);

        // Current maturity bar (teal-light fill)
        const barX = margin + labelW;
        const currentW = safeDivide(step.maturity_score!, 5) * barAreaW;
        pdf.setFillColor(...T.tealLight);
        pdf.rect(barX, rowY, currentW, rowH - 1, "F");

        // Target bar overlay (gap portion)
        const targetW = safeDivide(step.target_maturity!, 5) * barAreaW;
        const gapBarX = barX + currentW;
        const gapBarW = targetW - currentW;
        if (gapBarW > 0) {
          const gapColor = getGapColor(step.gap);
          const [r, g, b] = hexToRgb(gapColor);
          pdf.setFillColor(r, g, b);
          pdf.rect(gapBarX, rowY, gapBarW, rowH - 1, "F");
        }

        // Gap value label
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(6);
        pdf.setTextColor(...T.navy);
        pdf.text(`+${step.gap}`, barX + targetW + 2, rowY + 3);
      }

      y += chartSteps.length * rowH + 6;

      // Chart annotation — identify dominant section in top gaps
      const sectionGapCounts = new Map<string, number>();
      for (const s of chartSteps) {
        const sec = s.section_id ? sectionMap.get(s.section_id) ?? "Unknown" : "Unknown";
        sectionGapCounts.set(sec, (sectionGapCounts.get(sec) ?? 0) + 1);
      }
      const topGapSection = [...sectionGapCounts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (topGapSection && topGapSection[1] >= 2) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(T.small);
        pdf.setTextColor(...T.muted);
        pdf.text(`"${truncate(topGapSection[0], 40)}" accounts for ${topGapSection[1]} of the top ${chartSteps.length} gaps.`, margin, y);
        y += 5;
      }
    }
  }

  // ── Gap type summary line ──
  const gapTypeCounts = { discipline: 0, complexity: 0, unclassified: 0 };
  for (const step of gapSteps) {
    if (step.gap <= 0) continue;
    const gType = deriveGapType(step);
    if (gType === "discipline") gapTypeCounts.discipline++;
    else if (gType === "complexity") gapTypeCounts.complexity++;
    else gapTypeCounts.unclassified++;
  }
  const hasGapTypes = gapTypeCounts.discipline > 0 || gapTypeCounts.complexity > 0;

  if (hasGapTypes) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.body);
    const parts: string[] = [];
    if (gapTypeCounts.discipline > 0) parts.push(`${gapTypeCounts.discipline} discipline gap${gapTypeCounts.discipline !== 1 ? "s" : ""} (low effort — process/training fix)`);
    if (gapTypeCounts.complexity > 0) parts.push(`${gapTypeCounts.complexity} complexity gap${gapTypeCounts.complexity !== 1 ? "s" : ""} (high effort — tooling/redesign needed)`);
    const summaryText = `Gap classification: ${parts.join("; ")}.`;
    const summaryLines = pdf.splitTextToSize(summaryText, contentWidth);
    pdf.text(summaryLines, margin, y);
    y += summaryLines.length * T.lineH + 4;
  }

  // Gap table
  const typeColW = hasGapTypes ? 30 : 0;
  const deltaColW = isReviewMode ? 25 : 0;
  const stepColShrink = (hasGapTypes ? 10 : 0) + (isReviewMode ? 5 : 0);
  const secColShrink = (hasGapTypes ? 8 : 0) + (isReviewMode ? 5 : 0);
  const gapCols = [
    { label: "Step", width: 80 - stepColShrink },
    ...(hasGapTypes ? [{ label: "Type", width: typeColW }] : []),
    { label: "Section", width: 52 - secColShrink },
    { label: "Current", width: 25 },
    { label: "Target", width: 25 },
    { label: "Gap", width: 22 },
    ...(isReviewMode ? [{ label: "Delta", width: deltaColW }] : []),
    { label: "", width: contentWidth - (80 - stepColShrink) - typeColW - (52 - secColShrink) - 25 - 25 - 22 - deltaColW },
  ];

  y = drawTableHeaderRow(pdf, gapCols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.tableSize);

  for (let rowIndex = 0; rowIndex < gapSteps.length; rowIndex++) {
    const step = gapSteps[rowIndex];

    if (shouldBreakTable(y, pageHeight, margin, gapSteps.length - rowIndex)) {
      y = newTablePageClean(pdf, "Gap Analysis", gapCols, margin, contentWidth);
    }

    drawStripeRow(pdf, rowIndex, margin, y, contentWidth);

    let colX = margin + 2;

    pdf.setTextColor(...T.navy);
    pdf.text(truncate(step.name, hasGapTypes ? 42 : 50), colX, y + 3);
    colX += gapCols[0].width;

    // TYPE column (only when gap types exist)
    if (hasGapTypes) {
      const gType = deriveGapType(step);
      if (gType === "discipline") {
        pdf.setTextColor(...T.green);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.tiny);
        pdf.text("DISCIPLINE", colX, y + 3);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.tableSize);
      } else if (gType === "complexity") {
        pdf.setTextColor(...T.amber);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.tiny);
        pdf.text("COMPLEXITY", colX, y + 3);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.tableSize);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += typeColW;
    }

    pdf.setTextColor(...T.muted);
    const secName = step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014";
    pdf.text(truncate(secName, hasGapTypes ? 24 : 30), colX, y + 3);
    colX += gapCols[hasGapTypes ? 2 : 1].width;

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
    colX += 25;

    pdf.setTextColor(...T.navy);
    pdf.text(String(step.target_maturity ?? ""), colX + 5, y + 3);
    colX += 25;

    const gapColor = getGapColor(step.gap);
    const [gr, gg, gb] = hexToRgb(gapColor);
    pdf.setTextColor(gr, gg, gb);
    pdf.text(step.gap > 0 ? `+${step.gap}` : String(step.gap), colX, y + 3);
    colX += 22;

    // R8: Delta column
    if (isReviewMode && prevMap) {
      const prev = prevMap.get(step.id);
      if (prev != null && step.maturity_score != null) {
        const d = formatDelta(step.maturity_score, prev);
        pdf.setTextColor(d.color[0], d.color[1], d.color[2]);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.tableSize);
        pdf.text(`${prev}\u2192${step.maturity_score} (${d.text})`, colX, y + 3);
        pdf.setFont("helvetica", "normal");
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += deltaColW;
    }

    if (step.gap > 0 && maxGap > 0) {
      const barColWidth = gapCols[gapCols.length - 1].width;
      const barMaxWidth = barColWidth - 4;
      const barWidth = safeDivide(step.gap, maxGap) * barMaxWidth;
      pdf.setFillColor(gr, gg, gb);
      pdf.roundedRect(colX, y + 0.5, barWidth, 3, 1, 1, "F");
    }

    y += 6.5;
  }
}

export function renderBaseCostSummary(
  pdf: jsPDF,
  steps: Step[],
  sections: Section[],
  stepRoles: StepRoleForExport[],
  stepTools: StepToolForExport[],
  sectionEntries: PdfSectionEntry[],
  revenueConfig?: RevenueConfig | null,
  improvements?: ImprovementIdea[] | null,
): void {
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin: number = T.margin;
  const contentWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));
  const stepRolesMap = buildStepRolesMap(stepRoles);
  const stepToolsMap = buildStepToolsMap(stepTools);

  const totalMonthlyHours = steps.reduce((sum, s) => {
    if (s.time_minutes && s.frequency_per_month) {
      return sum + (s.time_minutes * s.frequency_per_month) / 60;
    }
    return sum;
  }, 0);

  const totalMonthlyCost = steps.reduce((total, s) => {
    return total + computeStepMonthlyCost(s, stepRolesMap, stepToolsMap);
  }, 0);

  if (totalMonthlyHours <= 0 && totalMonthlyCost <= 0) return;

  pdf.addPage("a4", "landscape");
  setPageBg(pdf);
  sectionEntries.push({ name: "Cost Summary", page: pdf.getNumberOfPages() });
  let y = margin;
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
    if (topSection && totalMonthlyHours > 0) {
      const pct = Math.round(safeDivide(topSection.hours, totalMonthlyHours) * 100);
      costNarrative.push(`"${topSection.name}" is the most resource-intensive phase, consuming ${pct}% of total effort. This is the natural starting point for efficiency improvements.`);
    }
    const costNarrLines = pdf.splitTextToSize(costNarrative.join(" "), contentWidth);
    pdf.text(costNarrLines, margin, y);
    y += costNarrLines.length * T.lineH + T.paraGap;
  }

  // Summary cards
  const costCardItems: { label: string; value: string }[] = [
    { label: "MONTHLY HOURS", value: `${totalMonthlyHours.toFixed(1)}h` },
  ];
  if (totalMonthlyCost > 0) {
    costCardItems.push({ label: "MONTHLY COST", value: `$${formatCurrency(totalMonthlyCost)}` });
    costCardItems.push({ label: "ANNUAL COST", value: `$${formatCurrency(totalMonthlyCost * 12)}` });
  }

  const costCardW = 55;
  const costCardGap = 4;
  const costCardH = 16;
  const costVariants: ("navy" | "teal" | "default")[] = ["default", "navy", "teal"];
  costCardItems.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (costCardW + costCardGap), y, costCardW, costCardH, stat.value, stat.label, costVariants[i] ?? "default");
  });
  y += costCardH + 4;

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
    pdf.setFontSize(T.h2);
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

    const maxSectionVal = safeMax(sortedSectionCosts.map((s) => s.cost || s.hours));

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    for (let rowIndex = 0; rowIndex < sortedSectionCosts.length; rowIndex++) {
      const sec = sortedSectionCosts[rowIndex];

      if (shouldBreakTable(y, pageHeight, margin, sortedSectionCosts.length - rowIndex)) {
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
        const barWidth = safeDivide(barVal, maxSectionVal) * barMaxWidth;
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
    pdf.setFontSize(T.h2);
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

      if (shouldBreakTable(y, pageHeight, margin, stepCosts.length - i)) {
        y = newTablePageClean(pdf, "Top 5 Costliest Steps", topCols, margin, contentWidth);
      }

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

  // ── Value / Waste Split (only when at least one step has a value_type) ──
  const classifiedSteps = steps.filter((s) => s.value_type != null);
  if (classifiedSteps.length > 0) {
    y += 6;

    if (y > pageHeight - margin - 60) {
      pdf.addPage("a4", "landscape");
      setPageBg(pdf);
      y = margin;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h2);
    pdf.setTextColor(...T.navy);
    pdf.text("Value / Waste Analysis", margin, y);
    y += 6;

    // Compute totals by value type
    const byType: Record<string, { count: number; hours: number; cost: number }> = {};
    for (const s of steps) {
      const vt = s.value_type ?? "unclassified";
      if (!byType[vt]) byType[vt] = { count: 0, hours: 0, cost: 0 };
      byType[vt].count++;
      if (s.time_minutes && s.frequency_per_month) {
        byType[vt].hours += (s.time_minutes * s.frequency_per_month) / 60;
      }
      byType[vt].cost += computeStepMonthlyCost(s, stepRolesMap, stepToolsMap);
    }

    // Summary cards: value vs waste hours
    const valueHrs = (byType.value_adding?.hours ?? 0);
    const wasteHrs = (byType.necessary_waste?.hours ?? 0) + (byType.pure_waste?.hours ?? 0);
    const wastePct = totalMonthlyHours > 0 ? Math.round(safeDivide(wasteHrs, totalMonthlyHours) * 100) : 0;

    const vwCards = [
      { label: "VALUE-ADDING", value: `${valueHrs.toFixed(1)}h`, variant: "teal" as const },
      { label: "WASTE (TOTAL)", value: `${wasteHrs.toFixed(1)}h`, variant: "navy" as const },
      { label: "WASTE %", value: `${wastePct}%`, variant: "default" as const },
    ];
    const vwCardW = 50;
    const vwCardGap = 4;
    vwCards.forEach((card, i) => {
      drawStatCard(pdf, margin + i * (vwCardW + vwCardGap), y, vwCardW, 16, card.value, card.label, card.variant);
    });
    y += 20;

    // Breakdown table
    const vtCols = [
      { label: "Category", width: 50 },
      { label: "Steps", width: 30 },
      { label: "Hrs/month", width: 40 },
      { label: "Cost/month", width: 50 },
      { label: "% of Total", width: 35 },
      { label: "", width: contentWidth - 50 - 30 - 40 - 50 - 35 },
    ];

    y = drawTableHeaderRow(pdf, vtCols, margin, contentWidth, y);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.tableSize);

    const typeOrder = ["value_adding", "necessary_waste", "pure_waste", "unclassified"];
    let ri = 0;
    for (const vt of typeOrder) {
      const data = byType[vt];
      if (!data || data.count === 0) continue;
      const meta = VALUE_TYPE_META[vt];

      drawStripeRow(pdf, ri, margin, y, contentWidth);
      let colX = margin + 2;

      // Category label with color indicator
      if (meta) {
        pdf.setFillColor(meta.color[0], meta.color[1], meta.color[2]);
        pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        pdf.setTextColor(...T.navy);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(T.tableSize);
        pdf.text(meta.label, colX + 5, y + 3);
      } else {
        pdf.setTextColor(...T.muted);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(T.tableSize);
        pdf.text("Unclassified", colX + 5, y + 3);
      }
      colX += vtCols[0].width;

      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...T.body);
      pdf.text(String(data.count), colX, y + 3);
      colX += vtCols[1].width;

      pdf.setTextColor(...T.navy);
      pdf.text(data.hours.toFixed(1), colX, y + 3);
      colX += vtCols[2].width;

      if (data.cost > 0) {
        pdf.text(`$${formatCurrency(data.cost)}`, colX, y + 3);
      } else {
        pdf.setTextColor(...T.faint);
        pdf.text("\u2014", colX, y + 3);
      }
      colX += vtCols[3].width;

      const pct = totalMonthlyHours > 0 ? Math.round(safeDivide(data.hours, totalMonthlyHours) * 100) : 0;
      pdf.setTextColor(...T.body);
      pdf.text(`${pct}%`, colX, y + 3);
      colX += vtCols[4].width;

      // Proportion bar
      if (data.hours > 0 && totalMonthlyHours > 0) {
        const barMaxW = vtCols[5].width - 4;
        const barW = safeDivide(data.hours, totalMonthlyHours) * barMaxW;
        const barColor = meta?.color ?? T.muted;
        pdf.setFillColor(barColor[0], barColor[1], barColor[2]);
        pdf.roundedRect(colX, y + 0.5, barW, 3, 1, 1, "F");
      }

      y += 6.5;
      ri++;
    }
  }

  // ── Revenue Impact (tiered per P6) ──
  const revTier = revenueConfig ? getRevenueTier(revenueConfig) : "skip";
  if (revTier !== "skip" && revenueConfig) {
    y += 8;

    if (y > pageHeight - margin - 50) {
      pdf.addPage("a4", "landscape");
      setPageBg(pdf);
      y = margin;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h2);
    pdf.setTextColor(...T.navy);
    pdf.text("Revenue Impact", margin, y);
    y += 6;

    if (revTier === "full") {
      // Full revenue model: monthly revenue, pipeline value, waste cost as % of revenue
      const monthlyRevenue = (revenueConfig.avg_order_value ?? 0) * (revenueConfig.monthly_inquiries ?? 0) * (revenueConfig.close_rate ?? 0);
      const annualRevenue = monthlyRevenue * 12;
      const reorderMultiplier = 1 + (revenueConfig.reorder_rate ?? 0);
      const lifetimeAnnual = annualRevenue * reorderMultiplier;

      // Waste cost
      const wasteSteps = steps.filter((s) => s.value_type === "necessary_waste" || s.value_type === "pure_waste");
      const wasteMonthlyCost = wasteSteps.reduce((sum, s) => sum + computeStepMonthlyCost(s, stepRolesMap, stepToolsMap), 0);
      const wasteAnnualCost = wasteMonthlyCost * 12;
      const wastePctOfRevenue = monthlyRevenue > 0 ? safeDivide(wasteAnnualCost, annualRevenue) * 100 : 0;

      // Narrative
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      const revNarr: string[] = [];
      revNarr.push(`Based on an average order value of $${formatCurrency(revenueConfig.avg_order_value)}, ${revenueConfig.monthly_inquiries} monthly inquiries, and a ${(revenueConfig.close_rate * 100).toFixed(0)}% close rate, estimated monthly revenue is $${formatCurrency(monthlyRevenue)}.`);
      if (wasteMonthlyCost > 0) {
        revNarr.push(`Process waste consumes $${formatCurrency(wasteAnnualCost)} annually — ${wastePctOfRevenue.toFixed(1)}% of revenue.`);
      }
      const revNarrLines = pdf.splitTextToSize(revNarr.join(" "), contentWidth);
      pdf.text(revNarrLines, margin, y);
      y += revNarrLines.length * T.lineH + T.paraGap;

      // Revenue stat cards
      const revCards = [
        { label: "MONTHLY REVENUE", value: `$${formatCurrency(monthlyRevenue)}`, variant: "navy" as const },
        { label: "ANNUAL REVENUE", value: `$${formatCurrency(annualRevenue)}`, variant: "teal" as const },
        { label: "LIFETIME (W/ REORDER)", value: `$${formatCurrency(lifetimeAnnual)}`, variant: "default" as const },
      ];
      if (wasteMonthlyCost > 0) {
        revCards.push({ label: "ANNUAL WASTE COST", value: `$${formatCurrency(wasteAnnualCost)}`, variant: "default" as const });
      }

      const revCardW = 55;
      revCards.forEach((card, i) => {
        drawStatCard(pdf, margin + i * (revCardW + 4), y, revCardW, 16, card.value, card.label, card.variant);
      });
      y += 22;
    } else {
      // Context tier: show available fields as context without full model
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.bodySize);
      pdf.setTextColor(...T.body);
      const contextParts: string[] = [];
      if (revenueConfig.avg_order_value != null && revenueConfig.avg_order_value > 0) contextParts.push(`average order value: $${formatCurrency(revenueConfig.avg_order_value)}`);
      if (revenueConfig.monthly_inquiries != null && revenueConfig.monthly_inquiries > 0) contextParts.push(`monthly inquiries: ${revenueConfig.monthly_inquiries}`);
      if (revenueConfig.close_rate != null && revenueConfig.close_rate > 0) contextParts.push(`close rate: ${(revenueConfig.close_rate * 100).toFixed(0)}%`);
      if (revenueConfig.reorder_rate != null && revenueConfig.reorder_rate > 0) contextParts.push(`reorder rate: ${(revenueConfig.reorder_rate * 100).toFixed(0)}%`);
      const contextText = `Engagement context: ${contextParts.join(", ")}. Complete all four revenue fields to enable full revenue impact modelling.`;
      const contextLines = pdf.splitTextToSize(contextText, contentWidth);
      pdf.text(contextLines, margin, y);
      y += contextLines.length * T.lineH + T.paraGap;
    }
  }

  // ── Potential Savings from Improvements ──
  const ideas = improvements?.filter((idea) => idea.description && idea.status !== "rejected") ?? [];
  if (ideas.length > 0 && totalMonthlyCost > 0) {
    y += 8;

    if (y > pageHeight - margin - 40) {
      pdf.addPage("a4", "landscape");
      setPageBg(pdf);
      y = margin;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(T.h2);
    pdf.setTextColor(...T.navy);
    pdf.text("Potential Savings from Improvements", margin, y);
    y += 6;

    // Sort by priority: critical > high > medium > low
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const sorted = [...ideas].sort((a, b) => (priorityOrder[a.priority] ?? 4) - (priorityOrder[b.priority] ?? 4));
    const top = sorted.slice(0, 5);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(T.bodySize);
    pdf.setTextColor(...T.body);
    const savingsNarr = `${ideas.length} improvement${ideas.length !== 1 ? "s" : ""} identified. The highest-priority items below represent concrete opportunities to reduce the $${formatCurrency(totalMonthlyCost)}/month operating cost. See the Improvements section for full detail.`;
    const savingsLines = pdf.splitTextToSize(savingsNarr, contentWidth);
    pdf.text(savingsLines, margin, y);
    y += savingsLines.length * T.lineH + T.paraGap;

    for (const idea of top) {
      if (y + 12 > pageHeight - margin) {
        pdf.addPage("a4", "landscape");
        setPageBg(pdf);
        y = margin;
      }

      // Priority color bar
      const pColor = idea.priority === "critical" ? T.red : idea.priority === "high" ? T.amber : T.teal;
      pdf.setFillColor(pColor[0], pColor[1], pColor[2]);
      pdf.rect(margin, y, 2, 8, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(T.small);
      pdf.setTextColor(...T.navy);
      pdf.text(truncate(idea.title, 60), margin + 5, y + 3);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(T.tiny);
      pdf.setTextColor(...T.muted);
      const desc = idea.description ? truncate(stripHtml(idea.description), 90) : "";
      if (desc) pdf.text(desc, margin + 5, y + 7);

      y += 10;
    }
  }
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

  const sectionEntries: PdfSectionEntry[] = [];

  // ── Title Page ──────────────────────────────────────────────────────────
  setPageBg(pdf);

  // Navy hero banner — top 38% of page
  const bannerH = pageHeight * 0.38;
  pdf.setFillColor(...T.navy);
  pdf.rect(0, 0, pageWidth, bannerH, "F");

  // Teal accent strip at bottom of banner
  pdf.setFillColor(...T.teal);
  pdf.rect(0, bannerH, pageWidth, 1.2, "F");

  // "PROCESS AUDIT REPORT" label on banner
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(120, 160, 180);
  pdf.text("PROCESS AUDIT REPORT", margin, margin + 8);

  // Workspace name — large, white, on banner
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.titleSize);
  pdf.setTextColor(255, 255, 255);
  const titleLines = pdf.splitTextToSize(workspaceName, contentWidth * 0.85);
  pdf.text(titleLines, margin, margin + 22);

  // Date on banner
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(160, 180, 200);
  pdf.text(dateStr, margin, bannerH - 12);

  // "Confidential" tag on banner
  pdf.setFontSize(7);
  pdf.setTextColor(100, 130, 160);
  pdf.text("Confidential", margin, bannerH - 5);

  // Below banner — summary and stats
  y = bannerH + 12;

  const liveSteps = steps.filter((s) => s.status === "live").length;
  const draftSteps = steps.filter((s) => s.status === "draft").length;
  const inProgressSteps = steps.filter((s) => s.status === "in_progress").length;
  const scoredSteps = steps.filter((s) => s.maturity_score != null);
  const avgMat = scoredSteps.length > 0
    ? (scoredSteps.reduce((sum, s) => sum + s.maturity_score!, 0) / scoredSteps.length).toFixed(1)
    : null;
  const totalHrs = steps.reduce((sum, s) => {
    if (s.time_minutes && s.frequency_per_month) return sum + (s.time_minutes * s.frequency_per_month) / 60;
    return sum;
  }, 0);

  // Summary paragraph
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.bodySize);
  pdf.setTextColor(...T.body);
  const descParts: string[] = [];
  descParts.push(`This report presents a comprehensive process audit covering ${sections.length} operational phases and ${steps.length} individual steps connected by ${connections.length} dependencies.`);
  const statusParts: string[] = [];
  if (liveSteps > 0) statusParts.push(`${liveSteps} live`);
  if (inProgressSteps > 0) statusParts.push(`${inProgressSteps} in progress`);
  if (draftSteps > 0) statusParts.push(`${draftSteps} in draft`);
  if (statusParts.length > 0) descParts.push(`Of these, ${statusParts.join(", ")}.`);
  if (avgMat) descParts.push(`Average maturity: ${avgMat}/5.`);
  if (totalHrs > 0) descParts.push(`Total monthly effort: ${totalHrs.toFixed(1)} hours.`);

  const descLines = pdf.splitTextToSize(descParts.join(" "), contentWidth);
  pdf.text(descLines, margin, y);
  y += descLines.length * T.lineH + 10;

  // Stat cards
  const titleStats: { label: string; value: string; variant: "navy" | "teal" | "default" }[] = [
    { label: "PHASES", value: String(sections.length), variant: "navy" },
    { label: "STEPS", value: String(steps.length), variant: "navy" },
    { label: "CONNECTIONS", value: String(connections.length), variant: "default" },
  ];
  if (avgMat) titleStats.push({ label: "AVG MATURITY", value: avgMat, variant: "teal" });
  if (totalHrs > 0) titleStats.push({ label: "MONTHLY HOURS", value: `${totalHrs.toFixed(1)}h`, variant: "default" });

  const statW = 46;
  const statGap = 4;
  const statH = 20;
  titleStats.forEach((stat, i) => {
    drawStatCard(pdf, margin + i * (statW + statGap), y, statW, statH, stat.value, stat.label, stat.variant);
  });

  // Bottom accent line + branding
  drawAccentLine(pdf, margin, pageHeight - margin - 4, contentWidth);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...T.faint);
  pdf.text("Prepared by", margin, pageHeight - margin);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...T.teal);
  pdf.text("Stride", margin + pdf.getTextWidth("Prepared by ") + 1, pageHeight - margin);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...T.faint);
  pdf.text(dateStr, pageWidth - margin, pageHeight - margin, { align: "right" });

  // ── Content Sections (skipped when orchestrator passes skipFooter=true) ──
  if (!skipFooter) {
    await renderBaseCanvasSnapshot(pdf, canvasElement, sectionEntries);
    renderBaseStepDetails(pdf, steps, sections, sectionEntries);
    renderBaseGapAnalysis(pdf, steps, sections, sectionEntries);
    renderBaseCostSummary(pdf, steps, sections, stepRoles, stepTools, sectionEntries);
  }

  // ── Footer ──────────────────────────────────────────────────────────────
  if (!skipFooter) {
    renderFooter(pdf, workspaceName);
  }

  return { pdf, sections: sectionEntries };
}

export async function exportWorkspacePdf(opts: ExportPdfOptions): Promise<void> {
  const { pdf } = await createWorkspacePdf(opts);
  const safeFilename = opts.workspaceName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  pdf.save(`${safeFilename}-process-report.pdf`);
}

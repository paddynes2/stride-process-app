import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import type { Section, Step, Stage, Touchpoint } from "@/types/database";
import { MATURITY_COLORS } from "@/lib/maturity";
import { PAIN_COLORS } from "@/lib/pain";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22C55E",
  neutral: "#6B7280",
  negative: "#EF4444",
};

interface NameMatch {
  sectionName: string;
  stageName: string;
}

interface ExportComparisonPdfOptions {
  workspaceName: string;
  processTabName: string;
  journeyTabName: string;
  sections: Section[];
  steps: Step[];
  stages: Stage[];
  touchpoints: Touchpoint[];
  nameMatches: NameMatch[];
  processCanvasElement: HTMLElement;
  journeyCanvasElement: HTMLElement;
}

export async function exportComparisonPdf({
  workspaceName,
  processTabName,
  journeyTabName,
  sections,
  steps,
  stages,
  touchpoints,
  nameMatches,
  processCanvasElement,
  journeyCanvasElement,
}: ExportComparisonPdfOptions): Promise<void> {
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Pre-compute stats
  const scoredSteps = steps.filter((s) => s.maturity_score != null);
  const avgMaturity =
    scoredSteps.length > 0
      ? scoredSteps.reduce((sum, s) => sum + (s.maturity_score ?? 0), 0) / scoredSteps.length
      : null;

  const painTouchpoints = touchpoints.filter((t) => t.pain_score != null);
  const avgPain =
    painTouchpoints.length > 0
      ? painTouchpoints.reduce((sum, t) => sum + (t.pain_score ?? 0), 0) / painTouchpoints.length
      : null;

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const t of touchpoints) {
    if (t.sentiment === "positive") sentimentCounts.positive++;
    else if (t.sentiment === "negative") sentimentCounts.negative++;
    else sentimentCounts.neutral++;
  }

  // --- Title Page ---
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFillColor(20, 184, 166);
  pdf.rect(margin, margin, contentWidth, 1, "F");

  y += 8;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(28);
  pdf.setTextColor(255, 255, 255);
  pdf.text(workspaceName, margin, y);

  y += 10;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255, 140);
  pdf.text("Process vs Journey Comparison Report", margin, y);

  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 76);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generated ${dateStr}`, margin, y);

  // Side-by-side stats: Process | Journey
  y += 14;
  const halfWidth = (contentWidth - 10) / 2;

  // Process side
  pdf.setFillColor(20, 20, 21);
  pdf.roundedRect(margin, y, halfWidth, 40, 3, 3, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(59, 130, 246); // accent-blue
  pdf.text("Process Map", margin + 5, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(processTabName, margin + 5, y + 13);

  const processStats = [
    { label: "Sections", value: String(sections.length) },
    { label: "Steps", value: String(steps.length) },
    { label: "Avg Maturity", value: avgMaturity != null ? avgMaturity.toFixed(1) : "\u2014" },
  ];

  const pStatW = 35;
  processStats.forEach((stat, i) => {
    const x = margin + 5 + i * (pStatW + 3);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(stat.value, x, y + 26);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(stat.label.toUpperCase(), x, y + 32);
  });

  // Journey side
  const journeyX = margin + halfWidth + 10;
  pdf.setFillColor(20, 20, 21);
  pdf.roundedRect(journeyX, y, halfWidth, 40, 3, 3, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(20, 184, 166); // brand teal
  pdf.text("Journey Map", journeyX + 5, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(journeyTabName, journeyX + 5, y + 13);

  const journeyStatsArr = [
    { label: "Stages", value: String(stages.length) },
    { label: "Touchpoints", value: String(touchpoints.length) },
    { label: "Avg Pain", value: avgPain != null ? avgPain.toFixed(1) : "\u2014" },
  ];

  journeyStatsArr.forEach((stat, i) => {
    const x = journeyX + 5 + i * (pStatW + 3);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.text(stat.value, x, y + 26);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(stat.label.toUpperCase(), x, y + 32);
  });

  // Alignment summary
  y += 48;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(20, 184, 166);
  pdf.text(
    `${nameMatches.length} ALIGNMENT${nameMatches.length !== 1 ? "S" : ""} FOUND`,
    margin,
    y,
  );

  if (nameMatches.length > 0) {
    y += 6;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 140);
    const matchText = nameMatches.map((m) => m.sectionName).join(", ");
    pdf.text(truncate(matchText, 120), margin, y);
  }

  // Sentiment distribution bar
  y += 10;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 140);
  pdf.text("JOURNEY SENTIMENT", margin, y);
  y += 5;

  const sentimentTotal = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
  if (sentimentTotal > 0) {
    let barX = margin;
    const barWidth = 120;
    const segments = [
      { key: "positive", count: sentimentCounts.positive, color: SENTIMENT_COLORS.positive },
      { key: "neutral", count: sentimentCounts.neutral, color: SENTIMENT_COLORS.neutral },
      { key: "negative", count: sentimentCounts.negative, color: SENTIMENT_COLORS.negative },
    ];

    for (const seg of segments) {
      if (seg.count === 0) continue;
      const segWidth = (seg.count / sentimentTotal) * barWidth;
      const [r, g, b] = hexToRgb(seg.color);
      pdf.setFillColor(r, g, b);
      pdf.roundedRect(barX, y, segWidth, 4, 1, 1, "F");
      barX += segWidth;
    }

    y += 8;
    pdf.setFontSize(7);
    segments.forEach((seg, idx) => {
      const [r, g, b] = hexToRgb(seg.color);
      pdf.setFillColor(r, g, b);
      pdf.circle(margin + idx * 50, y, 1.2, "F");
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(
        `${capitalize(seg.key)}: ${seg.count} (${Math.round((seg.count / sentimentTotal) * 100)}%)`,
        margin + idx * 50 + 3,
        y + 1,
      );
    });
  } else {
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text("No sentiment data", margin, y + 3);
  }

  // --- Process Canvas Snapshot Page ---
  pdf.addPage("a4", "landscape");
  y = margin;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(59, 130, 246);
  pdf.text("Process Map", margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(processTabName, margin + pdf.getTextWidth("Process Map") + 5, y);
  y += 8;

  await captureCanvasToPage(pdf, processCanvasElement, margin, y, contentWidth, pageHeight);

  // --- Journey Canvas Snapshot Page ---
  pdf.addPage("a4", "landscape");
  y = margin;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(20, 184, 166);
  pdf.text("Journey Map", margin, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(journeyTabName, margin + pdf.getTextWidth("Journey Map") + 5, y);
  y += 8;

  await captureCanvasToPage(pdf, journeyCanvasElement, margin, y, contentWidth, pageHeight);

  // --- Alignment Analysis Page ---
  if (nameMatches.length > 0 || sections.length > 0 || stages.length > 0) {
    pdf.addPage("a4", "landscape");
    y = margin;
    pdf.setFillColor(10, 10, 11);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Alignment Analysis", margin, y);
    y += 4;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 100);
    pdf.text(
      "Matching sections and stages indicate alignment between internal processes and customer journey.",
      margin,
      y + 4,
    );
    y += 12;

    if (nameMatches.length > 0) {
      // Matched pairs table
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(20, 184, 166);
      pdf.text(`Matched (${nameMatches.length})`, margin, y);
      y += 6;

      const matchCols = [
        { label: "Process Section", width: 80 },
        { label: "", width: 20 },
        { label: "Journey Stage", width: 80 },
        { label: "Section Maturity", width: 40 },
        { label: "Stage Pain", width: contentWidth - 80 - 20 - 80 - 40 },
      ];

      y = drawTableHeader(pdf, matchCols, margin, contentWidth, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);

      for (let i = 0; i < nameMatches.length; i++) {
        const match = nameMatches[i];

        if (i % 2 === 0) {
          pdf.setFillColor(14, 14, 15);
          pdf.rect(margin, y - 1, contentWidth, 6, "F");
        }

        let colX = margin + 2;

        // Section name
        pdf.setTextColor(255, 255, 255);
        pdf.text(truncate(match.sectionName, 45), colX, y + 3);
        colX += matchCols[0].width;

        // Arrow
        pdf.setTextColor(20, 184, 166);
        pdf.text("\u2194", colX + 8, y + 3);
        colX += matchCols[1].width;

        // Stage name
        pdf.setTextColor(255, 255, 255);
        pdf.text(truncate(match.stageName, 45), colX, y + 3);
        colX += matchCols[2].width;

        // Section avg maturity
        const section = sections.find(
          (s) => s.name.trim().toLowerCase() === match.sectionName.trim().toLowerCase(),
        );
        if (section) {
          const sectionSteps = steps.filter((s) => s.section_id === section.id && s.maturity_score != null);
          if (sectionSteps.length > 0) {
            const avg = sectionSteps.reduce((sum, s) => sum + s.maturity_score!, 0) / sectionSteps.length;
            const rounded = Math.round(avg);
            const mColor = MATURITY_COLORS[Math.max(1, Math.min(5, rounded)) as keyof typeof MATURITY_COLORS] ?? "#6B7280";
            const [r, g, b] = hexToRgb(mColor);
            pdf.setFillColor(r, g, b);
            pdf.circle(colX + 1.5, y + 2, 1.2, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.text(avg.toFixed(1), colX + 5, y + 3);
          } else {
            pdf.setTextColor(255, 255, 255, 76);
            pdf.text("\u2014", colX + 5, y + 3);
          }
        } else {
          pdf.setTextColor(255, 255, 255, 76);
          pdf.text("\u2014", colX + 5, y + 3);
        }
        colX += matchCols[3].width;

        // Stage avg pain
        const stage = stages.find(
          (s) => s.name.trim().toLowerCase() === match.stageName.trim().toLowerCase(),
        );
        if (stage) {
          const stageTps = touchpoints.filter(
            (t) => t.stage_id === stage.id && t.pain_score != null,
          );
          if (stageTps.length > 0) {
            const avgP = stageTps.reduce((sum, t) => sum + t.pain_score!, 0) / stageTps.length;
            const rounded = Math.round(avgP);
            const pColor = PAIN_COLORS[Math.max(1, Math.min(5, rounded))] ?? "#6B7280";
            const [r, g, b] = hexToRgb(pColor);
            pdf.setFillColor(r, g, b);
            pdf.circle(colX + 1.5, y + 2, 1.2, "F");
            pdf.setTextColor(255, 255, 255);
            pdf.text(avgP.toFixed(1), colX + 5, y + 3);
          } else {
            pdf.setTextColor(255, 255, 255, 76);
            pdf.text("\u2014", colX + 5, y + 3);
          }
        } else {
          pdf.setTextColor(255, 255, 255, 76);
          pdf.text("\u2014", colX + 5, y + 3);
        }

        y += 6;
      }

      y += 6;
    }

    // Unmatched sections and stages
    const matchedSectionNames = new Set(nameMatches.map((m) => m.sectionName.trim().toLowerCase()));
    const matchedStageNames = new Set(nameMatches.map((m) => m.stageName.trim().toLowerCase()));
    const unmatchedSections = sections.filter(
      (s) => !matchedSectionNames.has(s.name.trim().toLowerCase()),
    );
    const unmatchedStages = stages.filter(
      (s) => !matchedStageNames.has(s.name.trim().toLowerCase()),
    );

    if (unmatchedSections.length > 0 || unmatchedStages.length > 0) {
      if (y > pageHeight - margin - 30) {
        pdf.addPage("a4", "landscape");
        y = margin;
        pdf.setFillColor(10, 10, 11);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(255, 255, 255, 100);
        pdf.text("Alignment Analysis (continued)", margin, y);
        y += 8;
      }

      // Side-by-side unmatched lists
      const listHalf = (contentWidth - 10) / 2;

      if (unmatchedSections.length > 0) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(59, 130, 246);
        pdf.text(`Unmatched Sections (${unmatchedSections.length})`, margin, y);

        let listY = y + 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255, 140);
        for (const section of unmatchedSections) {
          pdf.text(`\u2022 ${truncate(section.name, 50)}`, margin + 2, listY);
          listY += 4.5;
          if (listY > pageHeight - margin) break;
        }
      }

      if (unmatchedStages.length > 0) {
        const stageListX = margin + listHalf + 10;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(20, 184, 166);
        pdf.text(`Unmatched Stages (${unmatchedStages.length})`, stageListX, y);

        let listY = y + 5;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7);
        pdf.setTextColor(255, 255, 255, 140);
        for (const stage of unmatchedStages) {
          pdf.text(`\u2022 ${truncate(stage.name, 50)}`, stageListX + 2, listY);
          listY += 4.5;
          if (listY > pageHeight - margin) break;
        }
      }
    }
  }

  // --- Footer on all pages ---
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 50);
    pdf.text(
      `${workspaceName} \u2014 Comparison Report \u2014 Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" },
    );
    pdf.setTextColor(20, 184, 166, 80);
    pdf.text("Stride", pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  // Download
  const safeFilename = workspaceName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  pdf.save(`${safeFilename}-comparison-report.pdf`);
}

// --- Helpers ---

async function captureCanvasToPage(
  pdf: jsPDF,
  canvasElement: HTMLElement,
  marginVal: number,
  y: number,
  contentWidth: number,
  pageHeight: number,
): Promise<void> {
  try {
    const dataUrl = await toPng(canvasElement, {
      backgroundColor: "#0a0a0b",
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

    const canvasAvailHeight = pageHeight - y - marginVal;
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

    pdf.addImage(dataUrl, "PNG", marginVal, y, imgW, imgH);
  } catch {
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255, 140);
    pdf.text("Canvas snapshot unavailable", marginVal, y + 10);
  }
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

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [255, 255, 255];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

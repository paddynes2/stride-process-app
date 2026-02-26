import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import type { Stage, Touchpoint, TouchpointConnection } from "@/types/database";
import { PAIN_COLORS } from "@/lib/pain";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22C55E",
  neutral: "#6B7280",
  negative: "#EF4444",
};

interface ExportJourneyPdfOptions {
  workspaceName: string;
  tabName: string;
  stages: Stage[];
  touchpoints: Touchpoint[];
  connections: TouchpointConnection[];
  canvasElement: HTMLElement;
}

export async function exportJourneyPdf({
  workspaceName,
  tabName,
  stages,
  touchpoints,
  connections,
  canvasElement,
}: ExportJourneyPdfOptions): Promise<void> {
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

  const stageMap = new Map(stages.map((s) => [s.id, s.name]));

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
  pdf.text(`Journey Map: ${tabName}`, margin, y);

  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 76);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generated ${dateStr}`, margin, y);

  // Summary stats
  y += 14;
  const statsBoxWidth = 40;
  const statsGap = 5;
  const sentimentCounts = computeSentimentCounts(touchpoints);
  const avgPain = computeAveragePain(touchpoints);

  const titleStats = [
    { label: "Stages", value: String(stages.length) },
    { label: "Touchpoints", value: String(touchpoints.length) },
    { label: "Connections", value: String(connections.length) },
    { label: "Avg Pain", value: avgPain != null ? avgPain.toFixed(1) : "\u2014" },
  ];

  titleStats.forEach((stat, i) => {
    const x = margin + i * (statsBoxWidth + statsGap);
    pdf.setFillColor(20, 20, 21);
    pdf.roundedRect(x, y, statsBoxWidth, 18, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text(stat.value, x + statsBoxWidth / 2, y + 10, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(stat.label.toUpperCase(), x + statsBoxWidth / 2, y + 15, { align: "center" });
  });

  // Sentiment distribution below stats
  y += 24;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 140);
  pdf.text("SENTIMENT DISTRIBUTION", margin, y);
  y += 5;

  const sentimentBarWidth = 120;
  const total = sentimentCounts.positive + sentimentCounts.neutral + sentimentCounts.negative;
  if (total > 0) {
    let barX = margin;
    const segments = [
      { key: "positive", count: sentimentCounts.positive, color: SENTIMENT_COLORS.positive },
      { key: "neutral", count: sentimentCounts.neutral, color: SENTIMENT_COLORS.neutral },
      { key: "negative", count: sentimentCounts.negative, color: SENTIMENT_COLORS.negative },
    ];

    for (const seg of segments) {
      if (seg.count === 0) continue;
      const segWidth = (seg.count / total) * sentimentBarWidth;
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
      pdf.circle(margin + idx * 45, y, 1.2, "F");
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(
        `${capitalize(seg.key)}: ${seg.count} (${Math.round((seg.count / total) * 100)}%)`,
        margin + idx * 45 + 3,
        y + 1
      );
    });
  } else {
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text("No sentiment data", margin, y + 3);
  }

  // --- Canvas Snapshot Page ---
  pdf.addPage("a4", "landscape");
  y = margin;

  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Journey Map", margin, y);
  y += 8;

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

    pdf.addImage(dataUrl, "PNG", margin, y, imgW, imgH);
  } catch {
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255, 140);
    pdf.text("Canvas snapshot unavailable", margin, y + 10);
  }

  // --- Touchpoint Details Page ---
  if (touchpoints.length > 0) {
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

    const sortedTps = [...touchpoints].sort((a, b) => {
      const stageA = a.stage_id ? stageMap.get(a.stage_id) ?? "" : "";
      const stageB = b.stage_id ? stageMap.get(b.stage_id) ?? "" : "";
      if (stageA !== stageB) return stageA.localeCompare(stageB);
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

      // Name
      pdf.setTextColor(255, 255, 255);
      pdf.text(truncate(tp.name, 38), colX, y + 3);
      colX += cols[0].width;

      // Stage
      pdf.setTextColor(255, 255, 255, 140);
      const stageName = tp.stage_id ? stageMap.get(tp.stage_id) ?? "\u2014" : "\u2014";
      pdf.text(truncate(stageName, 32), colX, y + 3);
      colX += cols[1].width;

      // Sentiment with color dot
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

      // Pain with color dot
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

      // Gain
      if (tp.gain_score != null) {
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(tp.gain_score), colX + 5, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("\u2014", colX + 5, y + 3);
      }
      colX += cols[4].width;

      // Customer emotion
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(truncate(tp.customer_emotion ?? "\u2014", 25), colX, y + 3);
      colX += cols[5].width;

      // Notes preview (strip HTML tags for TipTap content)
      const notesText = tp.notes ? stripHtml(tp.notes) : "\u2014";
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text(truncate(notesText, 20), colX, y + 3);

      y += 6;
    }
  }

  // --- Pain Point Ranking Page ---
  const painTouchpoints = touchpoints
    .filter((tp) => tp.pain_score != null)
    .sort((a, b) => (b.pain_score ?? 0) - (a.pain_score ?? 0));

  if (painTouchpoints.length > 0) {
    pdf.addPage("a4", "landscape");
    y = margin;
    pdf.setFillColor(10, 10, 11);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Pain Point Ranking", margin, y);
    y += 8;

    // Summary cards
    const highPainCount = painTouchpoints.filter((tp) => (tp.pain_score ?? 0) >= 4).length;
    const painSummary = [
      { label: "Touchpoints Scored", value: String(painTouchpoints.length) },
      { label: "High Pain (4-5)", value: String(highPainCount) },
      { label: "Avg Pain", value: avgPain != null ? avgPain.toFixed(1) : "\u2014" },
      { label: "Max Pain", value: String(painTouchpoints[0]?.pain_score ?? "\u2014") },
    ];

    const painCardW = 50;
    const painCardGap = 5;
    painSummary.forEach((stat, i) => {
      const x = margin + i * (painCardW + painCardGap);
      pdf.setFillColor(20, 20, 21);
      pdf.roundedRect(x, y, painCardW, 16, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text(stat.value, x + painCardW / 2, y + 9, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text(stat.label.toUpperCase(), x + painCardW / 2, y + 14, { align: "center" });
    });
    y += 22;

    // Pain ranking table
    const painCols = [
      { label: "Touchpoint", width: 70 },
      { label: "Stage", width: 60 },
      { label: "Pain", width: 25 },
      { label: "Sentiment", width: 30 },
      { label: "Emotion", width: 50 },
      { label: "", width: contentWidth - 70 - 60 - 25 - 30 - 50 },
    ];

    y = drawTableHeader(pdf, painCols, margin, contentWidth, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);

    const maxPain = painTouchpoints[0]?.pain_score ?? 5;

    for (let rowIndex = 0; rowIndex < painTouchpoints.length; rowIndex++) {
      const tp = painTouchpoints[rowIndex];

      if (y > pageHeight - margin - 5) {
        y = newTablePage(pdf, "Pain Point Ranking", painCols, margin, contentWidth, pageWidth, pageHeight);
      }

      if (rowIndex % 2 === 0) {
        pdf.setFillColor(14, 14, 15);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }

      let colX = margin + 2;

      // Name
      pdf.setTextColor(255, 255, 255);
      pdf.text(truncate(tp.name, 40), colX, y + 3);
      colX += painCols[0].width;

      // Stage
      pdf.setTextColor(255, 255, 255, 140);
      const pStageName = tp.stage_id ? stageMap.get(tp.stage_id) ?? "\u2014" : "\u2014";
      pdf.text(truncate(pStageName, 35), colX, y + 3);
      colX += painCols[1].width;

      // Pain with color
      const painScore = tp.pain_score ?? 0;
      const pColor = PAIN_COLORS[painScore] ?? "#6B7280";
      const [pr, pg, pb] = hexToRgb(pColor);
      pdf.setFillColor(pr, pg, pb);
      pdf.circle(colX + 1.5, y + 2, 1.2, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(painScore), colX + 5, y + 3);
      colX += painCols[2].width;

      // Sentiment
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
      colX += painCols[3].width;

      // Emotion
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(truncate(tp.customer_emotion ?? "\u2014", 28), colX, y + 3);
      colX += painCols[4].width;

      // Pain bar
      if (painScore > 0 && maxPain > 0) {
        const barMaxWidth = painCols[5].width - 4;
        const barWidth = (painScore / maxPain) * barMaxWidth;
        pdf.setFillColor(pr, pg, pb);
        pdf.roundedRect(colX, y + 0.5, barWidth, 3, 1, 1, "F");
      }

      y += 6;
    }
  }

  // --- Stage Breakdown Page ---
  if (stages.length > 0) {
    pdf.addPage("a4", "landscape");
    y = margin;
    pdf.setFillColor(10, 10, 11);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Stage Breakdown", margin, y);
    y += 8;

    const stageCols = [
      { label: "Stage", width: 70 },
      { label: "Channel", width: 35 },
      { label: "Owner", width: 45 },
      { label: "Touchpoints", width: 35 },
      { label: "Avg Pain", width: 30 },
      { label: "Sentiment", width: contentWidth - 70 - 35 - 45 - 35 - 30 },
    ];

    y = drawTableHeader(pdf, stageCols, margin, contentWidth, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);

    for (let rowIndex = 0; rowIndex < stages.length; rowIndex++) {
      const stage = stages[rowIndex];

      if (y > pageHeight - margin - 5) {
        y = newTablePage(pdf, "Stage Breakdown", stageCols, margin, contentWidth, pageWidth, pageHeight);
      }

      if (rowIndex % 2 === 0) {
        pdf.setFillColor(14, 14, 15);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }

      const stageTps = touchpoints.filter((tp) => tp.stage_id === stage.id);
      const stageAvgPain = computeStagePain(stage.id, touchpoints);
      const stageSentiment = computeSentimentCounts(stageTps);

      let colX = margin + 2;

      // Name
      pdf.setTextColor(255, 255, 255);
      pdf.text(truncate(stage.name, 40), colX, y + 3);
      colX += stageCols[0].width;

      // Channel
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(stage.channel ? capitalize(stage.channel) : "\u2014", colX, y + 3);
      colX += stageCols[1].width;

      // Owner
      pdf.text(truncate(stage.owner ?? "\u2014", 25), colX, y + 3);
      colX += stageCols[2].width;

      // Touchpoint count
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(stageTps.length), colX, y + 3);
      colX += stageCols[3].width;

      // Avg pain with color
      if (stageAvgPain != null) {
        const roundedPain = Math.round(stageAvgPain);
        const painClr = PAIN_COLORS[Math.max(1, Math.min(5, roundedPain))] ?? "#6B7280";
        const [r, g, b] = hexToRgb(painClr);
        pdf.setFillColor(r, g, b);
        pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.text(stageAvgPain.toFixed(1), colX + 5, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("\u2014", colX + 5, y + 3);
      }
      colX += stageCols[4].width;

      // Sentiment mini-bar
      const stageTotal = stageSentiment.positive + stageSentiment.neutral + stageSentiment.negative;
      if (stageTotal > 0) {
        const miniBarWidth = stageCols[5].width - 10;
        let bx = colX;
        for (const seg of [
          { count: stageSentiment.positive, color: SENTIMENT_COLORS.positive },
          { count: stageSentiment.neutral, color: SENTIMENT_COLORS.neutral },
          { count: stageSentiment.negative, color: SENTIMENT_COLORS.negative },
        ]) {
          if (seg.count === 0) continue;
          const w = (seg.count / stageTotal) * miniBarWidth;
          const [r, g, b] = hexToRgb(seg.color);
          pdf.setFillColor(r, g, b);
          pdf.roundedRect(bx, y + 0.5, w, 3, 0.5, 0.5, "F");
          bx += w;
        }
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("\u2014", colX, y + 3);
      }

      y += 6;
    }
  }

  // --- Footer on all pages ---
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 50);
    pdf.text(
      `${workspaceName} \u2014 ${tabName} \u2014 Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
    pdf.setTextColor(20, 184, 166, 80);
    pdf.text("Stride", pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  // Download
  const safeFilename = workspaceName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  const safeTabName = tabName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  pdf.save(`${safeFilename}-${safeTabName}-journey-report.pdf`);
}

// --- Helpers ---

function computeAveragePain(touchpoints: Touchpoint[]): number | null {
  const withPain = touchpoints.filter((tp) => tp.pain_score != null);
  if (withPain.length === 0) return null;
  return withPain.reduce((sum, tp) => sum + tp.pain_score!, 0) / withPain.length;
}

function computeStagePain(stageId: string, touchpoints: Touchpoint[]): number | null {
  const stageTps = touchpoints.filter((tp) => tp.stage_id === stageId && tp.pain_score != null);
  if (stageTps.length === 0) return null;
  return stageTps.reduce((sum, tp) => sum + tp.pain_score!, 0) / stageTps.length;
}

function computeSentimentCounts(touchpoints: Touchpoint[]): { positive: number; neutral: number; negative: number } {
  let positive = 0;
  let neutral = 0;
  let negative = 0;
  for (const tp of touchpoints) {
    if (tp.sentiment === "positive") positive++;
    else if (tp.sentiment === "neutral") neutral++;
    else if (tp.sentiment === "negative") negative++;
  }
  return { positive, neutral, negative };
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

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [255, 255, 255];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

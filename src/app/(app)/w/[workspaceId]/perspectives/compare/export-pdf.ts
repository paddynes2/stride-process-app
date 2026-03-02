import { jsPDF } from "jspdf";

const DIVERGENCE_THRESHOLD = 2;

export type ElementInfo = { name: string; tab_id: string; type: string };

export interface ComparisonRow {
  id: string;
  element: ElementInfo | undefined;
  annA: { content: string | null; rating: number | null } | null;
  annB: { content: string | null; rating: number | null } | null;
  divergence: number | null;
  isDivergent: boolean;
}

export interface SummaryStats {
  countA: number;
  countB: number;
  avgRatingA: number | null;
  avgRatingB: number | null;
  divergenceCount: number;
  top3: ComparisonRow[];
}

interface ExportOptions {
  workspaceName: string;
  perspAName: string;
  perspBName: string;
  summaryStats: SummaryStats | null;
  comparisonRows: ComparisonRow[];
}

export function exportPerspectivesComparisonPdf({
  workspaceName,
  perspAName,
  perspBName,
  summaryStats,
  comparisonRows,
}: ExportOptions): void {
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
  pdf.text("Perspective Comparison Report", margin, y);

  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 76);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generated ${dateStr}`, margin, y);

  // Side-by-side perspective stats
  y += 14;
  const halfWidth = (contentWidth - 10) / 2;

  // Perspective A box
  pdf.setFillColor(20, 20, 21);
  pdf.roundedRect(margin, y, halfWidth, 40, 3, 3, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(59, 130, 246);
  pdf.text("Perspective A", margin + 5, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(truncate(perspAName, 45), margin + 5, y + 13);

  if (summaryStats) {
    const statsA = [
      { label: "Annotations", value: String(summaryStats.countA) },
      {
        label: "Avg Rating",
        value: summaryStats.avgRatingA != null ? summaryStats.avgRatingA.toFixed(1) : "\u2014",
      },
    ];
    statsA.forEach((stat, i) => {
      const x = margin + 5 + i * 45;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text(stat.value, x, y + 26);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text(stat.label.toUpperCase(), x, y + 32);
    });
  }

  // Perspective B box
  const boxBX = margin + halfWidth + 10;
  pdf.setFillColor(20, 20, 21);
  pdf.roundedRect(boxBX, y, halfWidth, 40, 3, 3, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(20, 184, 166);
  pdf.text("Perspective B", boxBX + 5, y + 8);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(truncate(perspBName, 45), boxBX + 5, y + 13);

  if (summaryStats) {
    const statsB = [
      { label: "Annotations", value: String(summaryStats.countB) },
      {
        label: "Avg Rating",
        value: summaryStats.avgRatingB != null ? summaryStats.avgRatingB.toFixed(1) : "\u2014",
      },
    ];
    statsB.forEach((stat, i) => {
      const x = boxBX + 5 + i * 45;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text(stat.value, x, y + 26);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text(stat.label.toUpperCase(), x, y + 32);
    });
  }

  y += 48;

  // Divergence summary
  if (summaryStats) {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(245, 158, 11);
    pdf.text(
      `${summaryStats.divergenceCount} DIVERGENCE${summaryStats.divergenceCount !== 1 ? "S" : ""} (rating gap \u2265 ${DIVERGENCE_THRESHOLD})`,
      margin,
      y,
    );
    y += 5;

    if (summaryStats.top3.length > 0) {
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255, 140);
      const top3Names = summaryStats.top3.map((r) => r.element?.name ?? r.id.slice(0, 8)).join(", ");
      pdf.text(`Top divergent: ${truncate(top3Names, 120)}`, margin, y);
      y += 5;
    }
  }

  // --- Comparison Table Page ---
  pdf.addPage("a4", "landscape");
  y = margin;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Comparison Table", margin, y);

  y += 4;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(`${truncate(perspAName, 30)} vs ${truncate(perspBName, 30)}`, margin, y + 4);
  y += 12;

  const colWidths = {
    element: 50,
    type: 18,
    noteA: 55,
    ratingA: 16,
    noteB: 55,
    ratingB: 16,
  };
  const gapWidth = contentWidth - colWidths.element - colWidths.type - colWidths.noteA - colWidths.ratingA - colWidths.noteB - colWidths.ratingB;
  const cols = [
    { label: "Element", width: colWidths.element },
    { label: "Type", width: colWidths.type },
    { label: `${truncate(perspAName, 16)} Note`, width: colWidths.noteA },
    { label: "Rating A", width: colWidths.ratingA },
    { label: `${truncate(perspBName, 16)} Note`, width: colWidths.noteB },
    { label: "Rating B", width: colWidths.ratingB },
    { label: "Gap", width: gapWidth },
  ];

  y = drawTableHeader(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  for (let i = 0; i < comparisonRows.length; i++) {
    if (y > pageHeight - margin - 6) {
      pdf.addPage("a4", "landscape");
      y = margin;
      pdf.setFillColor(10, 10, 11);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      y = drawTableHeader(pdf, cols, margin, contentWidth, y);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);
    }

    const row = comparisonRows[i];
    const elementName = row.element?.name ?? `(${row.id.slice(0, 8)}\u2026)`;
    const elementType = row.element?.type ?? "unknown";

    if (row.isDivergent) {
      pdf.setFillColor(78, 55, 10);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    } else if (i % 2 === 0) {
      pdf.setFillColor(14, 14, 15);
      pdf.rect(margin, y - 1, contentWidth, 6, "F");
    }

    let colX = margin + 2;

    // Element name
    pdf.setTextColor(255, 255, 255);
    pdf.text(truncate(elementName, 28), colX, y + 3);
    colX += cols[0].width;

    // Type
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(elementType, colX, y + 3);
    colX += cols[1].width;

    // Persp A note
    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(truncate(row.annA?.content ?? "\u2014", 32), colX, y + 3);
    colX += cols[2].width;

    // Persp A rating
    if (row.annA?.rating != null) {
      pdf.setTextColor(59, 130, 246);
      pdf.text(String(row.annA.rating), colX, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 50);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += cols[3].width;

    // Persp B note
    pdf.setTextColor(255, 255, 255, 140);
    pdf.text(truncate(row.annB?.content ?? "\u2014", 32), colX, y + 3);
    colX += cols[4].width;

    // Persp B rating
    if (row.annB?.rating != null) {
      pdf.setTextColor(20, 184, 166);
      pdf.text(String(row.annB.rating), colX, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 50);
      pdf.text("\u2014", colX, y + 3);
    }
    colX += cols[5].width;

    // Gap
    if (row.divergence !== null) {
      if (row.isDivergent) {
        pdf.setTextColor(245, 158, 11);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
      }
      pdf.text(String(row.divergence), colX, y + 3);
    } else {
      pdf.setTextColor(255, 255, 255, 50);
      pdf.text("\u2014", colX, y + 3);
    }

    y += 6;
  }

  // Footer on all pages
  const totalPages = pdf.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 50);
    pdf.text(
      `${workspaceName} \u2014 Perspective Comparison \u2014 Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" },
    );
    pdf.setTextColor(20, 184, 166, 80);
    pdf.text("Stride", pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  const safeFilename = workspaceName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  pdf.save(`${safeFilename}-perspective-comparison.pdf`);
}

// --- Helpers ---

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

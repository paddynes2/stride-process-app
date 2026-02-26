import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import type { Section, Step, Connection } from "@/types/database";

const MATURITY_COLORS: Record<number, string> = {
  1: "#EF4444",
  2: "#F97316",
  3: "#EAB308",
  4: "#84CC16",
  5: "#22C55E",
};

interface ExportPdfOptions {
  workspaceName: string;
  sections: Section[];
  steps: Step[];
  connections: Connection[];
  canvasElement: HTMLElement;
}

export async function exportWorkspacePdf({
  workspaceName,
  sections,
  steps,
  connections,
  canvasElement,
}: ExportPdfOptions): Promise<void> {
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

  // Brand accent line
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
  pdf.text("Process Map Report", margin, y);

  y += 6;
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 76);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  pdf.text(`Generated ${dateStr}`, margin, y);

  // Summary stats on title page
  y += 14;
  const statsBoxWidth = 40;
  const statsGap = 5;
  const stats = [
    { label: "Sections", value: sections.length },
    { label: "Steps", value: steps.length },
    { label: "Connections", value: connections.length },
  ];

  stats.forEach((stat, i) => {
    const x = margin + i * (statsBoxWidth + statsGap);
    pdf.setFillColor(20, 20, 21);
    pdf.roundedRect(x, y, statsBoxWidth, 18, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text(String(stat.value), x + statsBoxWidth / 2, y + 10, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 76);
    pdf.text(stat.label.toUpperCase(), x + statsBoxWidth / 2, y + 15, { align: "center" });
  });

  // --- Canvas Snapshot Page ---
  pdf.addPage("a4", "landscape");
  y = margin;

  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.text("Process Map", margin, y);
  y += 8;

  try {
    const dataUrl = await toPng(canvasElement, {
      backgroundColor: "#0a0a0b",
      pixelRatio: 2,
      filter: (node) => {
        // Exclude React Flow controls, minimap, and toolbar panels from snapshot
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

    // Get image dimensions to maintain aspect ratio
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

  // --- Step List Page ---
  if (steps.length > 0) {
    pdf.addPage("a4", "landscape");
    y = margin;

    pdf.setFillColor(10, 10, 11);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Step Details", margin, y);
    y += 8;

    // Table header
    const cols = [
      { label: "Step", width: 60 },
      { label: "Section", width: 50 },
      { label: "Status", width: 25 },
      { label: "Maturity", width: 25 },
      { label: "Target", width: 25 },
      { label: "Gap", width: 20 },
      { label: "Min/run", width: 22 },
      { label: "Freq/mo", width: 22 },
      { label: "Hrs/mo", width: 22 },
    ];

    pdf.setFillColor(20, 20, 21);
    pdf.rect(margin, y, contentWidth, 7, "F");

    let colX = margin + 2;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255, 76);
    for (const col of cols) {
      pdf.text(col.label.toUpperCase(), colX, y + 4.5);
      colX += col.width;
    }
    y += 7;

    // Section lookup
    const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

    // Sort steps by section, then name
    const sortedSteps = [...steps].sort((a, b) => {
      const secA = a.section_id ? sectionMap.get(a.section_id) ?? "" : "";
      const secB = b.section_id ? sectionMap.get(b.section_id) ?? "" : "";
      if (secA !== secB) return secA.localeCompare(secB);
      return a.name.localeCompare(b.name);
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);

    for (let rowIndex = 0; rowIndex < sortedSteps.length; rowIndex++) {
      const step = sortedSteps[rowIndex];

      if (y > pageHeight - margin - 5) {
        pdf.addPage("a4", "landscape");
        y = margin;
        pdf.setFillColor(10, 10, 11);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
      }

      // Alternate row background
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(14, 14, 15);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }

      colX = margin + 2;
      pdf.setTextColor(255, 255, 255);
      pdf.text(truncate(step.name, 35), colX, y + 3);
      colX += cols[0].width;

      pdf.setTextColor(255, 255, 255, 140);
      const sectionName = step.section_id ? sectionMap.get(step.section_id) ?? "—" : "—";
      pdf.text(truncate(sectionName, 28), colX, y + 3);
      colX += cols[1].width;

      pdf.text(formatStatus(step.status), colX, y + 3);
      colX += cols[2].width;

      // Maturity with color indicator
      if (step.maturity_score != null) {
        const color = MATURITY_COLORS[step.maturity_score];
        if (color) {
          const [r, g, b] = hexToRgb(color);
          pdf.setFillColor(r, g, b);
          pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        }
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(step.maturity_score), colX + 5, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("—", colX + 5, y + 3);
      }
      colX += cols[3].width;

      // Target
      if (step.target_maturity != null) {
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(step.target_maturity), colX + 5, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("—", colX + 5, y + 3);
      }
      colX += cols[4].width;

      // Gap
      if (step.maturity_score != null && step.target_maturity != null) {
        const gap = step.target_maturity - step.maturity_score;
        if (gap > 0) {
          pdf.setTextColor(239, 68, 68);
          pdf.text(`+${gap}`, colX, y + 3);
        } else if (gap === 0) {
          pdf.setTextColor(255, 255, 255, 76);
          pdf.text("0", colX, y + 3);
        } else {
          pdf.setTextColor(34, 197, 94);
          pdf.text(String(gap), colX, y + 3);
        }
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("—", colX, y + 3);
      }
      colX += cols[5].width;

      // Time
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(step.time_minutes ? String(step.time_minutes) : "—", colX, y + 3);
      colX += cols[6].width;

      // Frequency
      pdf.text(step.frequency_per_month ? String(step.frequency_per_month) : "—", colX, y + 3);
      colX += cols[7].width;

      // Monthly hours
      if (step.time_minutes && step.frequency_per_month) {
        const hrs = (step.time_minutes * step.frequency_per_month) / 60;
        pdf.setTextColor(255, 255, 255);
        pdf.text(hrs.toFixed(1), colX, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("—", colX, y + 3);
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
      `${workspaceName} — Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5,
      { align: "center" }
    );
    pdf.setTextColor(20, 184, 166, 80);
    pdf.text("Stride", pageWidth - margin, pageHeight - 5, { align: "right" });
  }

  // Download
  const safeFilename = workspaceName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  pdf.save(`${safeFilename}-process-report.pdf`);
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [255, 255, 255];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

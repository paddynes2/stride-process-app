import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import type { Section, Step, Connection } from "@/types/database";
import { MATURITY_COLORS } from "@/lib/maturity";

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
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Pre-compute shared lookups
  const sectionMap = new Map(sections.map((s) => [s.id, s.name]));
  const stepRolesMap = buildStepRolesMap(stepRoles);
  const stepToolsMap = buildStepToolsMap(stepTools);
  const sectionEntries: PdfSectionEntry[] = [];

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

  // Workspace description area
  y += 12;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255, 100);
  const liveSteps = steps.filter((s) => s.status === "live").length;
  const draftSteps = steps.filter((s) => s.status === "draft").length;
  const scoredSteps = steps.filter((s) => s.maturity_score != null);
  const avgMat = scoredSteps.length > 0
    ? (scoredSteps.reduce((sum, s) => sum + s.maturity_score!, 0) / scoredSteps.length).toFixed(1)
    : null;
  const descParts: string[] = [];
  descParts.push(`This workspace contains ${sections.length} section${sections.length !== 1 ? "s" : ""} and ${steps.length} step${steps.length !== 1 ? "s" : ""} connected by ${connections.length} connection${connections.length !== 1 ? "s" : ""}.`);
  if (liveSteps > 0 || draftSteps > 0) {
    descParts.push(`${liveSteps} step${liveSteps !== 1 ? "s are" : " is"} live, ${draftSteps} in draft.`);
  }
  if (avgMat) {
    descParts.push(`Average maturity score: ${avgMat}/5.`);
  }
  const descText = descParts.join(" ");
  const descLines = pdf.splitTextToSize(descText, contentWidth);
  pdf.text(descLines, margin, y);
  y += descLines.length * 4 + 6;

  // Summary stats on title page
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
  if (canvasElement !== null) {
    pdf.addPage("a4", "landscape");
    sectionEntries.push({ name: "Canvas Snapshot", page: pdf.getNumberOfPages() });
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
  }

  // --- Step List Page ---
  if (steps.length > 0) {
    pdf.addPage("a4", "landscape");
    sectionEntries.push({ name: "Step Details", page: pdf.getNumberOfPages() });
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

    y = drawTableHeader(pdf, cols, margin, contentWidth, y);

    // Sort steps by section position, then step position (flow order)
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
      // Within same section: sort by step position
      if (a.position_y !== b.position_y) return a.position_y - b.position_y;
      return a.position_x - b.position_x;
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);

    for (let rowIndex = 0; rowIndex < sortedSteps.length; rowIndex++) {
      const step = sortedSteps[rowIndex];
      const remainingRows = sortedSteps.length - rowIndex;

      if (y > pageHeight - margin - 5 && remainingRows > 3) {
        y = newTablePage(pdf, "Step Details", cols, margin, contentWidth, pageWidth, pageHeight);
      }

      // Alternate row background
      if (rowIndex % 2 === 0) {
        pdf.setFillColor(14, 14, 15);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }

      let colX = margin + 2;
      pdf.setTextColor(255, 255, 255);
      pdf.text(truncate(step.name, 42), colX, y + 3);
      colX += cols[0].width;

      pdf.setTextColor(255, 255, 255, 140);
      const sectionName = step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014";
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
        pdf.text("\u2014", colX + 5, y + 3);
      }
      colX += cols[3].width;

      // Target
      if (step.target_maturity != null) {
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(step.target_maturity), colX + 5, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("\u2014", colX + 5, y + 3);
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
        pdf.text("\u2014", colX, y + 3);
      }
      colX += cols[5].width;

      // Time
      pdf.setTextColor(255, 255, 255, 140);
      pdf.text(step.time_minutes ? String(step.time_minutes) : "\u2014", colX, y + 3);
      colX += cols[6].width;

      // Frequency
      pdf.text(step.frequency_per_month ? String(step.frequency_per_month) : "\u2014", colX, y + 3);
      colX += cols[7].width;

      // Monthly hours
      if (step.time_minutes && step.frequency_per_month) {
        const hrs = (step.time_minutes * step.frequency_per_month) / 60;
        pdf.setTextColor(255, 255, 255);
        pdf.text(hrs.toFixed(1), colX, y + 3);
      } else {
        pdf.setTextColor(255, 255, 255, 76);
        pdf.text("\u2014", colX, y + 3);
      }

      y += 6;
    }
  }

  // --- Gap Analysis Summary Page ---
  const gapSteps = steps
    .filter((s) => s.maturity_score != null && s.target_maturity != null)
    .map((s) => ({
      ...s,
      gap: s.target_maturity! - s.maturity_score!,
    }))
    .sort((a, b) => b.gap - a.gap);

  if (gapSteps.length > 0) {
    pdf.addPage("a4", "landscape");
    sectionEntries.push({ name: "Gap Analysis", page: pdf.getNumberOfPages() });
    y = margin;
    pdf.setFillColor(10, 10, 11);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Gap Analysis", margin, y);
    y += 8;

    // Narrative summary
    const belowTargetCount = gapSteps.filter((s) => s.gap > 0).length;
    const topGapNames = gapSteps.filter((s) => s.gap > 0).slice(0, 3).map((s) => s.name);
    const narrativeParts: string[] = [];
    narrativeParts.push(`${belowTargetCount} of ${gapSteps.length} scored step${gapSteps.length !== 1 ? "s" : ""} ${belowTargetCount === 1 ? "has a" : "have"} maturity gap${belowTargetCount !== 1 ? "s" : ""}.`);
    if (topGapNames.length > 0) {
      narrativeParts.push(`The largest gaps are in: ${topGapNames.join(", ")}.`);
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(255, 255, 255, 140);
    const narrativeLines = pdf.splitTextToSize(narrativeParts.join(" "), contentWidth);
    pdf.text(narrativeLines, margin, y);
    y += narrativeLines.length * 3.5 + 4;

    // Summary cards
    const scoredCount = gapSteps.length;
    const belowTarget = gapSteps.filter((s) => s.gap > 0).length;
    const avgGap = gapSteps.reduce((sum, s) => sum + s.gap, 0) / gapSteps.length;
    const maxGap = Math.max(...gapSteps.map((s) => s.gap));

    const gapSummaryStats = [
      { label: "Steps Scored", value: String(scoredCount) },
      { label: "Below Target", value: String(belowTarget) },
      { label: "Avg Gap", value: avgGap.toFixed(1) },
      { label: "Max Gap", value: String(maxGap) },
    ];

    const gapCardW = 50;
    const gapCardGap = 5;
    gapSummaryStats.forEach((stat, i) => {
      const x = margin + i * (gapCardW + gapCardGap);
      pdf.setFillColor(20, 20, 21);
      pdf.roundedRect(x, y, gapCardW, 16, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.text(stat.value, x + gapCardW / 2, y + 9, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text(stat.label.toUpperCase(), x + gapCardW / 2, y + 14, { align: "center" });
    });
    y += 22;

    // Gap table header
    const gapCols = [
      { label: "Step", width: 70 },
      { label: "Section", width: 60 },
      { label: "Current", width: 30 },
      { label: "Target", width: 30 },
      { label: "Gap", width: 25 },
      { label: "", width: contentWidth - 70 - 60 - 30 - 30 - 25 }, // bar area
    ];

    y = drawTableHeader(pdf, gapCols, margin, contentWidth, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);

    for (let rowIndex = 0; rowIndex < gapSteps.length; rowIndex++) {
      const step = gapSteps[rowIndex];
      const remainingGapRows = gapSteps.length - rowIndex;

      if (y > pageHeight - margin - 5 && remainingGapRows > 3) {
        y = newTablePage(pdf, "Gap Analysis", gapCols, margin, contentWidth, pageWidth, pageHeight);
      }

      if (rowIndex % 2 === 0) {
        pdf.setFillColor(14, 14, 15);
        pdf.rect(margin, y - 1, contentWidth, 6, "F");
      }

      let colX = margin + 2;

      // Step name
      pdf.setTextColor(255, 255, 255);
      pdf.text(truncate(step.name, 40), colX, y + 3);
      colX += gapCols[0].width;

      // Section
      pdf.setTextColor(255, 255, 255, 140);
      const secName = step.section_id ? sectionMap.get(step.section_id) ?? "\u2014" : "\u2014";
      pdf.text(truncate(secName, 35), colX, y + 3);
      colX += gapCols[1].width;

      // Current maturity with color dot
      if (step.maturity_score != null) {
        const color = MATURITY_COLORS[step.maturity_score];
        if (color) {
          const [r, g, b] = hexToRgb(color);
          pdf.setFillColor(r, g, b);
          pdf.circle(colX + 1.5, y + 2, 1.2, "F");
        }
        pdf.setTextColor(255, 255, 255);
        pdf.text(String(step.maturity_score), colX + 5, y + 3);
      }
      colX += gapCols[2].width;

      // Target
      pdf.setTextColor(255, 255, 255);
      pdf.text(String(step.target_maturity ?? ""), colX + 5, y + 3);
      colX += gapCols[3].width;

      // Gap value (color-coded)
      const gapColor = getGapColor(step.gap);
      const [gr, gg, gb] = hexToRgb(gapColor);
      pdf.setTextColor(gr, gg, gb);
      pdf.text(step.gap > 0 ? `+${step.gap}` : String(step.gap), colX, y + 3);
      colX += gapCols[4].width;

      // Visual gap bar
      if (step.gap > 0 && maxGap > 0) {
        const barMaxWidth = gapCols[5].width - 4;
        const barWidth = (step.gap / maxGap) * barMaxWidth;
        pdf.setFillColor(gr, gg, gb);
        pdf.roundedRect(colX, y + 0.5, barWidth, 3, 1, 1, "F");
      }

      y += 6;
    }
  }

  // --- Cost Summary Page ---
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
    sectionEntries.push({ name: "Cost Summary", page: pdf.getNumberOfPages() });
    y = margin;
    pdf.setFillColor(10, 10, 11);
    pdf.rect(0, 0, pageWidth, pageHeight, "F");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.text("Cost Summary", margin, y);
    y += 8;

    // Narrative summary
    {
      const costNarrative: string[] = [];
      costNarrative.push(`Total monthly effort across all sections is ${totalMonthlyHours.toFixed(1)} hours.`);
      if (totalMonthlyCost > 0) {
        costNarrative.push(`Estimated monthly cost is $${formatCurrency(totalMonthlyCost)} ($${formatCurrency(totalMonthlyCost * 12)} annually).`);
      }
      // Find highest-cost section
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
        costNarrative.push(`The highest-cost section is "${topSection.name}".`);
      }
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255, 140);
      const costNarrLines = pdf.splitTextToSize(costNarrative.join(" "), contentWidth);
      pdf.text(costNarrLines, margin, y);
      y += costNarrLines.length * 3.5 + 4;
    }

    // Total cards
    const costCardItems = [
      { label: "Monthly Hours", value: `${totalMonthlyHours.toFixed(1)}h` },
    ];
    if (totalMonthlyCost > 0) {
      costCardItems.push({ label: "Monthly Cost", value: `$${formatCurrency(totalMonthlyCost)}` });
      costCardItems.push({ label: "Annual Cost (est.)", value: `$${formatCurrency(totalMonthlyCost * 12)}` });
    }

    const costCardW = 65;
    const costCardGap = 5;
    costCardItems.forEach((stat, i) => {
      const x = margin + i * (costCardW + costCardGap);
      pdf.setFillColor(20, 20, 21);
      pdf.roundedRect(x, y, costCardW, 18, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text(stat.value, x + costCardW / 2, y + 10, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255, 76);
      pdf.text(stat.label.toUpperCase(), x + costCardW / 2, y + 16, { align: "center" });
    });
    y += 24;

    // Per-section cost breakdown
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
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text("By Section", margin, y);
      y += 6;

      // Section cost table header
      const costCols = [
        { label: "Section", width: 80 },
        { label: "Steps", width: 30 },
        { label: "Hrs/month", width: 40 },
        { label: "Cost/month", width: 50 },
        { label: "", width: contentWidth - 80 - 30 - 40 - 50 }, // bar area
      ];

      y = drawTableHeader(pdf, costCols, margin, contentWidth, y);

      // Sort sections by cost descending (or hours if no cost)
      const sortedSectionCosts = [...sectionCosts].sort((a, b) => {
        if (a.cost !== b.cost) return b.cost - a.cost;
        return b.hours - a.hours;
      });

      const maxSectionVal = Math.max(...sortedSectionCosts.map((s) => s.cost || s.hours));

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);

      for (let rowIndex = 0; rowIndex < sortedSectionCosts.length; rowIndex++) {
        const sec = sortedSectionCosts[rowIndex];

        if (y > pageHeight - margin - 5) {
          y = newTablePage(pdf, "Cost Summary — By Section", costCols, margin, contentWidth, pageWidth, pageHeight);
        }

        if (rowIndex % 2 === 0) {
          pdf.setFillColor(14, 14, 15);
          pdf.rect(margin, y - 1, contentWidth, 6, "F");
        }

        let colX = margin + 2;

        pdf.setTextColor(255, 255, 255);
        pdf.text(truncate(sec.name, 45), colX, y + 3);
        colX += costCols[0].width;

        pdf.setTextColor(255, 255, 255, 140);
        pdf.text(String(sec.stepCount), colX, y + 3);
        colX += costCols[1].width;

        pdf.setTextColor(255, 255, 255);
        pdf.text(sec.hours.toFixed(1), colX, y + 3);
        colX += costCols[2].width;

        if (sec.cost > 0) {
          pdf.text(`$${formatCurrency(sec.cost)}`, colX, y + 3);
        } else {
          pdf.setTextColor(255, 255, 255, 76);
          pdf.text("\u2014", colX, y + 3);
        }
        colX += costCols[3].width;

        // Bar
        const barVal = sec.cost || sec.hours;
        if (barVal > 0 && maxSectionVal > 0) {
          const barMaxWidth = costCols[4].width - 4;
          const barWidth = (barVal / maxSectionVal) * barMaxWidth;
          pdf.setFillColor(59, 130, 246); // accent-blue
          pdf.roundedRect(colX, y + 0.5, barWidth, 3, 1, 1, "F");
        }

        y += 6;
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
        y = margin;
        pdf.setFillColor(10, 10, 11);
        pdf.rect(0, 0, pageWidth, pageHeight, "F");
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Top 5 Costliest Steps", margin, y);
      y += 6;

      const topCols = [
        { label: "Step", width: 80 },
        { label: "Section", width: 60 },
        { label: "Hrs/month", width: 40 },
        { label: "Cost/month", width: 50 },
      ];

      y = drawTableHeader(pdf, topCols, margin, contentWidth, y);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7);

      for (let i = 0; i < stepCosts.length; i++) {
        const sc = stepCosts[i];

        if (i % 2 === 0) {
          pdf.setFillColor(14, 14, 15);
          pdf.rect(margin, y - 1, contentWidth, 6, "F");
        }

        let colX = margin + 2;

        pdf.setTextColor(255, 255, 255);
        pdf.text(truncate(sc.name, 45), colX, y + 3);
        colX += topCols[0].width;

        pdf.setTextColor(255, 255, 255, 140);
        pdf.text(truncate(sc.section, 35), colX, y + 3);
        colX += topCols[1].width;

        pdf.setTextColor(255, 255, 255);
        pdf.text(sc.hours.toFixed(1), colX, y + 3);
        colX += topCols[2].width;

        if (sc.cost > 0) {
          pdf.text(`$${formatCurrency(sc.cost)}`, colX, y + 3);
        } else {
          pdf.setTextColor(255, 255, 255, 76);
          pdf.text("\u2014", colX, y + 3);
        }

        y += 6;
      }
    }
  }

  // --- Footer on all pages ---
  if (!skipFooter) {
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(7);
      pdf.setTextColor(255, 255, 255, 50);
      pdf.text(
        `${workspaceName} \u2014 Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 5,
        { align: "center" }
      );
      pdf.setTextColor(20, 184, 166, 80);
      pdf.text("Stride", pageWidth - margin, pageHeight - 5, { align: "right" });
    }
  }

  return { pdf, sections: sectionEntries };
}

export async function exportWorkspacePdf(opts: ExportPdfOptions): Promise<void> {
  const { pdf } = await createWorkspacePdf(opts);
  const safeFilename = opts.workspaceName.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  pdf.save(`${safeFilename}-process-report.pdf`);
}

function buildStepRolesMap(stepRoles: StepRoleForExport[]): Map<string, StepRoleForExport[]> {
  const map = new Map<string, StepRoleForExport[]>();
  for (const sr of stepRoles) {
    const existing = map.get(sr.step_id);
    if (existing) {
      existing.push(sr);
    } else {
      map.set(sr.step_id, [sr]);
    }
  }
  return map;
}

function buildStepToolsMap(stepTools: StepToolForExport[]): Map<string, StepToolForExport[]> {
  const map = new Map<string, StepToolForExport[]>();
  for (const st of stepTools) {
    const existing = map.get(st.step_id);
    if (existing) {
      existing.push(st);
    } else {
      map.set(st.step_id, [st]);
    }
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

function drawTableHeader(
  pdf: jsPDF,
  cols: { label: string; width: number }[],
  margin: number,
  contentWidth: number,
  y: number,
): number {
  pdf.setFillColor(20, 20, 21);
  pdf.rect(margin, y, contentWidth, 7, "F");
  let hX = margin + 2;
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
  margin: number,
  contentWidth: number,
  pageWidth: number,
  pageHeight: number,
): number {
  pdf.addPage("a4", "landscape");
  let y = margin;
  pdf.setFillColor(10, 10, 11);
  pdf.rect(0, 0, pageWidth, pageHeight, "F");

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255, 100);
  pdf.text(`${title} (continued)`, margin, y);
  y += 5;

  y = drawTableHeader(pdf, cols, margin, contentWidth, y);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  return y;
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
  if (!result) return [255, 255, 255];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

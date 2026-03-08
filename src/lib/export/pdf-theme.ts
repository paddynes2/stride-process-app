import { jsPDF } from "jspdf";

// ── Swiss Editorial Theme (single source of truth) ─────────────────────────
export const T = {
  // Page
  bg: [255, 255, 255] as const,
  // Text
  navy: [23, 37, 84] as const,
  navyLight: [30, 58, 138] as const,
  body: [51, 65, 85] as const,
  muted: [100, 116, 139] as const,
  faint: [148, 163, 184] as const,
  white: [255, 255, 255] as const,
  // Accent
  teal: [13, 148, 136] as const,
  tealDark: [17, 94, 89] as const,
  tealLight: [204, 251, 241] as const,
  tealBg: [240, 253, 250] as const,
  // Surfaces
  surface: [248, 250, 252] as const,
  surfaceDark: [241, 245, 249] as const,
  tableHead: [23, 37, 84] as const,
  tableHeadText: [255, 255, 255] as const,
  tableStripe: [248, 250, 252] as const,
  border: [226, 232, 240] as const,
  cardBorder: [203, 213, 225] as const,
  // Semantic
  red: [220, 38, 38] as const,
  green: [22, 163, 74] as const,
  blue: [37, 99, 235] as const,
  amber: [217, 119, 6] as const,
  // Fonts
  titleSize: 28,
  h1: 18,
  h2: 13,
  h3: 10.5,
  bodySize: 10,
  small: 8,
  tiny: 7,
  tableSize: 8,
  tableHeadSize: 7.5,
  // Layout
  margin: 20,
  lineH: 4.5,
  paraGap: 7,
} as const;

export const GAP_COLORS: Record<number, string> = {
  0: "#6B7280",
  1: "#22C55E",
  2: "#84CC16",
  3: "#EAB308",
  4: "#F97316",
  5: "#EF4444",
};

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#16A34A",
  neutral: "#6B7280",
  negative: "#DC2626",
};

// ── Shared Types ───────────────────────────────────────────────────────────

export interface StepRoleForExport {
  step_id: string;
  role: { hourly_rate: number | null };
}

export interface StepToolForExport {
  step_id: string;
  tool: { cost_per_month: number | null };
}

export interface PdfSectionEntry {
  name: string;
  page: number;
}

// ── Automation Readiness Scale (branded rubric) ──────────────────────────

export const AUTOMATION_READINESS_SCALE = [
  { level: 1, label: "Manual / Tribal", definition: "Process lives in one person\u2019s head. No documentation, no digital trail.", indicator: "If the person is unavailable, the step does not happen." },
  { level: 2, label: "Documented", definition: "Process is written or templated. Could be done by someone else but isn\u2019t.", indicator: "A written SOP or checklist exists. Execution is still manual." },
  { level: 3, label: "Structured", definition: "Consistent format, clear inputs/outputs. Data exists in usable form.", indicator: "Someone else could execute this step with 30 min of training." },
  { level: 4, label: "Assisted", definition: "Key steps augmented by tools or AI. Human decides, tools do the heavy lifting.", indicator: "A tool drafts, compares, or alerts. Human reviews and approves." },
  { level: 5, label: "Autonomous", definition: "Runs end-to-end for standard cases. Human handles exceptions only.", indicator: "Step completes without human intervention. Monitored, self-healing." },
] as const;

// ── Gap Type Derivation ─────────────────────────────────────────────────

export type GapType = "discipline" | "complexity" | null;

export function deriveGapType(
  step: { maturity_score: number | null; target_maturity: number | null; effort_score: number | null },
): GapType {
  if (step.maturity_score == null || step.target_maturity == null) return null;
  const gap = step.target_maturity - step.maturity_score;
  if (gap <= 0) return null;
  if (step.effort_score == null) return null;
  if (step.effort_score <= 2) return "discipline";
  return "complexity";
}

// ── Composite Score ─────────────────────────────────────────────────────

export interface CompositeScore {
  score: number;
  target: number;
  gap: number;
  stepsScored: number;
}

export function computeCompositeScore(
  steps: { maturity_score: number | null; target_maturity: number | null }[],
): CompositeScore | null {
  const scored = steps.filter((s) => s.maturity_score != null);
  if (scored.length === 0) return null;
  const totalScore = scored.reduce((sum, s) => sum + s.maturity_score!, 0);
  const score = totalScore / scored.length;
  const withTarget = scored.filter((s) => s.target_maturity != null);
  const target = withTarget.length > 0
    ? withTarget.reduce((sum, s) => sum + s.target_maturity!, 0) / withTarget.length
    : score;
  return { score, target, gap: target - score, stepsScored: scored.length };
}

// ── Baseline / Delta View (R8) ────────────────────────────────────────────

export interface PreviousScore {
  step_id: string;
  maturity: number;
  date: string;
}

export interface BaselineData {
  baseline_date: string;
  review_interval_days: number;
  previous_scores: PreviousScore[];
  review_number: number;
}

/** Build a lookup map from previous scores. */
export function buildPreviousScoreMap(scores: PreviousScore[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const s of scores) {
    map.set(s.step_id, s.maturity);
  }
  return map;
}

/** Format a delta value for display: "+2" green, "0" gray, "-1" red. */
export function formatDelta(current: number, previous: number): { text: string; color: readonly [number, number, number] } {
  const delta = current - previous;
  if (delta > 0) return { text: `+${delta}`, color: T.green };
  if (delta < 0) return { text: String(delta), color: T.red };
  return { text: "0", color: T.faint };
}

// ── Phase Derivation (R5 + P4) ────────────────────────────────────────────

export const PHASE_META = [
  { phase: 0, label: "Phase 0", timeline: "Week 1–2", color: T.green, description: "Configuration, templates, and triggers — no engineering required." },
  { phase: 1, label: "Phase 1", timeline: "Month 1–3", color: T.blue, description: "Custom development — tools, integrations, or AI agents." },
  { phase: 2, label: "Phase 2", timeline: "Month 3–6", color: T.amber, description: "Sequenced after Phase 1 dependencies are in place." },
] as const;

/** Derive roadmap phase for a step. P4: phase_override takes precedence. */
export function derivePhase(step: {
  maturity_score: number | null;
  target_maturity: number | null;
  effort_score: number | null;
  impact_score: number | null;
  phase_override: number | null;
}): number | null {
  // P4: manual override
  if (step.phase_override != null) return step.phase_override;

  // Must have a gap
  if (step.maturity_score == null || step.target_maturity == null) return null;
  const gap = step.target_maturity - step.maturity_score;
  if (gap <= 0) return null;

  const gapType = deriveGapType(step);
  const impact = step.impact_score ?? 0;

  // Phase 0: discipline + high impact
  if (gapType === "discipline" && impact >= 4) return 0;
  // Phase 1: complexity + high impact
  if (gapType === "complexity" && impact >= 4) return 1;
  // Phase 2: everything else with a gap
  return 2;
}

// ── Value Type Helpers ────────────────────────────────────────────────────

export const VALUE_TYPE_META: Record<string, { label: string; color: readonly [number, number, number]; shortLabel: string }> = {
  value_adding: { label: "Value Adding", color: T.green, shortLabel: "VALUE" },
  necessary_waste: { label: "Necessary Waste", color: T.amber, shortLabel: "NECESSARY" },
  pure_waste: { label: "Pure Waste", color: T.red, shortLabel: "WASTE" },
};

export interface RevenueConfig {
  avg_order_value: number;
  monthly_inquiries: number;
  close_rate: number;
  reorder_rate: number;
}

export type RevenueTier = "full" | "context" | "skip";

/** Determine revenue rendering tier per P6.
 *  full = all 4 fields present, context = partial, skip = none */
export function getRevenueTier(workspace: {
  avg_order_value?: number | null;
  monthly_inquiries?: number | null;
  close_rate?: number | null;
  reorder_rate?: number | null;
}): RevenueTier {
  const fields = [workspace.avg_order_value, workspace.monthly_inquiries, workspace.close_rate, workspace.reorder_rate];
  const present = fields.filter((f) => f != null && f > 0).length;
  if (present === 4) return "full";
  if (present > 0) return "context";
  return "skip";
}

// ── Shared Helpers ─────────────────────────────────────────────────────────

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [100, 100, 100];
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)];
}

export function truncate(str: string, maxLen: number): string {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + "\u2026";
}

export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function stripHtml(str: string): string {
  if (!str) return "";
  return str.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
}

export function formatStatus(status: string): string {
  if (!status) return "";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Clamp a number to [min, max], returning fallback if NaN/undefined. */
export function clamp(value: number | null | undefined, min: number, max: number, fallback: number = min): number {
  if (value == null || !Number.isFinite(value)) return fallback;
  return Math.min(Math.max(value, min), max);
}

export function getGapColor(gap: number): string {
  if (gap <= 0) return GAP_COLORS[0];
  if (gap >= 5) return GAP_COLORS[5];
  return GAP_COLORS[gap] ?? GAP_COLORS[3];
}

// ── Page / Layout Helpers ──────────────────────────────────────────────────

export function setPageBg(pdf: jsPDF): void {
  const w = pdf.internal.pageSize.getWidth();
  const h = pdf.internal.pageSize.getHeight();
  pdf.setFillColor(...T.bg);
  pdf.rect(0, 0, w, h, "F");
}

export function drawAccentLine(pdf: jsPDF, x: number, y: number, width: number): void {
  pdf.setFillColor(...T.teal);
  pdf.rect(x, y, width, 0.8, "F");
}

export function drawSectionTitle(pdf: jsPDF, title: string, margin: number, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.h1);
  pdf.setTextColor(...T.navy);
  pdf.text(title, margin, y);
  y += 3;
  const lineW = Math.min(pdf.getTextWidth(title) + 8, 120);
  drawAccentLine(pdf, margin, y, lineW);
  return y + 7;
}

export function drawSubheading(pdf: jsPDF, title: string, margin: number, y: number): number {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.h2);
  pdf.setTextColor(...T.navy);
  pdf.text(title, margin, y);
  return y + 5;
}

export function drawBodyText(pdf: jsPDF, text: string, margin: number, y: number, contentWidth: number): number {
  if (!text || !text.trim()) return y;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.bodySize);
  pdf.setTextColor(...T.body);
  const lines = pdf.splitTextToSize(text, contentWidth);
  pdf.text(lines, margin, y);
  return y + lines.length * T.lineH + T.paraGap;
}

export function drawTableHeaderRow(
  pdf: jsPDF,
  cols: { label: string; width: number }[],
  margin: number,
  contentWidth: number,
  y: number,
): number {
  pdf.setFillColor(...T.tableHead);
  pdf.rect(margin, y, contentWidth, 7, "F");
  let hX = margin + 2;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(T.tableHeadSize);
  pdf.setTextColor(...T.tableHeadText);
  for (const col of cols) {
    if (col.label) pdf.text(col.label.toUpperCase(), hX, y + 4.5);
    hX += col.width;
  }
  return y + 8;
}

export function drawStripeRow(pdf: jsPDF, rowIndex: number, margin: number, y: number, contentWidth: number): void {
  if (rowIndex % 2 === 0) {
    pdf.setFillColor(...T.tableStripe);
    pdf.rect(margin, y - 1.5, contentWidth, 6.5, "F");
  }
  pdf.setDrawColor(...T.border);
  pdf.setLineWidth(0.15);
  pdf.line(margin, y + 5, margin + contentWidth, y + 5);
}

export function newTablePageClean(
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

export function drawStatCard(
  pdf: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  value: string,
  label: string,
  variant: "default" | "navy" | "teal" = "default",
): void {
  if (variant === "navy") {
    pdf.setFillColor(...T.navy);
    pdf.roundedRect(x, y, w, h, 2, 2, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(255, 255, 255);
    pdf.text(value, x + w / 2, y + h * 0.5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(180, 195, 220);
    pdf.text(label, x + w / 2, y + h * 0.8, { align: "center" });
  } else if (variant === "teal") {
    pdf.setFillColor(...T.tealBg);
    pdf.setDrawColor(...T.teal);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(x, y, w, h, 2, 2, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(...T.tealDark);
    pdf.text(value, x + w / 2, y + h * 0.5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...T.teal);
    pdf.text(label, x + w / 2, y + h * 0.8, { align: "center" });
  } else {
    pdf.setFillColor(...T.surface);
    pdf.setDrawColor(...T.border);
    pdf.setLineWidth(0.3);
    pdf.roundedRect(x, y, w, h, 2, 2, "FD");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(15);
    pdf.setTextColor(...T.navy);
    pdf.text(value, x + w / 2, y + h * 0.5, { align: "center" });
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.setTextColor(...T.muted);
    pdf.text(label, x + w / 2, y + h * 0.8, { align: "center" });
  }
}

/** Add a new clean landscape page and return layout metrics. */
export function addCleanPage(pdf: jsPDF): { y: number; pageWidth: number; pageHeight: number; margin: number; contentWidth: number } {
  pdf.addPage("a4", "landscape");
  setPageBg(pdf);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin: number = T.margin;
  return { y: margin, pageWidth, pageHeight, margin, contentWidth: pageWidth - margin * 2 };
}

/** Check if there's enough vertical space; if not, add a new page. Returns updated y and layout. */
export function ensureSpace(
  pdf: jsPDF,
  y: number,
  needed: number,
  pageHeight: number,
  margin: number,
): { y: number; pageWidth: number; pageHeight: number; margin: number; contentWidth: number } | null {
  if (y + needed > pageHeight - margin) {
    return addCleanPage(pdf);
  }
  return null;
}

// ── Data Helpers ───────────────────────────────────────────────────────────

export function buildStepRolesMap(stepRoles: StepRoleForExport[]): Map<string, StepRoleForExport[]> {
  const map = new Map<string, StepRoleForExport[]>();
  for (const sr of stepRoles) {
    const existing = map.get(sr.step_id);
    if (existing) existing.push(sr);
    else map.set(sr.step_id, [sr]);
  }
  return map;
}

export function buildStepToolsMap(stepTools: StepToolForExport[]): Map<string, StepToolForExport[]> {
  const map = new Map<string, StepToolForExport[]>();
  for (const st of stepTools) {
    const existing = map.get(st.step_id);
    if (existing) existing.push(st);
    else map.set(st.step_id, [st]);
  }
  return map;
}

export function computeStepMonthlyCost(
  step: { id: string; time_minutes: number | null; frequency_per_month: number | null },
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

/** Compute step cost using only roles (no tools). Used by enhanced sections. */
export function computeStepCostRolesOnly(
  step: { id: string; time_minutes: number | null; frequency_per_month: number | null },
  rolesMap: Map<string, StepRoleForExport[]>,
): number {
  if (!step.time_minutes || !step.frequency_per_month) return 0;
  const monthlyHours = (step.time_minutes * step.frequency_per_month) / 60;
  const roles = rolesMap.get(step.id) ?? [];
  const withRate = roles.filter((r) => r.role.hourly_rate != null);
  if (withRate.length === 0) return 0;
  const avgRate = withRate.reduce((sum, r) => sum + Number(r.role.hourly_rate), 0) / withRate.length;
  return monthlyHours * avgRate;
}

/** Safe division — returns 0 when divisor is 0 or non-finite. */
export function safeDivide(numerator: number, denominator: number): number {
  if (!Number.isFinite(denominator) || denominator === 0) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

/** Safe Math.max — returns fallback when array is empty (prevents -Infinity). */
export function safeMax(values: number[], fallback = 0): number {
  if (values.length === 0) return fallback;
  return Math.max(...values);
}

/** Reset jsPDF font state to safe defaults. Call after try/catch to prevent state leakage. */
export function resetFontState(pdf: jsPDF): void {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(T.bodySize);
  pdf.setTextColor(...T.body);
  pdf.setFillColor(...T.bg);
  pdf.setDrawColor(...T.border);
  pdf.setLineWidth(0.15);
  pdf.setLineDashPattern([], 0);
}

/**
 * Decide whether to break a table to a new page.
 * Prevents orphan pages (few rows alone on a continuation page) by:
 * 1. Allowing tail-end rows to extend into the footer gap zone
 * 2. Force-breaking early when tail rows won't fit — so all remaining rows
 *    move to the next page together, avoiding 2-3 row orphans.
 * Footer renders at pageHeight-9, so usable bottom is pageHeight-10.
 */
export function shouldBreakTable(
  y: number,
  pageHeight: number,
  margin: number,
  remainingRows: number,
  rowHeight = 6.5,
): boolean {
  const normalBottom = pageHeight - margin - 5;
  // If plenty of rows remain, use the normal conservative threshold
  if (remainingRows > 8) return y > normalBottom;
  // For the tail end: would all remaining rows fit if we extend to the footer zone?
  const extendedBottom = pageHeight - 10; // footer starts at pageHeight-9
  const spaceNeeded = remainingRows * rowHeight;
  if (y + spaceNeeded <= extendedBottom) return false; // they fit — don't break
  // They don't fit even in the extended zone — force break NOW so all remaining
  // rows land on the next page together (avoids 2-3 row orphan pages)
  return true;
}

/** Race a promise against a timeout. Rejects with Error if timeout expires. */
export function withTimeout<V>(promise: Promise<V>, ms: number, label = "Operation"): Promise<V> {
  return new Promise<V>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); },
    );
  });
}

/** Render footer on all pages except page 1 (title page). Shared between pdf.ts and canvas-view.tsx. */
export function renderFooter(pdf: jsPDF, workspaceName: string, baselineData?: BaselineData | null): void {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin: number = T.margin;
  const totalPages = pdf.getNumberOfPages();

  // R8: Determine footer mode text
  let modeText = "";
  if (baselineData) {
    const baseDate = new Date(baselineData.baseline_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (baselineData.review_number > 0) {
      modeText = ` \u2014 Review #${baselineData.review_number} \u2014 Baseline: ${baseDate}`;
    } else {
      const nextDate = new Date(baselineData.baseline_date);
      nextDate.setDate(nextDate.getDate() + baselineData.review_interval_days);
      const nextStr = nextDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      modeText = ` \u2014 Baseline Assessment \u2014 Next Review: ${nextStr}`;
    }
  }

  for (let i = 2; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFillColor(...T.teal);
    pdf.rect(margin, pageHeight - 9, pageWidth - margin * 2, 0.5, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...T.faint);
    pdf.text(
      `${truncate(workspaceName, 30)} \u2014 Page ${i} of ${totalPages}${modeText}`,
      pageWidth / 2,
      pageHeight - 4,
      { align: "center" },
    );
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...T.teal);
    pdf.text("Stride", pageWidth - margin, pageHeight - 4, { align: "right" });
    pdf.setFont("helvetica", "normal");
  }
}

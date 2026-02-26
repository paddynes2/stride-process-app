/** Pain scoring constants for journey canvas heat map — inverted from maturity (high pain = red). */

export const PAIN_COLORS: Record<number, string> = {
  1: "#22C55E", // green (low pain)
  2: "#84CC16", // lime
  3: "#EAB308", // yellow
  4: "#F97316", // orange
  5: "#EF4444", // red (high pain)
};

export const PAIN_LABELS: Record<number, string> = {
  1: "Minimal",
  2: "Low",
  3: "Moderate",
  4: "High",
  5: "Severe",
};

export const PAIN_FALLBACK_COLOR = "#6B7280";

/** Pain levels with color and label, useful for legends and dropdowns. */
export const PAIN_LEVELS = [1, 2, 3, 4, 5].map((level) => ({
  level,
  color: PAIN_COLORS[level],
  label: PAIN_LABELS[level],
}));

/** Get the color for a pain score, clamped to 1-5. Returns fallback gray for null. */
export function getPainColor(score: number | null): string {
  if (score == null) return PAIN_FALLBACK_COLOR;
  const rounded = Math.round(score);
  return PAIN_COLORS[Math.max(1, Math.min(5, rounded))] ?? PAIN_FALLBACK_COLOR;
}

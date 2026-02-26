/** Maturity scoring constants — single source of truth for colors, labels, and helpers. */

export const MATURITY_COLORS: Record<number, string> = {
  1: "#EF4444",
  2: "#F97316",
  3: "#EAB308",
  4: "#84CC16",
  5: "#22C55E",
};

export const MATURITY_LABELS: Record<number, string> = {
  1: "Initial",
  2: "Developing",
  3: "Defined",
  4: "Managed",
  5: "Optimized",
};

export const MATURITY_FALLBACK_COLOR = "#6B7280";

/** Maturity levels with color and label, useful for legends and dropdowns. */
export const MATURITY_LEVELS = [1, 2, 3, 4, 5].map((level) => ({
  level,
  color: MATURITY_COLORS[level],
  label: MATURITY_LABELS[level],
}));

/** Get the color for a maturity score, clamped to 1-5. Returns fallback gray for null. */
export function getMaturityColor(score: number | null): string {
  if (score == null) return MATURITY_FALLBACK_COLOR;
  const rounded = Math.round(score);
  return MATURITY_COLORS[Math.max(1, Math.min(5, rounded))] ?? MATURITY_FALLBACK_COLOR;
}

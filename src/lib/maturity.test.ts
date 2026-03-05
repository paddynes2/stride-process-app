import { describe, it, expect } from "vitest";
import {
  getMaturityColor,
  MATURITY_COLORS,
  MATURITY_FALLBACK_COLOR,
  MATURITY_LABELS,
  MATURITY_LEVELS,
} from "./maturity";

describe("getMaturityColor", () => {
  it("returns fallback for null", () => {
    expect(getMaturityColor(null)).toBe(MATURITY_FALLBACK_COLOR);
  });

  it("returns correct color for each score 1-5", () => {
    for (let i = 1; i <= 5; i++) {
      expect(getMaturityColor(i)).toBe(MATURITY_COLORS[i]);
    }
  });

  it("clamps score below 1 to level 1", () => {
    expect(getMaturityColor(0)).toBe(MATURITY_COLORS[1]);
    expect(getMaturityColor(-5)).toBe(MATURITY_COLORS[1]);
  });

  it("clamps score above 5 to level 5", () => {
    expect(getMaturityColor(6)).toBe(MATURITY_COLORS[5]);
    expect(getMaturityColor(100)).toBe(MATURITY_COLORS[5]);
  });

  it("rounds fractional scores", () => {
    expect(getMaturityColor(2.4)).toBe(MATURITY_COLORS[2]);
    expect(getMaturityColor(2.5)).toBe(MATURITY_COLORS[3]);
    expect(getMaturityColor(4.9)).toBe(MATURITY_COLORS[5]);
  });
});

describe("MATURITY_LEVELS", () => {
  it("has 5 levels with color and label", () => {
    expect(MATURITY_LEVELS).toHaveLength(5);
    for (const lvl of MATURITY_LEVELS) {
      expect(lvl.color).toBe(MATURITY_COLORS[lvl.level]);
      expect(lvl.label).toBe(MATURITY_LABELS[lvl.level]);
    }
  });
});

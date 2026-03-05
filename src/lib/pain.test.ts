import { describe, it, expect } from "vitest";
import {
  getPainColor,
  PAIN_COLORS,
  PAIN_FALLBACK_COLOR,
  PAIN_LABELS,
  PAIN_LEVELS,
} from "./pain";

describe("getPainColor", () => {
  it("returns fallback for null", () => {
    expect(getPainColor(null)).toBe(PAIN_FALLBACK_COLOR);
  });

  it("returns correct color for each score 1-5", () => {
    for (let i = 1; i <= 5; i++) {
      expect(getPainColor(i)).toBe(PAIN_COLORS[i]);
    }
  });

  it("clamps score below 1 to level 1", () => {
    expect(getPainColor(0)).toBe(PAIN_COLORS[1]);
    expect(getPainColor(-5)).toBe(PAIN_COLORS[1]);
  });

  it("clamps score above 5 to level 5", () => {
    expect(getPainColor(6)).toBe(PAIN_COLORS[5]);
    expect(getPainColor(100)).toBe(PAIN_COLORS[5]);
  });

  it("rounds fractional scores", () => {
    expect(getPainColor(2.4)).toBe(PAIN_COLORS[2]);
    expect(getPainColor(2.5)).toBe(PAIN_COLORS[3]);
    expect(getPainColor(4.9)).toBe(PAIN_COLORS[5]);
  });

  it("inverts maturity colors (high pain = red, low pain = green)", () => {
    expect(PAIN_COLORS[1]).toContain("22C55E"); // green
    expect(PAIN_COLORS[5]).toContain("EF4444"); // red
  });
});

describe("PAIN_LEVELS", () => {
  it("has 5 levels with color and label", () => {
    expect(PAIN_LEVELS).toHaveLength(5);
    for (const lvl of PAIN_LEVELS) {
      expect(lvl.color).toBe(PAIN_COLORS[lvl.level]);
      expect(lvl.label).toBe(PAIN_LABELS[lvl.level]);
    }
  });
});

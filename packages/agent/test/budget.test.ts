import { describe, expect, it } from "vitest";
import {
  BudgetExceededError,
  BudgetPausedError,
  checkBudget,
  centsToUsd,
  usdToCents,
} from "../src/budget";

describe("budget enforcement", () => {
  it("does nothing when no cap set", () => {
    expect(() =>
      checkBudget(
        { capUsdCents: null, spentUsdCents: 1000, onCap: "fail" },
        { estimatedUsdCents: 9999 },
      ),
    ).not.toThrow();
  });

  it("does nothing under cap", () => {
    expect(() =>
      checkBudget(
        { capUsdCents: 50, spentUsdCents: 10, onCap: "fail" },
        { estimatedUsdCents: 5 },
      ),
    ).not.toThrow();
  });

  it("throws BudgetExceededError on `fail` policy at cap", () => {
    expect(() =>
      checkBudget(
        { capUsdCents: 50, spentUsdCents: 40, onCap: "fail" },
        { estimatedUsdCents: 11 },
      ),
    ).toThrow(BudgetExceededError);
  });

  it("throws BudgetPausedError on `pause` policy at cap", () => {
    expect(() =>
      checkBudget(
        { capUsdCents: 50, spentUsdCents: 40, onCap: "pause" },
        { estimatedUsdCents: 11 },
      ),
    ).toThrow(BudgetPausedError);
  });

  it("does not throw on `degrade` policy — caller decides", () => {
    expect(() =>
      checkBudget(
        { capUsdCents: 50, spentUsdCents: 40, onCap: "degrade" },
        { estimatedUsdCents: 11 },
      ),
    ).not.toThrow();
  });

  it("usdToCents/centsToUsd roundtrip preserves 2-decimal USD", () => {
    expect(usdToCents(0.5)).toBe(50);
    expect(centsToUsd(50)).toBe(0.5);
  });
});

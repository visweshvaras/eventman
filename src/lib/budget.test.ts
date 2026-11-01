import { describe, expect, it } from "vitest";
import { calculateBudgetSummary } from "./budget";

describe("calculateBudgetSummary", () => {
  it("calculates actual spending, remaining funds, and utilization", () => {
    expect(calculateBudgetSummary(1000, [125, 275])).toEqual({
      actualExpenses: 400,
      remainingBudget: 600,
      utilizationPercent: 40,
    });
  });

  it("keeps a negative balance visible when expenses exceed the budget", () => {
    expect(calculateBudgetSummary(100, [140]).remainingBudget).toBe(-40);
  });

  it("returns no utilization percentage for a zero budget", () => {
    expect(calculateBudgetSummary(0, [0]).utilizationPercent).toBeNull();
  });

  it("adds fractional amounts in cents without floating-point drift", () => {
    expect(calculateBudgetSummary(1, [0.1, 0.2])).toMatchObject({
      actualExpenses: 0.3,
      remainingBudget: 0.7,
      utilizationPercent: 30,
    });
  });

  it("rejects negative or non-finite amounts", () => {
    expect(() => calculateBudgetSummary(-1, [])).toThrow(RangeError);
    expect(() => calculateBudgetSummary(100, [Number.NaN])).toThrow(RangeError);
    expect(() => calculateBudgetSummary(0, [Number.MAX_SAFE_INTEGER])).toThrow(RangeError);
  });
});

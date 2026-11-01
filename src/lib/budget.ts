export interface BudgetSummary {
  actualExpenses: number;
  remainingBudget: number;
  utilizationPercent: number | null;
}

export function sumMoneyAmounts(amounts: readonly number[]): number {
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) {
    throw new RangeError("Amounts must be non-negative finite numbers.");
  }

  const totalCents = amounts.reduce((total, amount) => {
    const updatedTotal = total + Math.round(amount * 100);
    if (!Number.isSafeInteger(updatedTotal)) {
      throw new RangeError("Amount total exceeds the supported precision.");
    }
    return updatedTotal;
  }, 0);

  return totalCents / 100;
}

export function calculateBudgetSummary(
  totalBudget: number,
  expenseAmounts: readonly number[],
): BudgetSummary {
  if (!Number.isFinite(totalBudget) || totalBudget < 0) {
    throw new RangeError("Total budget must be a non-negative finite number.");
  }
  const totalBudgetCents = Math.round(totalBudget * 100);
  if (!Number.isSafeInteger(totalBudgetCents)) {
    throw new RangeError("Total budget exceeds the supported precision.");
  }
  const actualExpenses = sumMoneyAmounts(expenseAmounts);
  const actualExpensesCents = Math.round(actualExpenses * 100);
  const remainingBudget = (totalBudgetCents - actualExpensesCents) / 100;

  return {
    actualExpenses,
    remainingBudget,
    utilizationPercent: totalBudgetCents === 0
      ? null
      : (actualExpensesCents / totalBudgetCents) * 100,
  };
}

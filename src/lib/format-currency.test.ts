import { describe, expect, it } from "vitest";
import { formatCurrency } from "./format-currency";

describe("formatCurrency", () => {
  it("formats supported currencies using the app's Indian number grouping", () => {
    expect(formatCurrency(123456, "INR")).toBe("₹1,23,456");
  });

  it("falls back to a readable amount when the currency code is invalid", () => {
    expect(formatCurrency(1234, "INVALID")).toBe("INVALID 1,234");
  });
});

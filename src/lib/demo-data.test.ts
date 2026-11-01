import { describe, expect, it } from "vitest";
import { demoDashboardEvents } from "./demo-data";

describe("demo dashboard data", () => {
  it("provides clearly fictional event data without a real account owner", () => {
    expect(demoDashboardEvents).toHaveLength(1);
    expect(demoDashboardEvents[0]).toMatchObject({
      id: "demo-event-1",
      owner_id: "",
      name: "Maya & Arjun's Wedding",
      event_type: "Wedding",
      budgets: [{ total_amount: 1800000, currency: "INR" }],
      tasks: expect.arrayContaining([
        expect.objectContaining({ title: "Venue walkthrough", status: "pending" }),
      ]),
    });
  });
});

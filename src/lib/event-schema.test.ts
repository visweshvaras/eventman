import { describe, expect, it } from "vitest";
import { createEventSchema, updateEventSchema } from "./event-schema";

describe("event request schemas", () => {
  it("normalizes omitted optional event fields", () => {
    expect(
      createEventSchema.parse({
        name: "A celebration",
        event_type: "Wedding",
        event_date: "2027-05-01",
        guest_count: 120,
        total_budget: 800000,
      }),
    ).toMatchObject({
      name: "A celebration",
      location: "",
      currency: "INR",
      theme: "",
      preferences: "",
    });
  });

  it("rejects invalid dates, guest counts, and negative budgets", () => {
    const invalidEvent = {
      name: "A celebration",
      event_type: "Wedding",
      event_date: "not-a-date",
      guest_count: 0,
      total_budget: -1,
    };

    expect(createEventSchema.safeParse(invalidEvent).success).toBe(false);
  });

  it("keeps partial updates from resetting fields that were not supplied", () => {
    expect(updateEventSchema.parse({ name: "Updated celebration" })).toEqual({
      name: "Updated celebration",
    });
  });
});

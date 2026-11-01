import { afterEach, describe, expect, it, vi } from "vitest";

const { isSupabaseConfigured, requireUser } = vi.hoisted(() => ({
  isSupabaseConfigured: vi.fn(() => true),
  requireUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  isSupabaseConfigured,
  requireUser,
}));

import * as assistantRoute from "./assistant/route";
import * as eventRoute from "./events/[eventId]/route";
import * as expenseRoute from "./events/[eventId]/expenses/route";
import * as taskRoute from "./events/[eventId]/tasks/route";
import * as taskItemRoute from "./events/[eventId]/tasks/[taskId]/route";
import * as eventsRoute from "./events/route";

const routeContext = {
  params: Promise.resolve({
    eventId: "00000000-0000-4000-8000-000000000001",
    taskId: "00000000-0000-4000-8000-000000000002",
  }),
};

async function expectAuthenticationRequired(response: Response) {
  expect(response.status).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
}

describe("protected API routes", () => {
  afterEach(() => {
    vi.clearAllMocks();
    isSupabaseConfigured.mockReturnValue(true);
  });

  it("reports missing Supabase configuration before attempting authentication", async () => {
    isSupabaseConfigured.mockReturnValue(false);

    const response = await eventsRoute.GET();

    expect(response.status).toBe(503);
    expect(requireUser).not.toHaveBeenCalled();
  });

  it("rejects event list reads and creation without a signed-in user", async () => {
    requireUser.mockResolvedValue({ supabase: {}, user: null });

    await expectAuthenticationRequired(await eventsRoute.GET());
    await expectAuthenticationRequired(
      await eventsRoute.POST(new Request("http://localhost/api/events", { method: "POST" })),
    );
  });

  it("rejects event reads, updates, and deletion without a signed-in user", async () => {
    requireUser.mockResolvedValue({ supabase: {}, user: null });
    const request = new Request("http://localhost/api/events/id", { method: "PATCH" });

    await expectAuthenticationRequired(await eventRoute.GET(request, routeContext));
    await expectAuthenticationRequired(await eventRoute.PATCH(request, routeContext));
    await expectAuthenticationRequired(await eventRoute.DELETE(request, routeContext));
  });

  it("rejects task creation, updates, and deletion without a signed-in user", async () => {
    requireUser.mockResolvedValue({ supabase: {}, user: null });
    const request = new Request("http://localhost/api/events/id/tasks", { method: "POST" });

    await expectAuthenticationRequired(await taskRoute.POST(request, routeContext));
    await expectAuthenticationRequired(await taskItemRoute.PATCH(request, routeContext));
    await expectAuthenticationRequired(await taskItemRoute.DELETE(request, routeContext));
  });

  it("rejects expense creation without a signed-in user", async () => {
    requireUser.mockResolvedValue({ supabase: {}, user: null });

    await expectAuthenticationRequired(
      await expenseRoute.POST(
        new Request("http://localhost/api/events/id/expenses", { method: "POST" }),
        routeContext,
      ),
    );
  });

  it("rejects assistant requests without a signed-in user", async () => {
    requireUser.mockResolvedValue({ supabase: {}, user: null });

    await expectAuthenticationRequired(
      await assistantRoute.POST(new Request("http://localhost/api/assistant", { method: "POST" })),
    );
  });
});

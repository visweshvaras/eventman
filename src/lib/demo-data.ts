import type { EventRecord } from "./event-schema";

export interface DashboardEvent extends EventRecord {
  budgets: { total_amount: number; currency: string }[];
  tasks: { id: string; title: string; status: string; due_date: string | null }[];
  expenses: { amount: number }[];
}

export const demoDashboardEvents: readonly DashboardEvent[] = [
  {
    id: "demo-event-1",
    owner_id: "",
    name: "Maya & Arjun's Wedding",
    event_type: "Wedding",
    event_date: "2027-02-20",
    location: "Jaipur, Rajasthan",
    guest_count: 180,
    currency: "INR",
    theme: "Garden celebration",
    preferences: "",
    created_at: "2026-11-01T00:00:00.000Z",
    updated_at: "2026-11-01T00:00:00.000Z",
    budgets: [{ total_amount: 1800000, currency: "INR" }],
    tasks: [
      {
        id: "demo-task-1",
        title: "Venue walkthrough",
        status: "pending",
        due_date: "2026-12-10",
      },
      {
        id: "demo-task-2",
        title: "Choose invitation design",
        status: "in_progress",
        due_date: "2026-12-18",
      },
      {
        id: "demo-task-3",
        title: "Confirm guest list",
        status: "completed",
        due_date: "2026-11-15",
      },
    ],
    expenses: [{ amount: 25000 }, { amount: 12000 }],
  },
];

import { z } from "zod";

export const eventTypeSchema = z.enum([
  "Wedding",
  "Birthday",
  "Anniversary",
  "Engagement",
  "Baby shower",
  "Corporate event",
  "Community gathering",
  "Festival",
  "College event",
  "Family celebration",
  "Other",
]);

export const createEventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  event_type: eventTypeSchema,
  event_date: z.string().date(),
  location: z.string().trim().max(160).default(""),
  guest_count: z.number().int().min(1).max(100_000),
  total_budget: z.number().nonnegative().max(1_000_000_000),
  currency: z.string().trim().length(3).default("INR"),
  theme: z.string().trim().max(160).default(""),
  preferences: z.string().trim().max(2000).default(""),
}).strict();

export const updateEventSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  event_type: eventTypeSchema.optional(),
  event_date: z.string().date().optional(),
  location: z.string().trim().max(160).optional(),
  guest_count: z.number().int().min(1).max(100_000).optional(),
  theme: z.string().trim().max(160).optional(),
  preferences: z.string().trim().max(2000).optional(),
}).strict();

export type CreateEventInput = z.infer<typeof createEventSchema>;

export interface EventRecord {
  id: string;
  owner_id: string;
  name: string;
  event_type: z.infer<typeof eventTypeSchema>;
  event_date: string;
  location: string;
  guest_count: number;
  currency: string;
  theme: string;
  preferences: string;
  created_at: string;
  updated_at: string;
}

export interface BudgetRecord {
  id: string;
  event_id: string;
  total_amount: number;
  currency: string;
}

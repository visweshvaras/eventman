import { updateEventSchema } from "@/lib/event-schema";
import { isSupabaseConfigured, requireUser } from "@/lib/supabase/server";
import { z } from "zod";

const eventIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { eventId } = await context.params;
  if (!eventIdSchema.safeParse(eventId).success) {
    return Response.json({ error: "Invalid event identifier." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,owner_id,name,event_type,event_date,location,guest_count,currency,theme,preferences,created_at,updated_at,budgets(total_amount,currency),tasks(id,title,description,status,priority,due_date,assigned_to),expenses(id,description,amount,expense_date),vendors(id,name,category,estimated_cost,quoted_cost,booking_status),guests(id,name,rsvp_status,guest_count)",
    )
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Could not load event:", error.message);
    return Response.json({ error: "Could not load this event." }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  return Response.json({ event: data });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { eventId } = await context.params;
  if (!eventIdSchema.safeParse(eventId).success) {
    return Response.json({ error: "Invalid event identifier." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = updateEventSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
    return Response.json({ error: "No valid event changes were provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .update(parsed.data)
    .eq("id", eventId)
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("Could not update event:", error.message);
    return Response.json({ error: "Could not update this event." }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  return Response.json({ event: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { eventId } = await context.params;
  if (!eventIdSchema.safeParse(eventId).success) {
    return Response.json({ error: "Invalid event identifier." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not delete event:", error.message);
    return Response.json({ error: "Could not delete this event." }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Event not found." }, { status: 404 });
  }

  return Response.json({ deleted: true });
}

import { createEventSchema, type EventRecord } from "@/lib/event-schema";
import { isSupabaseConfigured, requireUser } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("events")
    .select(
      "id,owner_id,name,event_type,event_date,location,guest_count,currency,theme,preferences,created_at,updated_at,budgets(total_amount,currency),tasks(id,title,status,due_date)",
    )
    .order("event_date", { ascending: true });

  if (error) {
    console.error("Could not load events:", error.message);
    return Response.json({ error: "Could not load your events." }, { status: 500 });
  }

  return Response.json({ events: data ?? [] });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Please check the event details.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const eventInput = parsed.data;
  const { data: eventId, error: createError } = await supabase.rpc(
    "create_event_with_budget",
    {
      p_name: eventInput.name,
      p_event_type: eventInput.event_type,
      p_event_date: eventInput.event_date,
      p_location: eventInput.location,
      p_guest_count: eventInput.guest_count,
      p_currency: eventInput.currency.toUpperCase(),
      p_theme: eventInput.theme,
      p_preferences: eventInput.preferences,
      p_total_budget: eventInput.total_budget,
    },
  );

  if (createError || !eventId) {
    console.error("Could not create event:", createError?.message);
    return Response.json({ error: "Could not save your event. Please try again." }, { status: 500 });
  }

  const { data: event, error: readError } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .single();

  if (readError || !event) {
    console.error("Event created but could not be reloaded:", readError?.message);
    return Response.json({ error: "Your event was saved but could not be loaded." }, { status: 500 });
  }

  const responseEvent = event as EventRecord;
  return Response.json({ event: responseEvent }, { status: 201 });
}

import { z } from "zod";
import { isSupabaseConfigured, requireUser } from "@/lib/supabase/server";

const expenseSchema = z.object({
  description: z.string().trim().min(1).max(240),
  amount: z.number().positive().max(1_000_000_000),
  expense_date: z.string().date(),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const { eventId } = await context.params;
  if (!z.string().uuid().safeParse(eventId).success) {
    return Response.json({ error: "Invalid event identifier." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = expenseSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Please check the expense details.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, event_id: eventId })
    .select("id,event_id,description,amount,expense_date")
    .single();
  if (error || !data) {
    console.error("Could not create expense:", error?.message);
    return Response.json({ error: "Could not save this expense." }, { status: 500 });
  }
  return Response.json({ expense: data }, { status: 201 });
}

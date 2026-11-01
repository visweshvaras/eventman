import { z } from "zod";
import { isSupabaseConfigured, requireUser } from "@/lib/supabase/server";

const taskSchema = z.object({
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).default(""),
  due_date: z.string().date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Add the required variables to .env.local." }, { status: 503 });
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
  const parsed = taskSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Please check the task details.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...parsed.data, event_id: eventId })
    .select("id,event_id,title,description,due_date,priority,status,assigned_to")
    .single();

  if (error || !data) {
    console.error("Could not create task:", error?.message);
    return Response.json({ error: "Could not save this task." }, { status: 500 });
  }

  return Response.json({ task: data }, { status: 201 });
}

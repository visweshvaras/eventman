import { z } from "zod";
import { isSupabaseConfigured, requireUser } from "@/lib/supabase/server";

const taskUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(2000).optional(),
  due_date: z.string().date().nullable().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  status: z.enum(["pending", "in_progress", "completed"]).optional(),
}).refine((value) => Object.keys(value).length > 0);

export async function PATCH(
  request: Request,
  context: { params: Promise<{ eventId: string; taskId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const { eventId, taskId } = await context.params;
  if (!z.string().uuid().safeParse(eventId).success || !z.string().uuid().safeParse(taskId).success) {
    return Response.json({ error: "Invalid task identifier." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = taskUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "No valid task changes were provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(parsed.data)
    .eq("event_id", eventId)
    .eq("id", taskId)
    .select("id,event_id,title,description,due_date,priority,status")
    .maybeSingle();

  if (error) {
    console.error("Could not update task:", error.message);
    return Response.json({ error: "Could not update this task." }, { status: 500 });
  }
  if (!data) return Response.json({ error: "Task not found." }, { status: 404 });
  return Response.json({ task: data });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ eventId: string; taskId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) return Response.json({ error: "Authentication required." }, { status: 401 });

  const { eventId, taskId } = await context.params;
  if (!z.string().uuid().safeParse(eventId).success || !z.string().uuid().safeParse(taskId).success) {
    return Response.json({ error: "Invalid task identifier." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("event_id", eventId)
    .eq("id", taskId)
    .select("id")
    .maybeSingle();
  if (error) {
    console.error("Could not delete task:", error.message);
    return Response.json({ error: "Could not delete this task." }, { status: 500 });
  }
  if (!data) return Response.json({ error: "Task not found." }, { status: 404 });
  return Response.json({ deleted: true });
}

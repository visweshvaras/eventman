import { z } from "zod";
import { calculateBudgetSummary } from "@/lib/budget";
import { createEventSchema, updateEventSchema } from "@/lib/event-schema";
import { getNimErrorMessage } from "@/lib/nim-error";
import { isSupabaseConfigured, requireUser } from "@/lib/supabase/server";

const requestSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  conversationId: z.string().uuid().optional(),
  eventId: z.string().uuid().optional(),
});

const taskInputSchema = z.object({
  event_id: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  due_date: z.string().date().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

const expenseInputSchema = z.object({
  event_id: z.string().uuid(),
  description: z.string().trim().min(1).max(240),
  amount: z.number().positive().max(1_000_000_000),
  expense_date: z.string().date().optional(),
});

const budgetInputSchema = z.object({
  event_id: z.string().uuid(),
  total_amount: z.number().nonnegative().max(1_000_000_000),
});

const assistantEventUpdatesSchema = updateEventSchema.omit({ event_date: true });

const updateInputSchema = z.object({
  event_id: z.string().uuid(),
  updates: assistantEventUpdatesSchema.refine((value) => Object.keys(value).length > 0),
});

const createEventToolSchema = createEventSchema;

interface ProviderToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface ProviderMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ProviderToolCall[];
  tool_call_id?: string;
}

interface ProviderResponse {
  choices?: {
    message?: {
      content?: string | null;
      tool_calls?: ProviderToolCall[];
    };
  }[];
  error?: { message?: string };
}

const tools = [
  {
    type: "function",
    function: {
      name: "get_events",
      description: "List the authenticated user's events and their dates, budgets, and guest counts.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event_summary",
      description: "Read a specific authorized event, its budget, saved expenses, and tasks.",
      parameters: {
        type: "object",
        properties: { event_id: { type: "string", format: "uuid" } },
        required: ["event_id"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Create a real event and its budget record for the authenticated user.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          event_type: { type: "string", enum: ["Wedding", "Birthday", "Anniversary", "Engagement", "Baby shower", "Corporate event", "Community gathering", "Festival", "College event", "Family celebration", "Other"] },
          event_date: { type: "string", format: "date" },
          location: { type: "string" },
          guest_count: { type: "integer", minimum: 1 },
          total_budget: { type: "number", minimum: 0 },
          currency: { type: "string" },
          theme: { type: "string" },
          preferences: { type: "string" },
        },
        required: ["name", "event_type", "event_date", "guest_count", "total_budget", "currency"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_event",
      description: "Update allowed details on one event the authenticated user can access.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", format: "uuid" },
          updates: {
            type: "object",
            properties: {
              name: { type: "string" },
              event_type: { type: "string", enum: ["Wedding", "Birthday", "Anniversary", "Engagement", "Baby shower", "Corporate event", "Community gathering", "Festival", "College event", "Family celebration", "Other"] },
              location: { type: "string" },
              guest_count: { type: "integer", minimum: 1 },
              theme: { type: "string" },
              preferences: { type: "string" },
            },
            additionalProperties: false,
          },
        },
        required: ["event_id", "updates"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_budget",
      description: "Set an event's total budget and return actual expense totals from saved records.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", format: "uuid" },
          total_amount: { type: "number", minimum: 0 },
        },
        required: ["event_id", "total_amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_expense",
      description: "Record an actual expense against an authorized event.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", format: "uuid" },
          description: { type: "string" },
          amount: { type: "number", exclusiveMinimum: 0 },
          expense_date: { type: "string", format: "date" },
        },
        required: ["event_id", "description", "amount"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Add a real planning task to an authorized event.",
      parameters: {
        type: "object",
        properties: {
          event_id: { type: "string", format: "uuid" },
          title: { type: "string" },
          description: { type: "string" },
          due_date: { type: "string", format: "date" },
          priority: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["event_id", "title"],
        additionalProperties: false,
      },
    },
  },
];

async function executeTool(
  name: string,
  rawArguments: unknown,
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
) {
  if (name === "get_events") {
    const { data, error } = await supabase
      .from("events")
      .select("id,name,event_type,event_date,location,guest_count,currency,budgets(total_amount,currency)")
      .order("event_date", { ascending: true })
      .limit(30);
    if (error) throw new Error("Could not retrieve events.");
    return { events: data ?? [] };
  }

  if (name === "get_event_summary") {
    const input = z.object({ event_id: z.string().uuid() }).parse(rawArguments);
    const [eventResult, budgetResult, expensesResult, tasksResult] = await Promise.all([
      supabase.from("events").select("id,name,event_type,event_date,location,guest_count,currency,theme,preferences").eq("id", input.event_id).maybeSingle(),
      supabase.from("budgets").select("total_amount,currency").eq("event_id", input.event_id).maybeSingle(),
      supabase.from("expenses").select("amount").eq("event_id", input.event_id),
      supabase.from("tasks").select("title,status,due_date,priority").eq("event_id", input.event_id).limit(100),
    ]);
    if (eventResult.error || !eventResult.data) throw new Error("Event not found or you do not have access.");
    if (budgetResult.error || expensesResult.error || tasksResult.error) throw new Error("Could not load all event details.");
    const summary = calculateBudgetSummary(
      Number(budgetResult.data?.total_amount ?? 0),
      (expensesResult.data ?? []).map((expense) => Number(expense.amount)),
    );
    return {
      event: eventResult.data,
      budget: {
        total: Number(budgetResult.data?.total_amount ?? 0),
        actual_expenses: summary.actualExpenses,
        remaining: summary.remainingBudget,
      },
      tasks: tasksResult.data ?? [],
    };
  }

  if (name === "create_event") {
    const input = createEventToolSchema.parse(rawArguments);
    const { data: eventId, error } = await supabase.rpc("create_event_with_budget", {
      p_name: input.name,
      p_event_type: input.event_type,
      p_event_date: input.event_date,
      p_location: input.location,
      p_guest_count: input.guest_count,
      p_currency: input.currency.toUpperCase(),
      p_theme: input.theme,
      p_preferences: input.preferences,
      p_total_budget: input.total_budget,
    });
    if (error || !eventId) throw new Error("The event could not be saved.");
    return { created: true, event_id: eventId, name: input.name, total_budget: input.total_budget };
  }

  if (name === "update_event") {
    const input = updateInputSchema.parse(rawArguments);
    const { data, error } = await supabase
      .from("events")
      .update(input.updates)
      .eq("id", input.event_id)
      .select("id,name,event_type,event_date,location,guest_count,currency,theme,preferences")
      .maybeSingle();
    if (error || !data) throw new Error("Event not found or the changes could not be saved.");
    return { updated: true, event: data };
  }

  if (name === "update_budget") {
    const input = budgetInputSchema.parse(rawArguments);
    const { data, error } = await supabase
      .from("budgets")
      .update({ total_amount: input.total_amount })
      .eq("event_id", input.event_id)
      .select("total_amount,currency")
      .maybeSingle();
    if (error || !data) throw new Error("Budget not found or the change could not be saved.");
    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("amount")
      .eq("event_id", input.event_id);
    if (expenseError) throw new Error("Budget changed but saved expenses could not be reloaded.");
    const summary = calculateBudgetSummary(
      Number(data.total_amount),
      (expenses ?? []).map((expense) => Number(expense.amount)),
    );
    return {
      updated: true,
      total_budget: Number(data.total_amount),
      actual_expenses: summary.actualExpenses,
      remaining: summary.remainingBudget,
      currency: data.currency,
    };
  }

  if (name === "create_expense") {
    const input = expenseInputSchema.parse(rawArguments);
    const { data, error } = await supabase
      .from("expenses")
      .insert({
        ...input,
        expense_date: input.expense_date ?? new Date().toISOString().slice(0, 10),
      })
      .select("id,event_id,description,amount,expense_date")
      .single();
    if (error) throw new Error("The expense could not be saved.");
    return { created: true, expense: data };
  }

  if (name === "create_task") {
    const input = taskInputSchema.parse(rawArguments);
    const { data, error } = await supabase
      .from("tasks")
      .insert(input)
      .select("id,event_id,title,description,due_date,priority,status")
      .single();
    if (error) throw new Error("The task could not be saved.");
    return { created: true, task: data };
  }

  throw new Error("This action is not available.");
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return Response.json({ error: "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the hosting service's environment settings." }, { status: 503 });
  }
  const { supabase, user } = await requireUser();
  if (!user) {
    return Response.json({ error: "Authentication required." }, { status: 401 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(requestBody);
  if (!parsed.success) {
    return Response.json({ error: "A message is required.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: withinRateLimit, error: rateLimitError } = await supabase.rpc("consume_assistant_rate_limit");
  if (rateLimitError) {
    console.error("Could not check assistant rate limit:", rateLimitError.message);
    return Response.json({ error: "The assistant is temporarily unavailable." }, { status: 503 });
  }
  if (!withinRateLimit) {
    return Response.json({ error: "You've reached the assistant's limit. Please try again in a minute." }, { status: 429 });
  }

  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  const model = process.env.NVIDIA_NIM_MODEL;
  if (!apiKey || !model) {
    return Response.json(
      { error: "The AI assistant is not configured. Add NVIDIA_NIM_API_KEY and NVIDIA_NIM_MODEL on the server." },
      { status: 503 },
    );
  }

  let conversationId = parsed.data.conversationId;
  if (conversationId) {
    const { data: existingConversation, error } = await supabase
      .from("conversations")
      .select("id,event_id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (error || !existingConversation) {
      return Response.json({ error: "Conversation not found." }, { status: 404 });
    }
    if (parsed.data.eventId && existingConversation.event_id !== parsed.data.eventId) {
      return Response.json({ error: "This conversation belongs to a different event." }, { status: 400 });
    }
  } else {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, event_id: parsed.data.eventId ?? null })
      .select("id")
      .single();
    if (error || !data) {
      console.error("Could not create assistant conversation:", error?.message);
      return Response.json({ error: "Could not start a conversation." }, { status: 500 });
    }
    conversationId = data.id;
  }

  const { data: history, error: historyError } = await supabase
    .from("conversation_messages")
    .select("role,content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(16);
  if (historyError) {
    console.error("Could not load assistant conversation:", historyError.message);
    return Response.json({ error: "Could not load conversation history." }, { status: 500 });
  }

  const { error: userMessageError } = await supabase.from("conversation_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: parsed.data.message,
  });
  if (userMessageError) {
    console.error("Could not save assistant message:", userMessageError.message);
    return Response.json({ error: "Could not save your message." }, { status: 500 });
  }

  const systemPrompt = [
    "You are EventGenie, a careful event planning assistant.",
    "The user is authenticated. Use tools for reading or changing event data; never claim a change succeeded unless a tool returns success.",
    "Only use data returned by tools. Never invent vendors, quotes, actual savings, expenses, or event details.",
    "If multiple events could match a request, ask which event before making changes.",
    "Ask concise follow-up questions if required tool fields are missing. Never guess a date, budget, or guest count.",
    "For unsupported actions (including deleting records, changing event dates, or changing vendors/guests), explain that you cannot execute them yet. Do not imply those records were changed.",
    "When changing a budget, use the saved expense totals returned by tools for arithmetic.",
    parsed.data.eventId ? `The current event context ID is ${parsed.data.eventId}; still verify it through tools.` : "No event is currently selected.",
    "Keep responses concise and clearly summarize completed changes.",
  ].join(" ");

  const messages: ProviderMessage[] = [
    { role: "system", content: systemPrompt },
    ...(history ?? [])
      .reverse()
      .filter((entry) => entry.role === "user" || entry.role === "assistant")
      .map((entry) => ({
        role: entry.role as "user" | "assistant",
        content: entry.content,
      })),
    { role: "user", content: parsed.data.message },
  ];

  let hasExecutedMutation = false;
  const toolFailures: string[] = [];

  try {
    let responseText = "";
    for (let turn = 0; turn < 4; turn += 1) {
      const nimResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          tools,
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: 1200,
        }),
        signal: AbortSignal.timeout(45_000),
        cache: "no-store",
      });

      const providerPayload = (await nimResponse.json()) as ProviderResponse;
      if (!nimResponse.ok) {
        console.error("NVIDIA NIM request failed:", providerPayload.error?.message ?? nimResponse.statusText);
        return Response.json(
          { error: getNimErrorMessage(nimResponse.status, hasExecutedMutation) },
          { status: 502 },
        );
      }

      const assistantMessage = providerPayload.choices?.[0]?.message;
      if (!assistantMessage) {
        return Response.json({ error: "The assistant returned an invalid response." }, { status: 502 });
      }

      const calls = assistantMessage.tool_calls ?? [];
      if (calls.length === 0) {
        responseText = assistantMessage.content?.trim() ?? "";
        break;
      }

      messages.push({
        role: "assistant",
        content: assistantMessage.content ?? null,
        tool_calls: calls,
      });

      for (const call of calls) {
        let toolResult: unknown;
        try {
          const argumentsValue: unknown = JSON.parse(call.function.arguments);
          toolResult = await executeTool(call.function.name, argumentsValue, supabase);
          if (
            typeof toolResult === "object" &&
            toolResult !== null &&
            ("created" in toolResult || "updated" in toolResult)
          ) {
            hasExecutedMutation = true;
          }
        } catch (toolError) {
          toolResult = {
            success: false,
            error: toolError instanceof Error ? toolError.message : "The action could not be completed.",
          };
          toolFailures.push(
            toolError instanceof Error ? toolError.message : "The action could not be completed.",
          );
        }
        messages.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          tool_call_id: call.id,
        });
      }

      if (toolFailures.length > 0) {
        responseText = `I couldn't complete every requested change: ${toolFailures.join("; ")}. Please review your event before retrying, since earlier actions in this request may already have been saved.`;
        break;
      }
    }

    if (!responseText) {
      return Response.json(
        { error: "The assistant could not finish this request. Your dashboard may have changed; check it before retrying." },
        { status: 502 },
      );
    }

    const { error: saveResponseError } = await supabase.from("conversation_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: responseText,
    });
    if (saveResponseError) {
      console.error("Could not save assistant response:", saveResponseError.message);
      return Response.json(
        { error: "The request may have completed, but its response could not be saved. Refresh your event data before retrying." },
        { status: 500 },
      );
    }
    const { error: conversationUpdateError } = await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
    if (conversationUpdateError) {
      console.error("Could not update conversation timestamp:", conversationUpdateError.message);
    }

    return Response.json({ conversationId, message: responseText });
  } catch (error) {
    console.error("Assistant request failed:", error);
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return Response.json(
      {
        error: hasExecutedMutation
          ? "The assistant could not finish its reply. A change may already have been saved; refresh your event before retrying."
          : timedOut
            ? "The assistant took too long to respond. Please try again."
            : "The assistant is temporarily unavailable.",
      },
      { status: 502 },
    );
  }
}

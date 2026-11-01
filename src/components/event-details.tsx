"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  CreditCard,
  MapPin,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AssistantWidget } from "@/components/assistant-widget";
import type { EventRecord } from "@/lib/event-schema";
import { calculateBudgetSummary } from "@/lib/budget";
import { formatCurrency } from "@/lib/format-currency";

interface EventTask {
  id: string;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
  due_date: string | null;
  assigned_to: string;
}

interface EventExpense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
}

interface EventDetailsRecord extends EventRecord {
  budgets: { total_amount: number; currency: string }[];
  tasks: EventTask[];
  expenses: EventExpense[];
  vendors: { id: string; name: string; category: string; estimated_cost: number; quoted_cost: number | null; booking_status: string }[];
  guests: { id: string; name: string; rsvp_status: string; guest_count: number }[];
}

const emptyEvent: EventDetailsRecord = {
  id: "",
  owner_id: "",
  name: "",
  event_type: "Other",
  event_date: "",
  location: "",
  guest_count: 1,
  currency: "INR",
  theme: "",
  preferences: "",
  created_at: "",
  updated_at: "",
  budgets: [],
  tasks: [],
  expenses: [],
  vendors: [],
  guests: [],
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function EventDetails({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [event, setEvent] = useState<EventDetailsRecord>(emptyEvent);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");

  const loadEvent = useCallback(async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`, { cache: "no-store" });
      const payload = (await response.json()) as { event?: EventDetailsRecord; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not load this event.");
      if (!payload.event) throw new Error("The event could not be found.");
      setEvent(payload.event);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load this event.");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    void Promise.resolve().then(loadEvent);
  }, [loadEvent]);

  const totalBudget = Number(event.budgets[0]?.total_amount ?? 0);
  const budgetSummary = useMemo(
    () => calculateBudgetSummary(
      totalBudget,
      event.expenses.map((expense) => Number(expense.amount)),
    ),
    [event.expenses, totalBudget],
  );
  const actualExpenses = budgetSummary.actualExpenses;
  const completedTasks = event.tasks.filter((task) => task.status === "completed").length;
  const progress = event.tasks.length ? Math.round((completedTasks / event.tasks.length) * 100) : 0;

  async function saveEvent(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    const formData = new FormData(eventForm.currentTarget);
    const updatedDate = String(formData.get("event_date") ?? "");
    if (
      updatedDate !== event.event_date &&
      !window.confirm("Changing the event date may affect deadlines and vendor arrangements. Save this change?")
    ) {
      return;
    }

    setIsSaving(true);
    setError("");
    setNotice("");

    const updates = {
      name: String(formData.get("name") ?? ""),
      event_date: updatedDate,
      location: String(formData.get("location") ?? ""),
      guest_count: Number(formData.get("guest_count")),
      theme: String(formData.get("theme") ?? ""),
      preferences: String(formData.get("preferences") ?? ""),
    };

    try {
      const response = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const payload = (await response.json()) as { event?: EventRecord; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not update this event.");
      setIsEditing(false);
      setNotice("Your event details have been saved.");
      await loadEvent();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not update this event.");
    } finally {
      setIsSaving(false);
    }
  }

  async function addTask(taskForm: FormEvent<HTMLFormElement>) {
    taskForm.preventDefault();
    setError("");
    try {
      const response = await fetch(`/api/events/${event.id}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: taskTitle, due_date: taskDate || undefined }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not add this task.");
      setTaskTitle("");
      setTaskDate("");
      setNotice("Task added to your plan.");
      await loadEvent();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Could not add this task.");
    }
  }

  async function addExpense(expenseForm: FormEvent<HTMLFormElement>) {
    expenseForm.preventDefault();
    setError("");
    try {
      const response = await fetch(`/api/events/${event.id}/expenses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: expenseDescription,
          amount: Number(expenseAmount),
          expense_date: new Date().toISOString().slice(0, 10),
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not add this expense.");
      setExpenseDescription("");
      setExpenseAmount("");
      setNotice("Expense saved to your budget.");
      await loadEvent();
    } catch (expenseError) {
      setError(expenseError instanceof Error ? expenseError.message : "Could not add this expense.");
    }
  }

  async function toggleTask(task: EventTask) {
    setError("");
    try {
      const response = await fetch(`/api/events/${event.id}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: task.status === "completed" ? "pending" : "completed" }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not update this task.");
      await loadEvent();
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "Could not update this task.");
    }
  }

  async function deleteEvent() {
    if (!window.confirm("Delete this event and all of its saved planning information? This cannot be undone.")) return;
    try {
      const response = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not delete this event.");
      router.replace("/dashboard");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete this event.");
    }
  }

  if (isLoading) {
    return <main className="event-loading">Opening your event plan...</main>;
  }

  if (error && !event.id) {
    return (
      <main className="event-loading">
        <p role="alert">{error}</p>
        <Link className="button button-outline" href="/dashboard"><ArrowLeft size={15} /> Back to your events</Link>
      </main>
    );
  }

  return (
    <div className="app-shell event-shell">
      <main className="event-detail-main">
        <header className="event-detail-topbar">
          <Link className="back-link" href="/dashboard"><ArrowLeft size={15} /> All events</Link>
          <button className="event-edit-button" onClick={() => setIsEditing((current) => !current)} type="button">
            <Pencil size={14} /> {isEditing ? "Cancel editing" : "Edit event"}
          </button>
        </header>
        <div className="event-detail-content">
          {error && <div className="dashboard-alert" role="alert"><p>{error}</p><button onClick={() => setError("")} type="button" aria-label="Dismiss error">x</button></div>}
          {notice && <div className="event-notice" role="status">{notice}</div>}

          <section className="event-hero-card">
            <div className="event-hero-main">
              <span className="panel-kicker">{event.event_type.toUpperCase()} | YOUR EVENT PLAN</span>
              <h1>{event.name}</h1>
              <div className="event-meta-row">
                <span><CalendarDays size={15} /> {formatDate(event.event_date)}</span>
                {event.location && <span><MapPin size={15} /> {event.location}</span>}
                <span><Users size={15} /> {event.guest_count.toLocaleString("en-IN")} guests</span>
              </div>
              {event.theme && <p className="event-theme">{event.theme}</p>}
            </div>
            <div className="event-hero-progress">
              <span className="progress-ring"><strong>{progress}%</strong></span>
              <span>Planning progress</span>
              <small>{completedTasks} of {event.tasks.length} tasks complete</small>
            </div>
          </section>

          {isEditing && (
            <section className="panel event-edit-panel">
              <div className="panel-heading">
                <div><span className="panel-kicker">MAKE IT YOURS</span><h2>Event details</h2></div>
              </div>
              <form className="event-form" onSubmit={saveEvent}>
                <label className="form-field form-field-wide">Event name<input name="name" defaultValue={event.name} maxLength={120} required /></label>
                <label className="form-field">Date<input name="event_date" type="date" defaultValue={event.event_date} required /></label>
                <label className="form-field">Guest count<input name="guest_count" type="number" min={1} max={100000} defaultValue={event.guest_count} required /></label>
                <label className="form-field form-field-wide">Location<input name="location" defaultValue={event.location} maxLength={160} /></label>
                <label className="form-field form-field-wide">Theme / preferences<textarea name="theme" defaultValue={event.theme} maxLength={2000} rows={3} /></label>
                <input name="preferences" type="hidden" value={event.preferences} readOnly />
                <div className="form-footer"><p>Changes save to your event plan.</p><button className="button button-primary" disabled={isSaving} type="submit">{isSaving ? "Saving..." : "Save details"}</button></div>
              </form>
            </section>
          )}

          <div className="event-detail-stats">
            <article className="event-detail-stat"><span><Wallet size={16} /> Total budget</span><strong>{formatCurrency(totalBudget, event.currency)}</strong></article>
            <article className="event-detail-stat"><span><CreditCard size={16} /> Recorded expenses</span><strong>{formatCurrency(actualExpenses, event.currency)}</strong></article>
            <article className="event-detail-stat"><span><Users size={16} /> Guests</span><strong>{event.guests.reduce((count, guest) => count + guest.guest_count, 0).toLocaleString("en-IN")} / {event.guest_count}</strong></article>
            <article className="event-detail-stat"><span><CheckCircle2 size={16} /> Vendors</span><strong>{event.vendors.length}</strong></article>
          </div>

          <div className="event-detail-grid">
            <section className="panel detail-section">
              <div className="panel-heading">
                <div><span className="panel-kicker">PLAN THE NEXT STEP</span><h2>Your tasks</h2></div>
                <span className="detail-count">{event.tasks.length}</span>
              </div>
              <form className="inline-add-form" onSubmit={addTask}>
                <label className="sr-only" htmlFor="task-title">New task title</label>
                <input id="task-title" maxLength={160} onChange={(input) => setTaskTitle(input.target.value)} placeholder="Add a planning task..." required value={taskTitle} />
                <label className="sr-only" htmlFor="task-date">Task due date</label>
                <input id="task-date" aria-label="Task due date" onChange={(input) => setTaskDate(input.target.value)} type="date" value={taskDate} />
                <button aria-label="Add task" disabled={!taskTitle.trim()} type="submit"><Plus size={16} /></button>
              </form>
              {event.tasks.length ? (
                <div className="detail-list">
                  {event.tasks.map((task) => (
                    <div className={`detail-list-row${task.status === "completed" ? " item-complete" : ""}`} key={task.id}>
                      <button aria-label={task.status === "completed" ? `Mark ${task.title} as not complete` : `Complete ${task.title}`} className="task-toggle" onClick={() => void toggleTask(task)} type="button">
                        {task.status === "completed" ? <CheckCircle2 size={17} /> : <Circle size={17} />}
                      </button>
                      <span className="detail-row-copy"><strong>{task.title}</strong><small>{task.due_date ? `Due ${formatDate(task.due_date)}` : "No due date"} | {task.priority} priority</small></span>
                      <span className={`status-pill status-${task.status}`}>{task.status.replace("_", " ")}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="detail-empty">Your tasks will appear here as you plan.</p>
              )}
            </section>

            <section className="panel detail-section">
              <div className="panel-heading">
                <div><span className="panel-kicker">KEEP YOUR SPENDING VISIBLE</span><h2>Expenses</h2></div>
                <span className="detail-count">{event.expenses.length}</span>
              </div>
              <form className="inline-add-form expense-add-form" onSubmit={addExpense}>
                <label className="sr-only" htmlFor="expense-description">Expense description</label>
                <input id="expense-description" maxLength={240} onChange={(input) => setExpenseDescription(input.target.value)} placeholder="Expense description" required value={expenseDescription} />
                <label className="sr-only" htmlFor="expense-amount">Amount</label>
                <input id="expense-amount" aria-label="Amount" min="0.01" onChange={(input) => setExpenseAmount(input.target.value)} placeholder="Amount" required step="0.01" type="number" value={expenseAmount} />
                <button aria-label="Add expense" disabled={!expenseDescription.trim() || !expenseAmount} type="submit"><Plus size={16} /></button>
              </form>
              {event.expenses.length ? (
                <div className="detail-list">
                  {event.expenses.map((expense) => (
                    <div className="detail-list-row" key={expense.id}>
                      <span className="expense-icon"><Wallet size={15} /></span>
                      <span className="detail-row-copy"><strong>{expense.description}</strong><small>{formatDate(expense.expense_date)}</small></span>
                      <strong className="expense-amount">{formatCurrency(Number(expense.amount), event.currency)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="detail-empty">No expenses recorded. Add actual spending here.</p>
              )}
            </section>

            <section className="panel detail-section">
              <div className="panel-heading">
                <div><span className="panel-kicker">PEOPLE YOU&apos;RE WORKING WITH</span><h2>Vendors</h2></div>
                <span className="detail-count">{event.vendors.length}</span>
              </div>
              {event.vendors.length ? (
                <div className="detail-list">
                  {event.vendors.map((vendor) => (
                    <div className="detail-list-row" key={vendor.id}>
                      <span className="expense-icon"><Sparkles size={15} /></span>
                      <span className="detail-row-copy"><strong>{vendor.name}</strong><small>{vendor.category} | {vendor.booking_status}</small></span>
                      <strong className="expense-amount">{formatCurrency(Number(vendor.quoted_cost ?? vendor.estimated_cost), event.currency)}</strong>
                    </div>
                  ))}
                </div>
              ) : <p className="detail-empty">Vendors you add will appear here.</p>}
            </section>

            <section className="panel detail-section">
              <div className="panel-heading">
                <div><span className="panel-kicker">THE PEOPLE WHO MAKE IT SPECIAL</span><h2>Guest overview</h2></div>
                <span className="detail-count">{event.guests.length}</span>
              </div>
              <div className="guest-overview">
                <div><strong>{event.guests.filter((guest) => guest.rsvp_status === "confirmed").reduce((sum, guest) => sum + guest.guest_count, 0)}</strong><span>Confirmed</span></div>
                <div><strong>{event.guests.filter((guest) => guest.rsvp_status === "pending" || guest.rsvp_status === "invited").reduce((sum, guest) => sum + guest.guest_count, 0)}</strong><span>Awaiting reply</span></div>
                <div><strong>{event.guests.filter((guest) => guest.rsvp_status === "declined").reduce((sum, guest) => sum + guest.guest_count, 0)}</strong><span>Declined</span></div>
              </div>
              {!event.guests.length && <p className="detail-empty">Guest list counts will appear here as you add guests.</p>}
            </section>
          </div>

          <div className="event-delete-row">
            <div><strong>Remove this event</strong><span>This permanently deletes its tasks, expenses, and planning details.</span></div>
            <button className="delete-event-button" onClick={() => void deleteEvent()} type="button"><Trash2 size={14} /> Delete event</button>
          </div>
        </div>
      </main>
      <AssistantWidget eventId={eventId} onActionComplete={() => void loadEvent()} />
    </div>
  );
}

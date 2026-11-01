"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CreditCard,
  MapPin,
  Plus,
  Sparkles,
  Wallet,
} from "lucide-react";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { CreateEventInput, EventRecord } from "@/lib/event-schema";
import { AssistantWidget } from "@/components/assistant-widget";
import { calculateBudgetSummary, sumMoneyAmounts } from "@/lib/budget";

interface DashboardEvent extends EventRecord {
  budgets: { total_amount: number; currency: string }[];
  tasks: { id: string; title: string; status: string; due_date: string | null }[];
  expenses: { amount: number }[];
}

const eventTypes = [
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
];

const supportedCurrencies = ["INR", "USD", "EUR", "GBP", "CAD", "AUD"];

const initialForm: CreateEventInput = {
  name: "",
  event_type: "Wedding",
  event_date: "",
  location: "",
  guest_count: 100,
  total_budget: 0,
  currency: "INR",
  theme: "",
  preferences: "",
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(value)}`;
  }
}

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function Dashboard() {
  const router = useRouter();
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CreateEventInput>(initialForm);
  const [userName, setUserName] = useState("there");
  const modalRef = useRef<HTMLElement>(null);

  const loadEvents = useCallback(async () => {
    try {
      const response = await fetch("/api/events", { cache: "no-store" });
      const payload = (await response.json()) as {
        events?: DashboardEvent[];
        error?: string;
      };
      if (!response.ok) {
        if (response.status === 401) {
          setEvents([]);
          setError("Sign in to see and manage your events.");
        } else {
          throw new Error(payload.error ?? "Could not load your events.");
        }
      } else {
        setError("");
        setEvents(payload.events ?? []);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load your events.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadEvents);
    try {
      const supabase = createSupabaseBrowserClient();
      void supabase.auth.getUser().then(({ data, error: userError }) => {
        if (userError) {
          console.error("Could not load the current user:", userError.message);
          return;
        }
        const name = data.user?.user_metadata?.display_name;
        if (typeof name === "string" && name.trim()) setUserName(name.trim().split(/\s+/)[0]);
      }).catch((userError: unknown) => {
        console.error("Could not load the current user:", userError);
      });
    } catch {
      // The events API reports missing service configuration in its response.
    }
  }, [loadEvents]);

  useEffect(() => {
    if (!isCreateOpen) return;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modalRef.current?.querySelector<HTMLElement>("input, select, textarea, button")?.focus();

    function handleModalKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCreateOpen(false);
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;

      const focusableElements = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
        ),
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleModalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleModalKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [isCreateOpen]);

  const totals = useMemo(() => {
    return events.reduce(
      (summary, event) => {
        const currency = event.budgets[0]?.currency ?? event.currency;
        const currencySummary = summary.byCurrency[currency] ?? { budget: 0, spent: 0 };
        const budget = Number(event.budgets[0]?.total_amount ?? 0);
        const budgetSummary = calculateBudgetSummary(
          budget,
          event.expenses.map((expense) => Number(expense.amount)),
        );
        summary.byCurrency[currency] = {
          budget: sumMoneyAmounts([currencySummary.budget, budget]),
          spent: sumMoneyAmounts([currencySummary.spent, budgetSummary.actualExpenses]),
        };
        summary.guests += event.guest_count;
        summary.tasks += event.tasks.filter((task) => task.status !== "completed").length;
        return summary;
      },
      { byCurrency: {} as Record<string, { budget: number; spent: number }>, guests: 0, tasks: 0 },
    );
  }, [events]);
  const budgetByCurrency = Object.entries(totals.byCurrency);
  const currencyBreakdown = (kind: "budget" | "spent") =>
    budgetByCurrency.length
      ? budgetByCurrency.map(([currency, value]) => formatCurrency(value[kind], currency)).join(" | ")
      : formatCurrency(0, "INR");

  async function createEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { event?: EventRecord; error?: string };
      if (!response.ok) throw new Error(payload.error ?? "Could not create your event.");
      setIsCreateOpen(false);
      setForm(initialForm);
      await loadEvents();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not create your event.");
    } finally {
      setIsSaving(false);
    }
  }

  async function signOut() {
    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      router.replace("/login");
      router.refresh();
    } catch (signOutError) {
      setError(signOutError instanceof Error ? signOutError.message : "Could not sign out.");
    }
  }

  const nextEvent = events[0];
  const tasksDueSoon = useMemo(
    () =>
      events
        .flatMap((event) =>
          event.tasks
            .filter((task) => task.status !== "completed")
            .map((task) => ({ ...task, eventName: event.name })),
        )
        .filter((task) => task.due_date)
        .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))
        .slice(0, 4),
    [events],
  );

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link aria-label="EventGenie home" className="brand sidebar-brand" href="/">
          <span className="brand-mark"><Sparkles aria-hidden="true" size={17} /></span>
          <span>eventgenie</span>
        </Link>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Workspace">
          <a className="sidebar-link active" href="#overview"><CalendarDays size={17} /> Overview</a>
          <a className="sidebar-link" href="#events"><Sparkles size={17} /> My events</a>
          <a className="sidebar-link" href="#budget"><Wallet size={17} /> Budget overview</a>
          <a className="sidebar-link" href="#timeline"><Clock3 size={17} /> Upcoming tasks</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="help-icon"><CircleHelp size={17} /></span>
            <div><strong>Need a hand?</strong><span>Your plans, your pace.</span></div>
          </div>
          <button className="profile-button" onClick={signOut} type="button">
            <span className="profile-avatar">{userName.slice(0, 1).toUpperCase()}</span>
            <span className="profile-copy"><strong>{userName}</strong><small>Sign out</small></span>
            <ChevronDown aria-hidden="true" size={15} />
          </button>
        </div>
      </aside>

      <main className="dashboard-main" id="overview">
        <header className="dashboard-topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="topbar-actions">
            <span className="topbar-date">Your celebrations, your pace</span>
            <Link className="topbar-help" href="/#how-it-works" aria-label="Help and how it works">
              <CircleHelp size={18} />
            </Link>
          </div>
        </header>

        <section className="dashboard-content">
          <div className="dashboard-heading">
            <div>
              <div className="dashboard-eyebrow"><span /> YOUR PLANNING SPACE</div>
              <h1>Good things are <em>in the making,</em> {userName}.</h1>
              <p>Here&apos;s where your ideas start turning into a day to remember.</p>
            </div>
            <button className="button button-primary create-event-button" onClick={() => setIsCreateOpen(true)} type="button">
              <Plus aria-hidden="true" size={17} /> Create an event
            </button>
          </div>

          {error && (
            <div className="dashboard-alert" role="alert">
              <p>{error}</p>
              {error.startsWith("Sign in") && <Link href="/login">Log in</Link>}
              <button onClick={() => setError("")} type="button" aria-label="Dismiss error">x</button>
            </div>
          )}

          <div className="stat-grid" aria-label="Event planning summary">
            <article className="stat-card">
              <span className="stat-icon stat-purple"><CalendarDays size={18} /></span>
              <span className="stat-label">Planned events</span>
              <strong>{isLoading ? "-" : events.length}</strong>
              <span className="stat-foot">Every celebration, together</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon stat-peach"><Wallet size={18} /></span>
              <span className="stat-label">Total planned budget</span>
              <strong>{isLoading ? "-" : currencyBreakdown("budget")}</strong>
              <span className="stat-foot">Totals shown by currency</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon stat-green"><CreditCard size={18} /></span>
              <span className="stat-label">Recorded expenses</span>
              <strong>{isLoading ? "-" : currencyBreakdown("spent")}</strong>
              <span className="stat-foot">Based on saved expenses</span>
            </article>
            <article className="stat-card">
              <span className="stat-icon stat-blue"><CheckCircle2 size={18} /></span>
              <span className="stat-label">Open tasks</span>
              <strong>{isLoading ? "-" : totals.tasks}</strong>
              <span className="stat-foot">Across your events</span>
            </article>
          </div>

          <div className="dashboard-columns">
            <section className="panel event-panel" id="events">
              <div className="panel-heading">
                <div>
                  <span className="panel-kicker">THE BIG MOMENTS</span>
                  <h2>Your events</h2>
                </div>
                <button className="text-button" onClick={() => setIsCreateOpen(true)} type="button">
                  New event <Plus size={15} />
                </button>
              </div>
              {isLoading ? (
                <div className="empty-events"><span className="loading-dot" /> Loading your plans...</div>
              ) : events.length === 0 ? (
                <div className="empty-events">
                  <span className="empty-icon"><Sparkles size={21} /></span>
                  <h3>Your next big moment starts here.</h3>
                  <p>Add the event you&apos;re dreaming about. You can fill in the details as you go.</p>
                  <button className="button button-outline" onClick={() => setIsCreateOpen(true)} type="button">
                    Create your first event <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div className="event-list">
                  {events.map((event) => {
                    const spent = event.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
                    const budget = Number(event.budgets[0]?.total_amount ?? 0);
                    const completion = event.tasks.length
                      ? Math.round((event.tasks.filter((task) => task.status === "completed").length / event.tasks.length) * 100)
                      : 0;
                    return (
                      <Link className="event-card" href={`/events/${event.id}`} key={event.id}>
                        <span className="event-type-icon"><Sparkles size={18} /></span>
                        <span className="event-card-main">
                          <span className="event-card-title">{event.name}</span>
                          <span className="event-card-meta">
                            <span><CalendarDays size={13} /> {formatEventDate(event.event_date)}</span>
                            {event.location && <span><MapPin size={13} /> {event.location}</span>}
                          </span>
                          <span className="event-progress"><i style={{ width: `${completion}%` }} /></span>
                        </span>
                        <span className="event-card-budget">
                          <strong>{formatCurrency(budget, event.currency)}</strong>
                          <small>{formatCurrency(spent, event.currency)} recorded</small>
                        </span>
                        <ArrowRight className="event-card-arrow" size={17} />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            <aside className="right-column">
              <section className="panel budget-panel" id="budget">
                <div className="panel-heading panel-heading-compact">
                  <div>
                    <span className="panel-kicker">MONEY, MADE CLEAR</span>
                    <h2>Budget overview</h2>
                  </div>
                  <Wallet className="panel-heading-icon" size={18} />
                </div>
                {nextEvent ? (
                  <>
                    <span className="budget-subtitle budget-currency-note">Separate totals for each currency</span>
                    <div className="currency-budget-list">
                      {budgetByCurrency.map(([currency, value]) => {
                        const summary = calculateBudgetSummary(value.budget, [value.spent]);
                        const utilization = summary.utilizationPercent ?? 0;
                        return (
                          <div className="currency-budget-row" key={currency}>
                            <strong className="currency-budget-name">{currency}</strong>
                            <div className="budget-progress-track">
                              <span style={{ width: `${Math.min(utilization, 100)}%` }} />
                            </div>
                            <div className="budget-summary-row">
                              <span><i className="budget-dot planned-dot" /> Planned</span>
                              <strong>{formatCurrency(value.budget, currency)}</strong>
                            </div>
                            <div className="budget-summary-row">
                              <span><i className="budget-dot spent-dot" /> Recorded</span>
                              <strong>{formatCurrency(value.spent, currency)}</strong>
                            </div>
                            <div className="budget-summary-row remaining-row">
                              <span><i className="budget-dot remaining-dot" /> Remaining</span>
                              <strong>{formatCurrency(summary.remainingBudget, currency)}</strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p className="side-empty">Your budget summary will appear here after you create an event.</p>
                )}
              </section>

              <section className="panel tasks-panel" id="timeline">
                <div className="panel-heading panel-heading-compact">
                  <div>
                    <span className="panel-kicker">ONE THING AT A TIME</span>
                    <h2>Coming up</h2>
                  </div>
                  <Clock3 className="panel-heading-icon" size={18} />
                </div>
                {tasksDueSoon.length ? (
                  <div className="task-list">
                    {tasksDueSoon.map((task) => (
                      <div className="task-item" key={task.id}>
                        <span className="task-check"><CheckCircle2 size={16} /></span>
                        <span className="task-copy">
                          <strong>{task.title}</strong>
                          <small>{task.eventName}</small>
                        </span>
                        <span className="task-date">
                          {task.due_date && new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${task.due_date}T00:00:00`))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="side-empty">No upcoming tasks yet. Your next steps will show up here.</p>
                )}
              </section>

              <section className="assistant-promo">
                <span className="assistant-promo-icon"><Sparkles size={17} /></span>
                <div>
                  <strong>Have an idea? Just ask.</strong>
                  <p>Your planning companion is here to help you think it through.</p>
                </div>
                <ArrowDownRight aria-hidden="true" size={16} />
              </section>
            </aside>
          </div>
        </section>
      </main>

      {isCreateOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsCreateOpen(false);
        }}>
          <section ref={modalRef} aria-labelledby="create-event-title" aria-modal="true" className="event-modal" role="dialog" tabIndex={-1}>
            <div className="modal-heading">
              <div>
                <span className="panel-kicker">A NEW CELEBRATION</span>
                <h2 id="create-event-title">Let&apos;s make a plan.</h2>
                <p>Start with the basics. You can update every detail later.</p>
              </div>
              <button className="modal-close" onClick={() => setIsCreateOpen(false)} type="button" aria-label="Close form">x</button>
            </div>
            <form className="event-form" onSubmit={createEvent}>
              <label className="form-field form-field-wide">
                Event name
                <input
                  maxLength={120}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  placeholder="e.g. Maya & Arjun&apos;s wedding"
                  required
                  value={form.name}
                />
              </label>
              <label className="form-field">
                Type of event
                <select
                  onChange={(event) => setForm((current) => ({ ...current, event_type: event.target.value as CreateEventInput["event_type"] }))}
                  value={form.event_type}
                >
                  {eventTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label className="form-field">
                Event date
                <input
                  onChange={(event) => setForm((current) => ({ ...current, event_date: event.target.value }))}
                  required
                  type="date"
                  value={form.event_date}
                />
              </label>
              <label className="form-field">
                Guests
                <input
                  max={100000}
                  min={1}
                  onChange={(event) => setForm((current) => ({ ...current, guest_count: Number(event.target.value) }))}
                  required
                  type="number"
                  value={form.guest_count}
                />
              </label>
              <label className="form-field">
                Total budget
                <input
                  min={0}
                  onChange={(event) => setForm((current) => ({ ...current, total_budget: Number(event.target.value) }))}
                  required
                  step="0.01"
                  type="number"
                  value={form.total_budget}
                />
              </label>
              <label className="form-field">
                Location
                <input
                  maxLength={160}
                  onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
                  placeholder="City, venue, or a place you have in mind"
                  value={form.location}
                />
              </label>
              <label className="form-field">
                Currency
                <select
                  onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
                  value={form.currency}
                >
                  {supportedCurrencies.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                </select>
              </label>
              <label className="form-field form-field-wide">
                Theme or preferences <span className="optional-label">Optional</span>
                <textarea
                  maxLength={2000}
                  onChange={(event) => setForm((current) => ({ ...current, theme: event.target.value, preferences: event.target.value }))}
                  placeholder="Share a little about the atmosphere, culture, or details that matter."
                  rows={3}
                  value={form.theme}
                />
              </label>
              <div className="form-footer">
                <p>Only you can see your event and its details.</p>
                <button className="button button-primary" disabled={isSaving} type="submit">
                  {isSaving ? "Saving..." : "Create event"} {!isSaving && <ArrowRight size={15} />}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      <AssistantWidget onActionComplete={() => void loadEvents()} />
    </div>
  );
}

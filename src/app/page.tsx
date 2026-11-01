import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ClipboardCheck,
  Sparkles,
  Wallet,
} from "lucide-react";

const highlights = [
  {
    icon: CalendarDays,
    title: "A plan that moves with you",
    description:
      "Keep dates, details, and next steps together as your celebration takes shape.",
  },
  {
    icon: Wallet,
    title: "A budget you can trust",
    description:
      "See allocations and real expenses clearly. Financial totals are calculated by the app.",
  },
  {
    icon: ClipboardCheck,
    title: "Every detail, in reach",
    description:
      "Bring your tasks, vendors, and guest plans into one thoughtfully organized space.",
  },
];

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link aria-label="EventGenie home" className="brand" href="/">
          <span className="brand-mark">
            <Sparkles aria-hidden="true" size={19} />
          </span>
          <span>eventgenie</span>
        </Link>
        <nav aria-label="Main navigation" className="landing-links">
          <a href="#how-it-works">How it works</a>
          <a href="#features">What you can plan</a>
        </nav>
        <div className="nav-actions">
          <Link className="button button-quiet" href="/login">
            Log in
          </Link>
          <Link className="button button-small button-dark" href="/signup">
            Get started <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            A little more magic, a lot less juggling
          </div>
          <h1>
            Your personal
            <br />
            <span>AI event planner.</span>
          </h1>
          <p>
            Plan weddings, birthdays, and unforgettable celebrations with an
            assistant that helps you bring the budget, timeline, and little
            details together.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/signup">
              Plan my event <ArrowRight aria-hidden="true" size={17} />
            </Link>
            <a className="button button-outline" href="#how-it-works">
              See how it works
            </a>
          </div>
          <div className="hero-note">
            <Check aria-hidden="true" size={15} />
            Your plans stay yours. Start with one event, and take it one step at
            a time.
          </div>
        </div>

        <div className="planner-preview" aria-label="Event planning preview">
          <div className="preview-topbar">
            <div className="preview-window-dots" aria-hidden="true">
              <i />
              <i />
              <i />
            </div>
            <span>your celebration, in good hands</span>
            <Sparkles aria-hidden="true" size={16} />
          </div>
          <div className="preview-content">
            <div className="preview-heading">
              <div>
                <span className="preview-kicker">YOUR EVENT PLAN</span>
                <h2>A day to remember</h2>
                <p>Thoughtful plans, all in one place.</p>
              </div>
              <span className="preview-sparkle">
                <Sparkles aria-hidden="true" size={19} />
              </span>
            </div>
            <div className="preview-date">
              <CalendarDays aria-hidden="true" size={17} />
              <span>Make room for what matters</span>
              <span className="date-pill">Your timeline</span>
            </div>
            <div className="preview-budget">
              <div className="preview-budget-heading">
                <span>Budget overview</span>
                <span>Stay on track</span>
              </div>
              <div className="budget-placeholder">
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className="preview-budget-legend">
                <span><i className="legend-purple" />Planned</span>
                <span><i className="legend-peach" />Spent</span>
              </div>
            </div>
            <div className="preview-assistant">
              <span className="assistant-avatar">
                <Sparkles aria-hidden="true" size={15} />
              </span>
              <div>
                <strong>Your planning companion</strong>
                <p>Ask for ideas or update your plan in a chat.</p>
              </div>
              <ArrowRight aria-hidden="true" size={17} />
            </div>
          </div>
          <div className="preview-decoration decoration-one" aria-hidden="true" />
          <div className="preview-decoration decoration-two" aria-hidden="true" />
        </div>
        <div className="hero-orb hero-orb-one" aria-hidden="true" />
        <div className="hero-orb hero-orb-two" aria-hidden="true" />
      </section>

      <section className="trust-row" aria-label="Planning principles">
        <span>Made for real-life celebrations</span>
        <span><Check aria-hidden="true" size={15} /> Plans you can actually use</span>
        <span><Check aria-hidden="true" size={15} /> Your choices, always in control</span>
      </section>

      <section className="feature-section" id="features">
        <div className="section-heading">
          <span className="section-kicker">MORE CELEBRATION. LESS STRESS.</span>
          <h2>All the moving pieces, finally moving together.</h2>
          <p>
            From the first idea to the final checklist, EventGenie helps make
            planning feel manageable.
          </p>
        </div>
        <div className="feature-grid">
          {highlights.map(({ icon: Icon, title, description }, index) => (
            <article className="feature-card" key={title}>
              <span className={`feature-icon feature-icon-${index + 1}`}>
                <Icon aria-hidden="true" size={20} />
              </span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="closing-cta" id="how-it-works">
        <span className="closing-icon"><Sparkles aria-hidden="true" size={20} /></span>
        <div>
          <h2>Start with your idea. We&apos;ll help with the details.</h2>
          <p>Create an account and make your first event plan your own.</p>
        </div>
        <Link className="button button-primary" href="/signup">
          Let&apos;s plan <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </section>

      <footer className="landing-footer">
        <Link aria-label="EventGenie home" className="brand brand-footer" href="/">
          <span className="brand-mark"><Sparkles aria-hidden="true" size={16} /></span>
          <span>eventgenie</span>
        </Link>
        <span>Made for your moments, big and small.</span>
        <span>(c) 2026 EventGenie</span>
      </footer>
    </main>
  );
}

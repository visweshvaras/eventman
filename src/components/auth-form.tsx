"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";

type AuthMode = "login" | "signup" | "forgot" | "reset";

const copy: Record<AuthMode, { title: string; description: string; button: string }> = {
  login: {
    title: "Welcome back",
    description: "Pick up right where your plans left off.",
    button: "Log in",
  },
  signup: {
    title: "Let's make it memorable",
    description: "Create an account to start planning your celebration.",
    button: "Create my account",
  },
  forgot: {
    title: "Forgot your password?",
    description: "We'll send a secure link to help you get back in.",
    button: "Send reset link",
  },
  reset: {
    title: "Choose a new password",
    description: "Make it strong, and make it yours.",
    button: "Update password",
  },
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName.trim() },
            emailRedirectTo: getAuthRedirectUrl(
              "/auth/callback?next=/dashboard",
              window.location.origin,
            ),
          },
        });
        if (authError) throw authError;
        if (data.session) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setMessage("Check your inbox for a verification link to finish creating your account.");
        }
      } else if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        router.push("/dashboard");
        router.refresh();
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: getAuthRedirectUrl(
            "/auth/callback?next=/reset-password",
            window.location.origin,
          ),
        });
        if (authError) throw authError;
        setMessage("If an account exists for that email, a password reset link is on its way.");
      } else {
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Your password has been updated. You can now log in.");
        window.setTimeout(() => router.push("/login"), 1100);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const isPasswordRequired = mode === "login" || mode === "signup" || mode === "reset";
  const titleCopy = copy[mode];

  return (
    <main className="auth-page">
      <Link aria-label="EventGenie home" className="brand auth-brand" href="/">
        <span className="brand-mark"><Sparkles aria-hidden="true" size={18} /></span>
        <span>eventgenie</span>
      </Link>
      <section className="auth-card" aria-labelledby="auth-title">
        <span className="auth-icon"><Sparkles aria-hidden="true" size={20} /></span>
        <h1 id="auth-title">{titleCopy.title}</h1>
        <p className="auth-description">{titleCopy.description}</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label>
              Your name
              <input
                autoComplete="name"
                maxLength={100}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="How should we address you?"
                required
                value={displayName}
              />
            </label>
          )}
          {mode !== "reset" && (
            <label>
              Email address
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </label>
          )}
          {isPasswordRequired && (
            <label>
              {mode === "reset" ? "New password" : "Password"}
              <input
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                required
                type="password"
                value={password}
              />
            </label>
          )}
          {error && <p className="form-message form-error" role="alert">{error}</p>}
          {message && <p className="form-message form-success" role="status">{message}</p>}
          <button className="button button-primary auth-submit" disabled={isSubmitting} type="submit">
            {isSubmitting ? "One moment..." : titleCopy.button}
            {!isSubmitting && <ArrowRight aria-hidden="true" size={16} />}
          </button>
        </form>
        {mode === "login" && (
          <Link className="auth-forgot" href="/forgot-password">Forgot password?</Link>
        )}
        <div className="auth-bottom">
          {mode === "login" && <>New to EventGenie? <Link href="/signup">Create an account</Link></>}
          {mode === "signup" && <>Already have an account? <Link href="/login">Log in</Link></>}
          {(mode === "forgot" || mode === "reset") && (
            <Link href="/login"><ArrowLeft aria-hidden="true" size={14} /> Back to login</Link>
          )}
        </div>
        {mode === "login" && (
          <div className="auth-demo-link">
            <span>Just exploring?</span>
            <Link href="/demo">Explore the read-only demo <ArrowRight aria-hidden="true" size={14} /></Link>
          </div>
        )}
      </section>
      <p className="auth-footnote">Your celebrations are personal. Your plans stay private.</p>
    </main>
  );
}

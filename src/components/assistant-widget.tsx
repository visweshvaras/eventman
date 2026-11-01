"use client";

import {
  ArrowUp,
  MessageCircle,
  Minimize2,
  Sparkles,
  X,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Show my upcoming events",
  "Help me plan a celebration",
  "What can you help me manage?",
];

export function AssistantWidget({
  eventId,
  onActionComplete,
}: {
  eventId?: string;
  onActionComplete?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hi! I'm your EventGenie planning companion. I can read and update your saved events, budgets, expenses, and tasks.",
    },
  ]);
  const [conversationId, setConversationId] = useState<string>();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isSending]);

  useEffect(() => {
    if (isOpen) {
      composerRef.current?.focus();
    } else if (wasOpenRef.current) {
      launcherRef.current?.focus();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending) return;

    setError("");
    setMessage("");
    setMessages((current) => [...current, { role: "user", content: trimmedMessage }]);
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedMessage,
          conversationId,
          eventId,
        }),
      });
      const payload = (await response.json()) as {
        message?: string;
        conversationId?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "The assistant could not respond.");
      if (typeof payload.message !== "string" || !payload.conversationId) {
        throw new Error("The assistant returned an incomplete response.");
      }

      const responseMessage = payload.message;
      setConversationId(payload.conversationId);
      setMessages((current) => [...current, { role: "assistant", content: responseMessage }]);
      onActionComplete?.();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The assistant could not respond.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      {isOpen && (
        <section
          className="assistant-panel"
          aria-label="EventGenie planning assistant"
          onKeyDown={(event) => {
            if (event.key === "Escape") setIsOpen(false);
          }}
        >
          <header className="assistant-header">
            <span className="assistant-header-icon"><Sparkles size={17} /></span>
            <span className="assistant-title">
              <strong>Your planning companion</strong>
              <small>EventGenie AI</small>
            </span>
            <button
              aria-label="Close assistant"
              className="assistant-close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              <Minimize2 size={16} />
            </button>
          </header>
          <div className="assistant-messages" ref={historyRef} aria-live="polite" aria-busy={isSending}>
            {messages.map((chatMessage, index) => (
              <div className={`chat-row chat-${chatMessage.role}`} key={`${chatMessage.role}-${index}`}>
                {chatMessage.role === "assistant" && (
                  <span className="chat-avatar"><Sparkles size={13} /></span>
                )}
                <p>{chatMessage.content}</p>
              </div>
            ))}
            {isSending && (
              <div className="chat-row chat-assistant">
                <span className="chat-avatar"><Sparkles size={13} /></span>
                <p className="typing-indicator" role="status">
                  <span className="sr-only">Assistant is thinking</span>
                  <i aria-hidden="true" /><i aria-hidden="true" /><i aria-hidden="true" />
                </p>
              </div>
            )}
            {messages.length === 1 && (
              <div className="assistant-suggestions">
                <span>TRY ASKING</span>
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setMessage(suggestion)}
                    type="button"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
          {error && <p className="assistant-error" role="alert">{error}</p>}
          <form className="assistant-composer" onSubmit={sendMessage}>
            <label className="sr-only" htmlFor="assistant-message">Message your planning assistant</label>
            <textarea
              id="assistant-message"
              maxLength={4000}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="Ask or make a change..."
              ref={composerRef}
              rows={1}
              value={message}
            />
            <button aria-label="Send message" disabled={isSending || !message.trim()} type="submit">
              <ArrowUp size={17} />
            </button>
          </form>
          <p className="assistant-disclaimer">Actions are saved only after the app confirms them.</p>
        </section>
      )}
      <button
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close planning assistant" : "Open planning assistant"}
        className={`assistant-launcher${isOpen ? " launcher-open" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        ref={launcherRef}
        type="button"
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
        {!isOpen && <span>Ask EventGenie</span>}
      </button>
    </>
  );
}

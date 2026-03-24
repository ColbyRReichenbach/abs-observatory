"use client";

import { useId, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText, ThumbsDown, ThumbsUp } from "lucide-react";

type AIFeedbackProps = {
  surface: "copilot" | "visualizer" | "chart_insight" | "game_debrief" | "article";
  targetType: "ai_message" | "game_report" | "article" | "chart_insight" | "challenge_summary";
  targetId: string;
  generationId?: string | null;
  conversationId?: string | null;
  messageId?: string | null;
  articleId?: string | null;
  gamePk?: number | null;
  metadata?: Record<string, unknown>;
  prompt?: string;
  className?: string;
};

const FEEDBACK_SESSION_STORAGE_KEY = "aibs-ai-feedback-session-id";
const CSRF_COOKIE_NAME = "aibs_csrf";

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const matched = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return matched ? decodeURIComponent(matched.slice(name.length + 1)) : null;
}

function getFeedbackSessionId() {
  if (typeof window === "undefined") return null;

  try {
    const existing = window.localStorage.getItem(FEEDBACK_SESSION_STORAGE_KEY);
    if (existing) return existing;
    const generated = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    window.localStorage.setItem(FEEDBACK_SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return null;
  }
}

async function ensureCsrfToken() {
  const existing = getCookie(CSRF_COOKIE_NAME);
  if (existing) return existing;

  try {
    const response = await fetch("/api/csrf", {
      method: "GET",
      cache: "no-store",
      credentials: "same-origin",
    });
    const body = (await response.json()) as { csrfToken?: string };
    if (!response.ok || !body.csrfToken) {
      return null;
    }
    return body.csrfToken;
  } catch {
    return null;
  }
}

export function AIFeedback({
  surface,
  targetType,
  targetId,
  generationId = null,
  conversationId = null,
  messageId = null,
  articleId = null,
  gamePk = null,
  metadata,
  prompt = "Was this useful?",
  className = "",
}: AIFeedbackProps) {
  const [sentiment, setSentiment] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const textareaId = useId();

  const payloadBase = useMemo(
    () => ({
      sessionId: getFeedbackSessionId(),
      surface,
      targetType,
      targetId,
      generationId,
      conversationId,
      messageId,
      articleId,
      gamePk,
      metadata,
    }),
    [articleId, conversationId, gamePk, generationId, messageId, metadata, surface, targetId, targetType],
  );

  async function submitFeedback(nextSentiment: "up" | "down", nextComment?: string) {
    const csrfToken = await ensureCsrfToken();
    if (!csrfToken) {
      setStatusText("Feedback unavailable right now.");
      return;
    }

    setIsSubmitting(true);
    setStatusText(null);

    try {
      const response = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          ...payloadBase,
          sentiment: nextSentiment,
          comment: nextComment?.trim() ? nextComment.trim() : null,
        }),
      });

      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        setStatusText(body.error || "Could not save feedback.");
        return;
      }

      setSentiment(nextSentiment);
      setStatusText(nextComment?.trim() ? "Feedback saved." : "Thanks for the signal.");
    } catch {
      setStatusText("Could not save feedback.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-400">{prompt}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              void submitFeedback("up", comment);
            }}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
              sentiment === "up"
                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-emerald-200 hover:text-emerald-700"
            }`}
          >
            <ThumbsUp size={12} />
            <span>Up</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsExpanded(true);
              void submitFeedback("down");
            }}
            disabled={isSubmitting}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] transition-all ${
              sentiment === "down"
                ? "border-red-500 bg-red-50 text-red-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-red-200 hover:text-red-700"
            }`}
          >
            <ThumbsDown size={12} />
            <span>Down</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-gray-400 transition-colors hover:text-gray-700"
        >
          <MessageSquareText size={12} />
          <span>{isExpanded ? "Hide Note" : "Add Note"}</span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <label htmlFor={textareaId} className="sr-only">
              Optional AI feedback note
            </label>
            <textarea
              id={textareaId}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Optional: tell us what worked or what felt off."
              className="min-h-[84px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none transition-colors placeholder:text-gray-400 focus:border-gray-300"
              maxLength={1000}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-medium text-gray-400">{comment.length}/1000</p>
              <button
                type="button"
                disabled={!sentiment || isSubmitting}
                onClick={() => sentiment && submitFeedback(sentiment, comment)}
                className="inline-flex items-center rounded-full bg-gray-950 px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isSubmitting ? "Saving..." : "Save Note"}
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {statusText ? <p className="text-[11px] font-medium text-gray-500">{statusText}</p> : null}
    </div>
  );
}

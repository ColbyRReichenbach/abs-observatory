"use client";

import { useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { ensureCsrfToken } from "@/lib/client/csrf";
import { inferCopilotContext } from "@/lib/copilot-context";
import type { AIChatResponse } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

const CONFIDENCE_COLORS = {
  high: "var(--accent-primary)",
  medium: "var(--accent-warm)",
  low: "var(--state-confirmed)",
};

const STARTERS: Record<ViewMode, string[]> = {
  fan: [
    "What was the biggest ABS controversy this week?",
    "Which umpire has shown the most review volatility lately?",
    "Which teams have been the most overactive with challenges this spring?",
    "Show me the biggest late-inning overturned calls.",
  ],
  org: [
    "Which upcoming umpires carry the most ABS risk this week?",
    "Which teams are winning challenges in high-leverage spots?",
    "Summarize tonight's umpire prep notes for this matchup.",
    "Which counts create the most controversy for this umpire?",
  ],
};

export function QueryExplorerClient({ mode }: { mode: ViewMode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState(STARTERS[mode][0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIChatResponse | null>(null);
  const context = inferCopilotContext(pathname, { range: searchParams.get("range") ?? undefined });

  const modeCopy = useMemo(
    () =>
      mode === "org"
        ? {
            eyebrow: "Prep Interface",
            title: "AI Prep Explorer",
            subtitle: "Structured baseball ops prompts over approved AiBS tools and league data.",
            starterLabel: "Quick prep prompts",
            answerHeading: "Prep Readout",
          }
        : {
            eyebrow: "Conversation Starter",
            title: "AI Copilot Explorer",
            subtitle: "Ask fan-friendly baseball questions over approved AiBS tools and challenge data.",
            starterLabel: "Popular prompts",
            answerHeading: "Copilot Readout",
          },
    [mode],
  );

  async function runQuery(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const csrfToken = await ensureCsrfToken();
      if (!csrfToken) {
        setResult({ error: "Sign in and verify your email to use AiBS AI." } as AIChatResponse);
        return;
      }
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ message: question, context, delivery: "sync", surface: "copilot" }),
      });
      const payload = (await res.json()) as AIChatResponse;
      if (!res.ok || payload.safetyDisposition === "blocked") {
        setResult({
          ...payload,
          error: payload.error || "AiBS can only answer baseball-related analytics questions.",
        });
        return;
      }
      setResult(payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="panel relative overflow-hidden p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(74,158,110,0.06),transparent_55%)]" />
        <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-30" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
            <span className="h-1 w-1 rounded-full bg-[var(--accent-primary)]" />
            {modeCopy.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-display uppercase tracking-[0.06em] text-[var(--ink-0)]">
            {modeCopy.title}
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-2)]">{modeCopy.subtitle}</p>
        </div>
      </div>

      <div className="mt-6 panel p-5">
        <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">{modeCopy.starterLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STARTERS[mode].map((starter) => (
            <button
              key={starter}
              type="button"
              onClick={() => setQuestion(starter)}
              className="rounded-full border border-[var(--border-subtle)] bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-2)] transition hover:border-[var(--accent-primary)] hover:text-[var(--accent-primary)]"
            >
              {starter}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={runQuery} className="mt-6 panel p-5">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">Your question</span>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="input mt-2 h-28 resize-none"
          />
        </label>
        <button
          disabled={loading}
          className={`mt-4 rounded-full px-6 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] transition-all duration-[var(--motion-fast)] ${
            loading
              ? "bg-[var(--surface-3)] text-[var(--ink-3)] cursor-wait"
              : "bg-[var(--accent-primary)] text-white hover:brightness-110 shadow-[0_4px_12px_rgba(74,158,110,0.25)]"
          }`}
        >
          {loading ? "Running..." : mode === "org" ? "Run Prep Query" : "Ask Copilot"}
        </button>
      </form>

      {result ? (
        result.error ? (
          <section className="mt-6 animate-fade-in-up rounded-[var(--radius-lg)] border border-red-100 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {result.error}
          </section>
        ) : (
          <section className="mt-6 panel overflow-hidden animate-fade-in-up">
            <div className="p-5 space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-3)]">{modeCopy.answerHeading}</p>
                {result.confidence ? (
                  <span
                    className="status-chip text-[9px]"
                    style={{
                      borderColor: `${CONFIDENCE_COLORS[result.confidence]}44`,
                      color: CONFIDENCE_COLORS[result.confidence],
                      backgroundColor: `${CONFIDENCE_COLORS[result.confidence]}15`,
                    }}
                  >
                    {result.confidence}
                  </span>
                ) : null}
              </div>

              {result.answer ? (
                <p className="text-sm leading-relaxed text-[var(--ink-0)]">{result.answer}</p>
              ) : null}

              {result.citations?.length ? (
                <p className="text-[11px] text-[var(--ink-3)]">
                  Sources: {result.citations.join(", ")}
                </p>
              ) : null}

              {result.toolResults?.length ? (
                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]">
                    {mode === "org" ? "Structured Tool Output" : "Supporting Tool Output"}
                  </p>
                  <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-infield)] p-3 text-xs font-mono text-[var(--ink-1)]">
                    {JSON.stringify(result.toolResults, null, 2)}
                  </pre>
                </div>
              ) : null}
            </div>
          </section>
        )
      ) : null}
    </>
  );
}

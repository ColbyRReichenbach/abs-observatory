"use client";

import { useState } from "react";

type QueryResult = {
  answer: string;
  sql: string;
  sources: string[];
  confidence: "low" | "medium" | "high";
  rows: Record<string, unknown>[];
  error?: string;
  hint?: string;
};

const CONFIDENCE_COLORS = {
  high: "var(--accent-primary)",
  medium: "var(--accent-warm)",
  low: "var(--state-confirmed)",
};

export default function QueryPage() {
  const [question, setQuestion] = useState("Which teams have the highest ABS overturn rate this week?");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);

  async function runQuery(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = (await res.json()) as QueryResult;
      setResult(payload);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="panel relative overflow-hidden p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(74,158,110,0.06),transparent_55%)]" />
        <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-transparent via-[var(--accent-primary)] to-transparent opacity-30" />
        <div className="relative">
          <p className="flex items-center gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--ink-3)]">
            <span className="h-1 w-1 rounded-full bg-[var(--accent-primary)]" />
            Natural Language Interface
          </p>
          <h1 className="mt-3 text-4xl font-display uppercase tracking-[0.06em] text-[var(--ink-0)]">
            AI Query Explorer
          </h1>
          <p className="mt-2 text-sm text-[var(--ink-2)]">
            Guarded NL-to-SQL over approved ABS semantic views.
          </p>
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
          {loading ? "Running..." : "Run Query"}
        </button>
      </form>

      {result ? (
        <section className="mt-6 panel overflow-hidden animate-fade-in-up">
          {result.error ? (
            <div className="border-b border-[var(--state-confirmed)]/20 bg-[var(--state-confirmed)]/8 px-5 py-3 text-sm text-[#fca5a5]">
              {result.error}
            </div>
          ) : null}
          {result.hint ? (
            <div className="border-b border-[var(--accent-warm)]/20 bg-[var(--accent-warm-soft)] px-5 py-3 text-sm text-[var(--accent-warm)]">
              {result.hint}
            </div>
          ) : null}

          <div className="p-5 space-y-4">
            {result.answer ? (
              <p className="text-sm leading-relaxed text-[var(--ink-0)]">{result.answer}</p>
            ) : null}

            {result.confidence ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.08em] text-[var(--ink-3)]">Confidence</span>
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
              </div>
            ) : null}

            {result.sources?.length ? (
              <p className="text-[11px] text-[var(--ink-3)]">
                Sources: {result.sources.join(", ")}
              </p>
            ) : null}

            {result.sql ? (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]">Generated SQL</p>
                <pre className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-infield)] p-3 text-xs font-mono text-[var(--accent-primary)]">
                  {result.sql}
                </pre>
              </div>
            ) : null}

            {result.rows?.length ? (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-[0.1em] text-[var(--ink-3)]">
                  Results ({Math.min(result.rows.length, 20)} rows)
                </p>
                <pre className="max-h-64 overflow-auto rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-infield)] p-3 text-xs font-mono text-[var(--ink-1)]">
                  {JSON.stringify(result.rows.slice(0, 20), null, 2)}
                </pre>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  );
}

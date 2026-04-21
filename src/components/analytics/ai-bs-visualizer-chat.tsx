"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, FileText, Loader2, Send } from "lucide-react";

import { AIFeedback } from "@/components/ai-feedback";
import { BaseballSpinner } from "@/components/baseball-spinner";
import { AiBSIcon } from "@/components/ui/aibs-icon";
import { ensureCsrfToken } from "@/lib/client/csrf";
import type { AIChatResponse, AIVisualizerPlan } from "@/lib/types";

const FAN_STARTER_PROMPTS = [
  "Show challenge swings by inning.",
  "Compare overturn rate by count state.",
  "Map offense vs defense challenge results.",
  "Show where the biggest reviews show up late.",
];

const ORG_STARTER_PROMPTS = [
  "Show challenge value by inning.",
  "Compare expected vs realized value by count state.",
  "Map offensive vs defensive challenge results.",
  "Show late-and-close review pressure.",
];

function formatChartType(chartType: AIVisualizerPlan["chartType"]) {
  switch (chartType) {
    case "bar_chart":
      return "Bar Chart";
    case "line_chart":
      return "Line Chart";
    case "scatter_plot":
      return "Scatter Plot";
    case "heatmap":
      return "Heatmap";
    case "timeline":
      return "Timeline";
    case "table":
      return "Table";
    default:
      return chartType;
  }
}

function VisualizerPreview({ plan }: { plan: AIVisualizerPlan }) {
  return (
    <div className="rounded-[2rem] border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Preview</p>
          <p className="mt-2 text-2xl font-display uppercase tracking-tight text-gray-900">{plan.chartTitle}</p>
        </div>
        <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">
          {formatChartType(plan.chartType)}
        </span>
      </div>

      {plan.chartType === "bar_chart" ? <BarPreview /> : null}
      {plan.chartType === "line_chart" ? <LinePreview /> : null}
      {plan.chartType === "scatter_plot" ? <ScatterPreview /> : null}
      {plan.chartType === "heatmap" ? <HeatmapPreview /> : null}
      {plan.chartType === "timeline" ? <TimelinePreview /> : null}
      {plan.chartType === "table" ? <TablePreview /> : null}

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-gray-100 pt-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">X-Axis</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{plan.xAxis}</p>
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Y-Axis</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{plan.yAxis}</p>
        </div>
      </div>
    </div>
  );
}

function PreviewShell({ children }: { children: ReactNode }) {
  return <div className="rounded-[1.5rem] border border-gray-100 bg-[var(--surface-infield)] p-5">{children}</div>;
}

function BarPreview() {
  return (
    <PreviewShell>
      <div className="flex h-48 items-end gap-4">
        {[42, 68, 55, 82, 61].map((height, index) => (
          <div key={index} className="flex-1 rounded-t-2xl bg-blue-500/80" style={{ height: `${height}%` }} />
        ))}
      </div>
    </PreviewShell>
  );
}

function LinePreview() {
  return (
    <PreviewShell>
      <svg viewBox="0 0 320 180" className="h-48 w-full">
        <path d="M20 140 C60 120, 90 90, 130 102 S200 60, 300 32" fill="none" stroke="#2563eb" strokeWidth="6" strokeLinecap="round" />
        {[20, 88, 150, 220, 300].map((x, index) => (
          <circle key={index} cx={x} cy={[140, 112, 102, 72, 32][index]} r="7" fill="#ffffff" stroke="#2563eb" strokeWidth="4" />
        ))}
      </svg>
    </PreviewShell>
  );
}

function ScatterPreview() {
  const points = [
    [42, 124],
    [96, 108],
    [132, 86],
    [188, 98],
    [226, 58],
    [280, 42],
  ];
  return (
    <PreviewShell>
      <svg viewBox="0 0 320 180" className="h-48 w-full">
        {points.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r={index % 2 === 0 ? 10 : 7} fill="rgba(37,99,235,0.2)" stroke="#2563eb" strokeWidth="3" />
        ))}
      </svg>
    </PreviewShell>
  );
}

function HeatmapPreview() {
  const cells = [
    ["#dbeafe", "#93c5fd", "#60a5fa", "#1d4ed8"],
    ["#eff6ff", "#bfdbfe", "#3b82f6", "#2563eb"],
    ["#e0f2fe", "#7dd3fc", "#38bdf8", "#0284c7"],
    ["#fef3c7", "#fcd34d", "#f59e0b", "#d97706"],
  ];
  return (
    <PreviewShell>
      <div className="grid h-48 grid-cols-4 gap-3">
        {cells.flatMap((row, rowIndex) =>
          row.map((color, colIndex) => (
            <div key={`${rowIndex}-${colIndex}`} className="rounded-2xl" style={{ backgroundColor: color }} />
          )),
        )}
      </div>
    </PreviewShell>
  );
}

function TimelinePreview() {
  return (
    <PreviewShell>
      <div className="relative h-48">
        <div className="absolute left-6 right-6 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-200" />
        {[12, 26, 42, 58, 76].map((left, index) => (
          <div key={index} className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border-4 border-white bg-blue-500 shadow" style={{ left: `${left}%` }} />
        ))}
      </div>
    </PreviewShell>
  );
}

function TablePreview() {
  return (
    <PreviewShell>
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((index) => (
            <div key={index} className="h-6 rounded-full bg-gray-200" />
          ))}
        </div>
        {[1, 2, 3, 4].map((row) => (
          <div key={row} className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((col) => (
              <div key={`${row}-${col}`} className="h-10 rounded-2xl bg-white border border-gray-100" />
            ))}
          </div>
        ))}
      </div>
    </PreviewShell>
  );
}

export function AIBSVisualizerChat({
  context,
  teamColor = "#007aff",
  audience = "fan",
}: {
  context: string;
  teamColor?: string;
  audience?: "fan" | "org";
}) {
  const starterPrompts = audience === "org" ? ORG_STARTER_PROMPTS : FAN_STARTER_PROMPTS;
  const heading =
    audience === "org" ? "Build a strategy chart from AiBS data" : "Build a custom chart from AiBS data";
  const subtitle =
    audience === "org"
      ? "Ask for the exact workflow view you need, or describe the baseball question and AiBS will choose the strongest chart form."
      : "Ask for the exact chart you want, or describe the baseball question and AiBS will choose the best chart form.";
  const [query, setQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{
    query: string;
    answer: string;
    structuredPlan: AIVisualizerPlan | null;
    citations: string[];
    toolResults: Array<{ toolName: string; payload: unknown }>;
    conversationId: string;
    assistantMessageId: string | null;
    generationId: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setIsGenerating(true);
    setResult(null);
    setError(null);

    try {
      const csrfToken = await ensureCsrfToken();
      if (!csrfToken) {
        setError("Sign in and verify your email to use AiBS AI.");
        return;
      }
      const prompt = `For ${context}, return one strict chart specification for this request using only AiBS data. If the user names a chart type and it is implementable, use it. If they describe what they want to see without naming a chart, choose the best chart type and define it. Do not write explanation outside the chart spec. Request: ${query.trim()}`;
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({ message: prompt, delivery: "sync", surface: "visualizer" }),
      });
      const payload = (await response.json()) as AIChatResponse;

      if (!response.ok || payload.safetyDisposition === "blocked") {
        setError(payload.error || payload.answer || "Unable to generate a chart right now.");
        return;
      }

      setResult({
        query,
        answer: payload.answer,
        structuredPlan: payload.structuredPlan ?? null,
        citations: payload.citations,
        toolResults: payload.toolResults,
        conversationId: payload.conversationId,
        assistantMessageId: payload.assistantMessageId ?? null,
        generationId: payload.generationId ?? null,
      });
      setQuery("");
    } catch {
      setError("Unable to generate a chart right now.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="mt-16 mx-auto w-full max-w-6xl px-4 pb-10">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-100" />
          <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
            Visualize your own ideas
          </p>
          <div className="h-px flex-1 bg-gray-100" />
        </div>

        <div className="mx-auto max-w-3xl text-center">
          <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
            {heading}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {subtitle}
          </p>
        </div>

        <div className="relative group">
          <div className="panel flex items-center gap-4 rounded-full border border-gray-100 bg-white p-2 pl-6 shadow-xl shadow-black/[0.02] transition-all focus-within:border-gray-200 focus-within:shadow-lg focus-within:shadow-black/[0.04]">
            <div className="shrink-0 -ml-2 text-blue-500">
              <AiBSIcon size={20} showTextOnHover />
            </div>
            <form onSubmit={handleSubmit} className="flex flex-1 items-center">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Ask AiBS to build a chart for ${context}...`}
                className="w-full bg-transparent border-0 !outline-none text-sm font-medium text-gray-900 placeholder:text-gray-600 focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 [box-shadow:none_!important] [outline:none_!important] [-webkit-tap-highlight-color:transparent]"
              />
              <motion.button
                type="submit"
                disabled={isGenerating || !query.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 rounded-full bg-gray-900 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition-all hover:bg-black disabled:pointer-events-none disabled:opacity-30"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    <span>Building Chart</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Build Chart</span>
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>

        {!result && !isGenerating ? (
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setQuery(prompt)}
                className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <div className="panel flex items-start gap-3 rounded-3xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <AnimatePresence mode="wait">
          {isGenerating ? (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12"
            >
              <BaseballSpinner />
            </motion.div>
          ) : null}

          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full"
            >
              <div className="panel overflow-hidden rounded-[2.5rem] border border-gray-100 bg-white p-0 shadow-2xl shadow-black/[0.05]">
                <div className="flex items-center justify-between gap-6 border-b border-gray-50 px-10 py-8">
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                      Chart Output
                    </p>
                    <h4 className="text-xl font-display uppercase tracking-tight text-gray-900">
                      &ldquo;{result.query}&rdquo;
                    </h4>
                  </div>
                  <div className="max-w-xs rounded-2xl bg-gray-50 px-4 py-3 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Context</p>
                    <p className="text-xs font-bold text-gray-700">{context}</p>
                  </div>
                </div>

                <div className="grid gap-8 bg-gray-50 px-10 py-10 lg:grid-cols-[1.2fr_0.8fr]">
                  <div>
                    {result.structuredPlan ? (
                      <VisualizerPreview plan={result.structuredPlan} />
                    ) : null}
                    {!result.structuredPlan ? (
                      <p className="text-sm leading-relaxed text-gray-700">{result.answer}</p>
                    ) : null}
                  </div>

                  <div className="space-y-4">
                    {result.structuredPlan ? (
                      <div className="rounded-3xl border border-gray-200 bg-white p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Chart Setup
                          </p>
                          <span
                            className="rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white"
                            style={{ backgroundColor: teamColor }}
                          >
                            {formatChartType(result.structuredPlan.chartType)}
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-gray-100 bg-[var(--surface-infield)] px-4 py-3">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Title</p>
                            <p className="mt-1 text-sm font-semibold text-gray-900">{result.structuredPlan.chartTitle}</p>
                          </div>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">X-Axis</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">{result.structuredPlan.xAxis}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Y-Axis</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">{result.structuredPlan.yAxis}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Compare By</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">{result.structuredPlan.compareBy ?? "None"}</p>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Render Goal</p>
                              <p className="mt-1 text-sm font-semibold text-gray-900">{result.structuredPlan.highlight}</p>
                            </div>
                          </div>
                          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters</p>
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                                {result.structuredPlan.honorsUserChartRequest ? "User request honored" : "AiBS chart pick"}
                              </p>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {(result.structuredPlan.filters.length ? result.structuredPlan.filters : ["No extra filters"]).map((filter) => (
                                <span key={filter} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-gray-600">
                                  {filter}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {result.toolResults.length ? (
                      <div className="rounded-3xl border border-gray-200 bg-white p-5">
                        <div className="mb-3 flex items-center gap-2">
                          <FileText size={14} className="text-gray-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                            Data Sources
                          </p>
                        </div>
                        <ul className="space-y-2 text-xs font-semibold text-gray-700">
                          {result.toolResults.map((tool) => (
                            <li
                              key={tool.toolName}
                              className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 last:border-b-0 last:pb-0"
                            >
                              <span>{tool.toolName}</span>
                              <span
                                className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white"
                                style={{ backgroundColor: teamColor }}
                              >
                                Live
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {result.citations.length ? (
                      <div className="rounded-3xl border border-gray-200 bg-white p-5">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Citations
                        </p>
                        <ul className="space-y-2 text-xs text-gray-600">
                          {result.citations.map((citation) => (
                            <li key={citation}>{citation}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>

                {result.assistantMessageId ? (
                  <div className="border-t border-gray-100 bg-white px-10 py-6">
                    <AIFeedback
                      surface="visualizer"
                      targetType="ai_message"
                      targetId={result.assistantMessageId}
                      generationId={result.generationId}
                      conversationId={result.conversationId}
                      messageId={result.assistantMessageId}
                      prompt="Visualizer brief quality"
                    />
                  </div>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

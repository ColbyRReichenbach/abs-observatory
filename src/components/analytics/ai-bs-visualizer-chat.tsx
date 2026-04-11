"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, AlertCircle, FileText, Loader2, Send } from "lucide-react";

import { AIFeedback } from "@/components/ai-feedback";
import { BaseballSpinner } from "@/components/baseball-spinner";
import { AiBSIcon } from "@/components/ui/aibs-icon";
import type { AIChatResponse, AIVisualizerPlan } from "@/lib/types";

export function AIBSVisualizerChat({
  context,
  teamColor = "#007aff",
}: {
  context: string;
  teamColor?: string;
}) {
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
      const prompt = `For ${context}, propose one useful chart or table for this question and explain the baseball takeaway using only AiBS data. Question: ${query.trim()}`;
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt, delivery: "sync", surface: "visualizer" }),
      });
      const payload = (await response.json()) as AIChatResponse;

      if (!response.ok || payload.safetyDisposition === "blocked") {
        setError(payload.error || payload.answer || "Unable to generate a visualization brief right now.");
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
      setError("Unable to generate a visualization brief right now.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="mt-20 mx-auto w-full max-w-5xl px-4 pb-32">
      <div className="flex flex-col gap-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-100" />
          <p className="whitespace-nowrap text-[10px] font-black uppercase tracking-[0.3em] text-gray-600">
            Visualize your own ideas
          </p>
          <div className="h-px flex-1 bg-gray-100" />
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
                placeholder={`Ask aiBS for a chart brief about ${context}...`}
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
                    <span>Generating Brief</span>
                  </>
                ) : (
                  <>
                    <Send size={12} />
                    <span>Get Brief</span>
                  </>
                )}
              </motion.button>
            </form>
          </div>
        </div>

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
                      Visualization Brief
                    </p>
                    <h4 className="text-xl font-display uppercase tracking-tight text-gray-900">
                      &ldquo;{result.query}&rdquo;
                    </h4>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3 text-right">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Context</p>
                    <p className="text-xs font-bold text-gray-700">{context}</p>
                  </div>
                </div>

                <div className="grid gap-8 bg-gray-50 px-10 py-10 lg:grid-cols-[1.3fr_0.7fr]">
                  <div>
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
                        <Activity className="text-blue-500" size={22} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Recommended Output
                        </p>
                        <p className="text-lg font-display uppercase tracking-tight text-gray-900">
                          {result.structuredPlan?.chartType ?? "Analyst Brief"}
                        </p>
                      </div>
                    </div>
                    {result.structuredPlan ? (
                      <div className="space-y-4 text-sm text-gray-700">
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Why This Chart</p>
                          <p className="mt-1 leading-relaxed">{result.structuredPlan.whyThisChart}</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">X-Axis</p>
                            <p className="mt-1 leading-relaxed">{result.structuredPlan.xAxis}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Y-Axis</p>
                            <p className="mt-1 leading-relaxed">{result.structuredPlan.yAxis}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Grouping</p>
                          <p className="mt-1 leading-relaxed">{result.structuredPlan.grouping}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters</p>
                          <ul className="mt-2 space-y-2">
                            {result.structuredPlan.filters.map((filter) => (
                              <li key={filter}>- {filter}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Signals To Watch</p>
                          <ul className="mt-2 space-y-2">
                            {result.structuredPlan.signalsToWatch.map((signal) => (
                              <li key={signal}>- {signal}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Caveats</p>
                          <ul className="mt-2 space-y-2">
                            {result.structuredPlan.caveats.map((caveat) => (
                              <li key={caveat}>- {caveat}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm leading-relaxed text-gray-700">{result.answer}</p>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-3xl border border-gray-200 bg-white p-5">
                      <div className="mb-3 flex items-center gap-2">
                        <FileText size={14} className="text-gray-500" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Sources Used
                        </p>
                      </div>
                      {result.toolResults.length ? (
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
                      ) : (
                        <p className="text-xs text-gray-500">No tool outputs were attached to this brief.</p>
                      )}
                    </div>

                    <div className="rounded-3xl border border-gray-200 bg-white p-5">
                      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        Citations
                      </p>
                      {result.citations.length ? (
                        <ul className="space-y-2 text-xs text-gray-600">
                          {result.citations.map((citation) => (
                            <li key={citation}>{citation}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-gray-500">No citations available for this brief.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 bg-white px-10 py-6">
                  <AIFeedback
                    assistantMessageId={result.assistantMessageId}
                    generationId={result.generationId}
                    conversationId={result.conversationId}
                    variant="compact"
                  />
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </section>
  );
}

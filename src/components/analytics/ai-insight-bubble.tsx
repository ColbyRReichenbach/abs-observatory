"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, Send, X } from "lucide-react";

import { AIFeedback } from "@/components/ai-feedback";
import { AiBSIcon, ExpandableAiBSButton } from "@/components/ui/aibs-icon";
import type { ChartInsightPayload } from "@/lib/chart-insight-payload";
import type { AIChatResponse } from "@/lib/types";
import { useAiArtifactGeneration } from "@/lib/use-ai-artifact";

const CSRF_COOKIE_NAME = "aibs_csrf";

type ChartThreadMessage = {
  role: "user" | "assistant";
  content: string;
  structuredInsight?: AIChatResponse["structuredInsight"];
  conversationId?: string | null;
  assistantMessageId?: string | null;
  generationId?: string | null;
};

function getCookie(name: string) {
  if (typeof document === "undefined") return null;
  const matched = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name}=`));
  return matched ? decodeURIComponent(matched.slice(name.length + 1)) : null;
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
    if (!response.ok || !body.csrfToken) return null;
    return body.csrfToken;
  } catch {
    return null;
  }
}

function buildInitialChartPrompt(chartContext: ChartInsightPayload) {
  return [
    `Explain the "${chartContext.chartTitle}" chart in baseball terms.`,
    `Tell me what the visual is showing, what the strongest signal is, and how a baseball analyst should use it.`,
    `Stay grounded in the supplied chart payload only.`,
    `If the sample is thin or directional, say that explicitly.`,
  ].join(" ");
}

function StructuredInsightView({
  insight,
}: {
  insight: NonNullable<AIChatResponse["structuredInsight"]>;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/60 px-4 py-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Headline</p>
        <p className="mt-2 text-base font-semibold leading-relaxed text-gray-900">{insight.headline}</p>
      </div>
      <div className="space-y-3">
        {insight.sections.map((section) => (
          <div key={section.label} className="rounded-[1.25rem] border border-gray-100 bg-white px-4 py-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{section.label}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartContextSummary({
  chartContext,
}: {
  chartContext: ChartInsightPayload;
}) {
  return (
    <div className="rounded-[1.25rem] border border-gray-100 bg-gray-50/60 px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">Chart Focus</p>
      <p className="mt-2 text-sm font-semibold leading-relaxed text-gray-900">{chartContext.baseballQuestion}</p>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{chartContext.chartSummary}</p>
    </div>
  );
}

export function AIInsightBubble({
  insight,
  title = "AI Insight",
  insightId,
  metadata,
  trackArtifact = false,
  spotlight,
  spotlightTitle,
  insightContent,
  chartContext,
}: {
  insight: string;
  title?: string;
  insightId: string;
  metadata?: Record<string, unknown>;
  trackArtifact?: boolean;
  spotlight?: ReactNode;
  spotlightTitle?: string;
  insightContent?: ReactNode;
  chartContext?: ChartInsightPayload;
}) {
  const fallbackGenerationId = useAiArtifactGeneration({
    enabled: trackArtifact,
    surfaceKey: "chart_insight",
    surfaceDetail: "insight_bubble",
    targetType: "chart_insight",
    targetId: insightId,
    metadata: metadata ?? null,
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [messages, setMessages] = useState<ChartThreadMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const didBootstrapRef = useRef(false);
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    setMessages([]);
    setConversationId(null);
    setQuery("");
    setError(null);
    didBootstrapRef.current = false;
  }, [chartContext?.chartKey]);

  async function runChartChat(message: string, showUserMessage: boolean) {
    if (!chartContext || isLoading) return;

    const trimmed = message.trim();
    if (!trimmed) return;

    const csrfToken = await ensureCsrfToken();
    if (!csrfToken) {
      setError("Chart insight is unavailable right now.");
      return;
    }

    if (showUserMessage) {
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken,
        },
        body: JSON.stringify({
          message: trimmed,
          delivery: "sync",
          surface: "chart_insight",
          conversationId: conversationId ?? undefined,
          chartContext,
        }),
      });
      const payload = (await response.json()) as AIChatResponse & { error?: string };

      if (!response.ok || payload.safetyDisposition === "blocked") {
        setError(payload.error || payload.answer || "Unable to analyze this chart right now.");
        return;
      }

      setConversationId(payload.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: payload.answer,
          structuredInsight: payload.structuredInsight ?? null,
          conversationId: payload.conversationId,
          assistantMessageId: payload.assistantMessageId ?? null,
          generationId: payload.generationId ?? null,
        },
      ]);
    } catch {
      setError("Unable to analyze this chart right now.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen || !chartContext || didBootstrapRef.current) return;
    didBootstrapRef.current = true;
    void runChartChat(buildInitialChartPrompt(chartContext), false);
  }, [chartContext, isOpen]);

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant") ?? null,
    [messages],
  );
  const pinnedAssistantIndex = useMemo(
    () => messages.findIndex((message) => message.role === "assistant"),
    [messages],
  );
  const pinnedAssistantMessage = pinnedAssistantIndex >= 0 ? messages[pinnedAssistantIndex] : null;
  const threadMessages =
    pinnedAssistantIndex >= 0 ? messages.filter((_, index) => index !== pinnedAssistantIndex) : messages;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!query.trim()) return;
    const nextQuery = query;
    setQuery("");
    await runChartChat(nextQuery, true);
  };

  const handleOpen = () => {
    setIsOpen((current) => !current);
  };

  return (
    <div className="relative ml-3 inline-flex translate-y-[-2px] items-center justify-center align-middle" ref={bubbleRef}>
      <motion.button
        onClick={handleOpen}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        className={`z-20 flex h-8 shrink-0 items-center justify-center overflow-hidden whitespace-nowrap rounded-full bg-black text-white shadow-lg focus:outline-none ${isOpen ? "ring-4 ring-black/10" : ""}`}
        whileTap={{ scale: 0.95 }}
        style={{ originX: 0 }}
        animate={{
          width: isHovered && !isOpen ? 102 : 32,
          paddingLeft: isHovered && !isOpen ? 12 : 0,
          paddingRight: isHovered && !isOpen ? 12 : 0,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <div className="pointer-events-none flex h-8 w-8 shrink-0 items-center justify-center">
          {isOpen ? <X size={14} strokeWidth={3} /> : <AiBSIcon size={14} color="#ffffff" forceHover={isHovered} />}
        </div>

        <AnimatePresence>
          {isHovered && !isOpen ? (
            <motion.span
              key="text"
              className="pl-1 pr-2 text-[9.5px] font-black uppercase tracking-widest"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              Ask aiBS
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {isOpen ? (
                <div className="pointer-events-auto z-[9999]" style={{ position: "absolute", inset: 0 }}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 z-[100] bg-black/10 backdrop-blur-sm"
                  />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className={`fixed left-1/2 top-1/2 z-[101] max-h-[min(84vh,56rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-2xl ${spotlight ? "w-[min(84rem,calc(100vw-2rem))]" : "w-[min(46rem,calc(100vw-2rem))]"}`}
                  >
                    <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-600" />
                    <div className="h-[min(84vh,56rem)] overflow-hidden p-8 pr-6">
                      <div className="mb-6 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <ExpandableAiBSButton
                            size={14}
                            color="currentColor"
                            bgColor="bg-blue-50"
                            textColor="text-blue-600"
                            direction="right"
                            className="h-8 shadow-sm"
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{title}</span>
                        </div>
                        <motion.button
                          onClick={() => setIsOpen(false)}
                          whileTap={{ scale: 0.9 }}
                          className="text-gray-400 transition-colors hover:text-black"
                        >
                          <X size={16} />
                        </motion.button>
                      </div>

                      <div className={spotlight ? "grid h-[calc(min(84vh,56rem)-7rem)] gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]" : ""}>
                        {spotlight ? (
                          <div className="h-full overflow-auto rounded-[1.5rem] border border-gray-100 bg-gray-50/60 p-5">
                            <div className="mb-4">
                              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {spotlightTitle ?? "Chart Spotlight"}
                              </p>
                            </div>
                            {spotlight}
                          </div>
                        ) : null}

                        <div className={spotlight ? "flex h-full min-h-0 flex-col overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white" : ""}>
                          <div className={spotlight ? "border-b border-gray-100 px-5 py-4" : "mb-4"}>
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Chart Read</p>
                          </div>

                          <div ref={threadRef} className={spotlight ? "min-h-0 flex-1 overflow-y-auto px-5 py-5" : ""}>
                            <div className="space-y-4">
                              {chartContext ? <ChartContextSummary chartContext={chartContext} /> : null}

                              {pinnedAssistantMessage?.structuredInsight ? (
                                <StructuredInsightView insight={pinnedAssistantMessage.structuredInsight} />
                              ) : pinnedAssistantMessage ? (
                                <div className="rounded-[1.25rem] border border-gray-100 bg-white px-4 py-4 text-sm leading-relaxed text-gray-700">
                                  {pinnedAssistantMessage.content}
                                </div>
                              ) : insightContent ? (
                                <div className="space-y-5">{insightContent}</div>
                              ) : chartContext ? null : (
                                <div className="rounded-[1.25rem] border border-gray-100 bg-white px-4 py-4 text-sm leading-relaxed text-gray-700">
                                  {insight}
                                </div>
                              )}

                              {threadMessages.map((message, index) =>
                                message.role === "user" ? (
                                  <div key={`${message.role}-${index}`} className="flex justify-end">
                                    <div className="max-w-[90%] rounded-[1.25rem] bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm">
                                      {message.content}
                                    </div>
                                  </div>
                                ) : (
                                  <div key={`${message.role}-${index}`} className="space-y-3">
                                    {message.structuredInsight ? (
                                      <StructuredInsightView insight={message.structuredInsight} />
                                    ) : (
                                      <div className="rounded-[1.25rem] border border-gray-100 bg-gray-50/60 px-4 py-4 text-sm leading-relaxed text-gray-700">
                                        {message.content}
                                      </div>
                                    )}
                                  </div>
                                ),
                              )}

                              {isLoading ? (
                                <div className="rounded-[1.25rem] border border-blue-100 bg-blue-50/50 px-4 py-4 text-sm text-blue-700">
                                  <div className="flex items-center gap-2 font-semibold">
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Analyzing chart context…</span>
                                  </div>
                                </div>
                              ) : null}

                              {error ? (
                                <div className="rounded-[1.25rem] border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
                                  <div className="flex items-start gap-2">
                                    <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className={spotlight ? "border-t border-gray-100 bg-gray-50/60 px-5 py-4" : "mt-6"}>
                            <form onSubmit={handleSubmit} className="mb-4">
                              <label htmlFor={`${insightId}-follow-up`} className="sr-only">
                                Ask a follow-up about this chart
                              </label>
                              <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-2 shadow-sm">
                                <input
                                  id={`${insightId}-follow-up`}
                                  type="text"
                                  value={query}
                                  onChange={(event) => setQuery(event.target.value)}
                                  placeholder={`Ask a follow-up about ${spotlightTitle ?? "this chart"}…`}
                                  className="w-full border-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-0 [box-shadow:none_!important] [outline:none_!important] [-webkit-tap-highlight-color:transparent]"
                                />
                                <button
                                  type="submit"
                                  disabled={isLoading || !query.trim() || !chartContext}
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-white transition hover:bg-black disabled:opacity-30"
                                >
                                  <Send size={14} />
                                </button>
                              </div>
                            </form>

                            <AIFeedback
                              surface="chart_insight"
                              targetType="chart_insight"
                              targetId={insightId}
                              generationId={latestAssistantMessage?.generationId ?? fallbackGenerationId}
                              conversationId={latestAssistantMessage?.conversationId ?? conversationId}
                              messageId={latestAssistantMessage?.assistantMessageId ?? null}
                              metadata={metadata}
                              prompt="Insight quality"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </div>
  );
}

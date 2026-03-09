"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send } from "lucide-react";
import { AIFeedback } from "@/components/ai-feedback";
import { AiBSIcon } from "@/components/ui/aibs-icon";

import { inferCopilotContext } from "@/lib/copilot-context";
import type { AIChatResponse } from "@/lib/types";

const PANEL_W = 520;
const PANEL_MAX_H = 620;

const CONFIDENCE_COLORS = {
  high: "#10b981",
  medium: "#f59e0b",
  low: "#ef4444",
} as const;

type Confidence = keyof typeof CONFIDENCE_COLORS;

type Message = {
  role: "user" | "ai";
  content: string;
  confidence?: Confidence;
  citations?: string[];
  toolResults?: Array<{ toolName: string; payload: unknown }>;
  conversationId?: string;
  assistantMessageId?: string | null;
  generationId?: string | null;
};

/** Baseball arcing across the typing bubble — replaces spinner */
function BaseballTypingIndicator() {
  return (
    <div className="relative h-5 w-14 overflow-visible flex items-center">
      <motion.span
        className="absolute text-base select-none leading-none"
        style={{ left: 0, top: "50%", translateY: "-50%" }}
        animate={{
          x: [0, 20, 40],
          y: [0, -10, 0],
          opacity: [0, 1, 0],
          rotate: [0, 200, 400],
        }}
        transition={{
          duration: 0.75,
          repeat: Infinity,
          repeatDelay: 0.3,
          ease: "easeInOut",
          times: [0, 0.5, 1],
        }}
      >
        ⚾
      </motion.span>
    </div>
  );
}

export function ContextualCopilotFAB() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    // Hydrate from sessionStorage on first render (client only)
    if (typeof window === "undefined") return [];
    try {
      const stored = sessionStorage.getItem("aibs-copilot-messages");
      return stored ? (JSON.parse(stored) as Message[]) : [];
    } catch {
      return [];
    }
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [viewW, setViewW] = useState(0);
  const [viewH, setViewH] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const context = useMemo(
    () => inferCopilotContext(pathname, { range: searchParams.get("range") ?? undefined }),
    [pathname, searchParams],
  );

  const smartQuestions = useMemo(() => {
    if (context?.gameStatus === "Preview" || context?.gameStatus === "Warmup") {
      return [
        "Which team is more likely to challenge successfully today?",
        "What is the expected overturn rate for this umpire?",
        "Who are the most aggressive challengers in this matchup?",
      ];
    }
    if (context?.gameStatus === "In Progress" || context?.gameStatus === "Live") {
      return [
        "Explain the last overturned call",
        "Has this umpire missed any high leverage calls today?",
        "Which count states have been challenged most in this game?",
      ];
    }
    if (context?.gameStatus === "Final" || context?.gameStatus === "Game Over") {
      return [
        "Summarize the umpiring impact for this game",
        "Which team benefited most from reviews?",
        "Show me the highest leverage overturned pitch.",
      ];
    }
    if (pathname.includes("/teams"))
      return ["Who is the luckiest team on challenges?", "Recent overturned call trends", "Team success rate vs league avg"];
    if (pathname.includes("/umpires"))
      return ["Which umpire has the tightest zone?", "Missed call hotspots", "Performance trend in last 10 games"];
    return ["Biggest ABS trend today", "Highest leverage missed call", "League-wide overturn rate"];
  }, [pathname, context]);

  // Persist chat thread to sessionStorage across navigations
  useEffect(() => {
    try {
      sessionStorage.setItem("aibs-copilot-messages", JSON.stringify(messages));
    } catch { /* storage full or unavailable */ }
  }, [messages]);

  // Track viewport for drag constraints
  useEffect(() => {
    const update = () => {
      setViewW(window.innerWidth);
      setViewH(window.innerHeight);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Listen for open-copilot events dispatched by AIInsightBubble "Ask Follow Up"
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ prefill?: string }>).detail;
      setIsOpen(true);
      if (detail?.prefill) setQuestion(detail.prefill);
      setTimeout(() => inputRef.current?.focus(), 350);
    };
    window.addEventListener("open-copilot", handler);
    return () => window.removeEventListener("open-copilot", handler);
  }, []);

  // Auto-scroll to bottom whenever thread updates
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping]);

  const dragConstraints = useMemo(
    () => ({
      top: -(Math.max(0, viewH - PANEL_MAX_H - 64)),
      left: -(Math.max(0, viewW - PANEL_W - 32)),
      right: 0,
      bottom: 0,
    }),
    [viewW, viewH],
  );

  async function runQuery(q: string = question) {
    if (!q.trim() || isTyping) return;
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setQuestion("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q, context, delivery: "sync", surface: "copilot" }),
      });
      const payload = (await res.json()) as AIChatResponse;
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: payload.answer || payload.error || "Unable to complete that request.",
          confidence: payload.confidence as Confidence | undefined,
          citations: payload.citations,
          toolResults: payload.toolResults,
          conversationId: payload.conversationId,
          assistantMessageId: payload.assistantMessageId ?? null,
          generationId: payload.generationId ?? null,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Failed to connect to AiBS brain.", confidence: "low" },
      ]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {/* ── Collapsed FAB ── */}
        {!isOpen && (
          <motion.button
            layoutId="copilot"
            onClick={() => setIsOpen(true)}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileTap={{ scale: 0.95 }}
            className="flex h-16 items-center rounded-full bg-black text-white shadow-2xl shadow-black/30 overflow-hidden whitespace-nowrap shrink-0"
            style={{ originX: 1 }}
            animate={{
              width: isHovered ? 150 : 64,
              paddingLeft: isHovered ? 20 : 18,
              paddingRight: isHovered ? 20 : 18,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="shrink-0 flex items-center justify-center">
              <AiBSIcon size={28} forceHover={isHovered} showTextOnHover={false} color="#ffffff" />
            </div>
            <AnimatePresence>
              {isHovered && (
                <motion.span
                  key="text"
                  className="text-[11px] font-black uppercase tracking-widest pl-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  Ask aiBS
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        )}

        {/* ── Open Chat Panel ── */}
        {isOpen && (
          <motion.div
            layoutId="copilot"
            drag
            dragMomentum={false}
            dragConstraints={dragConstraints}
            className="flex flex-col bg-white rounded-[2rem] border border-gray-100 shadow-[0_32px_128px_rgba(0,0,0,0.1)] overflow-hidden"
            style={{
              width: `min(${PANEL_W}px, calc(100vw - 32px))`,
              maxHeight: `${PANEL_MAX_H}px`,
            }}
          >
            {/* Header — with aiBS identity */}
            <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50/50 border-b border-gray-100 cursor-grab active:cursor-grabbing shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0">
                  <AiBSIcon size={14} color="#ffffff" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">
                  aiBS Copilot
                </span>
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              </div>
              <div className="flex items-center gap-3">
                {messages.length > 0 && (
                  <button
                    onClick={() => {
                      setMessages([]);
                      try { sessionStorage.removeItem("aibs-copilot-messages"); } catch { /* noop */ }
                    }}
                    className="text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    Clear
                  </button>
                )}
                {/* Drag handle */}
                <div className="flex flex-col gap-[3px] opacity-20 pointer-events-none">
                  <div className="w-5 h-[2px] bg-black rounded-full" />
                  <div className="w-5 h-[2px] bg-black rounded-full" />
                </div>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsHovered(false);
                  }}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={16} className="text-gray-400" />
                </button>
              </div>
            </div>

            {/* ── Chat Thread ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 min-h-[200px]">
              {/* Smart question chips — only when thread is empty */}
              {messages.length === 0 && !isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-2"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">
                    Throw aiBS anything.
                  </p>
                  {smartQuestions.map((sq) => (
                    <button
                      key={sq}
                      onClick={() => runQuery(sq)}
                      className="block w-full text-left px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[11px] font-bold text-gray-600 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-700 transition-all text-balance"
                    >
                      {sq}
                    </button>
                  ))}
                </motion.div>
              )}

              {/* Message bubbles */}
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2.5 items-start ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  {msg.role === "ai" && (
                    <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0 mt-0.5">
                      <AiBSIcon size={12} color="#ffffff" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-1.5 ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                    {/* Bubble */}
                    <div
                      className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${msg.role === "user"
                        ? "bg-black text-white rounded-tr-sm"
                        : "bg-blue-50 border border-blue-100/60 text-gray-800 rounded-tl-sm"
                        }`}
                    >
                      {msg.content}
                    </div>

                    {/* Confidence chip */}
                    {msg.confidence && msg.role === "ai" && (
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border w-fit"
                        style={{
                          borderColor: `${CONFIDENCE_COLORS[msg.confidence]}22`,
                          backgroundColor: `${CONFIDENCE_COLORS[msg.confidence]}11`,
                        }}
                      >
                        <div
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: CONFIDENCE_COLORS[msg.confidence] }}
                        />
                        <span
                          className="text-[9px] font-black uppercase tracking-widest"
                          style={{ color: CONFIDENCE_COLORS[msg.confidence] }}
                        >
                          {msg.confidence} Confidence
                        </span>
                      </div>
                    )}

                    {msg.citations && msg.citations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.citations.map((citation) => (
                          <span
                            key={citation}
                            className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-blue-700"
                          >
                            {citation.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                    )}

                    {msg.toolResults && msg.toolResults.length > 0 && (
                      <details className="group w-full">
                        <summary className="text-[9px] font-black uppercase tracking-widest text-gray-400 cursor-pointer list-none flex items-center gap-1 group-open:mb-2">
                          Data Sources
                        </summary>
                        <div className="space-y-2">
                          {msg.toolResults.map((tool) => (
                            <div key={tool.toolName} className="rounded-xl border border-gray-100 bg-white p-3">
                              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                {tool.toolName.replaceAll("_", " ")}
                              </p>
                              <pre className="mt-2 overflow-x-auto text-[10px] font-mono text-gray-600">
                                {JSON.stringify(tool.payload, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    {msg.role === "ai" && msg.assistantMessageId ? (
                      <AIFeedback
                        surface="copilot"
                        targetType="ai_message"
                        targetId={msg.assistantMessageId}
                        generationId={msg.generationId}
                        conversationId={msg.conversationId}
                        messageId={msg.assistantMessageId}
                        metadata={{ pathname }}
                        prompt="Copilot quality"
                        className="pt-1"
                      />
                    ) : null}
                  </div>
                </motion.div>
              ))}

              {/* Baseball arc typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center shrink-0 mt-0.5">
                    <AiBSIcon size={12} color="#ffffff" forceHover />
                  </div>
                  <div className="px-4 py-3.5 rounded-2xl rounded-tl-sm bg-gray-50 border border-gray-100">
                    <BaseballTypingIndicator />
                  </div>
                </motion.div>
              )}
            </div>

            {/* ── Always-visible input ── */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runQuery();
              }}
              className="p-4 bg-white border-t border-gray-100 shrink-0"
            >
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-blue-200 focus-within:bg-white transition-all">
                <input
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Swing away at your curiosity..."
                  disabled={isTyping}
                  className="flex-1 bg-transparent px-3 py-2 text-sm font-medium border-0 !outline-none focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-transparent [box-shadow:none_!important] [outline:none_!important] [-webkit-tap-highlight-color:transparent] placeholder:text-gray-400 disabled:opacity-40"
                />
                <button
                  type="submit"
                  disabled={isTyping || !question.trim()}
                  className="h-10 w-10 flex items-center justify-center rounded-xl bg-black text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10 disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Send size={16} />
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

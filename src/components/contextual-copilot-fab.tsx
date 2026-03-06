"use client";

import { useMemo, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Send } from "lucide-react";
import { AiBSIcon } from "@/components/ui/aibs-icon";

import { formatContextWindow, inferCopilotContext } from "@/lib/copilot-context";
import { BaseballSpinner } from "@/components/baseball-spinner";
import type { AIQueryResponse } from "@/lib/types";

type QueryResult = AIQueryResponse & { error?: string; hint?: string };

const CONFIDENCE_COLORS = {
  high: "#10b981",
  medium: "#f59e0b",
  low: "#ef4444",
};

export function ContextualCopilotFAB() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const context = useMemo(
    () =>
      inferCopilotContext(pathname, {
        range: searchParams.get("range") ?? undefined,
      }),
    [pathname, searchParams],
  );

  const smartQuestions = useMemo(() => {
    if (context?.gameStatus === "Preview" || context?.gameStatus === "Warmup") {
      return ["Which team is more likely to challenge successfully today?", "What is the expected overturn rate for this umpire?", "Who are the most aggressive challengers in this matchup?"];
    }
    if (context?.gameStatus === "In Progress" || context?.gameStatus === "Live") {
      return ["Explain the last overturned call", "Has this umpire missed any high leverage calls today?", "What is the current win probability shift based on challenges?"];
    }
    if (context?.gameStatus === "Final" || context?.gameStatus === "Game Over") {
      return ["Summarize the umpiring impact for this game", "Which team benefited most from reviews?", "Show me the highest leverage overturned pitch."];
    }
    if (pathname.includes("/teams")) return ["Who is the luckiest team on challenges?", "Recent overturned call trends", "Team success rate vs league avg"];
    if (pathname.includes("/umpires")) return ["Which umpire has the tightest zone?", "Missed call hotspots", "Performance trend in last 10 games"];
    return ["Biggest ABS trend today", "Highest leverage missed call", "League-wide overturn rate"];
  }, [pathname, context]);

  async function runQuery(q: string = question) {
    if (!q.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, context }),
      });
      const payload = (await res.json()) as QueryResult;
      setResult(payload);

      // Auto scroll to result
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
      }, 100);
    } catch (e) {
      setResult({ answer: "Failed to connect to AiBS brain.", error: "Network Error", confidence: "low", sql: "", sources: [], rows: [] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            layoutId="copilot"
            onClick={() => setIsOpen(true)}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileTap={{ scale: 0.95 }}
            className="flex h-16 items-center rounded-full bg-black text-white shadow-2xl shadow-black/30 overflow-hidden whitespace-nowrap shrink-0"
            style={{ originX: 1 }} // Expand leftwards
            animate={{
              width: isHovered ? 150 : 64,
              paddingLeft: isHovered ? 20 : 18,
              paddingRight: isHovered ? 20 : 18
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

        {isOpen && (
          <motion.div
            layoutId="copilot"
            drag
            dragMomentum={false}
            className="flex flex-col w-[400px] max-h-[600px] bg-white rounded-[2rem] border border-gray-100 shadow-[0_32px_128px_rgba(0,0,0,0.1)] overflow-hidden"
          >
            {/* Header / Drag Handle */}
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-b border-gray-100 cursor-grab active:cursor-grabbing">
              <div className="flex items-center gap-3">
                <div className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              </div>
              <div className="flex items-center gap-4">
                {/* CSS Drag Handle to bypass Turbopack HMR icon issue */}
                <div className="flex flex-col gap-[3px] opacity-20">
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

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 scrollbar-hide min-h-[300px]">
              <div className="mb-6">
                <h4 className="text-2xl font-display uppercase tracking-tight text-gray-900">
                  Throw aiBS anything.
                </h4>
              </div>

              {!result && !loading && (
                <div className="grid gap-2 mb-8">
                  {smartQuestions.map((sq) => (
                    <button
                      key={sq}
                      onClick={() => {
                        setQuestion(sq);
                        runQuery(sq);
                      }}
                      className="text-left px-4 py-3 rounded-xl bg-gray-50 border border-gray-100 text-[11px] font-bold text-gray-600 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-700 transition-all text-balance"
                    >
                      {sq}
                    </button>
                  ))}
                </div>
              )}

              {loading && (
                <BaseballSpinner />
              )}

              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100/50 text-sm font-medium text-gray-800 leading-relaxed shadow-sm">
                    {result.answer}
                  </div>

                  {result.confidence && (
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full border w-fit"
                      style={{
                        borderColor: `${CONFIDENCE_COLORS[result.confidence]}22`,
                        backgroundColor: `${CONFIDENCE_COLORS[result.confidence]}11`
                      }}
                    >
                      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: CONFIDENCE_COLORS[result.confidence] }} />
                      <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: CONFIDENCE_COLORS[result.confidence] }}>
                        {result.confidence} Confidence
                      </span>
                    </div>
                  )}

                  {result.sql && (
                    <details className="group">
                      <summary className="text-[9px] font-black uppercase tracking-widest text-gray-400 cursor-pointer list-none flex items-center gap-1 group-open:mb-2">
                        View Logic
                      </summary>
                      <pre className="p-3 rounded-xl bg-gray-900 text-[10px] font-mono text-emerald-400 overflow-x-auto">
                        {result.sql}
                      </pre>
                    </details>
                  )}

                  <button
                    onClick={() => { setResult(null); setQuestion(""); }}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:underline"
                  >
                    Ask another question
                  </button>
                </motion.div>
              )}
            </div>

            {/* Input */}
            {!result && !loading && (
              <form
                onSubmit={(e) => { e.preventDefault(); runQuery(); }}
                className="p-6 bg-white border-t border-gray-100"
              >
                <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-blue-200 focus-within:bg-white transition-all">
                  <input
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="Type a custom query..."
                    className="flex-1 bg-transparent px-3 py-2 text-sm font-medium border-0 !outline-none focus:outline-none focus:ring-0 focus:border-transparent focus:shadow-none focus-visible:outline-none focus-visible:ring-0 focus-visible:border-transparent [box-shadow:none_!important] [outline:none_!important] [-webkit-tap-highlight-color:transparent] placeholder:text-gray-400"
                  />
                  <button
                    type="submit"
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-black text-white hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/10"
                  >
                    <Send size={18} />
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


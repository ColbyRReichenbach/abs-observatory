"use client";

import { CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

import { AIFeedback } from "@/components/ai-feedback";
import { ExpandableAiBSButton } from "@/components/ui/aibs-icon";
import { useAiArtifactGeneration } from "@/lib/use-ai-artifact";

type AIStatInsightProps = {
  title: string;
  impactDescription: string;
  countBefore?: string | null;
  countAfter?: string | null;
  umpireCount?: string | null;
  impactType?: string | null;
  verdict: string;
  insightId?: string | null;
};

export function AIStatInsight({
  title,
  verdict,
  impactDescription,
  countAfter,
  umpireCount,
  impactType,
  insightId = null,
}: AIStatInsightProps) {
  const generationId = useAiArtifactGeneration({
    surfaceKey: "chart_insight",
    surfaceDetail: "challenge_summary_card",
    targetType: "challenge_summary",
    targetId: insightId ?? `${title}:${verdict}`,
    title,
    summary: impactDescription,
    metadata: { title, verdict, impactType: impactType ?? null },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-purple-600/10 p-5 shadow-xl"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ExpandableAiBSButton
            size={16}
            color="#ffffff"
            bgColor="bg-black"
            textColor="text-white"
            direction="right"
            className="z-10 h-8 shadow-lg shadow-black/10"
          />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600">
            Challenge Summary
          </span>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-blue-500/10 bg-white/50 px-2 py-0.5">
          <CheckCircle2 size={10} className="text-emerald-500" />
          <span className="text-[8px] font-bold uppercase text-emerald-600">Verified Data Tag</span>
        </div>
      </div>

      <p className="mb-6 border-s-2 border-blue-500/30 ps-3 text-xs font-serif italic leading-relaxed text-gray-600">
        &ldquo;{impactDescription}&rdquo;
      </p>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-blue-100 bg-white/50 p-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Focus</span>
            <span className="mt-2 text-sm font-black text-gray-900">{title}</span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-white/50 p-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Count Transition</span>
            <span className="mt-2 text-lg font-mono font-bold text-gray-800">
              {umpireCount && countAfter && umpireCount !== countAfter
                ? `${umpireCount} → ${countAfter}`
                : (umpireCount || countAfter || "Steady Count")}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-blue-100 bg-white/50 p-4">
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Result</span>
            <span className="mt-2 text-sm font-black text-gray-900">{verdict}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-blue-600">
              {formatImpactType(impactType)}
            </span>
          </div>
        </div>
      </div>
      {insightId ? (
        <AIFeedback
          surface="chart_insight"
          targetType="challenge_summary"
          targetId={insightId}
          generationId={generationId}
          metadata={{ verdict, title }}
          prompt="Summary quality"
          className="mt-5"
        />
      ) : null}
    </motion.div>
  );
}

function formatImpactType(impactType: string | null | undefined) {
  switch (impactType) {
    case "direct_ending_impact":
      return "Plate Appearance Changed";
    case "direct_count_impact":
      return "Count Changed";
    case "downstream_inferred_impact":
      return "Downstream Outcome";
    default:
      return "Recorded Challenge";
  }
}

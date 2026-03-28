"use client";

import { motion } from "framer-motion";

import { AIInsightBubble } from "@/components/analytics/ai-insight-bubble";
import { BaseStateDiamond } from "@/components/game-hub/base-state-diamond";
import {
  formatBasesStateLabel,
  formatCountStateLabel,
  formatCountTransitionLabel,
  formatHalfInningLabel,
} from "@/lib/challenge-context";
import { buildChallengeDecisionChartPayload } from "@/lib/chart-insight-payload";
import { summarizeEstimatedLeverage } from "@/lib/estimated-leverage";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { ChallengeEvent } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

export function AtBatContextCard({
  challenge,
  viewMode,
  showDecisionAssistant = true,
}: {
  challenge: ChallengeEvent;
  viewMode: ViewMode;
  showDecisionAssistant?: boolean;
}) {
  const leverage = summarizeEstimatedLeverage(challenge);
  const pitchVelocity = challenge.startSpeed ? `${challenge.startSpeed.toFixed(1)} MPH` : "N/A";
  const pitchType = challenge.pitchType || "Unknown";
  const countSnapshot =
    challenge.countBefore ??
    (challenge.balls !== null && challenge.strikes !== null ? `${challenge.balls}-${challenge.strikes}` : "Unavailable");
  const countChange =
    challenge.umpireCount || challenge.countAfter
      ? formatCountTransitionLabel(challenge.umpireCount, challenge.countAfter)
      : formatCountStateLabel(countSnapshot);
  const location =
    challenge.px !== null && challenge.pz !== null ? `${challenge.px.toFixed(2)} x, ${challenge.pz.toFixed(2)} z` : "Location unavailable";
  const scoreState =
    challenge.homeScore === null || challenge.awayScore === null
      ? "Score unavailable"
      : challenge.homeScore === challenge.awayScore
        ? `Tie ${challenge.awayScore}-${challenge.homeScore}`
        : `${challenge.awayScore}-${challenge.homeScore}`;
  const inningLabel = `${formatHalfInningLabel(challenge.halfInning, "short")} ${challenge.inning ?? "-"}`;
  const baseStateLabel = formatBasesStateLabel(challenge.basesState);
  const plateContextLabel =
    formatHalfInningLabel(challenge.halfInning, "long") === "Top"
      ? "Away offense batting"
      : formatHalfInningLabel(challenge.halfInning, "long") === "Bottom"
        ? "Home offense batting"
        : "Offense batting";

  const usesTrustedWinValue =
    challenge.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(challenge.winExpectancyConfidence);
  const expectedChallengeValue = challenge.expectedChallengeValue ?? null;
  const estimatedOverturnProbability = challenge.estimatedOverturnProbability ?? null;
  const chartContext = buildChallengeDecisionChartPayload(challenge);

  const countConsequence =
    challenge.umpireCount && challenge.countAfter && challenge.umpireCount !== challenge.countAfter
      ? `Count changed from ${formatCountStateLabel(challenge.umpireCount)} to ${formatCountStateLabel(challenge.countAfter)}.`
      : `Review held the count at ${formatCountStateLabel(challenge.umpireCount ?? challenge.countAfter ?? countSnapshot)}.`;
  const deltaNarrative = usesTrustedWinValue
    ? `Comparable game states move win expectancy by ${formatWinDelta(challenge.winExpectancyDelta ?? 0)} from this review state.`
    : challenge.runExpectancyDelta !== null && challenge.runExpectancyDelta !== undefined
      ? `Comparable game states move run expectancy by ${formatRunDelta(challenge.runExpectancyDelta)} from this review state.`
      : challenge.positiveOutcomeDelta === null || challenge.positiveOutcomeDelta === undefined
        ? "No stable league comparison is available for this count change."
        : `Comparable plate appearances shift positive outcome rate by ${formatSignedPoints(challenge.positiveOutcomeDelta)}.`;
  const decisionNarrative =
    estimatedOverturnProbability === null || expectedChallengeValue === null
      ? "Model recommendation is unavailable for this review."
      : `${Math.round(estimatedOverturnProbability * 100)}% overturn probability and ${formatWinDelta(expectedChallengeValue)} expected value at challenge time.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-hidden"
    >
      <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <SummaryTile label="Focus" value={`${challenge.batterName ?? "Batter"} vs ${challenge.pitcherName ?? "Pitcher"}`} />
          <SummaryTile label="Count Transition" value={countChange} />
          <SummaryTile
            label="Result"
            value={challenge.isOverturned ? "Call Overturned" : "Call Confirmed"}
            note={formatImpactType(challenge.impactType)}
          />
        </div>

        <div className="mt-4 rounded-xl border border-gray-200/60 bg-slate-50/60 px-3 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <BaseStateDiamond basesState={challenge.basesState} size={48} />
            <div className="min-w-[180px] flex-1">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Game State</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{baseStateLabel}</p>
              <p className="mt-1 text-[11px] font-medium text-slate-600">
                {inningLabel} • {scoreState} • {challenge.outs ?? 0} out{(challenge.outs ?? 0) === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">{plateContextLabel}</p>
            </div>
            <MetricBadge label="Estimated Leverage" value={String(leverage.estimatedLeverageIndex)} />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <CompactStat label="Pitch" value={pitchType} />
          <CompactStat label="Velocity" value={pitchVelocity} />
          <CompactStat label="Location" value={location} />
          <CompactStat label="Count Before" value={formatCountStateLabel(challenge.umpireCount ?? countSnapshot)} />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <NarrativeCard
            label="Baseball Consequence"
            title={countConsequence}
            body={deltaNarrative}
          />
          <div className="rounded-xl border border-gray-200/60 bg-white px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Decision Read</p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {challenge.decisionRecommendation === "challenge"
                    ? "Model favored a challenge"
                    : challenge.decisionRecommendation === "hold"
                      ? "Model favored holding"
                      : challenge.decisionRecommendation === "cannot_challenge"
                        ? "No challenge inventory remained"
                        : "No recommendation available"}
                </p>
                <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600">{decisionNarrative}</p>
              </div>
              {viewMode === "org" && showDecisionAssistant ? (
                <AIInsightBubble
                  insight="Given this count shift, leverage, and historical baseline, explain whether a club should challenge here and why."
                  insightId={`challenge-decision:${challenge.challengeId}`}
                  metadata={{ surface: "challenge_decision_brief", challengeId: challenge.challengeId, viewMode }}
                  chartContext={chartContext}
                  spotlightTitle="Should aiBS Challenge?"
                  spotlight={<AtBatContextCard challenge={challenge} viewMode={viewMode} showDecisionAssistant={false} />}
                />
              ) : null}
            </div>
          </div>
        </div>

        {viewMode === "org" &&
        (challenge.heldCountBaseline ||
          challenge.correctedCountBaseline ||
          challenge.pitchTypeCountBaseline ||
          challenge.handednessBaseline ||
          challenge.pitchLaneBaseline) ? (
          <details className="mt-4 rounded-xl border border-gray-200/60 bg-slate-50/60 px-4 py-3">
            <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              League Baseline + Model Context
            </summary>
            <div className="mt-3 space-y-2 text-[11px] font-medium leading-relaxed text-slate-600">
              {challenge.heldCountBaseline ? (
                <p>
                  Umpire count {formatCountStateLabel(challenge.heldCountBaseline.countKey)}:
                  {" "}AVG {formatBaselineAverage(challenge.heldCountBaseline.battingAverage)}
                  {" · "}BB {formatBaselineRate(challenge.heldCountBaseline.walkRate)}
                  {" · "}K {formatBaselineRate(challenge.heldCountBaseline.strikeoutRate)}
                  {" · "}N {challenge.heldCountBaseline.plateAppearances.toLocaleString()}
                </p>
              ) : null}
              {challenge.correctedCountBaseline ? (
                <p>
                  Corrected count {formatCountStateLabel(challenge.correctedCountBaseline.countKey)}:
                  {" "}AVG {formatBaselineAverage(challenge.correctedCountBaseline.battingAverage)}
                  {" · "}BB {formatBaselineRate(challenge.correctedCountBaseline.walkRate)}
                  {" · "}K {formatBaselineRate(challenge.correctedCountBaseline.strikeoutRate)}
                  {" · "}N {challenge.correctedCountBaseline.plateAppearances.toLocaleString()}
                </p>
              ) : null}
              {challenge.pitchTypeCountBaseline ? (
                <p>
                  {challenge.pitchTypeCountBaseline.pitchType} in {formatCountStateLabel(challenge.pitchTypeCountBaseline.countKey)}:
                  {" "}N {challenge.pitchTypeCountBaseline.pitchCount.toLocaleString()}
                  {" · "}challenged {formatBaselineRate(challenge.pitchTypeCountBaseline.challengeRate)}
                  {challenge.pitchTypeCountBaseline.avgStartSpeed !== null
                    ? ` · ${challenge.pitchTypeCountBaseline.avgStartSpeed.toFixed(1)} MPH`
                    : ""}
                </p>
              ) : null}
              {challenge.handednessBaseline ? (
                <p>
                  {challenge.handednessBaseline.pitcherThrows}HP vs {challenge.handednessBaseline.batterStand}HB:
                  {" "}overturn {formatBaselineRate(challenge.handednessBaseline.overturnRate)}
                  {" · "}N {challenge.handednessBaseline.sampleSize.toLocaleString()}
                  {challenge.handednessBaseline.avgEdgeDistance !== null
                    ? ` · edge ${challenge.handednessBaseline.avgEdgeDistance.toFixed(2)} ft`
                    : ""}
                </p>
              ) : null}
              {challenge.pitchLaneBaseline ? (
                <p>
                  {challenge.pitchLaneBaseline.pitchType} in {challenge.pitchLaneBaseline.lane}:
                  {" "}overturn {formatBaselineRate(challenge.pitchLaneBaseline.overturnRate)}
                  {" · "}N {challenge.pitchLaneBaseline.sampleSize.toLocaleString()}
                  {challenge.pitchLaneBaseline.avgEdgeDistance !== null
                    ? ` · edge ${challenge.pitchLaneBaseline.avgEdgeDistance.toFixed(2)} ft`
                    : ""}
                </p>
              ) : null}
            </div>
          </details>
        ) : null}
      </div>
    </motion.div>
  );
}

function SummaryTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl border border-gray-200/60 bg-slate-50/60 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-black text-slate-900">{value}</p>
      {note ? <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">{note}</p> : null}
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[96px] rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-right">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-500">{label}</p>
      <p className="mt-1 text-xl font-display text-slate-900">{value}</p>
    </div>
  );
}

function CompactStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200/60 bg-white px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-xs font-bold text-slate-900">{value}</p>
    </div>
  );
}

function NarrativeCard({
  label,
  title,
  body,
}: {
  label: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200/60 bg-white px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600">{body}</p>
    </div>
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

function formatRunDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(3)}`;
}

function formatWinDelta(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : "-"}${(Math.abs(value) * 100).toFixed(2)}%`;
}

function formatSignedPoints(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : "-"}${(Math.abs(value) * 100).toFixed(1)} percentage points`;
}

function formatBaselineRate(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatBaselineAverage(value: number) {
  return value.toFixed(3).replace(/^0/, ".");
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";

import { AIInsightBubble } from "@/components/analytics/ai-insight-bubble";
import { BaseStateDiamond } from "@/components/game-hub/base-state-diamond";
import {
  formatBasesStateLabel,
  formatCountStateLabel,
  formatHalfInningLabel,
  getChallengeCountState,
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
  const [showBaselineContext, setShowBaselineContext] = useState(false);
  const leverage = summarizeEstimatedLeverage(challenge);
  const pitchVelocity = challenge.startSpeed ? `${challenge.startSpeed.toFixed(1)} MPH` : "N/A";
  const pitchType = challenge.pitchType || "Unknown";
  const countSnapshot =
    challenge.countBefore ??
    (challenge.balls !== null && challenge.strikes !== null ? `${challenge.balls}-${challenge.strikes}` : "Unavailable");
  const countState = getChallengeCountState(challenge.countBefore ?? countSnapshot, challenge.umpireCount, challenge.countAfter);
  const countChange =
    challenge.umpireCount || challenge.countAfter
      ? countState.transitionLabel
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
  const stabilizedCountLabel = formatCountStateLabel(countState.initial ?? countState.final ?? countSnapshot);

  const countConsequence = challenge.isOverturned
    ? countState.initial && countState.final && countState.initial !== countState.final
      ? `Count changed from ${countState.beforeLabel} to ${countState.afterLabel}.`
      : `Review moved the plate appearance to ${stabilizedCountLabel}.`
    : `Review confirmed the call and kept the plate appearance at ${stabilizedCountLabel}.`;
  const deltaNarrative = challenge.isOverturned
    ? usesTrustedWinValue
      ? `Comparable game states move win expectancy by ${formatWinDelta(challenge.winExpectancyDelta ?? 0)} from the corrected review state.`
      : challenge.runExpectancyDelta !== null && challenge.runExpectancyDelta !== undefined
        ? `Comparable game states move run expectancy by ${formatRunDelta(challenge.runExpectancyDelta)} from the corrected review state.`
        : challenge.positiveOutcomeDelta === null || challenge.positiveOutcomeDelta === undefined
          ? "No stable league comparison is available for this corrected count change."
          : `Comparable plate appearances shift offensive success rate by ${formatSignedPoints(challenge.positiveOutcomeDelta)} after the count correction.`
    : usesTrustedWinValue
      ? `The review did not create a new state; ${stabilizedCountLabel} situations typically carry ${formatWinDelta(challenge.winExpectancyDelta ?? 0)} of win expectancy from this baseline.`
      : challenge.runExpectancyDelta !== null && challenge.runExpectancyDelta !== undefined
        ? `The review preserved the original state; ${stabilizedCountLabel} situations typically carry ${formatRunDelta(challenge.runExpectancyDelta)} of run expectancy from this baseline.`
        : challenge.positiveOutcomeDelta === null || challenge.positiveOutcomeDelta === undefined
          ? "No stable league comparison is available for the upheld count state."
          : `Comparable plate appearances from ${stabilizedCountLabel} shift offensive success rate by ${formatSignedPoints(challenge.positiveOutcomeDelta)}.`;
  const decisionNarrative =
    estimatedOverturnProbability === null || expectedChallengeValue === null
      ? "Model recommendation is unavailable for this review."
      : `${Math.round(estimatedOverturnProbability * 100)}% overturn probability and ${formatWinDelta(expectedChallengeValue)} expected value at challenge time.`;
  const hasBaselineContext =
    viewMode === "org" &&
    Boolean(
      challenge.heldCountBaseline ||
        challenge.correctedCountBaseline ||
        challenge.pitchTypeCountBaseline ||
        challenge.handednessBaseline ||
        challenge.pitchLaneBaseline
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-hidden"
    >
      <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm">
        {viewMode === "org" && showDecisionAssistant ? (
          <div className="mb-4 flex justify-end">
            <AIInsightBubble
              insight="Given this count shift, leverage, and historical baseline, explain whether a club should challenge here and why."
              insightId={`challenge-decision:${challenge.challengeId}`}
              metadata={{ surface: "challenge_decision_brief", challengeId: challenge.challengeId, viewMode }}
              chartContext={chartContext}
              spotlightTitle="Should aiBS Challenge?"
              spotlight={<AtBatContextCard challenge={challenge} viewMode={viewMode} showDecisionAssistant={false} />}
            />
          </div>
        ) : null}

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
          <CompactStat label="Count Before" value={countState.beforeLabel} />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
          <NarrativeCard
            label="Baseball Consequence"
            title={countConsequence}
            body={deltaNarrative}
          />
          <div className="rounded-xl border border-gray-200/60 bg-white px-4 py-3">
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
          </div>
        </div>

        {hasBaselineContext ? (
          <div className="mt-4 rounded-xl border border-gray-200/60 bg-slate-50/60">
            <button
              type="button"
              onClick={() => setShowBaselineContext((current) => !current)}
              className="group flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-100/70"
              aria-expanded={showBaselineContext}
            >
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">League Baseline + Model Context</p>
                <p className="mt-1 text-[11px] font-medium text-slate-600">
                  Compare the original count, corrected count, and pitch context against league baselines.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-600 shadow-sm transition group-hover:border-slate-300 group-hover:text-slate-900">
                <span>{showBaselineContext ? "Hide" : "View"}</span>
                <motion.span
                  animate={{ rotate: showBaselineContext ? 180 : 0 }}
                  transition={{ duration: 0.18 }}
                  className="text-xs"
                >
                  ▾
                </motion.span>
              </div>
            </button>
            {showBaselineContext ? (
              <div className="grid gap-2 border-t border-gray-200/70 px-4 py-3 md:grid-cols-2">
                {challenge.heldCountBaseline ? (
                  <BaselineCard
                    title={`Umpire Count ${formatCountStateLabel(challenge.heldCountBaseline.countKey)}`}
                    metrics={[
                      `AVG ${formatBaselineAverage(challenge.heldCountBaseline.battingAverage)}`,
                      `BB ${formatBaselineRate(challenge.heldCountBaseline.walkRate)}`,
                      `K ${formatBaselineRate(challenge.heldCountBaseline.strikeoutRate)}`,
                      `N ${challenge.heldCountBaseline.plateAppearances.toLocaleString()}`,
                    ]}
                  />
                ) : null}
                {challenge.correctedCountBaseline ? (
                  <BaselineCard
                    title={`Corrected Count ${formatCountStateLabel(challenge.correctedCountBaseline.countKey)}`}
                    metrics={[
                      `AVG ${formatBaselineAverage(challenge.correctedCountBaseline.battingAverage)}`,
                      `BB ${formatBaselineRate(challenge.correctedCountBaseline.walkRate)}`,
                      `K ${formatBaselineRate(challenge.correctedCountBaseline.strikeoutRate)}`,
                      `N ${challenge.correctedCountBaseline.plateAppearances.toLocaleString()}`,
                    ]}
                  />
                ) : null}
                {challenge.pitchTypeCountBaseline ? (
                  <BaselineCard
                    title={`${challenge.pitchTypeCountBaseline.pitchType} in ${formatCountStateLabel(challenge.pitchTypeCountBaseline.countKey)}`}
                    metrics={[
                      `N ${challenge.pitchTypeCountBaseline.pitchCount.toLocaleString()}`,
                      `Challenged ${formatBaselineRate(challenge.pitchTypeCountBaseline.challengeRate)}`,
                      challenge.pitchTypeCountBaseline.avgStartSpeed !== null
                        ? `${challenge.pitchTypeCountBaseline.avgStartSpeed.toFixed(1)} MPH`
                        : null,
                    ]}
                  />
                ) : null}
                {challenge.handednessBaseline ? (
                  <BaselineCard
                    title={`${challenge.handednessBaseline.pitcherThrows}HP vs ${challenge.handednessBaseline.batterStand}HB`}
                    metrics={[
                      `Overturn ${formatBaselineRate(challenge.handednessBaseline.overturnRate)}`,
                      `N ${challenge.handednessBaseline.sampleSize.toLocaleString()}`,
                      challenge.handednessBaseline.avgEdgeDistance !== null
                        ? `Edge ${challenge.handednessBaseline.avgEdgeDistance.toFixed(2)} ft`
                        : null,
                    ]}
                  />
                ) : null}
                {challenge.pitchLaneBaseline ? (
                  <BaselineCard
                    title={`${challenge.pitchLaneBaseline.pitchType} in ${challenge.pitchLaneBaseline.lane}`}
                    metrics={[
                      `Overturn ${formatBaselineRate(challenge.pitchLaneBaseline.overturnRate)}`,
                      `N ${challenge.pitchLaneBaseline.sampleSize.toLocaleString()}`,
                      challenge.pitchLaneBaseline.avgEdgeDistance !== null
                        ? `Edge ${challenge.pitchLaneBaseline.avgEdgeDistance.toFixed(2)} ft`
                        : null,
                    ]}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
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
    <div className="flex min-w-[196px] items-center justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-500">{label}</p>
      <p className="text-xl font-display text-slate-900">{value}</p>
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

function BaselineCard({ title, metrics }: { title: string; metrics: Array<string | null> }) {
  const visibleMetrics = metrics.filter((metric): metric is string => Boolean(metric));

  return (
    <div className="rounded-lg border border-gray-200/70 bg-white px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {visibleMetrics.map((metric) => (
          <span
            key={metric}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-600"
          >
            {metric}
          </span>
        ))}
      </div>
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
  if (!Number.isFinite(value)) return "N/A";
  return `${(value * 100).toFixed(1)}%`;
}

function formatBaselineAverage(value: number) {
  if (!Number.isFinite(value)) return "N/A";
  const fixed = Number(value).toFixed(3);
  return fixed.startsWith("0.") ? fixed.slice(1) : fixed;
}

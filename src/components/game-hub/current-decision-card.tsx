"use client";

import { formatCountStateLabel, formatHalfInningLabel } from "@/lib/challenge-context";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { LiveChallengeWindow } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

function signedPercent(value: number | null | undefined, digits = 2) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(digits)}%`;
}

function signedRunValue(value: number | null | undefined) {
  if (value === null || value === undefined) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

export function CurrentDecisionCard({
  snapshot,
  viewMode,
}: {
  snapshot: LiveChallengeWindow | null;
  viewMode: ViewMode;
}) {
  if (!snapshot) return null;

  const useWinValue =
    viewMode === "org" &&
    snapshot.currentWinExpectancy !== null &&
    hasTrustedModelConfidenceBand(snapshot.winExpectancyConfidence);

  const nextBallValue = useWinValue ? snapshot.nextBallWinExpectancyDelta : snapshot.nextBallRunExpectancyDelta;
  const nextStrikeValue = useWinValue ? snapshot.nextStrikeWinExpectancyDelta : snapshot.nextStrikeRunExpectancyDelta;
  const nextBallSelectionValue = nextBallValue ?? snapshot.nextBallExpectedChallengeValue;
  const nextStrikeSelectionValue = nextStrikeValue ?? snapshot.nextStrikeExpectedChallengeValue;
  const bestPath =
    nextBallSelectionValue === null && nextStrikeSelectionValue === null
      ? null
      : nextStrikeSelectionValue === null || (nextBallSelectionValue !== null && nextBallSelectionValue >= nextStrikeSelectionValue)
        ? {
            label: "Called strike overturned",
            recommendation: snapshot.nextBallDecisionRecommendation,
            expectedValue: snapshot.nextBallExpectedChallengeValue,
            overturnProbability: snapshot.nextBallOverturnProbability,
            countLabel: formatCountStateLabel(snapshot.nextBallCountKey),
            deltaLabel: useWinValue ? signedPercent(snapshot.nextBallWinExpectancyDelta) : signedRunValue(snapshot.nextBallRunExpectancyDelta),
            deltaMode:
              nextBallValue !== null
                ? useWinValue
                  ? "win"
                  : "run"
                : snapshot.nextBallExpectedChallengeValue !== null
                  ? "expected"
                  : "unknown",
          }
        : {
            label: "Called ball overturned",
            recommendation: snapshot.nextStrikeDecisionRecommendation,
            expectedValue: snapshot.nextStrikeExpectedChallengeValue,
            overturnProbability: snapshot.nextStrikeOverturnProbability,
            countLabel: formatCountStateLabel(snapshot.nextStrikeCountKey),
            deltaLabel: useWinValue ? signedPercent(snapshot.nextStrikeWinExpectancyDelta) : signedRunValue(snapshot.nextStrikeRunExpectancyDelta),
            deltaMode:
              nextStrikeValue !== null
                ? useWinValue
                  ? "win"
                  : "run"
                : snapshot.nextStrikeExpectedChallengeValue !== null
                  ? "expected"
                  : "unknown",
          };
  const pathEyebrow =
    viewMode === "org"
      ? bestPath?.recommendation === "challenge"
        ? "Best Challenge Path"
        : "Largest Available Review Swing"
      : bestPath?.recommendation === "challenge"
        ? "Most Meaningful Flip"
        : "Largest Available Review Swing";

  return (
    <section className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
            {viewMode === "org" ? "Current Challenge Decision" : "Current Review Spot"}
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Challenge <span className="text-gray-400">Now?</span>
          </p>
          <p className="mt-2 text-[11px] font-medium leading-relaxed text-[var(--ink-2)]">
            {formatHalfInningLabel(snapshot.halfInning, "short")} {snapshot.inning ?? "-"} • {snapshot.baseStateLabel} •{" "}
            {snapshot.scoreStateLabel}
          </p>
        </div>
        <div className="min-w-[196px] rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
          <div className="grid grid-cols-[1fr_auto] items-center gap-6">
            <span className="text-[9px] font-black uppercase tracking-[0.22em] text-blue-500">Estimated Leverage</span>
            <span className="text-3xl font-display text-gray-900">{snapshot.estimatedLeverageIndex}</span>
          </div>
          <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            {formatCountStateLabel(snapshot.currentCountKey)} • {snapshot.leverageBucket.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <CompactMetric
          label="Next Ball Path"
          value={formatCountStateLabel(snapshot.nextBallCountKey)}
          detail={`${Math.round((snapshot.nextBallOverturnProbability ?? 0) * 100)}% overturn`}
        />
        <CompactMetric
          label="Next Strike Path"
          value={formatCountStateLabel(snapshot.nextStrikeCountKey)}
          detail={`${Math.round((snapshot.nextStrikeOverturnProbability ?? 0) * 100)}% overturn`}
        />
        <CompactMetric
          label={useWinValue ? "Current Win State" : "Current Run State"}
          value={
            useWinValue
              ? signedPercent(snapshot.currentWinExpectancy, 2)
              : snapshot.currentRunExpectancy === null
                ? "N/A"
                : snapshot.currentRunExpectancy.toFixed(3)
          }
          detail={viewMode === "org" ? "Current game-state baseline" : "Current decision backdrop"}
        />
      </div>

      {bestPath ? (
        <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                {pathEyebrow}
              </p>
              <p className="mt-1 text-base font-display text-gray-900">
                {bestPath.label} to <span className="text-blue-500">{bestPath.countLabel}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                {bestPath.deltaMode === "win"
                  ? "Game Swing"
                  : bestPath.deltaMode === "run"
                    ? "Run Swing"
                    : "Expected Review Value"}
              </p>
              <p className="mt-1 text-xl font-display text-gray-900">
                {bestPath.deltaMode === "expected" && bestPath.expectedValue !== null
                  ? signedPercent(bestPath.expectedValue)
                  : bestPath.deltaLabel}
              </p>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium leading-relaxed text-gray-600">
            {bestPath.recommendation === "challenge"
              ? "Model would challenge this spot."
              : bestPath.recommendation === "hold"
                ? "This path has the biggest swing on the board, but the model would still hold the challenge here."
                : "Review is not advised from the current path."}{" "}
            {bestPath.expectedValue === null
              ? "Expected value is still stabilizing."
              : `Estimated decision value: ${signedPercent(bestPath.expectedValue)}.`}
          </p>
        </div>
      ) : null}
    </section>
  );
}

function CompactMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/50 px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-2 text-lg font-display text-gray-900">{value}</p>
      <p className="mt-1 text-[10px] font-medium leading-relaxed text-gray-500">{detail}</p>
    </div>
  );
}

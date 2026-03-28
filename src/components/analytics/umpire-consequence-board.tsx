"use client";

import { useMemo, useState } from "react";

import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { ChallengeEvent } from "@/lib/types";

type BucketMode = "inning_phase" | "count_state" | "base_out_state";

type ConsequenceBucket = {
  label: string;
  challenges: number;
  overturned: number;
  overturnRate: number;
  avgLeverage: number;
  highLeverageShare: number;
  avgAbsoluteWinSwing: number | null;
  avgAbsoluteRunSwing: number | null;
  avgExpectedValue: number | null;
};

export function UmpireConsequenceBoard({
  challenges,
}: {
  challenges: ChallengeEvent[];
}) {
  const [mode, setMode] = useState<BucketMode>("count_state");
  const summary = useMemo(() => buildConsequenceSummary(challenges), [challenges]);
  const buckets = useMemo(() => buildBuckets(challenges, mode).slice(0, 4), [challenges, mode]);
  const topCalls = useMemo(() => buildTopCalls(challenges).slice(0, 3), [challenges]);

  return (
    <section className="mb-12">
      <div className="panel p-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Modeled Consequence</h4>
            <p className="text-2xl font-display leading-none text-gray-900">
              WE / RE <span className="text-gray-400">Impact Board</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("inning_phase")}
              className={chipClass(mode === "inning_phase")}
            >
              Inning Phase
            </button>
            <button
              type="button"
              onClick={() => setMode("count_state")}
              className={chipClass(mode === "count_state")}
            >
              Count State
            </button>
            <button
              type="button"
              onClick={() => setMode("base_out_state")}
              className={chipClass(mode === "base_out_state")}
            >
              Base / Out
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-[1.5rem] border border-gray-100 bg-gray-50/60 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Baseball Read</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-2)]">{summary.read}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Avg Abs WE Swing" value={summary.avgAbsoluteWinSwing} note="Overturned calls only" />
          <MetricCard label="Avg Abs RE Swing" value={summary.avgAbsoluteRunSwing} note="Overturned calls only" />
          <MetricCard label="High-Impact Overturns" value={summary.highImpactOverturnShare} note=">= 2.0 win expectancy percentage points" />
          <MetricCard label="Avg Expected Review Value" value={summary.avgExpectedValue} note="Modeled challenge value" />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.75rem] border border-gray-100 bg-[var(--surface-infield)] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Scenario Buckets</p>
            <p className="mt-1 text-sm font-medium text-[var(--ink-2)]">
              Highest-cost buckets only. {summary.topBucketLabel !== "Stabilizing" ? `${summary.topBucketLabel} currently leads at ${summary.topBucketNote}.` : "No single bucket has separated yet."}
            </p>
            <div className="mt-4 space-y-3">
              {buckets.map((bucket) => (
                <div key={bucket.label} className="rounded-[1rem] border border-gray-100 bg-white p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 lg:w-56">
                      <p className="text-sm font-semibold text-[var(--ink-0)]">{bucket.label}</p>
                      <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                        {bucket.challenges} challenges · {(bucket.overturnRate * 100).toFixed(1)}% overturned · ELI {bucket.avgLeverage.toFixed(1)}
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[340px]">
                      <MiniMetric label="Abs WE" value={formatPercent(bucket.avgAbsoluteWinSwing)} />
                      <MiniMetric label="Abs RE" value={formatRun(bucket.avgAbsoluteRunSwing)} />
                      <MiniMetric label="Expected" value={formatPercent(bucket.avgExpectedValue)} />
                    </div>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-gray-100">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(8, bucket.highLeverageShare * 100)}%` }} />
                  </div>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    {(bucket.highLeverageShare * 100).toFixed(0)}% high-leverage share
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Largest Consequence Calls</p>
            <div className="mt-4 space-y-3">
              {topCalls.length > 0 ? (
                topCalls.map((challenge) => (
                  <div key={challenge.challengeId} className="rounded-[1rem] border border-gray-100 bg-[var(--surface-infield)] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink-0)]">
                          {challenge.challengeTeamName ?? "Unknown team"} · {challenge.inning ? `${challenge.inning}${challenge.halfInning === "Bottom" ? "B" : "T"}` : "In-game"}
                        </p>
                        <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                          {challenge.calledDescription ?? "Pitch call"} · {challenge.countBefore ?? "count unavailable"} · {challenge.basesState ?? "bases unknown"}
                        </p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-700">
                        {formatPercent(absMetric(challenge.winExpectancyDelta))}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <MiniMetric label="Abs WE" value={formatPercent(absMetric(challenge.winExpectancyDelta))} />
                      <MiniMetric label="Abs RE" value={formatRun(absMetric(challenge.runExpectancyDelta))} />
                      <MiniMetric label="ELI" value={challenge.estimatedLeverageIndex?.toFixed(1) ?? "N/A"} />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--ink-3)]">No modeled consequence sample is available yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function buildConsequenceSummary(challenges: ChallengeEvent[]) {
  const overturned = challenges.filter((challenge) => challenge.isOverturned);
  const trustedWin = overturned.filter(
    (challenge) => challenge.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(challenge.winExpectancyConfidence ?? null),
  );
  const trustedRun = overturned.filter(
    (challenge) => challenge.runExpectancyDelta !== null && hasTrustedModelConfidenceBand(challenge.runExpectancyConfidence ?? null),
  );
  const expected = challenges.filter((challenge) => challenge.expectedChallengeValue !== null);
  const topBucket = buildBuckets(challenges, "count_state")[0] ?? null;

  const avgAbsWe = average(trustedWin.map((challenge) => absMetric(challenge.winExpectancyDelta)));
  const avgAbsRe = average(trustedRun.map((challenge) => absMetric(challenge.runExpectancyDelta)));
  const avgExpected = average(expected.map((challenge) => challenge.expectedChallengeValue ?? 0));
  const highImpactShare =
    trustedWin.length > 0
      ? trustedWin.filter((challenge) => absMetric(challenge.winExpectancyDelta) >= 0.02).length / trustedWin.length
      : null;

  const read =
    trustedWin.length === 0
      ? "The consequence layer is still stabilizing. There is not enough trusted win-expectancy coverage yet to separate which reviewed misses are doing the most game-state damage."
      : `When this umpire does get overturned, the average absolute swing is ${formatPercent(avgAbsWe)} in win expectancy and ${formatRun(
          avgAbsRe,
        )} in run expectancy. The highest-cost count family right now is ${topBucket?.label?.toLowerCase() ?? "still settling"}, which is the first place an analyst should look for repeat exposure.`;

  return {
    avgAbsoluteWinSwing: formatPercent(avgAbsWe),
    avgAbsoluteRunSwing: formatRun(avgAbsRe),
    highImpactOverturnShare: formatShare(highImpactShare),
    avgExpectedValue: formatPercent(avgExpected),
    topBucketLabel: topBucket?.label ?? "Stabilizing",
    topBucketNote: topBucket ? `${formatPercent(topBucket.avgAbsoluteWinSwing)} abs WE · ${(topBucket.overturnRate * 100).toFixed(1)}% overturned` : "No stable bucket yet",
    read,
  };
}

function buildBuckets(challenges: ChallengeEvent[], mode: BucketMode): ConsequenceBucket[] {
  const buckets = new Map<string, ChallengeEvent[]>();
  for (const challenge of challenges) {
    const label = bucketLabel(challenge, mode);
    const existing = buckets.get(label) ?? [];
    existing.push(challenge);
    buckets.set(label, existing);
  }

  return [...buckets.entries()]
    .map(([label, bucketChallenges]) => {
      const overturned = bucketChallenges.filter((challenge) => challenge.isOverturned);
      const trustedWin = overturned.filter(
        (challenge) => challenge.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(challenge.winExpectancyConfidence ?? null),
      );
      const trustedRun = overturned.filter(
        (challenge) => challenge.runExpectancyDelta !== null && hasTrustedModelConfidenceBand(challenge.runExpectancyConfidence ?? null),
      );
      const expected = bucketChallenges.filter((challenge) => challenge.expectedChallengeValue !== null);
      const leverageValues = bucketChallenges
        .map((challenge) => challenge.estimatedLeverageIndex)
        .filter((value): value is number => typeof value === "number");

      return {
        label,
        challenges: bucketChallenges.length,
        overturned: overturned.length,
        overturnRate: bucketChallenges.length > 0 ? overturned.length / bucketChallenges.length : 0,
        avgLeverage: average(leverageValues) ?? 0,
        highLeverageShare:
          bucketChallenges.length > 0
            ? bucketChallenges.filter((challenge) => (challenge.estimatedLeverageIndex ?? 0) >= 65).length / bucketChallenges.length
            : 0,
        avgAbsoluteWinSwing: average(trustedWin.map((challenge) => absMetric(challenge.winExpectancyDelta))),
        avgAbsoluteRunSwing: average(trustedRun.map((challenge) => absMetric(challenge.runExpectancyDelta))),
        avgExpectedValue: average(expected.map((challenge) => challenge.expectedChallengeValue ?? 0)),
      };
    })
    .sort((left, right) => {
      const winDiff = (right.avgAbsoluteWinSwing ?? -Infinity) - (left.avgAbsoluteWinSwing ?? -Infinity);
      if (winDiff !== 0) return winDiff;
      const leverageDiff = right.avgLeverage - left.avgLeverage;
      if (leverageDiff !== 0) return leverageDiff;
      return right.challenges - left.challenges;
    });
}

function buildTopCalls(challenges: ChallengeEvent[]) {
  return [...challenges]
    .filter(
      (challenge) =>
        challenge.isOverturned &&
        challenge.winExpectancyDelta !== null &&
        hasTrustedModelConfidenceBand(challenge.winExpectancyConfidence ?? null),
    )
    .sort((left, right) => absMetric(right.winExpectancyDelta) - absMetric(left.winExpectancyDelta))
    .slice(0, 4);
}

function bucketLabel(challenge: ChallengeEvent, mode: BucketMode) {
  if (mode === "inning_phase") {
    const inning = challenge.inning ?? 0;
    if (inning <= 3) return "Early";
    if (inning <= 6) return "Middle";
    if (inning <= 9) return "Late";
    return "Extras";
  }

  if (mode === "count_state") {
    return challenge.countBefore ?? "Unknown Count";
  }

  const bases = challenge.basesState ?? "Unknown Bases";
  const outs = challenge.outs ?? 0;
  return `${bases} · ${outs} outs`;
}

function chipClass(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition ${
    active
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-gray-200 bg-white text-gray-500 hover:border-blue-100 hover:text-blue-600"
  }`;
}

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-[1.25rem] border border-gray-100 bg-white p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-lg font-display leading-tight text-[var(--ink-0)]">{value}</p>
      {note ? <p className="mt-2 text-[10px] text-[var(--ink-3)]">{note}</p> : null}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1rem] border border-gray-100 bg-white px-3 py-3">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-base font-display text-[var(--ink-0)]">{value}</p>
    </div>
  );
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function absMetric(value: number | null | undefined) {
  return value == null ? 0 : Math.abs(value);
}

function formatPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${(value * 100).toFixed(2)}%`;
}

function formatRun(value: number | null) {
  if (value === null) return "N/A";
  return value.toFixed(3);
}

function formatShare(value: number | null) {
  if (value === null) return "N/A";
  return `${Math.round(value * 100)}%`;
}

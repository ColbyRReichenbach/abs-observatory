"use client";

import { formatLeverageBucketLabel } from "@/lib/estimated-leverage";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { ChallengeValueTimelineEntry } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

export function ChallengeValueTimeline({
  entries,
  viewMode,
}: {
  entries: ChallengeValueTimelineEntry[];
  viewMode: ViewMode;
}) {
  if (!entries.length) return null;

  const biggestSwing = [...entries].sort(
    (left, right) => Math.abs(right.estimatedChallengeSwing) - Math.abs(left.estimatedChallengeSwing),
  )[0];
  const highestPressure = [...entries].sort(
    (left, right) => right.estimatedLeverageIndex - left.estimatedLeverageIndex,
  )[0];
  const biggestRunValue = [...entries]
    .filter((entry) => entry.runExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.runExpectancyConfidence))
    .sort((left, right) => Math.abs(right.runExpectancyDelta ?? 0) - Math.abs(left.runExpectancyDelta ?? 0))[0];
  const biggestWinValue = [...entries]
    .filter((entry) => entry.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.winExpectancyConfidence))
    .sort((left, right) => Math.abs(right.winExpectancyDelta ?? 0) - Math.abs(left.winExpectancyDelta ?? 0))[0];
  const overturnedCount = entries.filter((entry) => entry.isOverturned).length;
  const maxSwing = Math.max(...entries.map((entry) => Math.abs(entry.estimatedChallengeSwing)), 1);
  const valueHeadline = viewMode === "org" && biggestWinValue ? biggestWinValue : biggestRunValue;
  const usesWinValue = viewMode === "org" && biggestWinValue !== undefined;

  return (
    <div className="mt-6 flex flex-col">
      <div className="mb-4 flex items-end justify-between px-2">
        <div>
          <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            Challenge Decision Value
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Scenario <span className="text-gray-400">Timeline</span>
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <SummaryCard
          eyebrow="Biggest Swing"
          title={biggestSwing ? `${biggestSwing.challengeTeamName ?? "Team"} ${biggestSwing.isOverturned ? "won" : "lost"} the top spot` : "No swing data"}
          detail={
            biggestSwing
              ? `${formatInning(biggestSwing)} • ${signedValue(biggestSwing.estimatedChallengeSwing)} ECS`
              : "Timeline will populate once challenges are tracked."
          }
        />
        <SummaryCard
          eyebrow="Highest Pressure"
          title={highestPressure ? `${highestPressure.baseStateLabel} • ${highestPressure.scoreStateLabel}` : "No pressure spot"}
          detail={highestPressure ? `${formatInning(highestPressure)} • ELI ${highestPressure.estimatedLeverageIndex}` : "No timeline yet."}
        />
        <SummaryCard
          eyebrow={usesWinValue ? "Win Value" : "Run Value"}
          title={
            valueHeadline
              ? `${valueHeadline.challengeTeamName ?? "Team"} ${
                  usesWinValue
                    ? valueHeadline.winExpectancyDelta !== null && valueHeadline.winExpectancyDelta >= 0
                      ? "captured"
                      : "lost"
                    : valueHeadline.runExpectancyDelta !== null && valueHeadline.runExpectancyDelta >= 0
                      ? "captured"
                      : "lost"
                } the top ${usesWinValue ? "win-value" : "run-value"} spot`
              : `${overturnedCount} overturned • ${entries.length - overturnedCount} confirmed`
          }
          detail={
            valueHeadline &&
            ((usesWinValue && valueHeadline.winExpectancyDelta !== null) || (!usesWinValue && valueHeadline.runExpectancyDelta !== null))
              ? `${formatInning(valueHeadline)} • ${
                  usesWinValue
                    ? signedWinValue(valueHeadline.winExpectancyDelta ?? 0)
                    : signedRunValue(valueHeadline.runExpectancyDelta ?? 0)
                } ${usesWinValue ? "WE" : "RE"}`
              : `${entries.length} reviewed moments in this game narrative`
          }
        />
      </div>

      <div className="grid gap-4">
        {entries.map((entry) => {
          const positiveDelta = entry.positiveOutcomeDelta;
          const deltaLabel =
            positiveDelta === null
              ? "No baseline delta"
              : `${positiveDelta >= 0 ? "+" : ""}${(positiveDelta * 100).toFixed(1)} pts`;

          return (
            <article
              key={entry.challengeId}
              className={`rounded-2xl border p-4 shadow-sm ${
                entry.isOverturned ? "border-emerald-100 bg-emerald-50" : "border-gray-100 bg-gray-50"
              }`}
            >
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {entry.halfInning === "Top" ? "T" : "B"}
                    {entry.inning ?? "-"} • {entry.challengeTeamName ?? "Unknown"}
                  </p>
                  <h5 className="text-sm font-bold text-gray-900">{entry.calledDescription ?? "Pitch challenge"}</h5>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {formatLeverageBucketLabel(entry.leverageBucket)} • ELI {entry.estimatedLeverageIndex}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                    entry.isOverturned ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"
                  }`}
                >
                  {entry.isOverturned ? "Overturned" : "Confirmed"}{" "}
                  {entry.estimatedChallengeSwing >= 0 ? `+${entry.estimatedChallengeSwing}` : entry.estimatedChallengeSwing}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-4">
                <MetricCard label="Count Shift" value={formatCountShift(entry)} />
                <MetricCard label="Base / Score" value={`${entry.baseStateLabel} • ${entry.scoreStateLabel}`} />
                <MetricCard label="Count Edge" value={deltaLabel} />
                <MetricCard
                  label={
                    viewMode === "org" && entry.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.winExpectancyConfidence)
                      ? "Win Value"
                      : entry.runExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.runExpectancyConfidence)
                        ? "Run Value"
                        : "At-Bat"
                  }
                  value={
                    viewMode === "org" && entry.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.winExpectancyConfidence)
                    ? `${signedWinValue(entry.winExpectancyDelta)} WE`
                      : entry.runExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.runExpectancyConfidence)
                      ? `${signedRunValue(entry.runExpectancyDelta)} RE`
                      : `${entry.batterName ?? "Batter"} vs ${entry.pitcherName ?? "Pitcher"}`
                  }
                />
              </div>

              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <span>Scenario Swing Index</span>
                  <span>{signedValue(entry.estimatedChallengeSwing)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/80">
                  <div
                    className={`h-full rounded-full ${
                      entry.estimatedChallengeSwing >= 0 ? "bg-emerald-500" : "bg-gray-900"
                    }`}
                    style={{ width: `${Math.max(10, (Math.abs(entry.estimatedChallengeSwing) / maxSwing) * 100)}%` }}
                  />
                </div>
              </div>

              {entry.scenarioTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {entry.scenarioTags.map((tag) => (
                    <span
                      key={`${entry.challengeId}-${tag}`}
                      className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              {entry.battingAverageDelta !== null || entry.walkRateDelta !== null ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {viewMode === "org" && entry.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.winExpectancyConfidence) ? (
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                      WE {signedWinValue(entry.winExpectancyDelta)}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                    {viewMode === "org" && hasTrustedModelConfidenceBand(entry.winExpectancyConfidence)
                      ? `${entry.winExpectancyConfidence?.toUpperCase() ?? "N/A"} WE confidence`
                      : entry.runExpectancyConfidence
                        ? `${entry.runExpectancyConfidence.toUpperCase()} RE confidence`
                        : "Baseline confidence unavailable"}
                  </span>
                  {entry.battingAverageDelta !== null ? (
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                      AVG {signedPercent(entry.battingAverageDelta)}
                    </span>
                  ) : null}
                  {entry.walkRateDelta !== null ? (
                    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
                      BB {signedPercent(entry.walkRateDelta)}
                    </span>
                  ) : null}
                </div>
              ) : null}

              {entry.impactSummary ? (
                <p className="mt-3 text-xs font-medium leading-relaxed text-gray-500">{entry.impactSummary}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-700">{value}</p>
    </div>
  );
}

function formatCountShift(entry: ChallengeValueTimelineEntry) {
  const initial = entry.umpireCount ?? entry.countBefore;
  const final = entry.countAfter;
  if (initial && final) {
    return initial === final ? initial : `${initial} -> ${final}`;
  }
  return initial ?? final ?? "Unavailable";
}

function formatInning(entry: ChallengeValueTimelineEntry) {
  return `${entry.halfInning === "Top" ? "T" : "B"}${entry.inning ?? "-"}`;
}

function signedValue(value: number) {
  return `${value >= 0 ? "+" : ""}${value}`;
}

function signedPercent(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)} pts`;
}

function signedRunValue(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

function signedWinValue(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function SummaryCard({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{eyebrow}</p>
      <p className="mt-2 text-base font-display leading-tight text-gray-900">{title}</p>
      <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-600">{detail}</p>
    </div>
  );
}

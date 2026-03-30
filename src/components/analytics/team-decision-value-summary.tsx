"use client";

import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { TeamDecisionValueSummary } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";

export function TeamDecisionValueSummaryCard({
  summary,
  viewMode,
  teamColor,
}: {
  summary: TeamDecisionValueSummary;
  viewMode: ViewMode;
  teamColor: string;
}) {
  const trusted = hasTrustedModelConfidenceBand(summary.modelConfidence);
  const expected = summary.averageExpectedChallengeValue;
  const realized = summary.averageRealizedChallengeValue;
  const surplus = summary.decisionSurplus;

  const orgNarrative = !trusted
    ? "This decision read is still stabilizing. AiBS is tracking challenge timing, but the expected-value model needs a larger confident sample before it becomes a primary recommendation layer."
    : surplus === null
      ? "Decision-value coverage is available, but the current sample is not large enough to separate expected and realized value cleanly."
      : surplus >= 0
        ? "This club is capturing at least as much win value as the model expects from comparable challenge windows."
        : "This club is leaving value on the table relative to what the model expects from similar challenge windows.";
  const fanNarrative = !trusted
    ? "This team is building an early decision profile, but the smartest-vs-costliest challenge read is still settling in."
    : summary.capturedValueShare >= summary.wastedValueShare
      ? "This team has been turning a larger share of similar challenge windows into favorable results."
      : "This team has created some favorable challenge windows, but the lower-value share is still elevated.";

  return (
    <section className="mt-8">
      <div className="panel p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">Decision Value Summary</h4>
            <p className="text-2xl font-display leading-none text-gray-900">
              {viewMode === "org" ? (
                <>
                  Expected <span className="text-gray-400">vs Realized</span>
                </>
              ) : (
                <>
                  Smart <span className="text-gray-400">Challenge Read</span>
                </>
              )}
            </p>
          </div>
          <div className="rounded-full border border-black/10 bg-[var(--surface-infield)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
            {summary.modelConfidence ? `${summary.modelConfidence.toUpperCase()} confidence` : "Stabilizing"}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {viewMode === "org" ? (
            <>
              <DecisionMetric
                label="Avg Expected WE Δ"
                value={expected === null ? "N/A" : formatWinValue(expected)}
                accent={teamColor}
              />
              <DecisionMetric
                label="Avg Realized WE Δ"
                value={realized === null ? "N/A" : formatWinValue(realized)}
                accent={teamColor}
              />
              <DecisionMetric
                label="Decision Surplus"
                value={surplus === null ? "N/A" : formatWinValue(surplus)}
                accent={teamColor}
              />
              <DecisionMetric
                label="Higher-Value Share"
                value={formatShare(summary.capturedValueShare)}
                accent={teamColor}
              />
              <DecisionMetric
                label="Late-Close EV Share"
                value={formatShare(summary.lateCloseExpectedValueShare)}
                accent={teamColor}
              />
              <DecisionMetric
                label="Best Decision Window"
                value={summary.bestDecisionWindowLabel ?? "Stabilizing"}
                accent={teamColor}
              />
            </>
          ) : (
            <>
              <DecisionMetric label="Higher-Value Share" value={formatShare(summary.capturedValueShare)} accent={teamColor} />
              <DecisionMetric label="Lower-Value Share" value={formatShare(summary.wastedValueShare)} accent={teamColor} />
              <DecisionMetric
                label="Best Challenge Window"
                value={summary.bestDecisionWindowLabel ?? "Still building"}
                accent={teamColor}
              />
            </>
          )}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-gray-100 bg-gray-50/60 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
            {viewMode === "org" ? "AiBS Decision Model Read" : "What This Means"}
          </p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-2)]">{viewMode === "org" ? orgNarrative : fanNarrative}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Chip label={`Challenge ${formatShare(summary.challengeRecommendationRate)}`} />
            <Chip label={`Hold ${formatShare(summary.holdRecommendationRate)}`} />
            <Chip label={`High-leverage EV ${formatShare(summary.highPressureExpectedValueShare)}`} />
            {summary.bestDecisionWindowExpectedValue !== null ? (
              <Chip label={`Best window ${formatWinValue(summary.bestDecisionWindowExpectedValue)}`} />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function DecisionMetric({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-[1.25rem] border border-gray-100 bg-white p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-lg font-display leading-tight text-[var(--ink-0)]" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
      {label}
    </span>
  );
}

function formatShare(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatWinValue(value: number) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

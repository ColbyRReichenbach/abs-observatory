"use client";

import { useMemo, useState } from "react";

import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type {
  TeamChallengeValueSummary,
  TeamDecisionBreakdownSection,
  TeamDecisionValueReport,
  TeamDecisionWindowEntry,
} from "@/lib/types";

export function TeamOrgCommandCenter({
  report,
  challengeSummary,
  bailouts,
  teamColor,
}: {
  report: TeamDecisionValueReport;
  challengeSummary: TeamChallengeValueSummary;
  bailouts: Array<{ pitcherName: string; bailouts: number; totalChallenges: number }>;
  teamColor: string;
}) {
  const [selectedWindowLabel, setSelectedWindowLabel] = useState<string | null>(report.strongestWindow?.label ?? null);
  const [selectedSectionKey, setSelectedSectionKey] = useState<TeamDecisionBreakdownSection["key"]>("count_state");
  const trustedDecisionModel = hasTrustedModelConfidenceBand(report.summary.modelConfidence);
  const trustedWinSummary =
    challengeSummary.averageWinExpectancyDelta !== null &&
    hasTrustedModelConfidenceBand(challengeSummary.winExpectancyConfidence);

  const windowOptions = useMemo(() => {
    const windows = [...report.topWindows, ...report.bottomWindows];
    const deduped = new Map<string, TeamDecisionWindowEntry>();
    for (const window of windows) {
      deduped.set(window.label, window);
    }
    return [...deduped.values()]
      .sort((left, right) => Math.abs(right.decisionSurplus ?? 0) - Math.abs(left.decisionSurplus ?? 0))
      .slice(0, 5);
  }, [report.bottomWindows, report.topWindows]);

  const selectedWindow =
    windowOptions.find((window) => window.label === selectedWindowLabel) ??
    report.strongestWindow ??
    report.weakestWindow ??
    null;

  const selectedSection =
    report.breakdownSections.find((section) => section.key === selectedSectionKey) ?? report.breakdownSections[0] ?? null;

  return (
    <section className="mt-8">
      <div className="panel p-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Challenge Management</h4>
            <p className="text-2xl font-display leading-none text-gray-900">
              Review <span className="text-gray-400">Profile</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag label={`${report.positiveWindowCount} positive windows`} />
            <Tag label={`${report.negativeWindowCount} negative windows`} />
            <Tag
              label={
                trustedWinSummary
                  ? `${formatSignedPercent(challengeSummary.averageWinExpectancyDelta)} avg WE`
                  : challengeSummary.averageRunExpectancyDelta === null
                    ? "RE stabilizing"
                    : `${formatSignedRunValue(challengeSummary.averageRunExpectancyDelta)} avg RE`
              }
            />
          </div>
        </div>

        <div className="mb-6 rounded-[1.5rem] border border-gray-100 bg-gray-50/60 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Review Read</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-2)]">
            {buildDecisionRead(report, challengeSummary, trustedDecisionModel, trustedWinSummary)}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Review Surplus"
            value={report.summary.decisionSurplus === null ? "N/A" : formatSignedPercent(report.summary.decisionSurplus)}
            note={trustedDecisionModel ? "Expected vs realized WE" : "Model still stabilizing"}
            accent={teamColor}
          />
          <MetricCard
            label="High-Value Window Share"
            value={formatShare(report.summary.capturedValueShare)}
            note={`${formatShare(report.summary.wastedValueShare)} low-value`}
            accent={teamColor}
          />
          <MetricCard
            label="Late-Game EV Share"
            value={formatShare(report.summary.lateCloseExpectedValueShare)}
            note={`${formatShare(report.summary.highPressureExpectedValueShare)} high-leverage EV`}
            accent={teamColor}
          />
          <MetricCard
            label="Best Review Window"
            value={report.summary.bestDecisionWindowLabel ?? "Stabilizing"}
            note={
              report.summary.bestDecisionWindowExpectedValue === null
                ? `${report.summary.bestDecisionWindowChallenges} challenges`
                : `${formatSignedPercent(report.summary.bestDecisionWindowExpectedValue)} expected`
            }
            accent={teamColor}
          />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="rounded-[1.75rem] border border-gray-100 bg-[var(--surface-infield)] p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Review Window Ladder</p>
                <p className="mt-1 text-sm font-medium text-[var(--ink-2)]">
                  Drill into where this club is actually adding review value or leaving it on the table.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {windowOptions.map((window) => (
                <button
                  key={window.label}
                  type="button"
                  onClick={() => setSelectedWindowLabel(window.label)}
                  className={`w-full rounded-[1.25rem] border px-4 py-4 text-left transition ${
                    selectedWindow?.label === window.label
                      ? "border-blue-200 bg-white shadow-sm"
                      : "border-gray-100 bg-white/70 hover:border-blue-100 hover:bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--ink-0)]">{window.label}</p>
                      <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                        {window.challenges} trusted reviews · {formatShare(window.capturedValueShare)} high-value · {formatShare(window.wastedValueShare)} low-value
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                        (window.decisionSurplus ?? 0) >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {formatSignedPercent(window.decisionSurplus)}
                    </span>
                  </div>
                  <WindowSurplusBar value={window.decisionSurplus ?? 0} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Selected Review Window</p>
              {selectedWindow ? (
                <>
                  <p className="mt-3 text-2xl font-display leading-tight text-[var(--ink-0)]" style={{ color: teamColor }}>
                    {selectedWindow.label}
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <MiniMetric label="Expected" value={formatSignedPercent(selectedWindow.averageExpectedChallengeValue)} />
                    <MiniMetric label="Actual" value={formatSignedPercent(selectedWindow.averageRealizedChallengeValue)} />
                    <MiniMetric label="Surplus" value={formatSignedPercent(selectedWindow.decisionSurplus)} />
                    <MiniMetric label="Trusted Sample" value={`${selectedWindow.challenges}`} />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--ink-2)]">
                    {hasTrustedModelConfidenceBand(selectedWindow.modelConfidence)
                      ? `Expected is the average pre-review win value the model projected, actual is what the trusted reviews in this window really returned, and surplus is actual minus expected. High-value share reflects how often this window landed in the stronger side of the model's recommendation set. Challenge recommendations ran at ${formatShare(selectedWindow.challengeRecommendationRate)}, while holds still made up ${formatShare(selectedWindow.holdRecommendationRate)} of the trusted sample.`
                      : "Expected is the pre-review model estimate, actual is what the team really got back, and surplus is the directional gap between the two. High-value share is still directional here because the sample is not yet trusted enough to anchor a hard recommendation on its own."}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm leading-7 text-[var(--ink-2)]">No stabilized window yet.</p>
              )}
            </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Overturned Pitcher Saves</p>
              <div className="mt-4 space-y-3">
                {bailouts.length > 0 ? (
                  bailouts.slice(0, 3).map((pitcher) => (
                    <div key={pitcher.pitcherName} className="rounded-[1rem] border border-gray-100 bg-[var(--surface-infield)] px-4 py-3">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink-0)]">{pitcher.pitcherName}</p>
                          <p className="mt-1 text-[11px] text-[var(--ink-3)]">{pitcher.totalChallenges} total challenged pitches</p>
                        </div>
                        <span className="text-2xl font-display text-[var(--ink-0)]">{pitcher.bailouts}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--ink-3)]">No overturned pitcher-save pattern has separated yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {selectedSection ? (
          <div className="mt-8 rounded-[1.75rem] border border-gray-100 bg-white p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Review Breakdown</p>
                <p className="mt-1 text-sm font-medium text-[var(--ink-2)]">
                  Use the tabs to switch between inning phase, count state, and base/out context. Only the highest-separation buckets stay in view.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {report.breakdownSections.map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setSelectedSectionKey(section.key)}
                    className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] transition ${
                      selectedSection.key === section.key
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-500 hover:border-blue-100 hover:text-blue-600"
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
            <BreakdownDrilldown section={selectedSection} teamColor={teamColor} />
          </div>
        ) : null}
      </div>
    </section>
  );
}

function BreakdownDrilldown({
  section,
  teamColor,
}: {
  section: TeamDecisionBreakdownSection;
  teamColor: string;
}) {
  const trimmedEntries = [...section.entries]
    .sort((left, right) => Math.abs(right.decisionSurplus ?? 0) - Math.abs(left.decisionSurplus ?? 0))
    .slice(0, 5);
  const maxAbs = Math.max(0.0001, ...trimmedEntries.map((entry) => Math.abs(entry.decisionSurplus ?? 0)));

  return (
    <>
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <MiniMetric label="Positive" value={`${section.positiveCount}`} />
        <MiniMetric label="Negative" value={`${section.negativeCount}`} />
        <MiniMetric label="Neutral" value={`${section.neutralCount}`} />
      </div>
      <div className="space-y-3">
        {trimmedEntries.map((entry) => {
          const surplus = entry.decisionSurplus ?? 0;
          const trusted = hasTrustedModelConfidenceBand(entry.modelConfidence);
          const magnitude = Math.min(50, (Math.abs(surplus) / maxAbs) * 50);
          return (
            <div key={entry.label} className="rounded-[1rem] border border-gray-100 bg-[var(--surface-infield)] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 lg:w-56">
                  <p className="text-sm font-semibold text-[var(--ink-0)]">{entry.label}</p>
                  <p className="mt-1 text-[11px] text-[var(--ink-3)]">
                    {entry.challenges} trusted reviews · {formatShare(entry.capturedValueShare)} higher-value · {formatShare(entry.wastedValueShare)} lower-value
                  </p>
                </div>
                <div className="relative h-8 flex-1 rounded-full bg-white">
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gray-200" />
                  <div
                    className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full"
                    style={{
                      left: surplus >= 0 ? "50%" : `calc(50% - ${magnitude}%)`,
                      width: `${magnitude}%`,
                      backgroundColor: surplus >= 0 ? teamColor : "#f59e0b",
                    }}
                  />
                </div>
                <div className="flex min-w-[150px] items-center justify-between gap-3 lg:block lg:text-right">
                  <p className="text-sm font-display text-[var(--ink-0)]">{formatSignedPercent(entry.decisionSurplus)}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    {trusted ? "trusted" : "directional"}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function WindowSurplusBar({ value }: { value: number }) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const magnitude = Math.min(100, Math.abs(safeValue) * 2500);
  return (
    <div className="mt-3 h-2 rounded-full bg-gray-100">
      <div
        className={`h-full rounded-full ${safeValue >= 0 ? "bg-emerald-500" : "bg-amber-500"}`}
        style={{ width: `${Math.max(6, magnitude)}%` }}
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  note,
  accent,
}: {
  label: string;
  value: string;
  note: string;
  accent: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-gray-100 bg-white p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</p>
      <p className="mt-2 text-lg font-display leading-tight text-[var(--ink-0)]" style={{ color: accent }}>
        {value}
      </p>
      <p className="mt-2 text-[10px] text-[var(--ink-3)]">{note}</p>
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

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-gray-500">
      {label}
    </span>
  );
}

function buildDecisionRead(
  report: TeamDecisionValueReport,
  challengeSummary: TeamChallengeValueSummary,
  trustedDecisionModel: boolean,
  trustedWinSummary: boolean,
) {
  if (!trustedDecisionModel) {
    return "The decision model is still building trusted separation in this sample, so the best use of this board is to identify directional concentration and avoid overreading tiny surplus gaps.";
  }

  const bestWindow = report.strongestWindow?.label ? report.strongestWindow.label.toLowerCase() : "its strongest modeled window";
  const weakWindow = report.weakestWindow?.label ? report.weakestWindow.label.toLowerCase() : "its weakest modeled window";
  const valueMode = trustedWinSummary ? "win value" : "run value";
  return `This club is operating with ${formatShare(report.summary.capturedValueShare)} captured ${valueMode} and ${formatShare(
    report.summary.lateCloseExpectedValueShare,
  )} of its modeled expected value showing up in late-close spots. The best current deployment shows up in ${bestWindow}, while ${weakWindow} remains the clearest leak point.`;
}

function formatShare(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatSignedPercent(value: number | null) {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function formatSignedRunValue(value: number | null) {
  if (value === null) return "N/A";
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
}

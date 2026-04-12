"use client";

import { Fragment, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { AIInsightBubble } from "@/components/analytics/ai-insight-bubble";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { buildTeamChallengeValueMatrixPayload } from "@/lib/chart-insight-payload";
import { hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import type { TeamChallengeScenarioCell, TeamChallengeValueSummary } from "@/lib/types";

type ScenarioRow = {
  label: string;
  cells: TeamChallengeScenarioCell[];
  totalChallenges: number;
  averageLeverage: number;
};

export function TeamChallengeValueMatrix({
  cells,
  summary,
  teamColor,
  viewMode,
  showInsight = true,
}: {
  cells: TeamChallengeScenarioCell[];
  summary: TeamChallengeValueSummary;
  teamColor: string;
  viewMode: "fan" | "org";
  showInsight?: boolean;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const chartContext = useMemo(() => buildTeamChallengeValueMatrixPayload(cells, summary), [cells, summary]);

  const rowLabels = useMemo(() => Array.from(new Set(cells.map((cell) => cell.rowLabel))), [cells]);
  const colLabels = useMemo(() => Array.from(new Set(cells.map((cell) => cell.colLabel))), [cells]);
  const cellMap = useMemo(() => new Map(cells.map((cell) => [toCellKey(cell.rowLabel, cell.colLabel), cell])), [cells]);
  const rows = useMemo<ScenarioRow[]>(
    () =>
      rowLabels.map((rowLabel) => {
        const rowCells = colLabels.map((colLabel) => cellMap.get(toCellKey(rowLabel, colLabel)) ?? buildEmptyCell(rowLabel, colLabel));
        const totalChallenges = rowCells.reduce((sum, cell) => sum + cell.challenges, 0);
        const weightedLeverage = rowCells.reduce((sum, cell) => sum + cell.avgEstimatedLeverage * cell.challenges, 0);
        return {
          label: rowLabel,
          cells: rowCells,
          totalChallenges,
          averageLeverage: totalChallenges > 0 ? weightedLeverage / totalChallenges : 0,
        };
      }),
    [cellMap, colLabels, rowLabels],
  );

  const usesWinValue =
    viewMode === "org" &&
    summary.averageWinExpectancyDelta !== null &&
    hasTrustedModelConfidenceBand(summary.winExpectancyConfidence);
  const primaryMetricLabel = viewMode === "org" ? (usesWinValue ? "Avg WE Delta" : "Avg RE Delta") : "Count Gain";
  const averagePrimaryValue = usesWinValue
    ? summary.averageWinExpectancyDelta
    : viewMode === "org"
      ? summary.averageRunExpectancyDelta
      : summary.averagePositiveOutcomeDelta;
  const maxChallenges = useMemo(() => Math.max(1, ...cells.map((cell) => cell.challenges), 1), [cells]);
  const maxRowChallenges = useMemo(() => Math.max(1, ...rows.map((row) => row.totalChallenges), 1), [rows]);
  const maxLeverage = useMemo(() => Math.max(1, ...cells.map((cell) => cell.avgEstimatedLeverage), summary.averageEstimatedLeverage, 1), [cells, summary.averageEstimatedLeverage]);

  const preferredCell = useMemo(
    () =>
      [...cells]
        .filter((cell) => cell.challenges > 0)
        .sort((left, right) => {
          const leftPrimary = getCellPrimaryMetric(left, usesWinValue, viewMode);
          const rightPrimary = getCellPrimaryMetric(right, usesWinValue, viewMode);
          if ((rightPrimary ?? -Infinity) !== (leftPrimary ?? -Infinity)) {
            return (rightPrimary ?? -Infinity) - (leftPrimary ?? -Infinity);
          }
          if (right.highPressureShare !== left.highPressureShare) return right.highPressureShare - left.highPressureShare;
          return right.avgEstimatedLeverage - left.avgEstimatedLeverage;
        })[0] ?? null,
    [cells, usesWinValue, viewMode],
  );
  const mostActiveCell = useMemo(
    () =>
      [...cells]
        .filter((cell) => cell.challenges > 0)
        .sort((left, right) => {
          if (right.challenges !== left.challenges) return right.challenges - left.challenges;
          return right.avgEstimatedLeverage - left.avgEstimatedLeverage;
        })[0] ?? null,
    [cells],
  );
  const highestPressureCell = useMemo(
    () =>
      [...cells]
        .filter((cell) => cell.challenges > 0)
        .sort((left, right) => {
          if (right.highPressureShare !== left.highPressureShare) return right.highPressureShare - left.highPressureShare;
          return right.avgEstimatedLeverage - left.avgEstimatedLeverage;
        })[0] ?? null,
    [cells],
  );

  const deploymentRead =
    summary.totalChallenges === 0
      ? "Challenge timing profile will appear once the club has a larger tracked sample."
      : summary.highPressureShare >= 0.5
        ? viewMode === "org"
          ? "This club is already allocating a larger share of reviews to later or tighter challenge states in this sample."
          : "This team tends to hold more of its reviews for later or tighter spots."
        : viewMode === "org"
          ? "This club is still spending more reviews before the later or tighter challenge states arrive."
          : "This team is still using more of its reviews before the later or tighter spots arrive.";

  const hoveredCell = hoveredKey ? cellMap.get(hoveredKey) ?? null : null;

  return (
    <div className="panel border border-gray-50 bg-white p-8 shadow-2xl shadow-black/[0.02]">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
            {viewMode === "org" ? "Scenario Deployment" : "Challenge Timing"}
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Challenge <span className="text-gray-400">Window Map</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryPill label="High-Pressure Share" value={formatWholePercent(summary.highPressureShare)} />
          <SummaryPill label="RISP <2 Outs" value={formatWholePercent(summary.rispLessThanTwoOutsShare)} />
          <SummaryPill label="Avg ELI" value={summary.averageEstimatedLeverage.toFixed(1)} />
          <SummaryPill label={primaryMetricLabel} value={formatPrimarySummaryValue(averagePrimaryValue, usesWinValue, viewMode)} />
        </div>
      </div>

      {showInsight ? (
        <div className="mb-4 flex justify-end">
          <AIInsightBubble
            insight="Explain which challenge windows are genuinely productive, which ones are mostly volume, and where this club is entering tougher review environments."
            insightId="team-challenge-value-matrix"
            metadata={{ surface: "team_challenge_value_matrix", viewMode }}
            chartContext={chartContext}
            spotlightTitle="Challenge Window Map"
            spotlight={
              <TeamChallengeValueMatrix
                cells={cells}
                summary={summary}
                teamColor={teamColor}
                viewMode={viewMode}
                showInsight={false}
              />
            }
          />
        </div>
      ) : null}

      <div className="mb-5 grid gap-3 lg:grid-cols-3">
        <SpotlightCard
          eyebrow={viewMode === "org" ? "Best Window" : "Best Review Window"}
          title={preferredCell ? `${preferredCell.rowLabel} • ${preferredCell.colLabel}` : "No clear favorite yet"}
          body={
            preferredCell
              ? `${preferredCell.challenges} reviews with ${formatCellPrimaryMetric(preferredCell, usesWinValue, viewMode)} and ELI ${preferredCell.avgEstimatedLeverage.toFixed(1)}.`
              : "The best challenge window will separate once the sample stabilizes."
          }
          tone="positive"
          teamColor={teamColor}
        />
        <SpotlightCard
          eyebrow="Most Used Window"
          title={mostActiveCell ? `${mostActiveCell.rowLabel} • ${mostActiveCell.colLabel}` : "No heavy deployment yet"}
          body={
            mostActiveCell
              ? `${mostActiveCell.challenges} reviews with ${formatWholePercent(mostActiveCell.overturnRate)} overturned. This is the club's highest-volume review lane.`
              : "Usage concentration will appear once tracked reviews accumulate."
          }
          tone="neutral"
          teamColor={teamColor}
        />
        <SpotlightCard
          eyebrow="Pressure Window"
          title={highestPressureCell ? `${highestPressureCell.rowLabel} • ${highestPressureCell.colLabel}` : "No pressure lane yet"}
          body={
            highestPressureCell
              ? `${formatWholePercent(highestPressureCell.highPressureShare)} high-pressure share with ELI ${highestPressureCell.avgEstimatedLeverage.toFixed(1)}.`
              : "No high-pressure review lane has separated yet."
          }
          tone="warning"
          teamColor={teamColor}
        />
      </div>

      <div
        className="rounded-[1.75rem] border border-gray-100 bg-[var(--surface-infield)] p-5"
        onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}
      >
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Scenario Board</p>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-[var(--ink-2)]">{deploymentRead}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LegendChip label="Bubble size = review volume" />
            <LegendChip label="Glow = leverage" />
            <LegendChip label={`Tone = ${primaryMetricLabel.toLowerCase()}`} />
          </div>
        </div>

        <div className="overflow-x-auto pb-1">
          <div
            className="grid min-w-[860px] gap-4"
            style={{ gridTemplateColumns: `180px repeat(${colLabels.length}, minmax(140px, 1fr))` }}
          >
            <div />
            {colLabels.map((label) => (
              <div key={label} className="px-2 text-center text-[10px] font-black uppercase tracking-[0.16em] text-[var(--ink-3)]">
                {label}
              </div>
            ))}

            {rows.map((row) => (
              <Fragment key={row.label}>
                <div className="rounded-[1.5rem] border border-gray-100 bg-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{row.label}</p>
                  <p className="mt-2 text-2xl font-display text-[var(--ink-0)]">{row.totalChallenges}</p>
                  <p className="mt-1 text-[11px] text-[var(--ink-3)]">tracked reviews</p>
                  <div className="mt-4 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(row.totalChallenges > 0 ? 10 : 0, (row.totalChallenges / maxRowChallenges) * 100)}%`,
                        backgroundColor: "color-mix(in srgb, var(--team-primary, #2563eb) 55%, white)",
                      }}
                    />
                  </div>
                  <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                    Avg ELI {row.averageLeverage.toFixed(1)}
                  </p>
                </div>

                {row.cells.map((cell) => {
                  const key = toCellKey(cell.rowLabel, cell.colLabel);
                  const active = hoveredKey === key;
                  const size = scaleRange(cell.challenges, 0, maxChallenges, 30, 88);
                  const tone = getCellTone(cell, usesWinValue, viewMode, teamColor);
                  const leverageStrength = maxLeverage > 0 ? Math.min(1, cell.avgEstimatedLeverage / maxLeverage) : 0;

                  return (
                    <button
                      key={key}
                      type="button"
                      onMouseEnter={() => setHoveredKey(key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      onFocus={() => setHoveredKey(key)}
                      onBlur={() => setHoveredKey(null)}
                      className={`rounded-[1.5rem] border p-4 text-left transition ${
                        active
                          ? "border-blue-200 bg-white shadow-lg"
                          : "border-gray-100 bg-white/90 hover:border-blue-100 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${
                            cell.challenges > 0 ? "bg-gray-100 text-gray-600" : "bg-gray-50 text-gray-400"
                          }`}
                        >
                          {cell.challenges > 0 ? `${formatWholePercent(cell.overturnRate)} overturned` : "No sample"}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                          ELI {cell.avgEstimatedLeverage.toFixed(1)}
                        </span>
                      </div>

                      <div className="flex min-h-[102px] items-center justify-center">
                        <div
                          className="flex items-center justify-center rounded-full border-2 font-display text-gray-900 transition-transform"
                          style={{
                            width: size,
                            height: size,
                            background:
                              cell.challenges > 0
                                ? `color-mix(in srgb, ${tone.color} ${Math.max(18, Math.round(18 + leverageStrength * 36))}%, white)`
                                : "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(241,245,249,0.9) 100%)",
                            borderColor: cell.challenges > 0 ? tone.color : "#dbe4ee",
                            boxShadow:
                              active && cell.challenges > 0
                                ? `0 16px 38px -22px ${tone.color}`
                                : cell.challenges > 0
                                  ? `0 10px 24px -22px ${tone.color}`
                                  : "none",
                            transform: active ? "scale(1.04)" : "scale(1)",
                          }}
                        >
                          <span className={cell.challenges > 0 ? "text-3xl leading-none" : "text-xs font-sans font-semibold uppercase tracking-[0.16em] text-gray-400"}>
                            {cell.challenges > 0 ? cell.challenges : "idle"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-1">
                        <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                          <span>{primaryMetricLabel}</span>
                          <span style={{ color: tone.color }}>{formatCellPrimaryMetric(cell, usesWinValue, viewMode)}</span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(cell.highPressureShare > 0 ? 8 : 0, cell.highPressureShare * 100)}%`,
                              backgroundColor: tone.color,
                            }}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--ink-3)]">
                          <span>{formatWholePercent(cell.highPressureShare)} pressure</span>
                          <span>{cell.overturned}/{cell.challenges || 0} overturned</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.16em] text-gray-400">
        {viewMode === "org"
          ? usesWinValue
            ? "Each review window shows volume, leverage, and trusted WE direction. Bigger circles mean more usage; warmer warning tones flag softer deployment."
            : "Each review window shows volume, leverage, and RE direction until WE confidence improves. Bigger circles mean more usage."
          : "This map emphasizes where the team actually spends reviews. Bigger circles mean more volume, stronger glow means more leverage, and the bottom ribbon shows how often the window turns high pressure."}
      </p>

      <AnimatePresence>
        {hoveredCell ? (
          <ChartTooltip
            usePortal
            portalProps={mousePos}
            title={`${hoveredCell.rowLabel} • ${hoveredCell.colLabel}`}
            value={hoveredCell.challenges}
            subValueLabel="Challenges"
            extra={[
              { label: "Overturned", value: hoveredCell.overturned },
              { label: "Overturn Rate", value: formatPercent(hoveredCell.overturnRate) },
              { label: "Avg ELI", value: hoveredCell.avgEstimatedLeverage.toFixed(1) },
              { label: primaryMetricLabel, value: formatCellPrimaryMetric(hoveredCell, usesWinValue, viewMode) },
              { label: "High Pressure", value: formatWholePercent(hoveredCell.highPressureShare) },
            ]}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function SpotlightCard({
  eyebrow,
  title,
  body,
  tone,
  teamColor,
}: {
  eyebrow: string;
  title: string;
  body: string;
  tone: "positive" | "neutral" | "warning";
  teamColor: string;
}) {
  const accent = tone === "positive" ? teamColor : tone === "warning" ? "#d97706" : "#64748b";

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{eyebrow}</p>
      <p className="mt-2 text-lg font-display leading-tight text-gray-900" style={{ color: accent }}>
        {title}
      </p>
      <p className="mt-3 text-[11px] font-medium leading-relaxed text-gray-600">{body}</p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-display text-gray-900">{value}</p>
    </div>
  );
}

function LegendChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">
      {label}
    </span>
  );
}

function toCellKey(rowLabel: string, colLabel: string) {
  return `${rowLabel}:${colLabel}`;
}

function buildEmptyCell(rowLabel: string, colLabel: string): TeamChallengeScenarioCell {
  return {
    rowKey: "",
    rowLabel,
    colKey: "",
    colLabel,
    challenges: 0,
    overturned: 0,
    overturnRate: 0,
    avgEstimatedLeverage: 0,
    avgPositiveOutcomeDelta: null,
    avgRunExpectancyDelta: null,
    avgWinExpectancyDelta: null,
    highPressureShare: 0,
  };
}

function getCellPrimaryMetric(
  cell: TeamChallengeScenarioCell,
  usesWinValue: boolean,
  viewMode: "fan" | "org",
) {
  if (usesWinValue) return cell.avgWinExpectancyDelta;
  if (viewMode === "org") return cell.avgRunExpectancyDelta;
  return cell.avgPositiveOutcomeDelta;
}

function formatCellPrimaryMetric(
  cell: TeamChallengeScenarioCell,
  usesWinValue: boolean,
  viewMode: "fan" | "org",
) {
  const metric = getCellPrimaryMetric(cell, usesWinValue, viewMode);
  if (metric === null) return "N/A";
  if (usesWinValue) return `${metric >= 0 ? "+" : ""}${(metric * 100).toFixed(2)}%`;
  if (viewMode === "org") return `${metric >= 0 ? "+" : ""}${metric.toFixed(3)}`;
  return `${metric >= 0 ? "+" : ""}${(metric * 100).toFixed(1)} pts`;
}

function formatPrimarySummaryValue(
  value: number | null,
  usesWinValue: boolean,
  viewMode: "fan" | "org",
) {
  if (value === null) return "N/A";
  if (usesWinValue) return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
  if (viewMode === "org") return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(1)}`;
}

function getCellTone(
  cell: TeamChallengeScenarioCell,
  usesWinValue: boolean,
  viewMode: "fan" | "org",
  teamColor: string,
) {
  const metric = getCellPrimaryMetric(cell, usesWinValue, viewMode);

  if (cell.challenges === 0 || metric === null) {
    return { color: "#94a3b8" };
  }

  if (metric < 0) {
    return { color: "#d97706" };
  }

  return { color: viewMode === "org" ? "#2563eb" : teamColor };
}

function scaleRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number) {
  if (value <= 0 || inMax <= inMin) return outMin;
  const ratio = (value - inMin) / (inMax - inMin);
  return outMin + ratio * (outMax - outMin);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatWholePercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

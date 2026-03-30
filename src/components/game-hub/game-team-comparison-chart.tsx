"use client";

import type { GameTeamChallengeComparison } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import { resolveMatchupAccentColors } from "@/lib/team-branding";

type MetricConfig = {
  key: string;
  label: string;
  format: "count" | "percent" | "run" | "win" | "number" | "swing";
  homeValue: number | null;
  awayValue: number | null;
  note?: string;
};

type GameTeamComparisonChartProps = {
  comparison: GameTeamChallengeComparison;
  state: "live" | "final";
  viewMode: ViewMode;
};

export function GameTeamComparisonChart({
  comparison,
  state,
  viewMode,
}: GameTeamComparisonChartProps) {
  const homeLabel = comparison.home.abbreviation ?? "HOME";
  const awayLabel = comparison.away.abbreviation ?? "AWAY";
  const { homeColor, awayColor } = resolveMatchupAccentColors({
    homeTeamId: comparison.home.teamId,
    awayTeamId: comparison.away.teamId,
    homePrimaryColor: comparison.home.primaryColor,
    awayPrimaryColor: comparison.away.primaryColor,
  });
  const metrics = getMetrics(comparison, state, viewMode);

  return (
    <section className="panel border border-gray-50 bg-white p-6 shadow-2xl shadow-black/[0.02]">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">
            {getEyebrow(state, viewMode)}
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Team vs Team <span className="text-gray-400">{getTitleAccent(state, viewMode)}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <Legend color={homeColor} label={homeLabel} />
          <Legend color={awayColor} label={awayLabel} />
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((metric) => (
          <MetricAxisRow
            key={metric.key}
            metric={metric}
            homeLabel={homeLabel}
            awayLabel={awayLabel}
            homeColor={homeColor}
            awayColor={awayColor}
          />
        ))}
      </div>
    </section>
  );
}

function MetricAxisRow({
  metric,
  homeLabel,
  awayLabel,
  homeColor,
  awayColor,
}: {
  metric: MetricConfig;
  homeLabel: string;
  awayLabel: string;
  homeColor: string;
  awayColor: string;
}) {
  const rawValues = [metric.homeValue, metric.awayValue].filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  const hasMixedConfidence =
    (metric.homeValue === null && metric.awayValue !== null) ||
    (metric.homeValue !== null && metric.awayValue === null);
  if (!rawValues.length) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{metric.label}</p>
            {metric.note ? <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-500">{metric.note}</p> : null}
          </div>
          <span className="rounded-full border border-dashed border-gray-200 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
            No trusted sample yet
          </span>
        </div>
      </div>
    );
  }
  const minValue = rawValues.length ? Math.min(...rawValues, 0) : 0;
  const maxValue = rawValues.length ? Math.max(...rawValues, 0) : 0;
  const safeMax = maxValue === minValue ? maxValue + 1 : maxValue;
  const zeroPosition = `${normalizePosition(0, minValue, safeMax)}%`;

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{metric.label}</p>
          {metric.note ? <p className="mt-1 text-[11px] font-medium leading-relaxed text-gray-500">{metric.note}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-semibold text-gray-600">
          {hasMixedConfidence ? (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-700">
              Mixed Confidence
            </span>
          ) : null}
          <ValuePill label={homeLabel} value={formatMetric(metric.homeValue, metric.format)} color={homeColor} />
          <ValuePill label={awayLabel} value={formatMetric(metric.awayValue, metric.format)} color={awayColor} />
        </div>
      </div>
      {hasMixedConfidence ? (
        <p className="mt-2 text-[11px] font-medium leading-relaxed text-amber-700">
          One club has a trusted modeled read here while the other side is still below confidence threshold, so compare the available value carefully.
        </p>
      ) : null}

      <div className="relative mt-4 h-12">
        <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-gray-200" />
        {minValue < 0 && maxValue > 0 ? (
          <div className="absolute top-0 h-full w-px border-l border-dashed border-gray-300" style={{ left: zeroPosition }} />
        ) : null}
        <Marker
          color={homeColor}
          position={`${normalizePosition(metric.homeValue ?? 0, minValue, safeMax)}%`}
          align="top"
          label={formatMetric(metric.homeValue, metric.format)}
        />
        <Marker
          color={awayColor}
          position={`${normalizePosition(metric.awayValue ?? 0, minValue, safeMax)}%`}
          align="bottom"
          label={formatMetric(metric.awayValue, metric.format)}
        />
      </div>
    </div>
  );
}

function Marker({
  color,
  position,
  align,
  label,
}: {
  color: string;
  position: string;
  align: "top" | "bottom";
  label: string;
}) {
  const verticalClass = align === "top" ? "top-1/2 -translate-y-[140%]" : "top-1/2 translate-y-[40%]";
  return (
    <div className="absolute top-1/2 -translate-x-1/2" style={{ left: position }}>
      <div className={`absolute left-1/2 -translate-x-1/2 rounded-full px-2 py-1 text-[9px] font-black tracking-wide text-white shadow ${verticalClass}`} style={{ backgroundColor: color }}>
        {label}
      </div>
      <div
        className="h-4 w-4 rounded-full border-2 border-white shadow"
        style={{ backgroundColor: color }}
      />
    </div>
  );
}

function ValuePill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</span>
      <span className="font-display text-sm text-gray-900">{value}</span>
    </span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  );
}

function normalizePosition(value: number, minValue: number, maxValue: number) {
  if (!Number.isFinite(value)) return 50;
  if (maxValue === minValue) return 50;
  return Math.max(0, Math.min(100, ((value - minValue) / (maxValue - minValue)) * 100));
}

function formatMetric(value: number | null, format: MetricConfig["format"]) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "N/A";
  switch (format) {
    case "count":
      return `${Math.round(value)}`;
    case "percent":
      return `${Math.round(value * 100)}%`;
    case "run":
      return `${value >= 0 ? "+" : ""}${value.toFixed(3)}`;
    case "win":
      return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
    case "swing":
      return `${value >= 0 ? "+" : ""}${value.toFixed(0)} ECS`;
    case "number":
    default:
      return value.toFixed(1);
  }
}

function getMetrics(
  comparison: GameTeamChallengeComparison,
  state: "live" | "final",
  viewMode: ViewMode,
): MetricConfig[] {
  const home = comparison.home;
  const away = comparison.away;

  if (viewMode === "fan") {
    return state === "live"
      ? [
          {
            key: "reviews",
            label: "Reviews Used",
            format: "count",
            homeValue: home.totalChallenges,
            awayValue: away.totalChallenges,
            note: "How aggressively each club has entered the ABS game so far.",
          },
          {
            key: "overturn",
            label: "Overturn Rate",
            format: "percent",
            homeValue: home.overturnRate,
            awayValue: away.overturnRate,
            note: "Who has turned reviews into wins more often tonight.",
          },
          {
            key: "leverage",
            label: "Average Leverage",
            format: "number",
            homeValue: home.averageLeverage,
            awayValue: away.averageLeverage,
            note: "Whether those reviews have come in louder spots or quieter ones.",
          },
        ]
      : [
          {
            key: "reviews",
            label: "Total Reviews",
            format: "count",
            homeValue: home.totalChallenges,
            awayValue: away.totalChallenges,
            note: "Raw challenge volume from the completed game.",
          },
          {
            key: "overturn",
            label: "Overturn Rate",
            format: "percent",
            homeValue: home.overturnRate,
            awayValue: away.overturnRate,
            note: "Which club actually won more of its review bets.",
          },
          {
            key: "late-close",
            label: "Late / Close Share",
            format: "percent",
            homeValue: home.lateCloseShare,
            awayValue: away.lateCloseShare,
            note: "How much of each team’s review activity came in the game’s tightest windows.",
          },
        ];
  }

  if (comparison.valueMode === "win") {
    return [
      {
        key: "expected-ev",
        label: "Expected EV",
        format: "win",
        homeValue: home.expectedValueSum,
        awayValue: away.expectedValueSum,
        note: "Modeled review value available to each club in the spots it actually entered.",
      },
      {
        key: "actual-we",
        label: "Actual WE",
        format: "win",
        homeValue: home.totalWinValue,
        awayValue: away.totalWinValue,
        note: "Realized win value captured through completed review outcomes.",
      },
      {
        key: "overturn",
        label: "Overturn Rate",
        format: "percent",
        homeValue: home.overturnRate,
        awayValue: away.overturnRate,
        note: "Outcome efficiency once the teams chose to review.",
      },
    ];
  }

  if (comparison.valueMode === "run") {
    return [
      {
        key: "actual-re",
        label: "Actual RE",
        format: "run",
        homeValue: home.totalRunValue,
        awayValue: away.totalRunValue,
        note: "Run expectancy captured through completed reviews.",
      },
      {
        key: "leverage",
        label: "Average ELI",
        format: "number",
        homeValue: home.averageLeverage,
        awayValue: away.averageLeverage,
        note: "How strategically loud each team’s review portfolio was.",
      },
      {
        key: "overturn",
        label: "Overturn Rate",
        format: "percent",
        homeValue: home.overturnRate,
        awayValue: away.overturnRate,
        note: "Outcome efficiency once the review was used.",
      },
    ];
  }

  return [
    {
      key: "expected-ev",
      label: "Expected EV",
      format: "win",
      homeValue: home.expectedValueSum,
      awayValue: away.expectedValueSum,
      note: "Modeled review value in the spots each team actually entered.",
    },
    {
      key: "swing",
      label: "Challenge Swing",
      format: "swing",
      homeValue: home.totalEstimatedSwing,
      awayValue: away.totalEstimatedSwing,
      note: "Fallback challenge impact when full WE / RE confidence is not available.",
    },
    {
      key: "leverage",
      label: "Average ELI",
      format: "number",
      homeValue: home.averageLeverage,
      awayValue: away.averageLeverage,
      note: "How aggressive each team’s review timing has been.",
    },
  ];
}

function getEyebrow(state: "live" | "final", viewMode: ViewMode) {
  if (state === "live") return viewMode === "org" ? "Live Ops Comparison" : "Live Matchup Lens";
  return viewMode === "org" ? "Postgame Value Audit" : "Postgame Matchup Lens";
}

function getTitleAccent(state: "live" | "final", viewMode: ViewMode) {
  if (state === "live") return viewMode === "org" ? "Decision Split" : "Challenge Split";
  return viewMode === "org" ? "Value Recap" : "Outcome Recap";
}

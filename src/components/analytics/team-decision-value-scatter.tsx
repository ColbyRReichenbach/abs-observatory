"use client";

import { useMemo, useState } from "react";

import { AIInsightBubble } from "@/components/analytics/ai-insight-bubble";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { buildTeamDecisionScatterChartPayload } from "@/lib/chart-insight-payload";
import type { TeamDecisionBreakdownSection, TeamDecisionValueReport } from "@/lib/types";

type ScatterPoint = {
  key: string;
  label: string;
  sectionKey: TeamDecisionBreakdownSection["key"];
  sectionTitle: string;
  challenges: number;
  expected: number | null;
  realized: number | null;
  surplus: number | null;
};

const SECTION_COLORS: Record<TeamDecisionBreakdownSection["key"], string> = {
  inning_phase: "#2563eb",
  count_state: "#dc2626",
  base_out_state: "#7c3aed",
};

export function TeamDecisionValueScatter({
  report,
  showInsight = true,
}: {
  report: TeamDecisionValueReport;
  showInsight?: boolean;
}) {
  const points = useMemo(() => buildPoints(report), [report]);
  const chartContext = useMemo(() => buildTeamDecisionScatterChartPayload(report), [report]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hovered = points.find((point) => point.key === hoveredKey) ?? null;
  const domain = useMemo(() => buildDomain(points), [points]);

  return (
    <section className="mt-8">
      <div className="panel border border-gray-50 p-5 shadow-2xl shadow-black/[0.02] sm:p-8">
        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Decision Process</h4>
            <p className="text-2xl font-display leading-none text-gray-900">
              Expected vs <span className="text-gray-400">Realized Value</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <p className="max-w-xl text-sm leading-6 text-[var(--ink-2)]">
              This is the core org question: is the club making good review decisions and getting the right returns, or surviving on noisy outcomes?
            </p>
            {showInsight ? (
              <AIInsightBubble
                insight="Explain how the quadrants separate process from outcome and which scenario buckets are actually helping or hurting the club."
                insightId="team-decision-value-scatter"
                metadata={{ surface: "team_decision_value_scatter" }}
                chartContext={chartContext}
                spotlightTitle="Expected vs Realized Challenge Value"
                spotlight={<TeamDecisionValueScatter report={report} showInsight={false} />}
              />
            ) : null}
          </div>
        </div>

        <div
          className="relative h-[430px] rounded-[1.75rem] border border-gray-100 bg-[var(--surface-infield)] sm:h-[360px]"
          onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}
          onMouseLeave={() => setHoveredKey(null)}
        >
          <div className="absolute bottom-16 left-10 right-4 top-16 sm:inset-x-8 sm:top-8 sm:bottom-12">
            <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gray-200" />
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-gray-200" />
            <div className="absolute -top-10 left-0 max-w-[11ch] text-[8px] font-black uppercase leading-4 tracking-[0.12em] text-emerald-600 sm:top-1 sm:max-w-none sm:text-[10px] sm:tracking-[0.14em]">Better outcomes</div>
            <div className="absolute -top-10 right-0 max-w-[10ch] text-right text-[8px] font-black uppercase leading-4 tracking-[0.12em] text-emerald-600 sm:top-1 sm:max-w-none sm:text-[10px] sm:tracking-[0.14em]">Good process</div>
            <div className="absolute bottom-3 left-0 max-w-[10ch] text-[8px] font-black uppercase leading-4 tracking-[0.12em] text-amber-600 sm:bottom-1 sm:max-w-none sm:text-[10px] sm:tracking-[0.14em]">Bad process</div>
            <div className="absolute bottom-3 right-0 max-w-[11ch] text-right text-[8px] font-black uppercase leading-4 tracking-[0.12em] text-amber-600 sm:bottom-1 sm:max-w-none sm:text-[10px] sm:tracking-[0.14em]">Leaking value</div>

            {points.map((point) => {
              const x = scale(point.expected ?? 0, domain.min, domain.max, 6, 94);
              const y = scale(point.realized ?? 0, domain.min, domain.max, 94, 6);
              const size = Math.max(14, Math.min(34, 10 + point.challenges * 2.4));
              const active = point.key === hoveredKey;
              return (
                <button
                  key={point.key}
                  type="button"
                  onMouseEnter={() => setHoveredKey(point.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  onFocus={() => setHoveredKey(point.key)}
                  onBlur={() => setHoveredKey(null)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: size,
                    height: size,
                    backgroundColor: `${SECTION_COLORS[point.sectionKey]}26`,
                    borderColor: active ? SECTION_COLORS[point.sectionKey] : "#d7deea",
                    boxShadow: active ? `0 10px 24px -12px ${SECTION_COLORS[point.sectionKey]}90` : "none",
                  }}
                >
                  <span className="sr-only">{point.label}</span>
                </button>
              );
            })}
          </div>
          <div className="absolute bottom-4 left-14 right-4 text-center text-[9px] font-black uppercase leading-4 tracking-[0.12em] text-[var(--ink-3)] sm:bottom-3 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 sm:text-[10px] sm:tracking-[0.14em]">
            Expected WE / WPA value
          </div>
          <div className="absolute left-2 top-1/2 max-w-[220px] -translate-y-1/2 -rotate-90 text-[9px] font-black uppercase leading-4 tracking-[0.12em] text-[var(--ink-3)] sm:text-[10px] sm:tracking-[0.14em]">
            Realized WE / WPA value
          </div>

          {hovered ? (
            <ChartTooltip
              usePortal
              portalProps={mousePos}
              title={`${hovered.sectionTitle} · ${hovered.label}`}
              value={formatValue(hovered.realized)}
              subValueLabel="Realized WE"
              extra={[
                { label: "Expected WE", value: formatValue(hovered.expected), mono: false },
                { label: "Review Surplus", value: formatValue(hovered.surplus), mono: false },
                { label: "Sample", value: hovered.challenges, mono: false },
              ]}
            />
          ) : null}
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-gray-100 bg-white p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Section Legend</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {report.breakdownSections.map((section) => (
              <span
                key={section.key}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-gray-600"
              >
                <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: SECTION_COLORS[section.key] }} />
                {section.title}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function buildPoints(report: TeamDecisionValueReport) {
  return report.breakdownSections.flatMap((section) =>
    section.entries.map((entry) => ({
      key: `${section.key}:${entry.label}`,
      label: entry.label,
      sectionKey: section.key,
      sectionTitle: section.title,
      challenges: entry.challenges,
      expected: entry.averageExpectedChallengeValue,
      realized: entry.averageRealizedChallengeValue,
      surplus: entry.decisionSurplus,
    })),
  );
}

function buildDomain(points: ScatterPoint[]) {
  const values = points
    .flatMap((point) => [point.expected, point.realized])
    .filter((value): value is number => typeof value === "number");
  const maxAbs = values.length > 0 ? Math.max(...values.map((value) => Math.abs(value)), 0.01) : 0.01;
  return { min: -maxAbs, max: maxAbs };
}

function scale(value: number, min: number, max: number, outMin: number, outMax: number) {
  if (max <= min) return (outMin + outMax) / 2;
  const ratio = (value - min) / (max - min);
  return outMin + ratio * (outMax - outMin);
}

function formatValue(value: number | null) {
  return value === null ? "N/A" : `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

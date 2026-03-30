"use client";

import { useMemo, useState } from "react";

import { AIInsightBubble } from "@/components/analytics/ai-insight-bubble";
import { ChartTooltip } from "@/components/ui/chart-tooltip";
import { buildTeamInventoryDeploymentChartPayload } from "@/lib/chart-insight-payload";
import type { TeamDecisionValueReport } from "@/lib/types";

type PhaseBucket = {
  label: string;
  challenges: number;
  usageShare: number;
  expectedShare: number;
  realizedShare: number;
  executionGap: number;
};

const ORDER = [
  { label: "Early", aliases: ["Early", "Early (1-3)"] },
  { label: "Middle", aliases: ["Middle", "Middle (4-6)"] },
  { label: "Late", aliases: ["Late", "Late (7-9)"] },
  { label: "Extras", aliases: ["Extras"] },
];

export function TeamInventoryDeploymentChart({
  report,
  showInsight = true,
}: {
  report: TeamDecisionValueReport;
  showInsight?: boolean;
}) {
  const buckets = useMemo(() => buildBuckets(report), [report]);
  const chartContext = useMemo(() => buildTeamInventoryDeploymentChartPayload(report), [report]);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hovered = buckets.find((bucket) => bucket.label === hoveredLabel) ?? null;

  return (
    <section className="mt-8">
      <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50">
        <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Inventory Deployment</h4>
            <p className="text-2xl font-display leading-none text-gray-900">
              Usage vs <span className="text-gray-400">Modeled Value Share</span>
            </p>
          </div>
          <div className="flex items-start gap-3">
            <p className="max-w-xl text-sm leading-6 text-[var(--ink-2)]">
              This shows whether the club is actually spending challenges where expected and realized WE value live, rather than just where volume happened to accumulate.
            </p>
            {showInsight ? (
              <AIInsightBubble
                insight="Explain whether this club is deploying challenges in the innings where modeled value actually lives."
                insightId="team-inventory-deployment"
                metadata={{ surface: "team_inventory_deployment" }}
                chartContext={chartContext}
                spotlightTitle="Usage vs Modeled Value Share"
                spotlight={<TeamInventoryDeploymentChart report={report} showInsight={false} />}
              />
            ) : null}
          </div>
        </div>

        <div className="relative rounded-[1.75rem] border border-gray-100 bg-[var(--surface-infield)] p-5" onMouseMove={(event) => setMousePos({ x: event.clientX, y: event.clientY })}>
          <div className="mb-4 grid grid-cols-[96px_repeat(4,minmax(0,1fr))] gap-3">
            <div />
            {buckets.map((bucket) => (
              <div key={`${bucket.label}-head`} className="text-center text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                {bucket.label}
              </div>
            ))}
          </div>

          {buckets.map((bucket) => (
            <button
              key={bucket.label}
              type="button"
              onMouseEnter={() => setHoveredLabel(bucket.label)}
              onMouseLeave={() => setHoveredLabel(null)}
              onFocus={() => setHoveredLabel(bucket.label)}
              onBlur={() => setHoveredLabel(null)}
              className={`mb-3 grid w-full grid-cols-[96px_repeat(4,minmax(0,1fr))] gap-3 rounded-[1.5rem] border p-4 text-left transition last:mb-0 ${
                hoveredLabel === bucket.label ? "border-blue-300 bg-white shadow-md" : "border-gray-100 bg-white hover:border-blue-200"
              }`}
            >
              <div className="flex items-center">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink-0)]">{bucket.label}</p>
                  <p className="mt-1 text-[11px] text-[var(--ink-3)]">{bucket.challenges} reviews</p>
                </div>
              </div>
              <ValueBar label="Usage" value={bucket.usageShare} color="#94a3b8" />
              <ValueBar label="Expected Value" value={bucket.expectedShare} color="#2563eb" signed />
              <ValueBar label="Realized Value" value={bucket.realizedShare} color="#059669" signed />
              <ValueBar label="Exec Gap" value={bucket.executionGap} color="#7c3aed" signed />
            </button>
          ))}

          {hovered ? (
            <ChartTooltip
              usePortal
              portalProps={mousePos}
              title={hovered.label}
              value={`${Math.round(hovered.usageShare * 100)}%`}
              subValueLabel="Usage Share"
              extra={[
                { label: "Expected Value Share", value: formatSignedShare(hovered.expectedShare), mono: false },
                { label: "Realized Value Share", value: formatSignedShare(hovered.realizedShare), mono: false },
                { label: "Execution Gap", value: formatSignedShare(hovered.executionGap), mono: false },
                { label: "Challenges", value: hovered.challenges, mono: false },
              ]}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function buildBuckets(report: TeamDecisionValueReport) {
  const section = report.breakdownSections.find((entry) => entry.key === "inning_phase");
  const orderedEntries = ORDER.map(({ aliases }) => section?.entries.find((entry) => aliases.includes(entry.label)) ?? null);
  const entries = orderedEntries.filter(Boolean);
  const totalChallenges = entries.reduce((sum, entry) => sum + (entry?.challenges ?? 0), 0);
  const totalAbsExpected = entries.reduce(
    (sum, entry) => sum + Math.abs((entry?.averageExpectedChallengeValue ?? 0) * (entry?.challenges ?? 0)),
    0,
  );
  const totalAbsRealized = entries.reduce(
    (sum, entry) => sum + Math.abs((entry?.averageRealizedChallengeValue ?? 0) * (entry?.challenges ?? 0)),
    0,
  );

  return ORDER.map(({ label, aliases }) => {
    const entry = section?.entries.find((item) => aliases.includes(item.label)) ?? null;
    const weightedExpected = (entry?.averageExpectedChallengeValue ?? 0) * (entry?.challenges ?? 0);
    const weightedRealized = (entry?.averageRealizedChallengeValue ?? 0) * (entry?.challenges ?? 0);
    const expectedShare = totalAbsExpected > 0 ? weightedExpected / totalAbsExpected : 0;
    const realizedShare = totalAbsRealized > 0 ? weightedRealized / totalAbsRealized : 0;
    return {
      label,
      challenges: entry?.challenges ?? 0,
      usageShare: totalChallenges > 0 ? (entry?.challenges ?? 0) / totalChallenges : 0,
      expectedShare,
      realizedShare,
      executionGap: realizedShare - expectedShare,
    };
  });
}

function ValueBar({
  label,
  value,
  color,
  signed = false,
}: {
  label: string;
  value: number;
  color: string;
  signed?: boolean;
}) {
  if (!signed) {
    return (
      <div className="flex flex-col justify-center">
        <div className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</div>
        <div className="h-3 rounded-full bg-gray-100">
          <div className="h-full rounded-full" style={{ width: `${Math.max(4, value * 100)}%`, backgroundColor: color }} />
        </div>
      </div>
    );
  }

  const magnitude = Math.min(50, Math.abs(value) * 100);
  return (
    <div className="flex flex-col justify-center">
      <div className="mb-2 text-[9px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">{label}</div>
      <div className="relative h-3 rounded-full bg-gray-100">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gray-200" />
        <div
          className="absolute top-0 h-full rounded-full"
          style={{
            left: value >= 0 ? "50%" : `calc(50% - ${magnitude}%)`,
            width: `${Math.max(3, magnitude)}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function formatSignedShare(value: number) {
  return `${value >= 0 ? "+" : ""}${Math.round(value * 100)}%`;
}

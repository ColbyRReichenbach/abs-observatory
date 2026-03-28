"use client";

import { useMemo } from "react";

import { formatHalfInningLabel } from "@/lib/challenge-context";
import { formatLeverageBucketLabel, summarizeEstimatedLeverage } from "@/lib/estimated-leverage";
import type { ChallengeEvent } from "@/lib/types";

export function WPASwapWaterfall({ challenges }: { challenges: ChallengeEvent[] }) {
  const data = useMemo(
    () =>
      [...challenges]
        .sort((a, b) =>
          a.challengedAt && b.challengedAt
            ? new Date(a.challengedAt).getTime() - new Date(b.challengedAt).getTime()
            : 0,
        )
        .map((challenge) => ({
          leverage: summarizeEstimatedLeverage(challenge),
          id: challenge.challengeId,
          inning: `${formatHalfInningLabel(challenge.halfInning, "short")}${challenge.inning ?? "-"}`,
          team: challenge.challengeTeamName ?? "Unknown",
          description: challenge.calledDescription || "Pitch challenge",
          outcome: challenge.isOverturned ? "Overturned" : "Confirmed",
          countChange: formatCountChange(challenge),
          impactLabel: describeImpactType(challenge.impactType),
          impactSummary:
            challenge.impactSummary ?? "No additional impact summary is available for this challenge.",
          toneClass: challenge.isOverturned
            ? "border-emerald-100 bg-emerald-50"
            : "border-gray-100 bg-gray-50",
          badgeClass: challenge.isOverturned ? "bg-emerald-500 text-white" : "bg-gray-900 text-white",
        })),
    [challenges],
  );

  if (!data.length) return null;

  return (
    <div className="mt-6 flex flex-col">
      <div className="mb-4 flex items-end justify-between px-2">
        <div>
          <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            Estimated Challenge Swing
          </h4>
          <p className="text-2xl font-display leading-none text-gray-900">
            Challenge <span className="text-gray-400">Pressure Timeline</span>
          </p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-emerald-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Overturned</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-gray-900" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Confirmed</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {data.map((entry) => (
          <article key={entry.id} className={`rounded-2xl border p-4 shadow-sm ${entry.toneClass}`}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {entry.inning} • {entry.team}
                </p>
                <h5 className="text-sm font-bold text-gray-900">{entry.description}</h5>
                <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  {formatLeverageBucketLabel(entry.leverage.leverageBucket)} • ELI {entry.leverage.estimatedLeverageIndex}
                </p>
              </div>
              <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${entry.badgeClass}`}>
                {entry.outcome} {entry.leverage.estimatedChallengeSwing >= 0 ? `+${entry.leverage.estimatedChallengeSwing}` : entry.leverage.estimatedChallengeSwing}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Estimated Leverage Index</p>
                <p className="mt-1 text-sm font-bold text-gray-900">{entry.leverage.estimatedLeverageIndex}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Estimated Challenge Swing</p>
                <p className="mt-1 text-sm font-bold text-gray-900">{entry.leverage.estimatedChallengeSwing}</p>
              </div>
              <div className="rounded-xl bg-white px-4 py-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Count / Impact</p>
                <p className="mt-1 text-sm font-medium text-gray-700">{entry.countChange} • {entry.impactLabel}</p>
                <p className="mt-1 text-xs text-gray-500">{entry.impactSummary}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function formatCountChange(challenge: ChallengeEvent) {
  const initial = challenge.umpireCount || (challenge.balls !== null && challenge.strikes !== null ? `${challenge.balls}-${challenge.strikes}` : null);
  const final = challenge.countAfter;

  if (initial && final) {
    return initial === final ? initial : `${initial} → ${final}`;
  }

  return initial || final || "Unavailable";
}

function describeImpactType(impactType: string | null | undefined) {
  switch (impactType) {
    case "direct_ending_impact":
      return "Plate appearance changed";
    case "direct_count_impact":
      return "Count changed";
    case "downstream_inferred_impact":
      return "Downstream outcome";
    default:
      return "Recorded challenge";
  }
}

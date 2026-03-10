"use client";

import { formatLeverageBucketLabel } from "@/lib/estimated-leverage";
import type { ChallengeValueTimelineEntry } from "@/lib/types";

export function ChallengeValueTimeline({ entries }: { entries: ChallengeValueTimelineEntry[] }) {
  if (!entries.length) return null;

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
                <MetricCard label="At-Bat" value={`${entry.batterName ?? "Batter"} vs ${entry.pitcherName ?? "Pitcher"}`} />
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

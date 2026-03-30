"use client";

import { useMemo, useState } from "react";

import type {
  UmpireCountHotspot,
  UmpireLeaderboardEntry,
  UmpireMatchupVulnerability,
  UmpirePitchTypeBreakdown,
  UmpireProfile,
} from "@/lib/types";

export function UmpireAnalystCallSheet({
  currentUmpire,
  overturnRate,
  highLeverageShare,
  profile,
  matchupVulnerabilities,
  pitchTypes,
}: {
  currentUmpire: UmpireLeaderboardEntry | null;
  overturnRate: number;
  highLeverageShare: number;
  profile: UmpireProfile;
  matchupVulnerabilities: UmpireMatchupVulnerability[];
  pitchTypes: UmpirePitchTypeBreakdown[];
}) {
  const [selectedMatchupKey, setSelectedMatchupKey] = useState<string>(
    matchupVulnerabilities.find((entry) => entry.challengedCount > 0)
      ? matchupKey(matchupVulnerabilities.find((entry) => entry.challengedCount > 0)!)
      : "R-R",
  );

  const selectedMatchup =
    matchupVulnerabilities.find((entry) => matchupKey(entry) === selectedMatchupKey) ?? matchupVulnerabilities[0] ?? null;
  const topZone = useMemo(
    () => [...profile.zoneBuckets].sort((left, right) => right.overturnRate - left.overturnRate)[0] ?? null,
    [profile.zoneBuckets],
  );
  const topCount = profile.countHotspots[0] ?? null;
  const dominantBias = profile.directionalBias.strikeToBall - profile.directionalBias.ballToStrike;
  const topPitchTypes = [...pitchTypes].sort((left, right) => right.challengedCount - left.challengedCount).slice(0, 5);

  return (
    <section className="mb-12">
      <div className="panel p-8">
        <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-blue-500">Operational Call Sheet</h4>
            <p className="text-2xl font-display leading-none text-gray-900">
              Review <span className="text-gray-400">Exposure Map</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Tag label={`${(overturnRate * 100).toFixed(1)}% OT`} />
            {currentUmpire ? <Tag label={`${currentUmpire.riskTier} risk`} /> : null}
            {currentUmpire ? <Tag label={`${currentUmpire.confidence} confidence`} /> : null}
          </div>
        </div>

        <div className="mb-6 rounded-[1.5rem] border border-gray-100 bg-gray-50/60 p-5">
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Baseball Read</p>
          <p className="mt-2 text-sm leading-7 text-[var(--ink-2)]">
            {buildUmpireRead({
              overturnRate,
              highLeverageShare,
              topCount,
              topZoneLabel: topZone?.zone ?? null,
              dominantBias,
              selectedMatchup,
            })}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Overturn Rate" value={`${(overturnRate * 100).toFixed(1)}%`} />
          <MetricCard label="High-Leverage Share" value={`${(highLeverageShare * 100).toFixed(0)}%`} />
          <MetricCard label="Top Count" value={topCount?.countKey ?? "N/A"} note={topCount ? `${topCount.challenges} challenges` : "No hotspot"} />
          <MetricCard label="Top Zone" value={formatZoneLabel(topZone?.zone ?? null)} note={topZone ? `${(topZone.overturnRate * 100).toFixed(1)}% overturn` : "No zone edge"} />
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.75rem] border border-gray-100 bg-[var(--surface-infield)] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Matchup Drilldown</p>
            <p className="mt-1 text-sm font-medium text-[var(--ink-2)]">
              Click the handedness bucket to see where review exposure is currently concentrating.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {matchupVulnerabilities.map((matchup) => {
                const key = matchupKey(matchup);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedMatchupKey(key)}
                    className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                      selectedMatchupKey === key
                        ? "border-blue-200 bg-white shadow-sm"
                        : "border-gray-100 bg-white/70 hover:border-blue-100 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[var(--ink-0)]">{formatMatchup(matchup)}</p>
                        <p className="mt-1 text-[11px] text-[var(--ink-3)]">{matchup.challengedCount} challenges</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-blue-700">
                        {(matchup.overturnRate * 100).toFixed(1)}%
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-[1.25rem] border border-gray-100 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Selected Matchup</p>
              {selectedMatchup ? (
                <>
                  <p className="mt-2 text-xl font-display text-[var(--ink-0)]">{formatMatchup(selectedMatchup)}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniMetric label="Challenges" value={`${selectedMatchup.challengedCount}`} />
                    <MiniMetric label="Overturn Rate" value={`${(selectedMatchup.overturnRate * 100).toFixed(1)}%`} />
                    <MiniMetric label="Top Zone" value={formatZoneLabel(selectedMatchup.topZone)} />
                  </div>
                  <p className="mt-4 text-sm leading-7 text-[var(--ink-2)]">
                    {selectedMatchup.challengedCount > 0
                      ? `Within this handedness bucket, the most exposed pitch family is ${selectedMatchup.topPitchTypeName ?? "unknown"}, and the hottest zone read is ${formatZoneLabel(
                          selectedMatchup.topZone,
                        ).toLowerCase()}.`
                      : "This matchup bucket has not built meaningful challenge sample yet."}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-[var(--ink-3)]">No matchup sample available.</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Pitch-Family Exposure</p>
            <div className="mt-4 space-y-3">
              {topPitchTypes.length > 0 ? (
                  topPitchTypes.slice(0, 3).map((pitch) => (
                    <div key={`${pitch.pitchTypeCode}-${pitch.pitchTypeName}`} className="rounded-[1rem] border border-gray-100 bg-[var(--surface-infield)] p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-[var(--ink-0)]">{pitch.pitchTypeName}</p>
                          <p className="mt-1 text-[11px] text-[var(--ink-3)]">{pitch.challengedCount} challenged pitches</p>
                        </div>
                        <span className="text-lg font-display text-[var(--ink-0)]">{(pitch.overturnRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-gray-100">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(10, pitch.overturnRate * 100)}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--ink-3)]">Pitch-family exposure will appear once pitch tagging is present in the sample.</p>
                )}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">Count Pressure Ledger</p>
              <div className="mt-4 space-y-3">
                {profile.countHotspots.length > 0 ? (
                  profile.countHotspots.slice(0, 4).map((hotspot) => <CountRow key={hotspot.countKey} hotspot={hotspot} />)
                ) : (
                  <p className="text-sm text-[var(--ink-3)]">No count hotspots have stabilized yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CountRow({ hotspot }: { hotspot: UmpireCountHotspot }) {
  return (
    <div className="rounded-[1rem] border border-gray-100 bg-[var(--surface-infield)] px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[var(--ink-0)]">{hotspot.countKey}</p>
          <p className="mt-1 text-[11px] text-[var(--ink-3)]">{hotspot.challenges} challenges</p>
        </div>
        <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">
          {(hotspot.overturnRate * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
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
    <div className="rounded-[1rem] border border-gray-100 bg-[var(--surface-infield)] px-3 py-3">
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

function matchupKey(matchup: Pick<UmpireMatchupVulnerability, "pitcherThrows" | "batterStand">) {
  return `${matchup.pitcherThrows}-${matchup.batterStand}`;
}

function formatMatchup(matchup: Pick<UmpireMatchupVulnerability, "pitcherThrows" | "batterStand">) {
  return `${matchup.pitcherThrows}HP vs ${matchup.batterStand}HH`;
}

function formatZoneLabel(zone: string | null) {
  if (!zone) return "N/A";
  switch (zone) {
    case "up":
      return "Upper Edge";
    case "down":
      return "Lower Edge";
    case "glove":
      return "Glove Side";
    case "arm":
      return "Arm Side";
    case "heart":
      return "Heart";
    case "edge":
      return "Edge";
    case "chase":
      return "Chase";
    default:
      return zone;
  }
}

function totalDirectional(profile: UmpireProfile) {
  return (
    profile.directionalBias.strikeToBall +
    profile.directionalBias.ballToStrike +
    profile.directionalBias.otherOverturns +
    profile.directionalBias.confirmed
  );
}

function formatBiasShare(value: number, total: number) {
  if (!total) return "No sample";
  return `${Math.round((value / total) * 100)}% share`;
}

function buildUmpireRead({
  overturnRate,
  highLeverageShare,
  topCount,
  topZoneLabel,
  dominantBias,
  selectedMatchup,
}: {
  overturnRate: number;
  highLeverageShare: number;
  topCount: UmpireCountHotspot | null;
  topZoneLabel: string | null;
  dominantBias: number;
  selectedMatchup: UmpireMatchupVulnerability | null;
}) {
  const biasRead =
    dominantBias > 0
      ? "strike-to-ball overturns leading the mix"
      : dominantBias < 0
        ? "ball-to-strike overturns leading the mix"
        : "a balanced overturn direction mix";
  return `This umpire is currently running a ${(overturnRate * 100).toFixed(1)}% overturn environment with ${(
    highLeverageShare * 100
  ).toFixed(0)}% of the sample arriving in high-leverage spots. The clearest pressure bucket shows up ${topCount ? `at ${topCount.countKey}` : "in the most active counts"}, ${
    topZoneLabel ? `with ${formatZoneLabel(topZoneLabel).toLowerCase()} as the hottest zone family` : "without one zone family clearly separating"
  }, with ${biasRead}, and ${selectedMatchup ? `${formatMatchup(selectedMatchup).toLowerCase()} as the current matchup bucket to monitor` : "handedness exposure still stabilizing"}.`;
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import { StrikeZonePlot } from "@/components/strike-zone-plot";
import { replayIntervalMs, stepReplayIndex, type ReplaySpeed } from "@/lib/replay";
import { applyExplorerFilters, resolveSelection } from "@/lib/strike-zone-explorer-state";
import type { ChallengeEvent } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import type { ZoneMode } from "@/lib/zone-mapping";
import { formatHalfInningLabel } from "@/lib/challenge-context";

import { InningIcon } from "@/components/inning-icon";
import { AtBatContextCard } from "@/components/game-hub/at-bat-context-card";

export function ChallengeExplorer({
  challenges,
  initialChallengeId = null,
  viewMode,
}: {
  challenges: ChallengeEvent[],
  initialChallengeId?: string | null,
  viewMode: ViewMode,
}) {
  const [pitchType, setPitchType] = useState<string>("all");
  const [batter, setBatter] = useState<string>("all");
  const [pitcher, setPitcher] = useState<string>("all");
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(
    initialChallengeId ?? challenges[0]?.challengeId ?? null
  );

  useEffect(() => {
    if (initialChallengeId) {
      const target = challenges.find(c => c.challengeId === initialChallengeId);
      if (target) {
        const resetTimer = window.setTimeout(() => {
          setSelectedChallengeId(initialChallengeId);
          setPitchType("all");
          setBatter("all");
          setPitcher("all");
        }, 0);

        const scrollTimer = window.setTimeout(() => {
          const el = document.getElementById("abs-explorer");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 300);

        return () => {
          window.clearTimeout(resetTimer);
          window.clearTimeout(scrollTimer);
        };
      }
    }
  }, [initialChallengeId, challenges]);
  const [hoveredChallengeId, setHoveredChallengeId] = useState<string | null>(null);
  const [zoneMode, setZoneMode] = useState<ZoneMode>("adjusted");
  const [showCountOverlay, setShowCountOverlay] = useState(false);
  const [showPitchOverlay, setShowPitchOverlay] = useState(false);
  const [replayEnabled, setReplayEnabled] = useState(false);
  const [replaySpeed, setReplaySpeed] = useState<ReplaySpeed>("1x");
  const reduceMotion = useReducedMotion();

  const pitchTypes = useMemo(
    () => ["all", ...Array.from(new Set(challenges.map((c) => c.pitchType).filter((v): v is string => Boolean(v))))],
    [challenges],
  );
  const batters = useMemo(
    () => ["all", ...Array.from(new Set(challenges.map((c) => c.batterName).filter((v): v is string => Boolean(v))))],
    [challenges],
  );
  const pitchers = useMemo(
    () => ["all", ...Array.from(new Set(challenges.map((c) => c.pitcherName).filter((v): v is string => Boolean(v))))],
    [challenges],
  );

  const filtered = useMemo(() => {
    return applyExplorerFilters(challenges, { pitchType, batter, pitcher });
  }, [challenges, pitchType, batter, pitcher]);

  const resolvedSelectionId = resolveSelection(selectedChallengeId, filtered);
  const selected = filtered.find((c) => c.challengeId === resolvedSelectionId) ?? null;
  const selectedIndex = filtered.findIndex((challenge) => challenge.challengeId === selected?.challengeId);
  const focusedChallengeId = hoveredChallengeId ?? selected?.challengeId ?? null;

  useEffect(() => {
    if (!replayEnabled || filtered.length <= 1 || selectedIndex < 0) return;
    const timer = setInterval(() => {
      const nextIndex = stepReplayIndex(selectedIndex, "next", filtered.length);
      const nextChallenge = filtered[nextIndex];
      if (!nextChallenge) {
        setReplayEnabled(false);
        return;
      }
      setSelectedChallengeId(nextChallenge.challengeId);
      if (nextIndex === filtered.length - 1) {
        setReplayEnabled(false);
      }
    }, replayIntervalMs(replaySpeed));
    return () => clearInterval(timer);
  }, [replayEnabled, replaySpeed, selectedIndex, filtered]);

  return (
    <section id="abs-explorer" className="panel overflow-hidden border-gray-100 bg-white shadow-2xl !rounded-r-none">
      {/* Toolbar */}
      <div className="border-b border-gray-100 px-6 py-5 bg-white/80 backdrop-blur-md">
        <div className="flex flex-wrap items-end gap-6">
          <Filter label="Pitch Type" value={pitchType} onChange={setPitchType} options={pitchTypes} />
          <Filter label="Batter" value={batter} onChange={setBatter} options={batters} />
          <Filter label="Pitcher" value={pitcher} onChange={setPitcher} options={pitchers} />

          {/* Zone mode toggle */}
          <fieldset className="flex items-center gap-1 rounded-full border border-gray-200 p-0.5 bg-white shadow-sm">
            <legend className="sr-only">Zone Mode</legend>
            <ModeButton active={zoneMode === "adjusted"} onClick={() => setZoneMode("adjusted")}>
              ABS Zone
            </ModeButton>
            <ModeButton active={zoneMode === "actual"} onClick={() => setZoneMode("actual")}>
              Fixed Zone
            </ModeButton>
          </fieldset>
        </div>

        {/* Controls row */}
        <div className="mt-5 flex flex-wrap items-center gap-6">
          {/* Overlays */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink-2)] cursor-pointer select-none transition-colors hover:text-[var(--ink-0)]">
              <input type="checkbox" checked={showCountOverlay} onChange={(e) => setShowCountOverlay(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-200 bg-white accent-blue-500" />
              Count Map
            </label>
            <label className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink-2)] cursor-pointer select-none transition-colors hover:text-[var(--ink-0)]">
              <input type="checkbox" checked={showPitchOverlay} onChange={(e) => setShowPitchOverlay(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-200 bg-white accent-blue-500" />
              Pitch Info
            </label>
          </div>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Replay controls */}
          <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1.5 shadow-sm">
            <ReplayButton
              onClick={() => {
                const previousIndex = stepReplayIndex(selectedIndex, "prev", filtered.length);
                const previous = filtered[previousIndex];
                if (previous) setSelectedChallengeId(previous.challengeId);
              }}
              label="Previous"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor"><path d="M6 2L2 5l4 3V2z" /></svg>
            </ReplayButton>
            <motion.button
              type="button"
              onClick={() => setReplayEnabled((prev) => !prev)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`rounded-full px-5 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${replayEnabled
                ? "bg-red-500 text-white shadow-red-500/20"
                : "bg-blue-500 text-white shadow-blue-500/20 hover:scale-105"
                }`}
            >
              {replayEnabled ? "Pause" : "Play Sequence"}
            </motion.button>
            <ReplayButton
              onClick={() => {
                const nextIndex = stepReplayIndex(selectedIndex, "next", filtered.length);
                const next = filtered[nextIndex];
                if (next) setSelectedChallengeId(next.challengeId);
              }}
              label="Next"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="currentColor"><path d="M4 2l4 3-4 3V2z" /></svg>
            </ReplayButton>

            <div className="h-4 w-px bg-white/10 mx-1" />

            <select
              aria-label="Replay speed"
              value={replaySpeed}
              onChange={(e) => setReplaySpeed(e.target.value as ReplaySpeed)}
              className="rounded-md bg-transparent px-2 py-1 text-[10px] font-black text-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="1x">1x</option>
              <option value="2x">2x</option>
              <option value="4x">4x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
        {/* Strike zone */}
        <div className="border-b border-gray-100 lg:border-b-0 lg:border-r bg-white">
          <StrikeZonePlot
            challenges={filtered}
            selectedChallengeId={selected?.challengeId ?? null}
            highlightedChallengeId={focusedChallengeId}
            zoneMode={zoneMode}
            showCountOverlay={showCountOverlay}
            showPitchOverlay={showPitchOverlay}
            onSelectChallenge={(id) => setSelectedChallengeId(id)}
            onHoverChallenge={(id) => setHoveredChallengeId(id)}
          />
        </div>

        {/* Detail panel */}
        <div className="flex flex-col bg-slate-50/50">
          <div className="border-b border-gray-100 p-6">
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                  Forensic Insights
                </h4>
                <p className="text-xl font-display leading-none text-gray-900">
                  Challenge <span className="text-gray-400">Brief</span>
                </p>
                <p className="mt-2 max-w-md text-[11px] font-medium leading-relaxed text-[var(--ink-2)]">
                  Focus this rail on the call, the game-state consequence, and the decision read. Deeper model and historical context stay tucked into org view only.
                </p>
              </div>
              {selected && (selected.px === null || selected.pz === null) && (
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Telemetry Unavailable
                </span>
              )}
            </div>
            {selected ? (
              <motion.div
                key={selected.challengeId}
                initial={reduceMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduceMotion ? undefined : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 space-y-4"
              >
                <AtBatContextCard challenge={selected} viewMode={viewMode} />
              </motion.div>
            ) : (
              <p className="mt-3 text-sm text-[var(--ink-3)]">No challenge matches current filters.</p>
            )}
          </div>

          <div className="flex-1 overflow-auto p-4 custom-scrollbar" style={{ maxHeight: "360px" }}>
            <div className="space-y-2">
              {filtered.map((c) => (
                <div key={`${c.challengeId}:${c.pitchNumber ?? 0}:${c.challengedAt ?? "na"}`} className="flex flex-col">
                  <motion.button
                    onClick={() => setSelectedChallengeId(c.challengeId)}
                    onMouseEnter={() => setHoveredChallengeId(c.challengeId)}
                    onMouseLeave={() => setHoveredChallengeId(null)}
                    whileHover={reduceMotion ? undefined : { x: 4 }}
                    whileTap={reduceMotion ? undefined : { scale: 0.98 }}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${focusedChallengeId === c.challengeId
                      ? "border-blue-500 bg-blue-500/10 shadow-[0_0_12px_rgba(59,130,246,0.1)]"
                      : "border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <InningIcon inning={c.inning} half={c.halfInning} className="scale-75 origin-left" />
                        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--ink-3)]">
                          {formatHalfInningLabel(c.halfInning, "short")} {c.inning ?? "-"}
                        </span>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-widest ${c.isOverturned ? "text-emerald-500" : "text-red-500"}`}>
                        {c.isOverturned ? "OVR" : "CNF"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-[var(--ink-1)] truncate">
                      {c.batterName ?? "Batter"} vs {c.pitcherName ?? "Pitcher"}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--ink-3)] font-medium">
                      {c.pitchType ?? "Pitch"} • {c.umpireCount || `${c.balls ?? 0}-${c.strikes ?? 0}`} • {c.outs ?? 0} out{(c.outs ?? 0) === 1 ? "" : "s"}
                    </div>
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-3)] opacity-60">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white border border-gray-200 rounded-lg px-4 py-2 text-xs font-bold text-[var(--ink-1)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:bg-gray-50 shadow-sm"
      >
        {options.map((opt) => (
          <option key={opt} value={opt} className="bg-[#0a0a0a]">
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.9 }}
      className={`rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${active
        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
        : "bg-transparent text-[var(--ink-3)] hover:text-blue-600 hover:bg-blue-50"
        }`}
    >
      {children}
    </motion.button>
  );
}

function ReplayButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={label}
      whileTap={{ scale: 0.8 }}
      className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-3)] hover:text-blue-600 hover:bg-blue-50 transition-all"
    >
      {children}
    </motion.button>
  );
}

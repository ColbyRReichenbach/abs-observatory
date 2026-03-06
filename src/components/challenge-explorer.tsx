"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

import { StrikeZonePlot } from "@/components/strike-zone-plot";
import { replayIntervalMs, stepReplayIndex, type ReplaySpeed } from "@/lib/replay";
import { applyExplorerFilters, resolveSelection } from "@/lib/strike-zone-explorer-state";
import type { ChallengeEvent } from "@/lib/types";
import type { ZoneMode } from "@/lib/zone-mapping";

import { InningIcon } from "@/components/inning-icon";
import { AIStatInsight } from "@/components/ai-stat-insight";
import { AtBatContextCard } from "@/components/game-hub/at-bat-context-card";

export function ChallengeExplorer({ challenges }: { challenges: ChallengeEvent[] }) {
  const [pitchType, setPitchType] = useState<string>("all");
  const [batter, setBatter] = useState<string>("all");
  const [pitcher, setPitcher] = useState<string>("all");
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(challenges[0]?.challengeId ?? null);
  const [hoveredChallengeId, setHoveredChallengeId] = useState<string | null>(null);
  const [zoneMode, setZoneMode] = useState<ZoneMode>("actual");
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

  // Mock AI Stat data based on selection
  const aiInsight = useMemo(() => {
    if (!selected) return null;
    const isOverturned = selected.isOverturned;
    return {
      batterName: selected.batterName ?? "Unknown",
      pitcherName: selected.pitcherName ?? "Unknown",
      verdict: isOverturned ? "Overturn" : "Confirmation",
      impactDescription: isOverturned
        ? `The overturn to a ball extended the plate appearance. Historical data suggests the batter's expected wOBA increases by .085 in this specific count shift.`
        : `The confirmed strike maintained pitcher leverage. Expected strikeout probability surged to 72% following this assessment.`,
      splitData: {
        label: "PROBABILITY OF REACHING BASE",
        before: ".245",
        after: isOverturned ? ".315" : ".180",
        trend: isOverturned ? "up" as const : "down" as const,
      }
    };
  }, [selected]);

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
    <section className="panel overflow-hidden border-white/5 bg-white/[0.01] shadow-2xl">
      {/* Toolbar */}
      <div className="border-b border-white/5 px-6 py-5 bg-white/5">
        <div className="flex flex-wrap items-end gap-6">
          <Filter label="Pitch Type" value={pitchType} onChange={setPitchType} options={pitchTypes} />
          <Filter label="Batter" value={batter} onChange={setBatter} options={batters} />
          <Filter label="Pitcher" value={pitcher} onChange={setPitcher} options={pitchers} />

          {/* Zone mode toggle */}
          <fieldset className="flex items-center gap-1 rounded-full border border-white/10 p-0.5 bg-white/5">
            <legend className="sr-only">Zone Mode</legend>
            <ModeButton active={zoneMode === "actual"} onClick={() => setZoneMode("actual")}>
              Actual
            </ModeButton>
            <ModeButton active={zoneMode === "adjusted"} onClick={() => setZoneMode("adjusted")}>
              Adjusted
            </ModeButton>
          </fieldset>
        </div>

        {/* Controls row */}
        <div className="mt-5 flex flex-wrap items-center gap-6">
          {/* Overlays */}
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] cursor-pointer select-none transition-colors hover:text-[var(--ink-1)]">
              <input type="checkbox" checked={showCountOverlay} onChange={(e) => setShowCountOverlay(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-blue-500" />
              Count Map
            </label>
            <label className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--ink-3)] cursor-pointer select-none transition-colors hover:text-[var(--ink-1)]">
              <input type="checkbox" checked={showPitchOverlay} onChange={(e) => setShowPitchOverlay(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-blue-500" />
              Pitch Info
            </label>
          </div>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Replay controls */}
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2 py-1.5 shadow-inner">
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
            <button
              type="button"
              onClick={() => setReplayEnabled((prev) => !prev)}
              className={`rounded-full px-5 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all ${replayEnabled
                ? "bg-red-500 text-white shadow-red-500/20"
                : "bg-blue-500 text-white shadow-blue-500/20 hover:scale-105"
                }`}
            >
              {replayEnabled ? "Pause" : "Play Sequence"}
            </button>
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
        <div className="border-b border-white/5 lg:border-b-0 lg:border-r relative bg-black/20">
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
        <div className="flex flex-col bg-white/[0.02]">
          {/* Selected pitch detail */}
          <div className="border-b border-white/5 p-6 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--ink-3)] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Decision Analysis
            </h3>
            {selected ? (
              <motion.div
                key={selected.challengeId}
                initial={reduceMotion ? false : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reduceMotion ? undefined : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6 space-y-4"
              >
                <DetailRow label="Matchup" value={`${selected.batterName ?? "?"} vs ${selected.pitcherName ?? "?"}`} highlight />
                <DetailRow label="Pitch" value={`#${selected.pitchNumber ?? "-"} • ${selected.pitchType ?? "Unknown"}`} />
                <div className="grid grid-cols-2 gap-4">
                  <DetailRow label="Velocity" value={selected.startSpeed ? `${selected.startSpeed.toFixed(1)} MPH` : "N/A"} compact />
                  <DetailRow label="Spin Rate" value={selected.spinRate ? `${Math.round(selected.spinRate)} RPM` : "N/A"} compact />
                </div>
                <div className="flex items-center gap-4 border-b border-white/5 pb-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ink-3)]">Inning</span>
                    <div className="flex items-center gap-2">
                      <InningIcon inning={selected.inning} half={selected.halfInning} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 ml-auto text-right">
                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ink-3)]">Count</span>
                    <span className="text-sm font-bold text-[var(--ink-1)]">{selected.balls}-{selected.strikes} • {selected.outs} Out</span>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-3)]">Official Verdict</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-lg ${selected.isOverturned
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10"
                      : "bg-red-500/10 text-red-500 border-red-500/20 shadow-red-500/10"
                      }`}>
                      {selected.isOverturned ? "Call Overturned" : "Call Confirmed"}
                    </span>
                  </div>
                </div>

                {aiInsight && (
                  <AIStatInsight {...aiInsight} />
                )}
              </motion.div>
            ) : (
              <p className="mt-3 text-sm text-[var(--ink-3)]">No challenge matches current filters.</p>
            )}
          </div>

          {/* Timeline list */}
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
                      : "border-white/5 bg-white/5 hover:bg-white/[0.08] hover:border-white/10"
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <InningIcon inning={c.inning} half={c.halfInning} className="scale-75 origin-left" />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${c.isOverturned ? "text-emerald-500" : "text-red-500"}`}>
                        {c.isOverturned ? "OVR" : "CNF"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs font-bold text-[var(--ink-1)] truncate">
                      {c.batterName ?? "Batter"} vs {c.pitcherName ?? "Pitcher"}
                    </div>
                    <div className="mt-1 text-[10px] text-[var(--ink-3)] font-medium">
                      {c.pitchType ?? "Pitch"} • {c.balls}-{c.strikes}
                    </div>
                  </motion.button>

                  <AnimatePresence>
                    {selectedChallengeId === c.challengeId && (
                      <AtBatContextCard challenge={c} />
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DetailRow({
  label,
  value,
  highlight,
  compact
}: {
  label: string;
  value: string;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-1 ${compact ? "" : "border-b border-white/5 pb-3 last:border-0 last:pb-0"}`}>
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--ink-3)]">{label}</span>
      <span className={`text-sm font-bold ${highlight ? "text-[var(--ink-0)] text-base" : "text-[var(--ink-1)]"}`}>
        {value}
      </span>
    </div>
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
        className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-xs font-bold text-[var(--ink-1)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:bg-white/[0.08]"
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
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-5 py-2 text-[10px] font-black uppercase tracking-widest transition-all ${active
        ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
        : "bg-transparent text-[var(--ink-3)] hover:text-white hover:bg-white/5"
        }`}
    >
      {children}
    </button>
  );
}

function ReplayButton({ onClick, label, children }: { onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--ink-3)] hover:text-white hover:bg-white/10 transition-all active:scale-90"
    >
      {children}
    </button>
  );
}


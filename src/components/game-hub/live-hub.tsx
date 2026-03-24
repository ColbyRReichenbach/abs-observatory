"use client";

import { MotionIn } from "@/components/motion-in";
import { ChallengeExplorer } from "@/components/challenge-explorer";
import { CurrentChallengeWindowCard } from "@/components/game-hub/current-challenge-window-card";
import { DynamicLeverageMeter } from "@/components/game-hub/dynamic-leverage-meter";
import { motion, AnimatePresence } from "framer-motion";
import type { ChallengeEvent, GameHubGame, GameLiveStatus, LiveChallengeWindow } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import { getGameViewCopy } from "@/lib/view-mode-contract";

type GameAbsCounters = {
    homeRemaining: number;
    awayRemaining: number;
} | null;

export function LiveWarRoom({ game, challenges, liveStatus, counters, liveChallengeWindow, initialChallengeId = null, viewMode }: {
    game: GameHubGame,
    challenges: ChallengeEvent[],
    liveStatus: GameLiveStatus | null,
    counters: GameAbsCounters,
    liveChallengeWindow: LiveChallengeWindow | null,
    initialChallengeId?: string | null,
    viewMode: ViewMode
}) {
    // S5-4: Determine context for at-bat strip
    const latestChallenge = challenges.at(-1);
    const currentInning = liveStatus?.inning ?? latestChallenge?.inning ?? 1;
    const isLateInning = currentInning >= 7;
    const currentBalls = liveStatus?.balls ?? latestChallenge?.balls ?? 0;
    const currentStrikes = liveStatus?.strikes ?? latestChallenge?.strikes ?? 0;
    const sameCountChallenges = challenges.filter(
        (challenge) => challenge.balls === currentBalls && challenge.strikes === currentStrikes,
    ).length;
    const copy = getGameViewCopy(viewMode, "live");
    const meterSection = (
        <>
            <div className="grid gap-6 lg:grid-cols-[1fr_300px] mb-6">
                <div className="panel p-6 shadow-2xl border border-blue-100 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                    <h4 className="absolute z-10 top-6 left-6 text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        {copy.eyebrow} • {game.statusabstract}
                    </h4>
                    <div className="h-80 w-full relative pt-12">
                        <DynamicLeverageMeter
                            homeScore={game.homescore ?? 0}
                            awayScore={game.awayscore ?? 0}
                            inning={liveStatus?.inning ?? 1}
                            balls={currentBalls}
                            strikes={currentStrikes}
                            outs={liveStatus?.outs ?? latestChallenge?.outs ?? 0}
                            basesState={latestChallenge?.basesState ?? null}
                            homeColor={game.homeprimarycolor || "#3b82f6"}
                            awayColor={game.awayprimarycolor || "#8b5cf6"}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full">
                    <div className="panel relative p-6 shadow-xl border border-gray-100 bg-white flex-1 flex flex-col items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundColor: game.homeprimarycolor || "#3b82f6" }} />
                        <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-gray-500">{game.homeabbreviation || "HOME"} CHALLENGES</span>
                        <motion.span
                            key={counters?.homeRemaining}
                            initial={{ scale: 1.5, opacity: 0, color: game.homeprimarycolor || "#3b82f6" }}
                            animate={{ scale: 1, opacity: 1, color: "#111827" }}
                            className="relative z-10 text-6xl font-display mt-2"
                        >
                            {counters?.homeRemaining ?? 0}
                        </motion.span>
                    </div>
                    <div className="panel relative p-6 shadow-xl border border-gray-100 bg-white flex-1 flex flex-col items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundColor: game.awayprimarycolor || "#8b5cf6" }} />
                        <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-gray-500">{game.awayabbreviation || "AWAY"} CHALLENGES</span>
                        <motion.span
                            key={counters?.awayRemaining}
                            initial={{ scale: 1.5, opacity: 0, color: game.awayprimarycolor || "#8b5cf6" }}
                            animate={{ scale: 1, opacity: 1, color: "#111827" }}
                            className="relative z-10 text-6xl font-display mt-2"
                        >
                            {counters?.awayRemaining ?? 0}
                        </motion.span>
                    </div>
                </div>
            </div>
            <CurrentChallengeWindowCard
                snapshot={liveChallengeWindow}
                viewMode={viewMode}
                homeColor={game.homeprimarycolor || "#3b82f6"}
            />
        </>
    );
    const feedSection = (
        <section className="mb-12">
            <div className="mb-6 px-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    {copy.eyebrow}
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    {copy.title.split(" ").slice(0, 1).join(" ")} <span className="text-gray-400 italic">{copy.title.split(" ").slice(1).join(" ")}</span>
                </p>
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-3 scrollbar-hide">
                <AnimatePresence mode="popLayout">
                    {[...challenges].reverse().slice(0, 8).map((c, i) => (
                        <motion.div
                            key={c.challengeId}
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ delay: i * 0.05, duration: 0.3 }}
                            className="panel p-4 shadow-sm border border-gray-50 bg-white flex items-center gap-4"
                        >
                            <span className="shrink-0 flex h-8 w-14 items-center justify-center rounded-lg bg-gray-50 text-[10px] font-black text-[var(--ink-2)]">
                                {c.halfInning === "Top" ? "T" : "B"}{c.inning}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[var(--ink-0)] truncate">
                                    {c.challengeTeamName} — {c.calledDescription || "Challenge"}
                                </p>
                                <p className="text-[10px] text-[var(--ink-3)] mt-0.5">
                                    Count: {c.umpireCount || `${c.balls}-${c.strikes}`} · {c.outs} out
                                </p>
                            </div>
                            <span className={`shrink-0 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${c.isOverturned
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                                : "bg-gray-50 text-gray-500 border border-gray-100"
                                }`}>
                                {c.isOverturned ? "Overturned" : "Confirmed"}
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {challenges.length === 0 && (
                    <div className="panel p-8 text-center text-gray-400 font-semibold border-dashed border-2 border-gray-200">
                        No challenge events yet this game
                    </div>
                )}
            </div>
        </section>
    );
    const burnSection = viewMode === "org" ? (
        <section className="mb-12">
            <div className="panel p-8 shadow-xl shadow-black/[0.02] border border-gray-50 bg-white">
                <div className="mb-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-orange-500 mb-1">
                        Resource Management
                    </h4>
                    <p className="text-2xl font-display leading-none text-gray-900">
                        Challenge <span className="text-gray-400 italic">Burn Rate</span>
                    </p>
                </div>
                <div className="space-y-3">
                    <BurnRow
                        teamName={game.homeabbreviation || "HOME"}
                        teamColor={game.homeprimarycolor || "#3b82f6"}
                        challengesUsed={challenges.filter((c) => c.challengeTeamId === game.homeTeamId).length}
                        currentInning={currentInning}
                    />
                    <BurnRow
                        teamName={game.awayabbreviation || "AWAY"}
                        teamColor={game.awayprimarycolor || "#8b5cf6"}
                        challengesUsed={challenges.filter((c) => c.challengeTeamId === game.awayTeamId).length}
                        currentInning={currentInning}
                    />
                </div>
            </div>
        </section>
    ) : null;
    const explorerSection = (
        <section>
            <ChallengeExplorer challenges={challenges} initialChallengeId={initialChallengeId} />
        </section>
    );

    return (
        <div className="py-6">
            <MotionIn>
                {/* S5-4: At-Bat Context Strip */}
                <div className={`w-full rounded-2xl px-5 py-3 mb-6 flex items-center gap-3 flex-wrap text-[11px] font-medium transition-all ${isLateInning ? "bg-amber-50 border border-amber-200 animate-pulse" : "bg-gray-50 border border-gray-100"}`}>
                    <span className="text-[var(--ink-2)]">
                        <strong className="text-[var(--ink-0)]">Inning {currentInning}</strong>
                    </span>
                    <span className="text-[var(--ink-3)]">·</span>
                    <span className="text-[var(--ink-2)]">
                        {liveStatus?.outs ?? latestChallenge?.outs ?? 0} Out{(liveStatus?.outs ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--ink-3)]">·</span>
                    <span className="text-[var(--ink-2)]">
                        Count: <strong>{latestChallenge?.umpireCount || `${currentBalls}-${currentStrikes}`}</strong>
                    </span>
                    <span className="text-[var(--ink-3)]">·</span>
                    <span className="text-[var(--ink-2)]">
                        {sameCountChallenges > 0 ? (
                            <>
                                {viewMode === "org" ? (
                                    <>This game challenged this count <strong className="text-blue-600">{sameCountChallenges}x</strong></>
                                ) : (
                                    <>This count has already sparked <strong className="text-blue-600">{sameCountChallenges} challenge{sameCountChallenges === 1 ? "" : "s"}</strong></>
                                )}
                            </>
                        ) : (
                            <>{viewMode === "org" ? "Waiting for a challenge at this count" : "No challenge drama at this count yet"}</>
                        )}
                    </span>
                    {isLateInning && (
                        <span className="ml-auto px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">
                            Late Innings
                        </span>
                    )}
                </div>

                {copy.sectionOrder.map((section) => {
                    if (section === "meter") return <div key={section}>{meterSection}</div>;
                    if (section === "feed") return <div key={section}>{feedSection}</div>;
                    if (section === "burn") return <div key={section}>{burnSection}</div>;
                    return <div key={section}>{explorerSection}</div>;
                })}
            </MotionIn >
        </div >
    );
}

/* S5-6: Burn rate visualization — dot plot representation */
function BurnRow({ teamName, teamColor, challengesUsed, currentInning }: {
    teamName: string;
    teamColor: string;
    challengesUsed: number;
    currentInning: number;
}) {
    return (
        <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-3)] w-10 shrink-0">{teamName}</span>
            <div className="flex gap-1.5 flex-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((inning) => {
                    const isUsed = inning <= challengesUsed;
                    const isCurrent = inning === currentInning;
                    return (
                        <div
                            key={inning}
                            className={`flex-1 h-3 rounded-full transition-all ${isCurrent ? "ring-2 ring-offset-1 ring-blue-400" : ""}`}
                            style={{
                                backgroundColor: isUsed ? teamColor : "rgb(229 231 235)",
                                opacity: isUsed ? 1 : 0.3,
                            }}
                        />
                    );
                })}
            </div>
            <span className="text-[10px] font-bold text-[var(--ink-3)] shrink-0">
                {challengesUsed} used
            </span>
        </div>
    );
}

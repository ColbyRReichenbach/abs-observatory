"use client";

import { MotionIn } from "@/components/motion-in";
import { ChallengeExplorer } from "@/components/challenge-explorer";
import { CurrentDecisionCard } from "@/components/game-hub/current-decision-card";
import { DynamicLeverageMeter } from "@/components/game-hub/dynamic-leverage-meter";
import { GameTeamComparisonChart } from "@/components/game-hub/game-team-comparison-chart";
import { UmpireInGameCard } from "@/components/game-hub/umpire-in-game-card";
import { ChallengeValueTimeline } from "@/components/game-hub/challenge-value-timeline";
import { motion } from "framer-motion";
import type {
    ChallengeEvent,
    ChallengeValueTimelineEntry,
    GameHubGame,
    GameLiveStatus,
    GameTeamChallengeComparison,
    GameUmpireInGameSummary,
    LiveChallengeWindow,
} from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import { resolveMatchupAccentColors } from "@/lib/team-branding";

type GameAbsCounters = {
    homeRemaining: number;
    awayRemaining: number;
} | null;

export function LiveWarRoom({ game, challenges, liveStatus, counters, liveChallengeWindow, challengeValueTimeline, teamComparison, umpireSummary, initialChallengeId = null, viewMode }: {
    game: GameHubGame,
    challenges: ChallengeEvent[],
    liveStatus: GameLiveStatus | null,
    counters: GameAbsCounters,
    liveChallengeWindow: LiveChallengeWindow | null,
    challengeValueTimeline: ChallengeValueTimelineEntry[],
    teamComparison: GameTeamChallengeComparison | null,
    umpireSummary: GameUmpireInGameSummary | null,
    initialChallengeId?: string | null,
    viewMode: ViewMode
}) {
    const latestChallenge = challenges.at(-1);
    const currentInning = liveStatus?.inning ?? latestChallenge?.inning ?? 1;
    const isLateInning = currentInning >= 7;
    const currentBalls = liveStatus?.balls ?? latestChallenge?.balls ?? 0;
    const currentStrikes = liveStatus?.strikes ?? latestChallenge?.strikes ?? 0;
    const matchupColors = resolveMatchupAccentColors({
        homeTeamId: game.homeTeamId ?? game.hometeamid ?? null,
        awayTeamId: game.awayTeamId ?? game.awayteamid ?? null,
        homePrimaryColor: game.homeprimarycolor,
        homeSecondaryColor: game.homesecondarycolor,
        awayPrimaryColor: game.awayprimarycolor,
        awaySecondaryColor: game.awaysecondarycolor,
    });
    const sameCountChallenges = challenges.filter(
        (challenge) => challenge.balls === currentBalls && challenge.strikes === currentStrikes,
    ).length;
    const leverageSection = viewMode === "fan" ? (
        <section className="mb-8">
            <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="panel p-6 shadow-2xl border border-blue-100 bg-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                    <h4 className="absolute z-10 top-6 left-6 text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-4 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Live Review Pulse • {game.statusabstract}
                    </h4>
                    <div className="relative h-[28rem] w-full pt-12">
                        <DynamicLeverageMeter
                            homeScore={game.homescore ?? 0}
                            awayScore={game.awayscore ?? 0}
                            inning={liveStatus?.inning ?? 1}
                            balls={currentBalls}
                            strikes={currentStrikes}
                            outs={liveStatus?.outs ?? latestChallenge?.outs ?? 0}
                            basesState={latestChallenge?.basesState ?? null}
                            homeColor={matchupColors.homeColor}
                            awayColor={matchupColors.awayColor}
                        />
                    </div>
                </div>

                <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="panel relative p-5 shadow-xl border border-gray-100 bg-white flex-1 flex flex-col items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundColor: game.homeprimarycolor || "#3b82f6" }} />
                        <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-gray-500">{game.homeabbreviation || "HOME"} remaining</span>
                        <motion.span
                            key={counters?.homeRemaining}
                            initial={{ scale: 1.5, opacity: 0, color: game.homeprimarycolor || "#3b82f6" }}
                            animate={{ scale: 1, opacity: 1, color: "#111827" }}
                            className="relative z-10 mt-2 text-5xl font-display"
                        >
                            {counters?.homeRemaining ?? 0}
                        </motion.span>
                      </div>
                      <div className="panel relative p-5 shadow-xl border border-gray-100 bg-white flex-1 flex flex-col items-center justify-center overflow-hidden">
                        <div className="absolute inset-0 opacity-10" style={{ backgroundColor: game.awayprimarycolor || "#8b5cf6" }} />
                        <span className="relative z-10 text-[10px] font-bold uppercase tracking-widest text-gray-500">{game.awayabbreviation || "AWAY"} remaining</span>
                        <motion.span
                            key={counters?.awayRemaining}
                            initial={{ scale: 1.5, opacity: 0, color: game.awayprimarycolor || "#8b5cf6" }}
                            animate={{ scale: 1, opacity: 1, color: "#111827" }}
                            className="relative z-10 mt-2 text-5xl font-display"
                        >
                            {counters?.awayRemaining ?? 0}
                        </motion.span>
                      </div>
                    </div>
                    <CurrentDecisionCard snapshot={liveChallengeWindow} viewMode={viewMode} />
                </div>
            </div>
        </section>
    ) : null;
    const decisionLeadSection = viewMode === "org" ? (
        <section className="mb-8">
            <CurrentDecisionCard snapshot={liveChallengeWindow} viewMode={viewMode} />
        </section>
    ) : null;
    const comparisonSection = teamComparison ? (
        <section className="mb-8">
            <GameTeamComparisonChart comparison={teamComparison} state="live" viewMode={viewMode} />
        </section>
    ) : null;
    const umpireSection = (
        <section className="mb-8">
            <UmpireInGameCard summary={umpireSummary} viewMode={viewMode} />
        </section>
    );
    const timelineSection = challengeValueTimeline.length ? (
        <section className="mb-8 panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
            <ChallengeValueTimeline entries={challengeValueTimeline} viewMode={viewMode} showSummaryCards={false} />
        </section>
    ) : null;
    const explorerSection = (
        <section>
            <ChallengeExplorer challenges={challenges} initialChallengeId={initialChallengeId} viewMode={viewMode} />
        </section>
    );

    return (
        <div className="py-6">
            <MotionIn>
                {/* S5-4: At-Bat Context Strip */}
                <div className={`mb-6 flex w-full flex-wrap items-center gap-3 rounded-2xl px-5 py-3 text-[11px] font-medium transition-all ${isLateInning ? "border border-amber-200 bg-amber-50 animate-pulse" : "border border-gray-100 bg-gray-50"}`}>
                    <span className="text-[var(--ink-2)]">
                        <strong className="text-[var(--ink-0)]">Inning {currentInning}</strong>
                    </span>
                    <span className="text-[var(--ink-3)]">·</span>
                    <span className="text-[var(--ink-2)]">
                        {liveStatus?.outs ?? latestChallenge?.outs ?? 0} Out{(liveStatus?.outs ?? 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--ink-3)]">·</span>
                    <span className="text-[var(--ink-2)]">
                        {latestChallenge?.basesState ? (
                            <>Base state: <strong>{latestChallenge.basesState}</strong></>
                        ) : (
                            <>Bases <strong>empty</strong></>
                        )}
                    </span>
                    <span className="text-[var(--ink-3)]">·</span>
                    <span className="text-[var(--ink-2)]">
                        {sameCountChallenges > 0 ? (
                            viewMode === "org" ? (
                                <>This state has been reviewed <strong className="text-blue-600">{sameCountChallenges}x</strong></>
                            ) : (
                                <>This spot has already sparked <strong className="text-blue-600">{sameCountChallenges} challenge{sameCountChallenges === 1 ? "" : "s"}</strong></>
                            )
                        ) : (
                            <>{viewMode === "org" ? "No review at this state yet" : "No challenge drama at this state yet"}</>
                        )}
                    </span>
                    {isLateInning && (
                        <span className="ml-auto px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest">
                            Late Innings
                        </span>
                    )}
                </div>

                {viewMode === "org" ? (
                    <>
                        {decisionLeadSection}
                        {comparisonSection}
                        {timelineSection}
                        {umpireSection}
                        {explorerSection}
                    </>
                ) : (
                    <>
                        {leverageSection}
                        {comparisonSection}
                        {timelineSection}
                        {umpireSection}
                        {explorerSection}
                    </>
                )}
            </MotionIn >
        </div >
    );
}

import { MotionIn } from "@/components/motion-in";
import { getGamePregameIntel } from "@/lib/pregame-intel";
import { MatchupRadarChart } from "@/components/game-hub/matchup-radar-chart";
import { UmpireHeatmap } from "@/components/game-hub/umpire-heatmap";
import { ChallengeDistributionTimeline } from "@/components/game-hub/challenge-distribution-timeline";
import type { GameHubGame } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import { getGameViewCopy } from "@/lib/view-mode-contract";

export async function PregameScoutingReport({ game, viewMode }: { game: GameHubGame; viewMode: ViewMode }) {
    const intel = await getGamePregameIntel(game.gamepk);
    const copy = getGameViewCopy(viewMode, "pregame");
    const sections = {
        signals: intel ? (
            <section className="mb-8">
                <div className="grid gap-4 md:grid-cols-3">
                    <PregameSignalCard
                        title={viewMode === "org" ? "Overall Risk" : "Tonight's Ump"}
                        value={`${Math.round((1 - intel.umpireTendency.overallAccuracy) * 100)}%`}
                        label={viewMode === "org" ? "challenge overturn profile" : "challenge volatility"}
                    />
                    <PregameSignalCard
                        title={viewMode === "org" ? "Home vs Ump" : `${game.homeabbreviation || "HOME"} history`}
                        value={`${Math.round(intel.teamHistoryVsUmpire.home.overturnRate * 100)}%`}
                        label={`${intel.teamHistoryVsUmpire.home.challenges} challenges tracked`}
                    />
                    <PregameSignalCard
                        title={viewMode === "org" ? "Away vs Ump" : `${game.awayabbreviation || "AWAY"} history`}
                        value={`${Math.round(intel.teamHistoryVsUmpire.away.overturnRate * 100)}%`}
                        label={`${intel.teamHistoryVsUmpire.away.challenges} challenges tracked`}
                    />
                </div>
            </section>
        ) : null,
        visuals: (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Matchup Matrix
                    </h4>
                    {intel ? (
                        <MatchupRadarChart
                            intel={intel}
                            homeTeamName={game.homeabbreviation || "HOME"}
                            awayTeamName={game.awayabbreviation || "AWAY"}
                            homeColor={game.homeprimarycolor || "#3b82f6"}
                            awayColor={game.awayprimarycolor || "#8b5cf6"}
                        />
                    ) : (
                        <div className="h-[250px] flex items-center justify-center text-sm font-bold text-gray-300 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200 mt-4">
                            Insufficient Matchup Data
                        </div>
                    )}
                </div>

                <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white lg:col-span-2">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4 flex w-full justify-start items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Umpire Thermal Zone
                    </h4>
                    {intel ? (
                        <UmpireHeatmap intel={intel} />
                    ) : (
                        <div className="h-64 flex w-full items-center justify-center text-sm font-bold text-gray-300 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            Heatmap Plot Pending
                        </div>
                    )}
                </div>
            </div>
        ),
        briefing: intel ? (
            <section className="mt-8">
                <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Zone Briefing
                    </h4>
                    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mb-6">
                        {intel.zoneBriefing.map((bucket) => (
                            <ZoneBriefingCell
                                key={bucket.bucket}
                                label={ZONE_LABELS[bucket.bucket]}
                                overturnRate={bucket.overturnRate}
                                sampleSize={bucket.challenges}
                            />
                        ))}
                    </div>
                    <div className="text-center border-t border-gray-50 pt-6">
                        <p className="text-sm font-medium text-[var(--ink-1)]">
                            Tonight&apos;s ump overturns <strong className="text-red-600 font-display text-lg">{((1 - intel.umpireTendency.overallAccuracy) * 100).toFixed(0)}%</strong> of challenges — league avg is <strong className="text-[var(--ink-3)]">{(intel.teamHistoryVsUmpire.leagueAverage * 100).toFixed(0)}%</strong>
                        </p>
                    </div>
                </div>
            </section>
        ) : null,
        history: intel ? (
            <>
                <section className="mt-8">
                    <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Challenge Timing Patterns
                        </h4>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-3)] w-10 shrink-0">
                                    {game.homeabbreviation || "HOME"}
                                </span>
                                <div className="flex gap-2 flex-1 items-end">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((inning) => {
                                        const val = intel.challengeTiming.home[inning - 1] ?? 0;
                                        const leagueAvg = intel.challengeTiming.leagueAverage[inning - 1] ?? 0;
                                        const height = Math.max(4, val * 12);
                                        const avgHeight = Math.max(4, leagueAvg * 12);
                                        return (
                                            <div key={inning} className="flex-1 flex flex-col items-center justify-end gap-2 h-24">
                                                <div className="relative w-full flex-1 flex items-end justify-center group">
                                                    <div className="absolute bottom-0 w-4/5 bg-gray-100/80 rounded-sm z-0" style={{ height: avgHeight }} />
                                                    <div
                                                        className="relative z-10 w-4/5 rounded-sm transition-all shadow-sm"
                                                        style={{
                                                            height: height,
                                                            backgroundColor: game.homeprimarycolor || "#3b82f6",
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-[8px] font-bold text-gray-400">{inning}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--ink-3)] w-10 shrink-0">
                                    {game.awayabbreviation || "AWAY"}
                                </span>
                                <div className="flex gap-2 flex-1 items-end">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((inning) => {
                                        const val = intel.challengeTiming.away[inning - 1] ?? 0;
                                        const leagueAvg = intel.challengeTiming.leagueAverage[inning - 1] ?? 0;
                                        const height = Math.max(4, val * 12);
                                        const avgHeight = Math.max(4, leagueAvg * 12);
                                        return (
                                            <div key={inning} className="flex-1 flex flex-col items-center justify-end gap-2 h-24">
                                                <div className="relative w-full flex-1 flex items-end justify-center group">
                                                    <div className="absolute bottom-0 w-4/5 bg-gray-100/80 rounded-sm z-0" style={{ height: avgHeight }} />
                                                    <div
                                                        className="relative z-10 w-4/5 rounded-sm transition-all shadow-sm"
                                                        style={{
                                                            height: height,
                                                            backgroundColor: game.awayprimarycolor || "#8b5cf6",
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-[8px] font-bold text-gray-400">{inning}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="mt-8">
                    <div className="panel p-8 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Umpire × Team History
                        </h4>
                        <div className="space-y-5">
                            <TeamVsUmpireBar
                                teamName={game.homeabbreviation || "HOME"}
                                teamColor={game.homeprimarycolor || "#3b82f6"}
                                gamesVsUmp={intel.teamHistoryVsUmpire.home.games}
                                overturnRate={intel.teamHistoryVsUmpire.home.overturnRate}
                                leagueAvg={intel.teamHistoryVsUmpire.leagueAverage}
                            />
                            <TeamVsUmpireBar
                                teamName={game.awayabbreviation || "AWAY"}
                                teamColor={game.awayprimarycolor || "#8b5cf6"}
                                gamesVsUmp={intel.teamHistoryVsUmpire.away.games}
                                overturnRate={intel.teamHistoryVsUmpire.away.overturnRate}
                                leagueAvg={intel.teamHistoryVsUmpire.leagueAverage}
                            />
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-50">
                            <p className="text-[11px] font-medium text-[var(--ink-2)] leading-relaxed">
                                <span className="font-display text-[var(--ink-0)]">{game.homeabbreviation}</span> has challenged <strong>{intel.teamHistoryVsUmpire.home.challenges}</strong> calls with tonight&apos;s umpire and won <strong className="text-emerald-600">{(intel.teamHistoryVsUmpire.home.overturnRate * 100).toFixed(0)}%</strong>.{" "}
                                <span className="font-display text-[var(--ink-0)]">{game.awayabbreviation}</span> has challenged <strong>{intel.teamHistoryVsUmpire.away.challenges}</strong> calls and won <strong className="text-emerald-600">{(intel.teamHistoryVsUmpire.away.overturnRate * 100).toFixed(0)}%</strong>.
                            </p>
                        </div>
                    </div>
                </section>

                <ChallengeDistributionTimeline
                    homeTeamName={game.homeabbreviation || "HOME"}
                    awayTeamName={game.awayabbreviation || "AWAY"}
                    homeData={intel.challengeTiming.home}
                    awayData={intel.challengeTiming.away}
                    leagueAverage={intel.challengeTiming.leagueAverage}
                    homeColor={game.homeprimarycolor || "#3b82f6"}
                    awayColor={game.awayprimarycolor || "#8b5cf6"}
                    title={viewMode === "org" ? "Challenge Timing Patterns" : "When These Clubs Usually Challenge"}
                />
            </>
        ) : null,
    } as const;

    return (
        <div className="py-8">
            <MotionIn>
                <header className="mb-12">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                        {copy.eyebrow}
                    </h2>
                    <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
                        {copy.title}
                    </h3>
                    <p className="mt-2 text-gray-500 max-w-2xl text-balance">
                        {copy.deck}
                    </p>
                </header>

                {copy.sectionOrder.map((section) => (
                    <div key={section}>{sections[section as keyof typeof sections]}</div>
                ))}
            </MotionIn >
        </div >
    );
}

function PregameSignalCard({ title, value, label }: { title: string; value: string; label: string }) {
    return (
        <div className="panel p-5 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">{title}</p>
            <p className="mt-3 text-4xl font-display text-gray-900">{value}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-widest text-[var(--ink-3)]">{label}</p>
        </div>
    );
}

/* ── S5-1: Zone Briefing Cell ── */
const ZONE_LABELS = {
    up_glove: "Up · Glove",
    up_arm: "Up · Arm",
    down_glove: "Down · Glove",
    down_arm: "Down · Arm",
} as const;

function ZoneBriefingCell({ label, overturnRate, sampleSize }: { label: string; overturnRate: number; sampleSize: number }) {
    const overturnPct = overturnRate * 100;
    const isHot = overturnPct > 40;
    const bgColor = isHot
        ? `rgba(239, 68, 68, ${Math.min(0.3, overturnPct / 100)})`
        : `rgba(34, 197, 94, ${Math.min(0.3, 1 - overturnRate)})`;

    return (
        <div
            className="rounded-xl p-4 border border-gray-100 text-center transition-all hover:shadow-md"
            style={{ backgroundColor: bgColor }}
        >
            <p className="text-[9px] font-black uppercase tracking-widest text-[var(--ink-3)] mb-2">{label}</p>
            <p className={`text-2xl font-display font-bold ${isHot ? "text-red-600" : "text-emerald-600"}`}>
                {overturnPct.toFixed(0)}%
            </p>
            <p className="text-[9px] text-[var(--ink-3)] mt-1 font-medium">{sampleSize} challenges</p>
        </div>
    );
}

/* ── S5-3: Team vs Umpire horizontal bar ── */
function TeamVsUmpireBar({
    teamName,
    teamColor,
    gamesVsUmp,
    overturnRate,
    leagueAvg,
}: {
    teamName: string;
    teamColor: string;
    gamesVsUmp: number;
    overturnRate: number;
    leagueAvg: number;
}) {
    const pct = overturnRate * 100;
    const leaguePct = leagueAvg * 100;
    const delta = pct - leaguePct;

    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--ink-2)]">
                    {teamName} vs. Ump
                </span>
                <span className="text-xs font-mono font-bold text-[var(--ink-1)]">
                    {pct.toFixed(0)}% <span className={`text-[10px] ${delta > 0 ? "text-emerald-600" : "text-red-500"}`}>({delta > 0 ? "+" : ""}{delta.toFixed(0)}pp)</span>
                </span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-gray-100">
                {/* League avg marker */}
                <div
                    className="absolute top-0 h-full w-0.5 bg-black/30 z-10"
                    style={{ left: `${leaguePct}%` }}
                />
                {/* Team bar */}
                <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.min(100, pct)}%`, backgroundColor: teamColor }}
                />
            </div>
            <p className="text-[9px] text-[var(--ink-3)] mt-1 font-medium">{gamesVsUmp} games against this umpire</p>
        </div>
    );
}

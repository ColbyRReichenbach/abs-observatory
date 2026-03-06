import { MotionIn } from "@/components/motion-in";
import { getGamePregameIntel } from "@/lib/pregame-intel";
import { MatchupRadarChart } from "@/components/game-hub/matchup-radar-chart";
import { UmpireHeatmap } from "@/components/game-hub/umpire-heatmap";
import { ChallengeDistributionTimeline } from "@/components/game-hub/challenge-distribution-timeline";

export async function PregameScoutingReport({ game }: { game: any }) {
    const intel = await getGamePregameIntel(game.gamepk);

    return (
        <div className="py-8">
            <MotionIn>
                <header className="mb-12">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                        ABS Scouting Report
                    </h2>
                    <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
                        Pregame Intelligence
                    </h3>
                    <p className="mt-2 text-gray-500 max-w-2xl text-balance">
                        Predictive intelligence matrix based on historical umpire tendencies and team challenge aggression entering tonight's matchup.
                    </p>
                </header>

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

                <ChallengeDistributionTimeline
                    homeTeamName={game.homeabbreviation || "HOME"}
                    awayTeamName={game.awayabbreviation || "AWAY"}
                    homeColor={game.homeprimarycolor || "#3b82f6"}
                    awayColor={game.awayprimarycolor || "#8b5cf6"}
                />
            </MotionIn >
        </div >
    );
}

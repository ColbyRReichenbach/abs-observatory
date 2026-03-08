import { MotionIn } from "@/components/motion-in";
import { ChallengeExplorer } from "@/components/challenge-explorer";
import { WPASwapWaterfall } from "@/components/game-hub/wpa-swap-waterfall";
import { getGameReport } from "@/lib/game-reports";
import ReactMarkdown from "react-markdown";
import type { ChallengeEvent, GameHubGame } from "@/lib/types";

export async function PostgameAAR({ game, challenges, initialChallengeId = null }: { game: GameHubGame, challenges: ChallengeEvent[], initialChallengeId?: string | null }) {
    const report = await getGameReport(game.gamepk);

    const homeAbbr = game.homeabbreviation;
    const awayAbbr = game.awayabbreviation;

    const homeChallenges = challenges.filter((c) => c.challengeTeamName === homeAbbr);
    const awayChallenges = challenges.filter((c) => c.challengeTeamName === awayAbbr);

    const scorecard = (team: typeof homeChallenges) => {
        const correct = team.filter((c) => c.isOverturned).length;
        const wrong = team.filter((c) => !c.isOverturned).length;
        const total = correct + wrong;
        const ratio = total > 0 ? correct / total : 0;
        return { correct, wrong, total, overturnRate: ratio };
    };

    const homeScore = scorecard(homeChallenges);
    const awayScore = scorecard(awayChallenges);

    // S5-11: Umpire game grade
    const totalChallenges = challenges.length;
    const totalOverturned = challenges.filter((c) => c.isOverturned).length;
    const umpOverturnRate = totalChallenges > 0 ? totalOverturned / totalChallenges : 0;
    return (
        <div className="py-8">
            <MotionIn>
                {/* S5-7: AI Match Summary promoted to very first element (Chapter 1) */}
                {report && (
                    <section className="mb-12 panel px-8 py-10 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
                        <div className="max-w-lg mx-auto text-center">
                            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500 mb-2">
                                Narrative Intelligence
                            </h4>
                            <h3 className="font-display text-3xl uppercase tracking-tighter text-gray-900 mb-6 leading-tight">
                                Game <span className="text-gray-400 italic">Debrief</span>
                            </h3>
                        </div>
                        <div className="max-w-lg mx-auto prose prose-sm text-[var(--ink-1)] leading-relaxed font-medium">
                            <ReactMarkdown>{report.narrativeMd}</ReactMarkdown>
                        </div>
                    </section>
                )}

                <header className="mb-12">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                        After-Action Report
                    </h2>
                    <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
                        ABS Forensic Analysis
                    </h3>
                    <p className="mt-2 text-gray-500 max-w-2xl text-balance">
                        Comprehensive postgame breakdown of critical review events, expected value shifts, and umpire zone consistency throughout the completed matchup.
                    </p>
                </header>

                {/* S5-10 + S5-11: Team and umpire challenge summaries */}
                <section className="grid gap-6 md:grid-cols-3 mb-8">
                    <SummaryPanel
                        teamName={game.homeabbreviation || "HOME"}
                        teamColor={game.homeprimarycolor || "#3b82f6"}
                        correct={homeScore.correct}
                        wrong={homeScore.wrong}
                        total={homeScore.total}
                        overturnRate={homeScore.overturnRate}
                    />
                    <SummaryPanel
                        teamName={game.awayabbreviation || "AWAY"}
                        teamColor={game.awayprimarycolor || "#8b5cf6"}
                        correct={awayScore.correct}
                        wrong={awayScore.wrong}
                        total={awayScore.total}
                        overturnRate={awayScore.overturnRate}
                    />
                    <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: "#0066cc" }} />
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Umpire Challenge Summary</h4>
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-5xl font-display font-bold text-gray-900">
                                {(umpOverturnRate * 100).toFixed(0)}%
                            </span>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-[var(--ink-0)]">{(umpOverturnRate * 100).toFixed(1)}% overturned</p>
                                <p className="text-[10px] text-[var(--ink-3)]">Based on this game&apos;s recorded challenges only</p>
                            </div>
                        </div>
                        <p className="text-[10px] text-[var(--ink-2)] font-medium leading-relaxed">
                            {totalOverturned} of {totalChallenges} challenges overturned tonight.
                        </p>
                    </div>
                </section>

                <section className="mb-8 panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
                    <WPASwapWaterfall challenges={challenges} />
                </section>

                {/* S5-9: Strike Zone Plot promoted — forensic log section header kept */}
                <section>
                    <div className="mb-6 px-2">
                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                            Forensic Log
                        </h4>
                        <p className="text-2xl font-display leading-none text-gray-900">
                            Pitch <span className="text-gray-400">Timeline</span>
                        </p>
                    </div>
                    <ChallengeExplorer challenges={challenges} initialChallengeId={initialChallengeId} />
                </section>
            </MotionIn>
        </div>
    );
}

function SummaryPanel({
    teamName,
    teamColor,
    correct,
    wrong,
    total,
    overturnRate,
}: {
    teamName: string;
    teamColor: string;
    correct: number;
    wrong: number;
    total: number;
    overturnRate: number;
}) {
    return (
        <div className="panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: teamColor }} />
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {teamName} Challenge Summary
                </h4>
                <span className="text-4xl font-display font-bold text-gray-900">
                    {(overturnRate * 100).toFixed(0)}%
                </span>
            </div>
            <div className="flex gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100">
                    {correct} Correct
                </span>
                <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[10px] font-black border border-red-100">
                    {wrong} Wrong
                </span>
            </div>
            <p className="text-[10px] text-[var(--ink-2)] font-medium leading-relaxed">
                {correct} of {total} challenges overturned for {teamName} in this game.
            </p>
        </div>
    );
}

import { MotionIn } from "@/components/motion-in";
import { ChallengeExplorer } from "@/components/challenge-explorer";
import { ChallengeValueTimeline } from "@/components/game-hub/challenge-value-timeline";
import { GameTeamComparisonChart } from "@/components/game-hub/game-team-comparison-chart";
import { UmpireInGameCard } from "@/components/game-hub/umpire-in-game-card";
import { getGameChallengeValueTimeline, getGameTeamChallengeComparison, getGameUmpireInGameSummary } from "@/lib/data";
import type { ChallengeEvent, GameHubGame } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import { getGameViewCopy } from "@/lib/view-mode-contract";

export async function PostgameAAR({ game, challenges, initialChallengeId = null, viewMode }: { game: GameHubGame, challenges: ChallengeEvent[], initialChallengeId?: string | null, viewMode: ViewMode }) {
    const [challengeValueTimeline, teamComparison, umpireSummary] = await Promise.all([
        getGameChallengeValueTimeline(game.gamepk),
        getGameTeamChallengeComparison(game.gamepk),
        getGameUmpireInGameSummary(game.gamepk),
    ]);
    const copy = getGameViewCopy(viewMode, "final");

    const recapSection = (
        <section className="mb-8 space-y-6">
            {teamComparison ? (
                <GameTeamComparisonChart comparison={teamComparison} state="final" viewMode={viewMode} />
            ) : null}
            <UmpireInGameCard summary={umpireSummary} viewMode={viewMode} />
        </section>
    );

    const waterfallSection = (
        <section className="mb-8 panel p-6 shadow-2xl shadow-black/[0.02] border border-gray-50 bg-white">
            <ChallengeValueTimeline entries={challengeValueTimeline} viewMode={viewMode} showSummaryCards={false} />
        </section>
    );

    const explorerSection = (
        <section>
            <div className="mb-6 px-2">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1">
                    Forensic Log
                </h4>
                <p className="text-2xl font-display leading-none text-gray-900">
                    Pitch <span className="text-gray-400">Timeline</span>
                </p>
            </div>
            <ChallengeExplorer challenges={challenges} initialChallengeId={initialChallengeId} viewMode={viewMode} />
        </section>
    );

    return (
        <div className="py-8">
            <MotionIn>
                <header className="mb-12">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 mb-1">
                                {copy.eyebrow}
                            </h2>
                            <h3 className="text-3xl font-display uppercase tracking-tight text-gray-900">
                                {copy.title}
                            </h3>
                            <p className="mt-2 text-gray-500 max-w-2xl text-balance">
                                {copy.deck}
                            </p>
                        </div>
                    </div>
                </header>
                {copy.sectionOrder.map((section) => {
                    if (section === "summary") return <div key={section}>{recapSection}</div>;
                    if (section === "waterfall") return <div key={section}>{waterfallSection}</div>;
                    return <div key={section}>{explorerSection}</div>;
                })}
            </MotionIn>
        </div>
    );
}

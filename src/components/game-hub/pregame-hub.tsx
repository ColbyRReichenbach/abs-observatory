import { MotionIn } from "@/components/motion-in";
import { getGamePregameIntel } from "@/lib/pregame-intel";
import { getGameChallengeOpportunityBoard } from "@/lib/data";
import { ChallengeOpportunityBoard } from "@/components/game-hub/challenge-opportunity-board";
import { PregameUmpireScoutCard } from "@/components/game-hub/pregame-umpire-scout-card";
import { PregameTeamComparisonChart } from "@/components/game-hub/pregame-team-comparison-chart";
import { PregameTimingComparisonChart } from "@/components/game-hub/pregame-timing-comparison-chart";
import { PregameZoneBriefChart } from "@/components/game-hub/pregame-zone-brief-chart";
import type { GameHubGame } from "@/lib/types";
import type { ViewMode } from "@/lib/view-mode";
import { getGameViewCopy } from "@/lib/view-mode-contract";
import { resolveMatchupAccentColors } from "@/lib/team-branding";

export async function PregameScoutingReport({ game, viewMode }: { game: GameHubGame; viewMode: ViewMode }) {
    const [intel, opportunityBoard] = await Promise.all([
        getGamePregameIntel(game.gamepk),
        getGameChallengeOpportunityBoard(game.gamepk),
    ]);
    const copy = getGameViewCopy(viewMode, "pregame");
    const homeLabel = game.homeabbreviation || "HOME";
    const awayLabel = game.awayabbreviation || "AWAY";
    const { homeColor, awayColor } = resolveMatchupAccentColors({
        homeTeamId: game.hometeamid,
        awayTeamId: game.awayteamid,
        homePrimaryColor: game.homeprimarycolor,
        awayPrimaryColor: game.awayprimarycolor,
    });

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

                {intel ? (
                    viewMode === "org" && opportunityBoard ? (
                        <section className="mb-8">
                        <ChallengeOpportunityBoard board={opportunityBoard} viewMode={viewMode} />
                        </section>
                    ) : null
                ) : null}

                {intel ? (
                    <section className="mb-8 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                        <PregameTeamComparisonChart
                            intel={intel}
                            opportunityBoard={opportunityBoard}
                            homeLabel={homeLabel}
                            awayLabel={awayLabel}
                            homeColor={homeColor}
                            awayColor={awayColor}
                            viewMode={viewMode}
                        />
                        <PregameTimingComparisonChart
                            intel={intel}
                            homeLabel={homeLabel}
                            awayLabel={awayLabel}
                            homeColor={homeColor}
                            awayColor={awayColor}
                            viewMode={viewMode}
                        />
                    </section>
                ) : null}

                {intel ? (
                    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                        <PregameUmpireScoutCard intel={intel} viewMode={viewMode} />
                        <PregameZoneBriefChart intel={intel} viewMode={viewMode} />
                    </section>
                ) : null}

                {viewMode === "fan" && opportunityBoard ? (
                    <section className="mt-8">
                        <ChallengeOpportunityBoard board={opportunityBoard} viewMode={viewMode} />
                    </section>
                ) : null}
            </MotionIn >
        </div >
    );
}

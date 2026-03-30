import { NextResponse } from "next/server";
import { getGamePregameIntel } from "@/lib/pregame-intel";

/**
 * D-5: Dedicated API route for pregame umpire x team history.
 * Returns the full pregame intel object which includes teamHistoryVsUmpire.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ gamePk: string }> },
) {
    const { gamePk } = await params;
    const pk = Number(gamePk);
    if (!pk || isNaN(pk)) {
        return NextResponse.json({ error: "Invalid gamePk" }, { status: 400 });
    }

    const intel = await getGamePregameIntel(pk);
    if (!intel) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json({
        umpireId: intel.umpireId,
        umpireName: intel.umpireName,
        homeTeam: {
            teamId: intel.homeTeamId,
            ...intel.teamHistoryVsUmpire.home,
        },
        awayTeam: {
            teamId: intel.awayTeamId,
            ...intel.teamHistoryVsUmpire.away,
        },
        leagueAverage: {
            overturnRate: intel.teamHistoryVsUmpire.leagueAverage,
        },
    });
}

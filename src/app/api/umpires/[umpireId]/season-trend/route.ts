import { NextResponse } from "next/server";
import { getUmpireSeasonTrend } from "@/lib/data";

/**
 * D-7: Umpire season-over-season trend API.
 * Returns one aggregated point per season the umpire has worked.
 */
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ umpireId: string }> },
) {
    const { umpireId } = await params;
    const id = Number(umpireId);
    if (!id || isNaN(id)) {
        return NextResponse.json({ error: "Invalid umpireId" }, { status: 400 });
    }

    const data = await getUmpireSeasonTrend(id);

    // If fewer than 2 seasons, the chart isn't meaningful
    if (data.length < 2) {
        return NextResponse.json({
            data: [],
            notice: "Insufficient season coverage for trend chart.",
        });
    }

    return NextResponse.json({ data });
}

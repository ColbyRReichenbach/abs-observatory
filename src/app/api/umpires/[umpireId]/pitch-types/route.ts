import { NextResponse } from "next/server";
import { getUmpirePitchTypeBreakdown } from "@/lib/data";
import { parseRange } from "@/lib/range";

/**
 * D-8: Umpire pitch type breakdown API.
 * Returns per-pitch-type challenge counts and overturn rates.
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ umpireId: string }> },
) {
    const { umpireId } = await params;
    const id = Number(umpireId);
    if (!id || isNaN(id)) {
        return NextResponse.json({ error: "Invalid umpireId" }, { status: 400 });
    }

    const url = new URL(request.url);
    const range = parseRange(url.searchParams.get("range") ?? undefined);

    const data = await getUmpirePitchTypeBreakdown(id, range);
    return NextResponse.json(data);
}

import { sql } from "@/lib/db";
import type { GameReport } from "@/lib/types";

export async function getGameReport(gameId: number): Promise<GameReport | null> {
    const rs = await sql<{
        game_pk: number;
        generated_at: string;
        narrative_md: string;
        chart_spec: unknown;
    }>(
        `
    SELECT 
      game_pk,
      generated_at,
      narrative_md,
      chart_spec
    FROM game_reports
    WHERE game_pk = $1
    ORDER BY generated_at DESC
    LIMIT 1
    `,
        [gameId],
    );

    const row = rs[0];
    if (!row) return null;

    return {
        gamePk: row.game_pk,
        generatedAt: row.generated_at,
        narrativeMd: row.narrative_md,
        chartSpec: row.chart_spec,
    };
}

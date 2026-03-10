import { sql } from "@/lib/db";
import type { GameReport } from "@/lib/types";

export async function getGameReport(gameId: number): Promise<GameReport | null> {
    const rs = await sql<{
        game_pk: number;
        generated_at: string;
        model_name: string | null;
        generation_id: string | null;
        narrative_md: string;
        chart_spec: unknown;
    }>(
        `
    SELECT 
      r.game_pk,
      r.generated_at,
      r.model_name,
      ge.generation_id,
      r.narrative_md,
      r.chart_spec
    FROM game_reports r
    LEFT JOIN LATERAL (
      SELECT generation_id
      FROM ai.generation_events
      WHERE target_type = 'game_report'
        AND target_id = r.game_pk::text
      ORDER BY created_at DESC
      LIMIT 1
    ) ge ON TRUE
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
        modelName: row.model_name,
        generationId: row.generation_id,
        narrativeMd: row.narrative_md,
        chartSpec: row.chart_spec,
    };
}

import { sql } from "@/lib/db";
import type { PregameIntel } from "@/lib/types";

export async function getGamePregameIntel(gamePk: number): Promise<PregameIntel | null> {
  const rows = await sql<any>(
    `
    WITH game_context AS (
      SELECT g.home_team_id, g.away_team_id, o.official_id as umpire_id, o.official_name as umpire_name
      FROM games g
      LEFT JOIN officials o ON o.game_pk = g.game_pk AND o.official_type = 'Home Plate'
      WHERE g.game_pk = $1
    ),
    team_stats AS (
      SELECT 
        c.challenge_team_id,
        SUM(CASE WHEN c.half_inning = 'Top' AND g.away_team_id = c.challenge_team_id THEN 1
                 WHEN c.half_inning = 'Bottom' AND g.home_team_id = c.challenge_team_id THEN 1 ELSE 0 END) as offensive_challenges,
        SUM(CASE WHEN c.half_inning = 'Top' AND g.home_team_id = c.challenge_team_id THEN 1
                 WHEN c.half_inning = 'Bottom' AND g.away_team_id = c.challenge_team_id THEN 1 ELSE 0 END) as defensive_challenges,
        AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END) as success_rate
      FROM abs_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      WHERE c.challenge_team_id IN (SELECT home_team_id FROM game_context UNION SELECT away_team_id FROM game_context)
      GROUP BY c.challenge_team_id
    )
    SELECT
      gc.umpire_id,
      gc.umpire_name,
      gc.home_team_id,
      gc.away_team_id,
      COALESCE(away.offensive_challenges, 0) as away_offense,
      COALESCE(away.defensive_challenges, 0) as away_defense,
      COALESCE(away.success_rate, 0) as away_success,
      COALESCE(home.offensive_challenges, 0) as home_offense,
      COALESCE(home.defensive_challenges, 0) as home_defense,
      COALESCE(home.success_rate, 0) as home_success
    FROM game_context gc
    LEFT JOIN team_stats away ON away.challenge_team_id = gc.away_team_id
    LEFT JOIN team_stats home ON home.challenge_team_id = gc.home_team_id
    `,
    [gamePk]
  );

  const r = rows[0];
  if (!r) return null;

  // Generate some realistic mock umpire zone baselines if we don't have enough data
  // In a full production system, this would query the umpire_zone_buckets
  return {
    umpireId: r.umpire_id,
    umpireName: r.umpire_name ?? "Unknown Umpire",
    awayTeam: {
      offensiveChallenges: Number(r.away_offense),
      defensiveChallenges: Number(r.away_defense),
      successRate: Number(r.away_success),
    },
    homeTeam: {
      offensiveChallenges: Number(r.home_offense),
      defensiveChallenges: Number(r.home_defense),
      successRate: Number(r.home_success),
    },
    umpireTendency: {
      lowZoneAccuracy: 0.88, // placeholder
      highZoneAccuracy: 0.94, // placeholder
      overallAccuracy: 0.92, // placeholder
    }
  };
}

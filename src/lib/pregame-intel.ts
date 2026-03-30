import { sql } from "@/lib/db";
import type { PregameIntel } from "@/lib/types";

type GameContextRow = {
  umpire_id: number | null;
  umpire_name: string | null;
  home_team_id: number;
  away_team_id: number;
  away_offense: number;
  away_defense: number;
  away_success: number;
  home_offense: number;
  home_defense: number;
  home_success: number;
};

type ZoneRow = {
  bucket: "up_glove" | "up_arm" | "down_glove" | "down_arm";
  challenges: number;
  overturn_rate: number;
};

type TimingRow = {
  challenge_team_id: number;
  inning: number;
  challenges: number;
};

type HistoryRow = {
  team_id: number;
  games: number;
  challenges: number;
  overturn_rate: number;
};

function toInningSeries(rows: TimingRow[], teamId: number): number[] {
  const teamRows = rows.filter((row) => row.challenge_team_id === teamId);
  const totalChallenges = teamRows.reduce((sum, row) => sum + Number(row.challenges), 0);
  const values = new Array(9).fill(0);
  for (const row of teamRows) {
    if (row.inning >= 1 && row.inning <= 9) {
      values[row.inning - 1] = totalChallenges > 0 ? Number(row.challenges) / totalChallenges : 0;
    }
  }
  return values;
}

export async function getGamePregameIntel(gamePk: number): Promise<PregameIntel | null> {
  const contextRows = await sql<GameContextRow>(
    `
    WITH game_context AS (
      SELECT g.home_team_id, g.away_team_id, o.official_id AS umpire_id, o.official_name AS umpire_name
      FROM games g
      LEFT JOIN officials o ON o.game_pk = g.game_pk AND o.official_type = 'Home Plate'
      WHERE g.game_pk = $1
    ),
    team_stats AS (
      SELECT
        c.challenge_team_id,
        COUNT(DISTINCT c.game_pk) AS games_with_challenges,
        SUM(
          CASE
            WHEN c.half_inning = 'Top' AND g.away_team_id = c.challenge_team_id THEN 1
            WHEN c.half_inning = 'Bottom' AND g.home_team_id = c.challenge_team_id THEN 1
            ELSE 0
          END
        ) AS offensive_challenges,
        SUM(
          CASE
            WHEN c.half_inning = 'Top' AND g.home_team_id = c.challenge_team_id THEN 1
            WHEN c.half_inning = 'Bottom' AND g.away_team_id = c.challenge_team_id THEN 1
            ELSE 0
          END
        ) AS defensive_challenges,
        AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS success_rate
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
      COALESCE(away.offensive_challenges::NUMERIC / NULLIF(away.games_with_challenges, 0), 0) AS away_offense,
      COALESCE(away.defensive_challenges::NUMERIC / NULLIF(away.games_with_challenges, 0), 0) AS away_defense,
      COALESCE(away.success_rate, 0) AS away_success,
      COALESCE(home.offensive_challenges::NUMERIC / NULLIF(home.games_with_challenges, 0), 0) AS home_offense,
      COALESCE(home.defensive_challenges::NUMERIC / NULLIF(home.games_with_challenges, 0), 0) AS home_defense,
      COALESCE(home.success_rate, 0) AS home_success
    FROM game_context gc
    LEFT JOIN team_stats away ON away.challenge_team_id = gc.away_team_id
    LEFT JOIN team_stats home ON home.challenge_team_id = gc.home_team_id
    `,
    [gamePk],
  );

  const context = contextRows[0];
  if (!context) return null;

  const [zoneRows, timingRows, historyRows, leagueRow, leagueTimingRows] = await Promise.all([
    context.umpire_id
      ? sql<ZoneRow>(
          `
          SELECT
            CASE
              WHEN COALESCE(c.pz, c.inferred_pz) >= ((COALESCE(c.strike_zone_top, c.inferred_strike_zone_top, 3.5) + COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom, 1.5)) / 2.0)
                THEN CASE WHEN COALESCE(c.px, c.inferred_px) < 0 THEN 'up_glove' ELSE 'up_arm' END
              ELSE CASE WHEN COALESCE(c.px, c.inferred_px) < 0 THEN 'down_glove' ELSE 'down_arm' END
            END AS bucket,
            COUNT(*) AS challenges,
            AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturn_rate
          FROM abs_challenges c
          JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
          WHERE o.official_id = $1
            AND COALESCE(c.px, c.inferred_px) IS NOT NULL
            AND COALESCE(c.pz, c.inferred_pz) IS NOT NULL
            AND COALESCE(c.strike_zone_top, c.inferred_strike_zone_top) IS NOT NULL
            AND COALESCE(c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NOT NULL
          GROUP BY 1
          `,
          [context.umpire_id],
        )
      : Promise.resolve([]),
    sql<TimingRow>(
      `
      SELECT
        c.challenge_team_id,
        c.inning,
        COUNT(*) AS challenges
      FROM abs_challenges c
      WHERE c.challenge_team_id IN ($1, $2)
        AND c.inning BETWEEN 1 AND 9
      GROUP BY c.challenge_team_id, c.inning
      `,
      [context.home_team_id, context.away_team_id],
    ),
    context.umpire_id
      ? sql<HistoryRow>(
          `
          SELECT
            c.challenge_team_id AS team_id,
            COUNT(DISTINCT c.game_pk) AS games,
            COUNT(*) AS challenges,
            AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturn_rate
          FROM abs_challenges c
          JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
          WHERE o.official_id = $1
            AND c.challenge_team_id IN ($2, $3)
          GROUP BY c.challenge_team_id
          `,
          [context.umpire_id, context.home_team_id, context.away_team_id],
        )
      : Promise.resolve([]),
    sql<{ league_average: number }>(
      `
      SELECT COALESCE(AVG(CASE WHEN is_overturned THEN 1.0 ELSE 0.0 END), 0)::NUMERIC AS league_average
      FROM abs_challenges
      `,
    ),
    sql<{ inning: number; avg_challenges: number }>(
      `
      WITH team_inning_counts AS (
        SELECT
          challenge_team_id,
          inning,
          COUNT(*) AS challenge_count
        FROM abs_challenges
        WHERE inning BETWEEN 1 AND 9
        GROUP BY challenge_team_id, inning
      ),
      team_totals AS (
        SELECT
          challenge_team_id,
          SUM(challenge_count) AS total_challenges
        FROM team_inning_counts
        GROUP BY challenge_team_id
      )
      SELECT
        tic.inning,
        AVG(
          CASE
            WHEN tt.total_challenges > 0 THEN tic.challenge_count::NUMERIC / tt.total_challenges
            ELSE 0
          END
        )::NUMERIC AS avg_challenges
      FROM team_inning_counts tic
      JOIN team_totals tt ON tt.challenge_team_id = tic.challenge_team_id
      GROUP BY inning
      ORDER BY inning ASC
      `,
    ),
  ]);

  const zoneMap = new Map(zoneRows.map((row) => [row.bucket, row]));
  const homeHistory = historyRows.find((row) => Number(row.team_id) === Number(context.home_team_id));
  const awayHistory = historyRows.find((row) => Number(row.team_id) === Number(context.away_team_id));
  const leagueAverage = Number(leagueRow[0]?.league_average ?? 0);

  return {
    homeTeamId: Number(context.home_team_id),
    awayTeamId: Number(context.away_team_id),
    umpireId: context.umpire_id,
    umpireName: context.umpire_name ?? "Unknown Umpire",
    awayTeam: {
      offensiveChallenges: Number(context.away_offense),
      defensiveChallenges: Number(context.away_defense),
      successRate: Number(context.away_success),
    },
    homeTeam: {
      offensiveChallenges: Number(context.home_offense),
      defensiveChallenges: Number(context.home_defense),
      successRate: Number(context.home_success),
    },
    umpireTendency: {
      lowZoneAccuracy: 1 - Number((zoneMap.get("down_glove")?.overturn_rate ?? zoneMap.get("down_arm")?.overturn_rate ?? leagueAverage)),
      highZoneAccuracy: 1 - Number((zoneMap.get("up_glove")?.overturn_rate ?? zoneMap.get("up_arm")?.overturn_rate ?? leagueAverage)),
      overallAccuracy: 1 - leagueAverage,
    },
    zoneBriefing: ([
      "up_glove",
      "up_arm",
      "down_glove",
      "down_arm",
    ] as const).map((bucket) => ({
      bucket,
      challenges: Number(zoneMap.get(bucket)?.challenges ?? 0),
      overturnRate: Number(zoneMap.get(bucket)?.overturn_rate ?? leagueAverage),
    })),
    challengeTiming: {
      home: toInningSeries(timingRows, Number(context.home_team_id)),
      away: toInningSeries(timingRows, Number(context.away_team_id)),
      leagueAverage: Array.from({ length: 9 }, (_, index) => {
        const row = leagueTimingRows.find((entry) => Number(entry.inning) === index + 1);
        return Number(row?.avg_challenges ?? 0);
      }),
    },
    teamHistoryVsUmpire: {
      home: {
        games: Number(homeHistory?.games ?? 0),
        challenges: Number(homeHistory?.challenges ?? 0),
        overturnRate: Number(homeHistory?.overturn_rate ?? leagueAverage),
      },
      away: {
        games: Number(awayHistory?.games ?? 0),
        challenges: Number(awayHistory?.challenges ?? 0),
        overturnRate: Number(awayHistory?.overturn_rate ?? leagueAverage),
      },
      leagueAverage,
    },
  };
}

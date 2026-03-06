import { sql } from "@/lib/db";
import { computeChallengeLeverageScore, rankChallengeMoments } from "@/lib/home-moments";
import type {
  ChallengeEvent,
  GameLiveStatus,
  GameReport,
  HomeChallengeMoment,
  LiveGameCard,
  RangeKey,
  SituationalFilters,
  TeamIdentity,
  TeamSideSplit,
  TeamSummary,
  TeamTrendPoint,
  UmpireProfile,
  UmpireSummary,
  UmpireTrendPoint,
} from "@/lib/types";

function rangeWhere(range: RangeKey, dateField = "g.game_date"): { clause: string; params: unknown[] } {
  if (range === "7d") {
    return { clause: `${dateField} >= NOW() - INTERVAL '7 days'`, params: [] };
  }
  if (range === "30d") {
    return { clause: `${dateField} >= NOW() - INTERVAL '30 days'`, params: [] };
  }
  if (range === "season") {
    return { clause: `g.season = EXTRACT(YEAR FROM NOW())::INT`, params: [] };
  }
  return { clause: "TRUE", params: [] };
}

function situationalWhere(filters?: SituationalFilters, alias = "c"): { clause: string; params: unknown[] } {
  let clauses = ["TRUE"];
  let params: unknown[] = [];

  if (!filters) return { clause: "TRUE", params: [] };

  if (filters.inningRange === "early") clauses.push(`${alias}.inning <= 3`);
  else if (filters.inningRange === "middle") clauses.push(`${alias}.inning BETWEEN 4 AND 6`);
  else if (filters.inningRange === "late") clauses.push(`${alias}.inning BETWEEN 7 AND 9`);
  else if (filters.inningRange === "extras") clauses.push(`${alias}.inning > 9`);

  if (filters.result === "overturned") clauses.push(`${alias}.is_overturned = TRUE`);
  else if (filters.result === "confirmed") clauses.push(`${alias}.is_overturned = FALSE`);

  // Leverage is tricky to do in SQL directly with the formula, 
  // but we can approximate for now if needed.
  // For simplicity in this step, focusing on the ones we strictly have columns for.

  return { clause: clauses.join(" AND "), params };
}

export async function getLiveGames(): Promise<LiveGameCard[]> {
  const rows = await sql<{
    gamepk: number;
    gamedate: string;
    status: string;
    detailedstate: string | null;
    hometeamid: number;
    hometeamname: string;
    hometeamabbreviation: string | null;
    hometeamlogourl: string | null;
    homescore: number | null;
    awayteamid: number;
    awayteamname: string;
    awayteamabbreviation: string | null;
    awayteamlogourl: string | null;
    awayscore: number | null;
    homeabsremaining: number;
    awayabsremaining: number;
    challengecount: number;
  }>(
    `
    SELECT
      g.game_pk AS gamePk,
      g.game_date AS gameDate,
      g.status_abstract AS status,
      g.status_detailed AS detailedState,
      g.home_team_id AS homeTeamId,
      home.name AS homeTeamName,
      home.abbreviation AS homeTeamAbbreviation,
      home.logo_svg_url AS homeTeamLogoUrl,
      g.home_score AS homeScore,
      g.away_team_id AS awayTeamId,
      away.name AS awayTeamName,
      away.abbreviation AS awayTeamAbbreviation,
      away.logo_svg_url AS awayTeamLogoUrl,
      g.away_score AS awayScore,
      COALESCE(home_sum.remaining, 0) AS homeAbsRemaining,
      COALESCE(away_sum.remaining, 0) AS awayAbsRemaining,
      COALESCE(ch.cnt, 0) AS challengeCount
    FROM games g
    LEFT JOIN teams home ON home.team_id = g.home_team_id
    LEFT JOIN teams away ON away.team_id = g.away_team_id
    LEFT JOIN team_abs_game_summary home_sum ON home_sum.game_pk = g.game_pk AND home_sum.team_side = 'home'
    LEFT JOIN team_abs_game_summary away_sum ON away_sum.game_pk = g.game_pk AND away_sum.team_side = 'away'
    LEFT JOIN (
      SELECT game_pk, COUNT(*) AS cnt FROM abs_challenges GROUP BY game_pk
    ) ch ON ch.game_pk = g.game_pk
    WHERE g.game_date >= NOW() - INTERVAL '2 day'
    ORDER BY CASE WHEN g.status_abstract = 'Live' THEN 0 ELSE 1 END, g.game_date DESC
    LIMIT 40
    `,
  );

  return rows.map((r) => ({
    gamePk: r.gamepk,
    gameDate: r.gamedate,
    status: r.status,
    detailedState: r.detailedstate,
    homeTeamId: r.hometeamid,
    homeTeamName: r.hometeamname,
    homeTeamAbbreviation: r.hometeamabbreviation,
    homeTeamLogoUrl: r.hometeamlogourl,
    homeScore: r.homescore,
    awayTeamId: r.awayteamid,
    awayTeamName: r.awayteamname,
    awayTeamAbbreviation: r.awayteamabbreviation,
    awayTeamLogoUrl: r.awayteamlogourl,
    awayScore: r.awayscore,
    homeAbsRemaining: Number(r.homeabsremaining ?? 0),
    awayAbsRemaining: Number(r.awayabsremaining ?? 0),
    challengeCount: Number(r.challengecount ?? 0),
  }));
}

export async function getHomeChallengeMoments(limit = 8): Promise<HomeChallengeMoment[]> {
  const rows = await sql<{
    challengeid: string;
    gamepk: number;
    challengedat: string | null;
    hometeam: string | null;
    awayteam: string | null;
    inning: number | null;
    halfinning: string | null;
    calleddescription: string | null;
    challengeteamname: string | null;
    isoverturned: boolean;
    homescore: number | null;
    awayscore: number | null;
  }>(
    `
    SELECT
      c.challenge_id AS challengeId,
      c.game_pk AS gamePk,
      c.challenged_at AS challengedAt,
      home.name AS homeTeam,
      away.name AS awayTeam,
      c.inning,
      c.half_inning AS halfInning,
      p.called_description AS calledDescription,
      challenge_team.name AS challengeTeamName,
      c.is_overturned AS isOverturned,
      c.home_score AS homeScore,
      c.away_score AS awayScore
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = c.pitch_number
    LEFT JOIN teams home ON home.team_id = g.home_team_id
    LEFT JOIN teams away ON away.team_id = g.away_team_id
    LEFT JOIN teams challenge_team ON challenge_team.team_id = c.challenge_team_id
    WHERE c.challenged_at >= NOW() - INTERVAL '48 hours'
    ORDER BY c.challenged_at DESC
    LIMIT $1
    `,
    [limit],
  );

  const moments = rows.map((r) => ({
    challengeId: r.challengeid,
    gamePk: Number(r.gamepk),
    challengedAt: r.challengedat,
    gameLabel: `${r.awayteam ?? "Away"} at ${r.hometeam ?? "Home"}`,
    inning: r.inning,
    halfInning: r.halfinning,
    calledDescription: r.calleddescription,
    challengeTeamName: r.challengeteamname,
    isOverturned: r.isoverturned,
    leverageScore: computeChallengeLeverageScore({
      inning: r.inning,
      homeScore: r.homescore,
      awayScore: r.awayscore,
      isOverturned: r.isoverturned,
    }),
  }));

  return rankChallengeMoments(moments);
}

export async function getGame(gamePk: number) {
  const rows = await sql<{
    gamepk: number;
    gamedate: string;
    statusabstract: string;
    statusdetailed: string | null;
    hometeamid: number;
    hometeamname: string;
    homescore: number | null;
    awayteamid: number;
    awayteamname: string;
    awayscore: number | null;
    homeabbreviation: string | null;
    awayabbreviation: string | null;
    homeprimarycolor: string | null;
    homesecondarycolor: string | null;
    awayprimarycolor: string | null;
    awaysecondarycolor: string | null;
    homelogosvgurl: string | null;
    awaylogosvgurl: string | null;
    venue: string | null;
  }>(
    `
    SELECT
      g.game_pk AS gamePk,
      g.game_date AS gameDate,
      g.status_abstract AS statusAbstract,
      g.status_detailed AS statusDetailed,
      g.home_team_id AS homeTeamId,
      home.name AS homeTeamName,
      g.home_score AS homeScore,
      g.away_team_id AS awayTeamId,
      away.name AS awayTeamName,
      g.away_score AS awayScore,
      home.abbreviation AS homeAbbreviation,
      away.abbreviation AS awayAbbreviation,
      home.primary_color AS homePrimaryColor,
      home.secondary_color AS homeSecondaryColor,
      away.primary_color AS awayPrimaryColor,
      away.secondary_color AS awaySecondaryColor,
      home.logo_svg_url AS homeLogoSvgUrl,
      away.logo_svg_url AS awayLogoSvgUrl,
      g.venue_name AS venue
    FROM games g
    LEFT JOIN teams home ON home.team_id = g.home_team_id
    LEFT JOIN teams away ON away.team_id = g.away_team_id
    WHERE g.game_pk = $1
    `,
    [gamePk],
  );
  return rows[0] ?? null;
}

export async function getGameAbsCounters(gamePk: number): Promise<{
  homeTeamId: number;
  awayTeamId: number;
  homeRemaining: number;
  awayRemaining: number;
} | null> {
  const rows = await sql<{
    hometeamid: number;
    awayteamid: number;
    homeremaining: number;
    awayremaining: number;
  }>(
    `
    SELECT
      g.home_team_id AS homeTeamId,
      g.away_team_id AS awayTeamId,
      COALESCE(home_sum.remaining, 0) AS homeRemaining,
      COALESCE(away_sum.remaining, 0) AS awayRemaining
    FROM games g
    LEFT JOIN team_abs_game_summary home_sum ON home_sum.game_pk = g.game_pk AND home_sum.team_side = 'home'
    LEFT JOIN team_abs_game_summary away_sum ON away_sum.game_pk = g.game_pk AND away_sum.team_side = 'away'
    WHERE g.game_pk = $1
    `,
    [gamePk],
  );

  const r = rows[0];
  if (!r) return null;
  return {
    homeTeamId: Number(r.hometeamid),
    awayTeamId: Number(r.awayteamid),
    homeRemaining: Number(r.homeremaining),
    awayRemaining: Number(r.awayremaining),
  };
}

export async function getGameLiveStatus(gamePk: number): Promise<GameLiveStatus | null> {
  const rows = await sql<{
    gamepk: number;
    statusabstract: string | null;
    inning: number | null;
    halfinning: string | null;
    balls: number | null;
    strikes: number | null;
    outs: number | null;
    homescore: number | null;
    awayscore: number | null;
    homeremaining: number;
    awayremaining: number;
    updatedat: string | null;
  }>(
    `
    SELECT
      g.game_pk AS gamePk,
      g.status_abstract AS statusAbstract,
      snap.inning,
      snap.half_inning AS halfInning,
      snap.balls,
      snap.strikes,
      snap.outs,
      COALESCE(snap.home_score, g.home_score) AS homeScore,
      COALESCE(snap.away_score, g.away_score) AS awayScore,
      COALESCE(home_sum.remaining, 0) AS homeRemaining,
      COALESCE(away_sum.remaining, 0) AS awayRemaining,
      snap.snapshot_time AS updatedAt
    FROM games g
    LEFT JOIN LATERAL (
      SELECT *
      FROM game_state_snapshots s
      WHERE s.game_pk = g.game_pk
      ORDER BY s.snapshot_time DESC
      LIMIT 1
    ) snap ON true
    LEFT JOIN team_abs_game_summary home_sum ON home_sum.game_pk = g.game_pk AND home_sum.team_side = 'home'
    LEFT JOIN team_abs_game_summary away_sum ON away_sum.game_pk = g.game_pk AND away_sum.team_side = 'away'
    WHERE g.game_pk = $1
    `,
    [gamePk],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    gamePk: Number(r.gamepk),
    statusAbstract: r.statusabstract,
    inning: r.inning,
    halfInning: r.halfinning,
    balls: r.balls,
    strikes: r.strikes,
    outs: r.outs,
    homeScore: r.homescore,
    awayScore: r.awayscore,
    homeRemaining: Number(r.homeremaining ?? 0),
    awayRemaining: Number(r.awayremaining ?? 0),
    updatedAt: r.updatedat,
    recentChallengeEvents: await getRecentGameChallenges(gamePk, 10),
  };
}

async function getRecentGameChallenges(
  gamePk: number,
  minutes: number,
): Promise<Array<{ challengedAt: string | null; isOverturned: boolean }>> {
  const rows = await sql<{ challengedat: string | null; isoverturned: boolean }>(
    `
    SELECT challenged_at AS challengedAt, is_overturned AS isOverturned
    FROM abs_challenges
    WHERE game_pk = $1
      AND challenged_at >= NOW() - ($2::text || ' minutes')::interval
    ORDER BY challenged_at ASC
    `,
    [gamePk, String(minutes)],
  );
  return rows.map((r) => ({
    challengedAt: r.challengedat,
    isOverturned: r.isoverturned,
  }));
}

export async function getGameChallenges(gamePk: number): Promise<ChallengeEvent[]> {
  const rows = await sql<{
    challenge_id: string;
    game_pk: number;
    challenged_at: string | null;
    inning: number | null;
    half_inning: string | null;
    balls: number | null;
    strikes: number | null;
    outs: number | null;
    bases_state: string | null;
    home_score: number | null;
    away_score: number | null;
    challenge_team_id: number | null;
    challenge_team_name: string | null;
    challenge_player_name: string | null;
    batter_name: string | null;
    pitcher_name: string | null;
    called_description: string | null;
    pitchnumber: number | null;
    pitchtype: string | null;
    startspeed: number | null;
    spinrate: number | null;
    is_overturned: boolean;
    px: number | null;
    pz: number | null;
    strike_zone_top: number | null;
    strike_zone_bottom: number | null;
  }>(
    `
    SELECT
      c.challenge_id,
      c.game_pk,
      c.challenged_at,
      c.inning,
      c.half_inning,
      c.balls,
      c.strikes,
      c.outs,
      c.bases_state,
      c.home_score,
      c.away_score,
      c.challenge_team_id,
      t.name AS challenge_team_name,
      c.challenge_player_name,
      c.batter_name,
      c.pitcher_name,
      p.called_description,
      c.pitch_number AS pitchNumber,
      p.pitch_type_description AS pitchType,
      p.start_speed AS startSpeed,
      p.spin_rate AS spinRate,
      c.is_overturned,
      c.px,
      c.pz,
      c.strike_zone_top,
      c.strike_zone_bottom
    FROM abs_challenges c
    LEFT JOIN teams t ON t.team_id = c.challenge_team_id
    LEFT JOIN pitches p
      ON p.game_pk = c.game_pk
      AND p.at_bat_index = c.at_bat_index
      AND p.pitch_number = c.pitch_number
    WHERE c.game_pk = $1
    ORDER BY challenged_at ASC NULLS LAST
    `,
    [gamePk],
  );

  return rows.map((r) => ({
    challengeId: r.challenge_id,
    gamePk: r.game_pk,
    challengedAt: r.challenged_at,
    inning: r.inning,
    halfInning: r.half_inning,
    balls: r.balls,
    strikes: r.strikes,
    outs: r.outs,
    basesState: r.bases_state,
    homeScore: r.home_score,
    awayScore: r.away_score,
    challengeTeamId: r.challenge_team_id,
    challengeTeamName: r.challenge_team_name,
    challengePlayerName: r.challenge_player_name,
    batterName: r.batter_name,
    pitcherName: r.pitcher_name,
    calledDescription: r.called_description,
    pitchNumber: r.pitchnumber,
    pitchType: r.pitchtype,
    startSpeed: r.startspeed === null ? null : Number(r.startspeed),
    spinRate: r.spinrate === null ? null : Number(r.spinrate),
    isOverturned: r.is_overturned,
    px: r.px === null ? null : Number(r.px),
    pz: r.pz === null ? null : Number(r.pz),
    strikeZoneTop: r.strike_zone_top === null ? null : Number(r.strike_zone_top),
    strikeZoneBottom: r.strike_zone_bottom === null ? null : Number(r.strike_zone_bottom),
  }));
}

export async function getUmpireLeaderboard(range: RangeKey = "season"): Promise<UmpireSummary[]> {
  const window = rangeWhere(range, "g.game_date");
  const rows = await sql<{
    umpireid: number;
    umpirename: string;
    challengedcalls: number;
    overturnedcalls: number;
    confirmedcalls: number;
    overturnrate: number;
    gamesworked: number;
  }>(
    `
    SELECT
      o.official_id AS umpireId,
      o.official_name AS umpireName,
      COALESCE(SUM(s.challenged_calls), 0) AS challengedCalls,
      COALESCE(SUM(s.overturned_calls), 0) AS overturnedCalls,
      COALESCE(SUM(s.confirmed_calls), 0) AS confirmedCalls,
      CASE WHEN SUM(s.challenged_calls) > 0
        THEN SUM(s.overturned_calls)::NUMERIC / SUM(s.challenged_calls)
        ELSE 0
      END AS overturnRate,
      COUNT(DISTINCT s.game_pk) AS gamesWorked
    FROM (SELECT DISTINCT official_id, official_name FROM officials WHERE official_type = 'Home Plate') o
    LEFT JOIN umpire_abs_game_summary s ON s.umpire_id = o.official_id
    LEFT JOIN games g ON g.game_pk = s.game_pk AND ${window.clause}
    GROUP BY o.official_id, o.official_name
    ORDER BY challengedCalls DESC, o.official_name ASC
    `,
    window.params,
  );

  return rows.map((r) => ({
    umpireId: r.umpireid,
    umpireName: r.umpirename,
    challengedCalls: Number(r.challengedcalls),
    overturnedCalls: Number(r.overturnedcalls),
    confirmedCalls: Number(r.confirmedcalls),
    overturnRate: Number(r.overturnrate),
    gamesWorked: Number(r.gamesworked),
  }));
}

export async function getUmpireSummary(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<UmpireSummary | null> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    umpireid: number;
    umpirename: string;
    challengedcalls: number;
    overturnedcalls: number;
    confirmedcalls: number;
    overturnrate: number;
    gamesworked: number;
  }>(
    `
    SELECT
      $1::INT AS umpireId,
      (SELECT official_name FROM officials WHERE official_id = $1 LIMIT 1) AS umpireName,
      COUNT(c.challenge_id) AS challengedCalls,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturnedCalls,
      COUNT(*) FILTER (WHERE c.is_overturned = FALSE AND c.challenge_id IS NOT NULL) AS confirmedCalls,
      CASE WHEN COUNT(c.challenge_id) > 0
        THEN COUNT(*) FILTER (WHERE c.is_overturned = TRUE)::NUMERIC / COUNT(c.challenge_id)
        ELSE 0
      END AS overturnRate,
      COUNT(DISTINCT c.game_pk) AS gamesWorked
    FROM (SELECT official_id FROM officials WHERE official_id = $1 LIMIT 1) o
    LEFT JOIN officials o2 ON o2.official_id = o.official_id AND o2.official_type = 'Home Plate'
    LEFT JOIN abs_challenges c ON c.game_pk = o2.game_pk
    LEFT JOIN games g ON g.game_pk = c.game_pk AND ${window.clause}
    WHERE o.official_id = $1
      AND (c.challenge_id IS NULL OR ${situational.clause})
    GROUP BY 1, 2
    `,
    [umpireId, ...window.params, ...situational.params],
  );

  const r = rows[0];
  if (!r) return null;
  return {
    umpireId: r.umpireid,
    umpireName: r.umpirename,
    challengedCalls: Number(r.challengedcalls),
    overturnedCalls: Number(r.overturnedcalls),
    confirmedCalls: Number(r.confirmedcalls),
    overturnRate: Number(r.overturnrate),
    gamesWorked: Number(r.gamesworked),
  };
}

export async function getUmpireProfile(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<UmpireProfile> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const [directionRows, zoneRows, hotspotRows] = await Promise.all([
    sql<{
      strike_to_ball: number;
      ball_to_strike: number;
      other_overturns: number;
      confirmed: number;
    }>(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE c.is_overturned = TRUE
            AND LOWER(COALESCE(p.called_description, '')) LIKE '%called strike%'
        ) AS strike_to_ball,
        COUNT(*) FILTER (
          WHERE c.is_overturned = TRUE
            AND LOWER(COALESCE(p.called_description, '')) LIKE '%ball%'
        ) AS ball_to_strike,
        COUNT(*) FILTER (
          WHERE c.is_overturned = TRUE
            AND LOWER(COALESCE(p.called_description, '')) NOT LIKE '%called strike%'
            AND LOWER(COALESCE(p.called_description, '')) NOT LIKE '%ball%'
        ) AS other_overturns,
        COUNT(*) FILTER (WHERE c.is_overturned = FALSE) AS confirmed
      FROM abs_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = c.pitch_number
      JOIN officials o ON o.game_pk = c.game_pk
      WHERE o.official_type = 'Home Plate'
        AND o.official_id = $1
        AND ${window.clause}
        AND ${situational.clause}
      `,
      [umpireId, ...window.params, ...situational.params],
    ),
    sql<{
      zone: "up" | "down" | "glove" | "arm";
      challenges: number;
      overturnrate: number;
    }>(
      `
      SELECT
        CASE
          WHEN ABS(c.px) >= ABS(
            ((c.pz - COALESCE(c.strike_zone_bottom, 1.5))
            / NULLIF((COALESCE(c.strike_zone_top, 3.5) - COALESCE(c.strike_zone_bottom, 1.5)), 0)) - 0.5
          )
            THEN CASE WHEN c.px < 0 THEN 'glove' ELSE 'arm' END
          ELSE CASE
            WHEN c.pz >= ((COALESCE(c.strike_zone_top, 3.5) + COALESCE(c.strike_zone_bottom, 1.5)) / 2.0) THEN 'up'
            ELSE 'down'
          END
        END AS zone,
        COUNT(*) AS challenges,
        AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturnRate
      FROM abs_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      JOIN officials o ON o.game_pk = c.game_pk
      WHERE o.official_type = 'Home Plate'
        AND o.official_id = $1
        AND c.px IS NOT NULL
        AND c.pz IS NOT NULL
        AND ${window.clause}
        AND ${situational.clause}
      GROUP BY 1
      ORDER BY challenges DESC
      `,
      [umpireId, ...window.params, ...situational.params],
    ),
    sql<{
      countkey: string;
      challenges: number;
      overturnrate: number;
    }>(
      `
      SELECT
        CONCAT(COALESCE(c.balls, 0), '-', COALESCE(c.strikes, 0)) AS countKey,
        COUNT(*) AS challenges,
        AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturnRate
      FROM abs_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      JOIN officials o ON o.game_pk = c.game_pk
      WHERE o.official_type = 'Home Plate'
        AND o.official_id = $1
        AND ${window.clause}
        AND ${situational.clause}
      GROUP BY 1
      ORDER BY challenges DESC
      LIMIT 6
      `,
      [umpireId, ...window.params, ...situational.params],
    ),
  ]);

  const direction = directionRows[0] ?? { strike_to_ball: 0, ball_to_strike: 0, other_overturns: 0, confirmed: 0 };

  return {
    directionalBias: {
      strikeToBall: Number(direction.strike_to_ball ?? 0),
      ballToStrike: Number(direction.ball_to_strike ?? 0),
      otherOverturns: Number(direction.other_overturns ?? 0),
      confirmed: Number(direction.confirmed ?? 0),
    },
    zoneBuckets: zoneRows.map((row) => ({
      zone: row.zone,
      challenges: Number(row.challenges),
      overturnRate: Number(row.overturnrate ?? 0),
    })),
    countHotspots: hotspotRows.map((row) => ({
      countKey: row.countkey,
      challenges: Number(row.challenges),
      overturnRate: Number(row.overturnrate ?? 0),
    })),
  };
}

export async function getTeamLeaderboard(range: RangeKey = "season"): Promise<TeamSummary[]> {
  const window = rangeWhere(range, "g.game_date");
  const rows = await sql<{
    teamid: number;
    teamname: string;
    gamestracked: number;
    usedsuccessful: number;
    usedfailed: number;
    challengestotal: number;
    avgremaining: number;
    overturnrate: number;
  }>(
    `
    SELECT
      t.team_id AS teamId,
      t.name AS teamName,
      COUNT(DISTINCT s.game_pk) AS gamesTracked,
      COALESCE(SUM(s.used_successful), 0) AS usedSuccessful,
      COALESCE(SUM(s.used_failed), 0) AS usedFailed,
      COALESCE(SUM(s.challenges_total), 0) AS challengesTotal,
      COALESCE(AVG(s.remaining), 0)::NUMERIC AS avgRemaining,
      CASE WHEN SUM(s.challenges_total) > 0
        THEN SUM(s.used_successful)::NUMERIC / SUM(s.challenges_total)
        ELSE 0
      END AS overturnRate
    FROM teams t
    LEFT JOIN team_abs_game_summary s ON s.team_id = t.team_id
    LEFT JOIN games g ON g.game_pk = s.game_pk AND ${window.clause}
    GROUP BY t.team_id, t.name
    ORDER BY challengesTotal DESC, t.name ASC
    `,
    window.params,
  );

  return rows.map((r) => ({
    teamId: r.teamid,
    teamName: r.teamname,
    gamesTracked: Number(r.gamestracked),
    usedSuccessful: Number(r.usedsuccessful),
    usedFailed: Number(r.usedfailed),
    challengesTotal: Number(r.challengestotal),
    avgRemaining: Number(r.avgremaining),
    overturnRate: Number(r.overturnrate),
  }));
}

export async function getTeamSummary(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<TeamSummary | null> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    teamid: number;
    teamname: string;
    gamestracked: number;
    usedsuccessful: number;
    usedfailed: number;
    challengestotal: number;
    avgremaining: number;
    overturnrate: number;
  }>(
    `
    SELECT
      $1::INT AS teamId,
      t.name AS teamName,
      COUNT(DISTINCT c.game_pk) AS gamesTracked,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS usedSuccessful,
      COUNT(*) FILTER (WHERE c.is_overturned = FALSE) AS usedFailed,
      COUNT(*) FILTER (WHERE c.challenge_id IS NOT NULL) AS challengesTotal,
      COALESCE(AVG(s.remaining), 0)::NUMERIC AS avgRemaining,
      CASE WHEN COUNT(c.challenge_id) > 0
        THEN COUNT(*) FILTER (WHERE c.is_overturned = TRUE)::NUMERIC / COUNT(c.challenge_id)
        ELSE 0
      END AS overturnRate
    FROM teams t
    LEFT JOIN abs_challenges c ON c.challenge_team_id = t.team_id
    LEFT JOIN games g ON g.game_pk = c.game_pk AND ${window.clause}
    LEFT JOIN team_abs_game_summary s ON s.game_pk = c.game_pk AND s.team_id = t.team_id
    WHERE t.team_id = $1
      AND (c.challenge_id IS NULL OR ${situational.clause})
    GROUP BY t.name
    `,
    [teamId, ...window.params, ...situational.params],
  );

  const r = rows[0];
  if (!r) return null;
  return {
    teamId: r.teamid,
    teamName: r.teamname,
    gamesTracked: Number(r.gamestracked),
    usedSuccessful: Number(r.usedsuccessful),
    usedFailed: Number(r.usedfailed),
    challengesTotal: Number(r.challengestotal),
    avgRemaining: Number(r.avgremaining),
    overturnRate: Number(r.overturnrate),
  };
}

export async function getTeamIdentity(teamId: number): Promise<TeamIdentity | null> {
  const rows = await sql<{
    teamid: number;
    teamname: string;
    abbreviation: string;
    primarycolor: string | null;
    secondarycolor: string | null;
    logosvgurl: string | null;
  }>(
    `
    SELECT
      t.team_id AS teamId,
      t.name AS teamName,
      t.abbreviation AS abbreviation,
      t.primary_color AS primaryColor,
      t.secondary_color AS secondaryColor,
      t.logo_svg_url AS logoSvgUrl
    FROM teams t
    WHERE t.team_id = $1
    `,
    [teamId],
  );

  const row = rows[0];
  if (!row) return null;
  return {
    teamId: Number(row.teamid),
    teamName: row.teamname,
    abbreviation: row.abbreviation,
    primaryColor: row.primarycolor,
    secondaryColor: row.secondarycolor,
    logoSvgUrl: row.logosvgurl,
  };
}

export async function getTeamTrend(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<TeamTrendPoint[]> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    gamepk: number;
    gamedate: string;
    ishome: boolean;
    hometeamid: number;
    awayteamid: number;
    homeabbr: string;
    awayabbr: string;
    opponentname: string | null;
    usedsuccessful: number;
    usedfailed: number;
    challengestotal: number;
    remaining: number;
  }>(
    `
    SELECT
      c.game_pk AS gamePk,
      g.game_date AS gameDate,
      (g.home_team_id = $1) AS isHome,
      g.home_team_id AS homeTeamId,
      g.away_team_id AS awayTeamId,
      home.abbreviation AS homeAbbr,
      away.abbreviation AS awayAbbr,
      CASE WHEN g.home_team_id = $1 THEN away.name ELSE home.name END AS opponentName,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS usedSuccessful,
      COUNT(*) FILTER (WHERE c.is_overturned = FALSE) AS usedFailed,
      COUNT(*) AS challengesTotal,
      COALESCE(s.remaining, 0) AS remaining
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN teams home ON home.team_id = g.home_team_id
    LEFT JOIN teams away ON away.team_id = g.away_team_id
    LEFT JOIN team_abs_game_summary s ON s.game_pk = c.game_pk AND s.team_id = $1
    WHERE c.challenge_team_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY c.game_pk, g.game_date, g.home_team_id, g.away_team_id, home.abbreviation, away.abbreviation, away.name, home.name, s.remaining
    ORDER BY g.game_date DESC
    LIMIT 24
    `,
    [teamId, ...window.params, ...situational.params],
  );

  return rows.map((r) => ({
    gamePk: Number(r.gamepk),
    gameDate: r.gamedate,
    isHome: Boolean(r.ishome),
    homeTeamId: Number(r.hometeamid),
    awayTeamId: Number(r.awayteamid),
    homeTeamAbbr: r.homeabbr ?? "???",
    awayTeamAbbr: r.awayabbr ?? "???",
    opponentName: r.opponentname ?? "Unknown",
    usedSuccessful: Number(r.usedsuccessful),
    usedFailed: Number(r.usedfailed),
    challengesTotal: Number(r.challengestotal),
    remaining: Number(r.remaining),
  }));
}

export async function getTeamSideSplits(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<TeamSideSplit[]> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    side: "home" | "away";
    games: number;
    usedsuccessful: number;
    usedfailed: number;
    challengestotal: number;
    avgremaining: number;
    overturnrate: number;
  }>(
    `
    SELECT
      CASE WHEN g.home_team_id = $1 THEN 'home' ELSE 'away' END AS side,
      COUNT(DISTINCT c.game_pk) AS games,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS usedSuccessful,
      COUNT(*) FILTER (WHERE c.is_overturned = FALSE) AS usedFailed,
      COUNT(*) AS challengesTotal,
      AVG(s.remaining)::NUMERIC AS avgRemaining,
      CASE WHEN COUNT(*) > 0 
        THEN COUNT(*) FILTER (WHERE c.is_overturned = TRUE)::NUMERIC / COUNT(*)
        ELSE 0
      END AS overturnRate
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN team_abs_game_summary s ON s.game_pk = c.game_pk AND s.team_id = $1
    WHERE c.challenge_team_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY 1
    `,
    [teamId, ...window.params, ...situational.params],
  );

  return rows.map((r) => ({
    side: r.side,
    games: Number(r.games),
    usedSuccessful: Number(r.usedsuccessful),
    usedFailed: Number(r.usedfailed),
    challengesTotal: Number(r.challengestotal),
    avgRemaining: Number(r.avgremaining),
    overturnRate: Number(r.overturnrate),
  }));
}

export async function getGameReport(gamePk: number): Promise<GameReport | null> {
  const rows = await sql<{
    gamepk: number;
    generatedat: string;
    narrativemd: string;
    chart_spec: unknown;
  }>(
    `
    SELECT game_pk, generated_at, narrative_md, chart_spec
    FROM game_reports
    WHERE game_pk = $1
    `,
    [gamePk],
  );

  const r = rows[0];
  if (!r) return null;
  return {
    gamePk: r.gamepk,
    generatedAt: r.generatedat,
    narrativeMd: r.narrativemd,
    chartSpec: r.chart_spec,
  };
}

export async function getUmpireTrend(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<UmpireTrendPoint[]> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    gamepk: number;
    gamedate: string;
    hometeamid: number;
    awayteamid: number;
    hometeamabbr: string;
    awayteamabbr: string;
    challenged_calls: number;
    overturned_calls: number;
    confirmed_calls: number;
  }>(
    `
    SELECT
      c.game_pk AS gamePk,
      g.game_date AS gameDate,
      g.home_team_id AS homeTeamId,
      g.away_team_id AS awayTeamId,
      home.abbreviation AS homeTeamAbbr,
      away.abbreviation AS awayTeamAbbr,
      COUNT(*) AS challenged_calls,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturned_calls,
      COUNT(*) FILTER (WHERE c.is_overturned = FALSE) AS confirmed_calls
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
    LEFT JOIN teams home ON home.team_id = g.home_team_id
    LEFT JOIN teams away ON away.team_id = g.away_team_id
    WHERE o.official_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY c.game_pk, g.game_date, g.home_team_id, g.away_team_id, home.abbreviation, away.abbreviation
    ORDER BY g.game_date DESC
    LIMIT 20
    `,
    [umpireId, ...window.params, ...situational.params],
  );

  return rows.map((r) => {
    const total = Number(r.challenged_calls);
    const overturned = Number(r.overturned_calls);
    const confirmed = Number(r.confirmed_calls);
    // Accuracy = confirmed / total
    const accuracy = total > 0 ? confirmed / total : 1.0;

    return {
      gamePk: Number(r.gamepk),
      gameDate: r.gamedate,
      homeTeamId: Number(r.hometeamid),
      awayTeamId: Number(r.awayteamid),
      homeTeamAbbr: r.hometeamabbr ?? "???",
      awayTeamAbbr: r.awayteamabbr ?? "???",
      accuracy,
      challengedCount: total,
      overturnedCount: overturned,
    };
  });
}

export async function getTeamAggression(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<Array<{ category: string, count: number, rate: number }>> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    category: string;
    count: number;
    overturn_rate: number;
  }>(
    `
    SELECT
      CASE
        WHEN c.inning <= 3 THEN 'Early (1-3)'
        WHEN c.inning BETWEEN 4 AND 6 THEN 'Middle (4-6)'
        WHEN c.inning BETWEEN 7 AND 9 THEN 'Late (7-9)'
        ELSE 'Extras'
      END AS category,
      COUNT(*) AS count,
      AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturn_rate
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    WHERE c.challenge_team_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY 1
    UNION ALL
    SELECT
      CASE WHEN (g.home_team_id = $1 AND c.half_inning = 'Bottom') OR (g.away_team_id = $1 AND c.half_inning = 'Top') THEN 'Offense' ELSE 'Defense' END AS category,
      COUNT(*) AS count,
      AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturn_rate
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    WHERE c.challenge_team_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY 1
    `,
    [teamId, ...window.params, ...situational.params],
  );

  return rows.map(r => ({
    category: r.category,
    count: Number(r.count),
    rate: Number(r.overturn_rate)
  }));
}

export async function getUmpireChallenges(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<ChallengeEvent[]> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<any>(
    `
    SELECT
      c.challenge_id AS challengeId,
      c.game_pk AS gamePk,
      c.at_bat_index AS atBatIndex,
      c.pitch_number AS pitchNumber,
      c.inning,
      c.half_inning AS halfInning,
      c.is_overturned AS isOverturned,
      p.called_description AS calledDescription,
      c.px,
      c.pz,
      c.strike_zone_top AS strikeZoneTop,
      c.strike_zone_bottom AS strikeZoneBottom,
      c.challenged_at AS challengedAt,
      c.balls,
      c.strikes,
      c.outs,
      p.pitch_type_description AS pitchType,
      t.name AS challengeTeamName
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = c.pitch_number
    JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
    LEFT JOIN teams t ON t.team_id = c.challenge_team_id
    WHERE o.official_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    ORDER BY c.challenged_at DESC
    `,
    [umpireId, ...window.params, ...situational.params],
  );

  return rows.map((r: any) => ({
    challengeId: r.challengeid,
    gamePk: Number(r.gamepk),
    atBatIndex: Number(r.atbatindex),
    pitchNumber: Number(r.pitchnumber),
    inning: Number(r.inning),
    halfInning: r.halfinning,
    isOverturned: Boolean(r.isoverturned),
    calledDescription: r.calleddescription,
    px: Number(r.px),
    pz: Number(r.pz),
    strikeZoneTop: Number(r.strikezonetop),
    strikeZoneBottom: Number(r.strikezonebottom),
    challengedAt: r.challengedat,
    challengeTeamName: r.challengeteamname,
    balls: r.balls,
    strikes: r.strikes,
    outs: r.outs,
    pitchType: r.pitchtype,
    // Add nulls for required but unused fields in this context
    basesState: null,
    homeScore: null,
    awayScore: null,
    challengeTeamId: null,
    challengePlayerName: null,
    batterName: null,
    pitcherName: null,
    startSpeed: null,
    spinRate: null,
  }));
}

export async function getTeamMemories(
  teamId: number,
  limit = 5,
  filters?: SituationalFilters
): Promise<Array<{
  gamePk: number,
  inning: number,
  description: string,
  title: string,
  result: 'overturned' | 'confirmed',
  date: string
}>> {
  const situational = situationalWhere(filters, "c");
  const rows = await sql<any>(
    `
    SELECT
      c.game_pk AS gamePk,
      c.inning,
      c.is_overturned,
      p.called_description,
      g.game_date,
      h.abbreviation AS home_abbr,
      a.abbreviation AS away_abbr
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = c.pitch_number
    JOIN teams h ON h.team_id = g.home_team_id
    JOIN teams a ON a.team_id = g.away_team_id
    WHERE c.challenge_team_id = $1
      AND ${situational.clause}
    ORDER BY g.game_date DESC, c.inning DESC
    LIMIT $2
    `,
    [teamId, limit, ...situational.params],
  );

  return rows.map((r: any) => {
    const isOverturned = Boolean(r.is_overturned);
    const result = isOverturned ? 'overturned' : 'confirmed';
    const matchup = `${r.away_abbr} @ ${r.home_abbr}`;

    // Construct a narrative title
    let title = isOverturned ? 'Crucial Overturn' : 'Stands as Called';
    if (Number(r.inning) >= 8) title = isOverturned ? 'Clutch Late Inning Save' : 'Heartbreaker';

    const calledDesc = r.called_description ? r.called_description : 'Pitch Event';
    return {
      gamePk: Number(r.gamepk),
      inning: Number(r.inning),
      description: `${calledDesc} in the ${r.inning}th inning against ${r.away_abbr === matchup.split(' @ ')[0] ? r.home_abbr : r.away_abbr}.`,
      title,
      result,
      date: new Date(r.game_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });
}

export async function getTeamSchedule(teamId: number, season = 2026): Promise<any[]> {
  const rows = await sql<any>(
    `
    SELECT 
      g.game_pk AS gamePk,
      g.game_date AS gameDate,
      g.status_abstract AS status,
      g.home_team_id AS homeTeamId,
      g.away_team_id AS awayTeamId,
      home.abbreviation AS homeAbbr,
      away.abbreviation AS awayAbbr,
      home.logo_svg_url AS homeLogoUrl,
      away.logo_svg_url AS awayLogoUrl
    FROM games g
    JOIN teams home ON home.team_id = g.home_team_id
    JOIN teams away ON away.team_id = g.away_team_id
    WHERE (g.home_team_id = $1 OR g.away_team_id = $1)
      AND EXTRACT(YEAR FROM g.game_date) = $2
    ORDER BY g.game_date ASC
    `,
    [teamId, season]
  );
  return rows.map(r => ({
    gamePk: Number(r.gamepk),
    gameDate: r.gamedate,
    status: r.status,
    homeTeamId: Number(r.hometeamid),
    awayTeamId: Number(r.awayteamid),
    homeAbbr: r.homeabbr,
    awayAbbr: r.awayabbr,
    homeLogoUrl: r.homelogourl,
    awayLogoUrl: r.awaylogourl
  }));
}

export async function getUmpirePerformanceDNA(umpireId: number, range: RangeKey = "season"): Promise<any> {
  const window = rangeWhere(range, "g.game_date");
  const rhythm = await sql<any>(
    `
        SELECT 
            c.inning,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturned,
            CASE WHEN COUNT(*) > 0 
                THEN COUNT(*) FILTER (WHERE c.is_overturned = FALSE)::NUMERIC / COUNT(*)
                ELSE 1.0
            END AS accuracy
        FROM abs_challenges c
        JOIN games g ON g.game_pk = c.game_pk
        JOIN officials o ON o.game_pk = c.game_pk AND o.official_id = $1 AND o.official_type = 'Home Plate'
        WHERE ${window.clause}
        GROUP BY c.inning
        ORDER BY c.inning ASC
        `,
    [umpireId, ...window.params]
  );

  const extremes = await sql<any>(
    `
        SELECT 
            c.challenge_id AS challengeId,
            c.game_pk AS gamePk,
            c.inning,
            c.px,
            c.pz,
            c.strike_zone_top,
            c.strike_zone_bottom,
            c.is_overturned,
            p.called_description,
            ABS(c.px) + ABS(c.pz - (c.strike_zone_top + c.strike_zone_bottom)/2) AS miss_distance
        FROM abs_challenges c
        JOIN games g ON g.game_pk = c.game_pk
        JOIN officials o ON o.game_pk = c.game_pk AND o.official_id = $1 AND o.official_type = 'Home Plate'
        LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = c.pitch_number
        WHERE ${window.clause}
        ORDER BY miss_distance DESC
        LIMIT 10
        `,
    [umpireId, ...window.params]
  );

  return {
    rhythm: rhythm.map((r: any) => ({
      inning: Number(r.inning),
      total: Number(r.total),
      overturned: Number(r.overturned),
      accuracy: Number(r.accuracy)
    })),
    extremes: extremes.map((r: any) => ({
      challengeId: r.challengeid,
      gamePk: Number(r.gamepk),
      inning: Number(r.inning),
      px: Number(r.px),
      pz: Number(r.pz),
      szTop: Number(r.strike_zone_top),
      szBottom: Number(r.strike_zone_bottom),
      isOverturned: Boolean(r.is_overturned),
      calledDescription: r.called_description,
      missDistance: Number(r.miss_distance)
    }))
  };
}

export async function getTeamUmpireMatchups(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<Array<{ umpireId: number; umpireName: string; challengesTotal: number; usedSuccessful: number; overturnRate: number; }>> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    umpire_id: number;
    official_name: string;
    challengestotal: number;
    usedsuccessful: number;
    overturnrate: number;
  }>(
    `
    SELECT
      o.official_id AS umpire_id,
      o.official_name,
      COUNT(*) AS challengestotal,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS usedsuccessful,
      AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturnrate
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
    WHERE c.challenge_team_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY o.official_id, o.official_name
    ORDER BY challengestotal DESC
    LIMIT 10
    `,
    [teamId, ...window.params, ...situational.params],
  );

  return rows.map((r) => ({
    umpireId: r.umpire_id,
    umpireName: r.official_name,
    challengesTotal: Number(r.challengestotal),
    usedSuccessful: Number(r.usedsuccessful),
    overturnRate: Number(r.overturnrate),
  }));
}

export type HittersEyeZone = "Top-L" | "Top-M" | "Top-R" | "Mid-L" | "Mid-M" | "Mid-R" | "Bot-L" | "Bot-M" | "Bot-R";

export async function getTeamHitterEyeHeatmap(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<Array<{ zone: HittersEyeZone; challenges: number; overturnRate: number; }>> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");

  // A standard strike zone is roughly +/- 8.5 inches (0.708 feet) horizontally.
  // nx represents horizontal position mapped such that [-1, 1] is the width of the plate.
  // nz represents vertical position mapped such that [0, 1] is bottom-to-top of strike zone.

  const rows = await sql<{
    zone: string;
    challenges: number;
    overturn_rate: number;
  }>(
    `
    WITH normalized AS (
      SELECT
        CASE WHEN c.px < -0.236 THEN 'L' WHEN c.px > 0.236 THEN 'R' ELSE 'M' END AS x_tier,
        CASE 
          WHEN (c.pz - c.strike_zone_bottom) / NULLIF(c.strike_zone_top - c.strike_zone_bottom, 0) > 0.66 THEN 'Top'
          WHEN (c.pz - c.strike_zone_bottom) / NULLIF(c.strike_zone_top - c.strike_zone_bottom, 0) < 0.33 THEN 'Bot'
          ELSE 'Mid'
        END AS z_tier,
        c.is_overturned
      FROM abs_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      WHERE c.challenge_team_id = $1
        AND (
          (g.home_team_id = $1 AND c.half_inning = 'Bottom') OR
          (g.away_team_id = $1 AND c.half_inning = 'Top')
        )
        AND c.px IS NOT NULL
        AND c.pz IS NOT NULL
        AND c.strike_zone_top IS NOT NULL
        AND c.strike_zone_bottom IS NOT NULL
        AND ${window.clause}
        AND ${situational.clause}
    )
    SELECT
      CONCAT(z_tier, '-', x_tier) AS zone,
      COUNT(*) AS challenges,
      AVG(CASE WHEN is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturn_rate
    FROM normalized
    GROUP BY z_tier, x_tier
    `,
    [teamId, ...window.params, ...situational.params],
  );

  return rows.map(r => ({
    zone: r.zone as HittersEyeZone,
    challenges: Number(r.challenges),
    overturnRate: Number(r.overturn_rate),
  }));
}

export async function getTeamPitchingBailouts(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<Array<{ pitcherName: string; bailouts: number; totalChallenges: number; }>> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");

  const rows = await sql<{
    pitcher_name: string;
    bailouts: number;
    total_challenges: number;
  }>(
    `
    SELECT
      COALESCE(c.pitcher_name, 'Unknown Pitcher') AS pitcher_name,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS bailouts,
      COUNT(*) AS total_challenges
    FROM abs_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    WHERE c.challenge_team_id = $1
      AND (
        (g.home_team_id = $1 AND c.half_inning = 'Top') OR
        (g.away_team_id = $1 AND c.half_inning = 'Bottom')
      )
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY COALESCE(c.pitcher_name, 'Unknown Pitcher')
    HAVING COUNT(*) FILTER (WHERE c.is_overturned = TRUE) > 0
    ORDER BY bailouts DESC, total_challenges ASC
    LIMIT 5
    `,
    [teamId, ...window.params, ...situational.params],
  );

  return rows.map(r => ({
    pitcherName: r.pitcher_name,
    bailouts: Number(r.bailouts),
    totalChallenges: Number(r.total_challenges),
  }));
}

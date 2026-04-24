import fs from "node:fs";
import path from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

function loadEnvFile(filename: string) {
  const fullPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(fullPath)) return;

  const content = fs.readFileSync(fullPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;

    const key = line.slice(0, separator).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\$\{([^}]+)\}/g, (_, ref: string) => process.env[ref] ?? "");
    process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

// Route-level chart audits should always hit the serving database the app reads from.
if (process.env.SERVING_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.SERVING_DATABASE_URL;
}

type SqlFn = <T extends Record<string, unknown>>(query: string, values?: unknown[]) => Promise<T[]>;

type SampleIds = {
  previewGamePk: number | null;
  finalGamePk: number | null;
  liveGamePk: number | null;
  teamId: number | null;
  umpireId: number | null;
};

let sql: SqlFn;
let getLiveGames: typeof import("@/lib/data").getLiveGames;
let getHomeChallengeMoments: typeof import("@/lib/data").getHomeChallengeMoments;
let getTeamLeaderboardModel: typeof import("@/lib/data").getTeamLeaderboardModel;
let getTeamTrendSparklines: typeof import("@/lib/data").getTeamTrendSparklines;
let getTeamSummary: typeof import("@/lib/data").getTeamSummary;
let getTeamTrend: typeof import("@/lib/data").getTeamTrend;
let getTeamAggression: typeof import("@/lib/data").getTeamAggression;
let getTeamInningEfficiency: typeof import("@/lib/data").getTeamInningEfficiency;
let getTeamSideSplits: typeof import("@/lib/data").getTeamSideSplits;
let getTeamSchedule: typeof import("@/lib/data").getTeamSchedule;
let getTeamUmpireMatchups: typeof import("@/lib/data").getTeamUmpireMatchups;
let getTeamChallengeValueSummary: typeof import("@/lib/data").getTeamChallengeValueSummary;
let getTeamDecisionValueReport: typeof import("@/lib/data").getTeamDecisionValueReport;
let getTeamPitchingBailouts: typeof import("@/lib/data").getTeamPitchingBailouts;
let getUmpireLeaderboardModel: typeof import("@/lib/data").getUmpireLeaderboardModel;
let getUmpireSummary: typeof import("@/lib/data").getUmpireSummary;
let getUmpireProfile: typeof import("@/lib/data").getUmpireProfile;
let getUmpireTrend: typeof import("@/lib/data").getUmpireTrend;
let getUmpirePageChallengeEvents: typeof import("@/lib/data").getUmpirePageChallengeEvents;
let getUmpirePerformanceDNA: typeof import("@/lib/data").getUmpirePerformanceDNA;
let getUmpireSeasonTrend: typeof import("@/lib/data").getUmpireSeasonTrend;
let getUmpireMatchupVulnerabilities: typeof import("@/lib/data").getUmpireMatchupVulnerabilities;
let getGame: typeof import("@/lib/data").getGame;
let getGameScoreboardData: typeof import("@/lib/data").getGameScoreboardData;
let getGameAbsCounters: typeof import("@/lib/data").getGameAbsCounters;
let getGameLiveStatus: typeof import("@/lib/data").getGameLiveStatus;
let getGameChallenges: typeof import("@/lib/data").getGameChallenges;
let getGamePageChallengeEvents: typeof import("@/lib/data").getGamePageChallengeEvents;
let getGameChallengeValueTimeline: typeof import("@/lib/data").getGameChallengeValueTimeline;
let getGameTeamChallengeComparison: typeof import("@/lib/data").getGameTeamChallengeComparison;
let getGameUmpireInGameSummary: typeof import("@/lib/data").getGameUmpireInGameSummary;
let getGameChallengeOpportunityBoard: typeof import("@/lib/data").getGameChallengeOpportunityBoard;
let getLiveChallengeWindow: typeof import("@/lib/data").getLiveChallengeWindow;
let getGamePregameIntel: typeof import("@/lib/pregame-intel").getGamePregameIntel;

let sampleIds: SampleIds;
let schemaReady = false;

beforeAll(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV ?? "test";

  ({ sql } = await import("@/lib/db"));
  const relationRows = await sql<{ exists: boolean }>(
    "SELECT to_regclass('public.mart_abs_pitch_challenges') IS NOT NULL AS exists",
  );
  schemaReady = Boolean(relationRows[0]?.exists);
  if (!schemaReady) {
    sampleIds = {
      previewGamePk: null,
      finalGamePk: null,
      liveGamePk: null,
      teamId: null,
      umpireId: null,
    };
    return;
  }

  ({
    getLiveGames,
    getHomeChallengeMoments,
    getTeamLeaderboardModel,
    getTeamTrendSparklines,
    getTeamSummary,
    getTeamTrend,
    getTeamAggression,
    getTeamInningEfficiency,
    getTeamSideSplits,
    getTeamSchedule,
    getTeamUmpireMatchups,
    getTeamChallengeValueSummary,
    getTeamDecisionValueReport,
    getTeamPitchingBailouts,
    getUmpireLeaderboardModel,
    getUmpireSummary,
    getUmpireProfile,
    getUmpireTrend,
    getUmpirePageChallengeEvents,
    getUmpirePerformanceDNA,
    getUmpireSeasonTrend,
    getUmpireMatchupVulnerabilities,
    getGame,
    getGameScoreboardData,
    getGameAbsCounters,
    getGameLiveStatus,
    getGameChallenges,
    getGamePageChallengeEvents,
    getGameChallengeValueTimeline,
    getGameTeamChallengeComparison,
    getGameUmpireInGameSummary,
    getGameChallengeOpportunityBoard,
    getLiveChallengeWindow,
  } = await import("@/lib/data"));

  ({ getGamePregameIntel } = await import("@/lib/pregame-intel"));

  const [previewGame, finalGame, liveGame, topTeam, topUmpire] = await Promise.all([
    sql<{ gamepk: number }>(
      `
      SELECT g.game_pk AS gamePk
      FROM games g
      WHERE g.status_abstract IN ('Preview', 'Warmup')
      ORDER BY ABS(EXTRACT(EPOCH FROM (g.game_date - NOW()))) ASC, g.game_pk ASC
      LIMIT 1
      `,
    ),
    sql<{ gamepk: number }>(
      `
      SELECT g.game_pk AS gamePk
      FROM games g
      JOIN mart_abs_pitch_challenges c ON c.game_pk = g.game_pk
      WHERE g.status_abstract IN ('Final', 'Game Over')
      GROUP BY g.game_pk, g.game_date
      ORDER BY g.game_date DESC, g.game_pk DESC
      LIMIT 1
      `,
    ),
    sql<{ gamepk: number }>(
      `
      SELECT g.game_pk AS gamePk
      FROM games g
      JOIN mart_abs_pitch_challenges c ON c.game_pk = g.game_pk
      WHERE g.status_abstract NOT IN ('Preview', 'Warmup', 'Final', 'Game Over')
      GROUP BY g.game_pk, g.game_date
      ORDER BY g.game_date DESC, g.game_pk DESC
      LIMIT 1
      `,
    ),
    sql<{ teamid: number }>(
      `
      SELECT c.challenge_team_id AS teamId
      FROM mart_abs_pitch_challenges c
      GROUP BY c.challenge_team_id
      ORDER BY COUNT(*) DESC, c.challenge_team_id ASC
      LIMIT 1
      `,
    ),
    sql<{ umpireid: number }>(
      `
      SELECT o.official_id AS umpireId
      FROM mart_abs_pitch_challenges c
      JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
      GROUP BY o.official_id
      ORDER BY COUNT(*) DESC, o.official_id ASC
      LIMIT 1
      `,
    ),
  ]);

  sampleIds = {
    previewGamePk: previewGame[0]?.gamepk ? Number(previewGame[0].gamepk) : null,
    finalGamePk: finalGame[0]?.gamepk ? Number(finalGame[0].gamepk) : null,
    liveGamePk: liveGame[0]?.gamepk ? Number(liveGame[0].gamepk) : null,
    teamId: topTeam[0]?.teamid ? Number(topTeam[0].teamid) : null,
    umpireId: topUmpire[0]?.umpireid ? Number(topUmpire[0].umpireid) : null,
  };
});

function skipIfSchemaMissing() {
  if (!schemaReady) {
    console.warn("Skipping chart data audit because mart_abs_pitch_challenges is not installed in the configured DB.");
    return true;
  }
  return false;
}

function skipIfSlowChartAuditDisabled(scope: string) {
  if (process.env.RUN_SLOW_CHART_AUDIT === "1") return false;
  console.warn(`Skipping ${scope} chart audit; set RUN_SLOW_CHART_AUDIT=1 to run deep route hydration checks.`);
  return true;
}

function expectNonEmptyNumericSeries(values: number[], label: string) {
  expect(values.length, `${label} should not be empty`).toBeGreaterThan(0);
  expect(values.some((value) => Number.isFinite(value)), `${label} should contain finite values`).toBe(true);
}

describe("chart data audit", () => {
  it("hydrates home fan/org route chart sources with real leaderboard data", async () => {
    if (skipIfSchemaMissing()) return;
    const [liveGames, moments, teamsFan, teamsOrg, umpires] = await Promise.all([
      getLiveGames(),
      getHomeChallengeMoments(12),
      getTeamLeaderboardModel("season", { includeDecisionMetrics: false, includeValueMetrics: false }),
      getTeamLeaderboardModel("season", { includeDecisionMetrics: true, includeValueMetrics: true }),
      getUmpireLeaderboardModel("season"),
    ]);

    expect(Array.isArray(liveGames)).toBe(true);
    expect(moments.length).toBeGreaterThan(0);
    expect(teamsFan.length).toBeGreaterThanOrEqual(30);
    expect(teamsFan.some((team) => team.challengesTotal > 0)).toBe(true);
    expect(teamsOrg.length).toBeGreaterThanOrEqual(30);
    expect(teamsOrg.some((team) => team.decisionSurplus !== null || team.avgRunExpectancyDelta !== null)).toBe(true);
    expect(umpires.length).toBeGreaterThan(0);
    expect(umpires.some((umpire) => umpire.challengedCalls > 0)).toBe(true);
    expect(umpires.every((umpire) => umpire.umpireName !== "Home Plate")).toBe(true);
    expect(
      umpires.some((umpire) => umpire.averageWinExpectancyDelta !== null || umpire.averageRunExpectancyDelta !== null),
      "home org umpire summaries should not drop all modeled WE/RE value fields",
    ).toBe(true);
  }, 30_000);

  it("hydrates teams index fan/org route chart sources with populated trend and leaderboard data", async () => {
    if (skipIfSchemaMissing()) return;
    const [teamsFan, teamsOrg, trendlines] = await Promise.all([
      getTeamLeaderboardModel("season", { includeDecisionMetrics: false, includeValueMetrics: false }),
      getTeamLeaderboardModel("season", { includeDecisionMetrics: true, includeValueMetrics: true }),
      getTeamTrendSparklines("season"),
    ]);

    expect(teamsFan.length).toBeGreaterThan(0);
    expect(teamsOrg.length).toBeGreaterThan(0);
    expect(trendlines.length).toBeGreaterThan(0);
    expect(trendlines.some((entry) => entry.values.length >= 2)).toBe(true);
    expect(teamsOrg.some((team) => team.challengeRatePerGame > 0)).toBe(true);
  }, 15_000);

  it("hydrates team detail fan/org route chart sources with real data for a representative club", async () => {
    if (skipIfSchemaMissing()) return;
    if (skipIfSlowChartAuditDisabled("team detail")) return;
    if (sampleIds.teamId === null) {
      console.warn("Skipping team detail chart audit because no representative team id is available.");
      return;
    }
    const teamId = sampleIds.teamId as number;

    const [
      summary,
      trend,
      aggression,
      inningEfficiency,
      sideSplits,
      schedule,
      umpireMatchups,
      challengeSummary,
      decisionReport,
      pitchingBailouts,
    ] = await Promise.all([
      getTeamSummary(teamId, "season"),
      getTeamTrend(teamId, "season"),
      getTeamAggression(teamId, "season"),
      getTeamInningEfficiency(teamId, "season"),
      getTeamSideSplits(teamId, "season"),
      getTeamSchedule(teamId),
      getTeamUmpireMatchups(teamId, "season"),
      getTeamChallengeValueSummary(teamId, "season"),
      getTeamDecisionValueReport(teamId, "season"),
      getTeamPitchingBailouts(teamId, "season"),
    ]);

    expect(summary).not.toBeNull();
    expect(summary?.challengesTotal ?? 0).toBeGreaterThan(0);
    expect(trend.length).toBeGreaterThan(0);
    expect(trend.some((point) => point.challengesTotal > 0)).toBe(true);
    expect(aggression.length).toBeGreaterThan(0);
    expect(aggression.some((bucket) => bucket.count > 0)).toBe(true);
    expect(inningEfficiency.length).toBeGreaterThan(0);
    expect(inningEfficiency.some((cell) => cell.sampleSize > 0)).toBe(true);
    expect(sideSplits.length).toBeGreaterThan(0);
    expect(sideSplits.some((split) => split.challengesTotal > 0)).toBe(true);
    expect(schedule.length).toBeGreaterThan(0);
    expect(umpireMatchups.length).toBeGreaterThan(0);
    expect(umpireMatchups.some((entry) => entry.challengesTotal > 0)).toBe(true);
    expect(challengeSummary.totalChallenges).toBeGreaterThan(0);
    expect(decisionReport.summary.totalChallenges).toBeGreaterThan(0);
    expect(
      decisionReport.breakdownSections.some((section) => section.entries.some((entry) => entry.challenges > 0)),
    ).toBe(true);
    expect(Array.isArray(pitchingBailouts)).toBe(true);
  }, 30_000);

  it("hydrates umpires index fan/org route chart sources with populated leaderboard data", async () => {
    if (skipIfSchemaMissing()) return;
    const umpires = await getUmpireLeaderboardModel("season");

    expect(umpires.length).toBeGreaterThan(0);
    expect(umpires.some((umpire) => umpire.challengedCalls > 0)).toBe(true);
    expect(umpires.every((umpire) => umpire.umpireName !== "Home Plate")).toBe(true);
    expect(umpires.some((umpire) => umpire.overturnRateVariance >= 0)).toBe(true);
    expect(
      umpires.some((umpire) => umpire.averageWinExpectancyDelta !== null || umpire.averageRunExpectancyDelta !== null),
      "umpire org leaderboard should carry aggregate modeled value fields",
    ).toBe(true);
  }, 15_000);

  it("hydrates org-detail contracts with enriched pitch and value fields", async () => {
    if (skipIfSchemaMissing()) return;
    if (sampleIds.teamId === null || sampleIds.umpireId === null || sampleIds.finalGamePk === null) {
      console.warn("Skipping enriched org contract audit because representative ids are not available.");
      return;
    }

    const [teamSummary, umpireChallenges, gameChallenges, timeline, teamComparison, umpireSummary] = await Promise.all([
      getTeamChallengeValueSummary(sampleIds.teamId, "season", undefined, { includeValueMetrics: true }),
      getUmpirePageChallengeEvents(sampleIds.umpireId, "season"),
      getGamePageChallengeEvents(sampleIds.finalGamePk),
      getGameChallengeValueTimeline(sampleIds.finalGamePk),
      getGameTeamChallengeComparison(sampleIds.finalGamePk),
      getGameUmpireInGameSummary(sampleIds.finalGamePk),
    ]);

    expect(teamSummary.totalChallenges).toBeGreaterThan(0);
    expect(
      teamSummary.averageWinExpectancyDelta !== null || teamSummary.averageRunExpectancyDelta !== null,
      "team org summaries should not drop all WE/RE value fields",
    ).toBe(true);

    const umpireLeaderboard = await getUmpireLeaderboardModel("season");
    const selectedUmpire = umpireLeaderboard.find((umpire) => umpire.umpireId === sampleIds.umpireId);
    expect(
      selectedUmpire?.averageWinExpectancyDelta !== null || selectedUmpire?.averageRunExpectancyDelta !== null,
      "umpire org summaries should not drop aggregate WE/RE value fields",
    ).toBe(true);

    expect(umpireChallenges.length).toBeGreaterThan(0);
    expect(
      umpireChallenges.some((challenge) => challenge.pitchType || challenge.startSpeed !== null || challenge.spinRate !== null),
      "umpire org challenge contracts should include pitch-family or trait data when available",
    ).toBe(true);
    expect(
      umpireChallenges.some(
        (challenge) =>
          challenge.winExpectancyDelta !== null ||
          challenge.runExpectancyDelta !== null ||
          challenge.expectedChallengeValue !== null,
      ),
      "umpire org challenge contracts should include modeled value fields when available",
    ).toBe(true);

    expect(gameChallenges.length).toBeGreaterThan(0);
    expect(
      gameChallenges.some(
        (challenge) =>
          challenge.winExpectancyDelta !== null ||
          challenge.runExpectancyDelta !== null ||
          challenge.expectedChallengeValue !== null,
      ),
      "game challenge contracts should include modeled value fields for postgame/live org reads",
    ).toBe(true);
    expect(
      timeline.some(
        (entry) =>
          entry.winExpectancyDelta !== null ||
          entry.runExpectancyDelta !== null ||
          entry.expectedChallengeValue !== null,
      ),
    ).toBe(true);
    expect(teamComparison).not.toBeNull();
    expect(
      (teamComparison?.home.totalWinValue ?? null) !== null ||
        (teamComparison?.away.totalWinValue ?? null) !== null ||
        (teamComparison?.home.totalRunValue ?? null) !== null ||
        (teamComparison?.away.totalRunValue ?? null) !== null ||
        (teamComparison?.home.expectedValueSum ?? null) !== null ||
        (teamComparison?.away.expectedValueSum ?? null) !== null,
      "team comparison should retain WE/RE totals when the underlying game has value coverage",
    ).toBe(true);
    expect(umpireSummary).not.toBeNull();
    expect(umpireSummary?.topPitchType).not.toBeNull();
  }, 30_000);

  it("hydrates umpire detail fan/org route chart sources with real data for a representative umpire", async () => {
    if (skipIfSchemaMissing()) return;
    if (skipIfSlowChartAuditDisabled("umpire detail")) return;
    if (sampleIds.umpireId === null) {
      console.warn("Skipping umpire detail chart audit because no representative umpire id is available.");
      return;
    }
    const umpireId = sampleIds.umpireId as number;

    const [summary, profile, trend, challenges, dna, seasonTrend, vulnerabilities] = await Promise.all([
      getUmpireSummary(umpireId, "season"),
      getUmpireProfile(umpireId, "season"),
      getUmpireTrend(umpireId, "season"),
      getUmpirePageChallengeEvents(umpireId, "season"),
      getUmpirePerformanceDNA(umpireId, "season"),
      getUmpireSeasonTrend(umpireId),
      getUmpireMatchupVulnerabilities(umpireId, "season"),
    ]);

    expect(summary).not.toBeNull();
    expect(summary?.challengedCalls ?? 0).toBeGreaterThan(0);
    expect(profile.countHotspots.length).toBeGreaterThan(0);
    expect(trend.length).toBeGreaterThan(0);
    expect(trend.some((point) => point.challengedCount > 0)).toBe(true);
    expect(challenges.length).toBeGreaterThan(0);
    expect(
      challenges.some(
        (challenge) =>
          typeof challenge.estimatedChallengeSwing === "number" ||
          typeof challenge.runExpectancyDelta === "number" ||
          typeof challenge.winExpectancyDelta === "number",
      ),
    ).toBe(true);
    expect(dna.rhythm.length).toBeGreaterThan(0);
    expect(dna.extremes.length).toBeGreaterThan(0);
    expect(seasonTrend.length).toBeGreaterThan(0);
    expect(seasonTrend.some((point) => point.gamesWorked > 0)).toBe(true);
    expect(vulnerabilities.length).toBeGreaterThan(0);
    expect(vulnerabilities.some((entry) => entry.challengedCount > 0)).toBe(true);
  }, 30_000);

  it("hydrates game pregame fan/org chart sources with populated matchup data", async () => {
    if (skipIfSchemaMissing()) return;
    if (sampleIds.previewGamePk === null) {
      console.warn("Skipping pregame chart audit because no preview game sample is available.");
      return;
    }
    const gamePk = sampleIds.previewGamePk as number;

    const [intel, board] = await Promise.all([getGamePregameIntel(gamePk), getGameChallengeOpportunityBoard(gamePk)]);

    expect(intel).not.toBeNull();
    const offenseDefenseValues = [
      intel?.homeTeam.offensiveChallenges ?? 0,
      intel?.homeTeam.defensiveChallenges ?? 0,
      intel?.awayTeam.offensiveChallenges ?? 0,
      intel?.awayTeam.defensiveChallenges ?? 0,
    ];
    expect(offenseDefenseValues.some((value) => value > 0)).toBe(true);
    expectNonEmptyNumericSeries(intel?.challengeTiming.home ?? [], "pregame home timing");
    expectNonEmptyNumericSeries(intel?.challengeTiming.away ?? [], "pregame away timing");
    expectNonEmptyNumericSeries(intel?.challengeTiming.leagueAverage ?? [], "pregame league timing");
    expect((intel?.zoneBriefing ?? []).length).toBe(4);
    expect(board).not.toBeNull();
    expect(board?.cells.some((cell) => cell.homeChallenges > 0 || cell.awayChallenges > 0)).toBe(true);
  }, 45_000);

  it("hydrates completed game route chart sources with populated challenge data", async () => {
    if (skipIfSchemaMissing()) return;
    if (skipIfSlowChartAuditDisabled("completed game")) return;
    if (sampleIds.finalGamePk === null) {
      console.warn("Skipping completed game chart audit because no final game sample is available.");
      return;
    }
    const gamePk = sampleIds.finalGamePk as number;

    const [game, scoreboard, counters, liveStatus, challenges, timeline, teamComparison, umpireSummary] = await Promise.all([
      getGame(gamePk),
      getGameScoreboardData(gamePk),
      getGameAbsCounters(gamePk),
      getGameLiveStatus(gamePk),
      getGameChallenges(gamePk),
      getGameChallengeValueTimeline(gamePk),
      getGameTeamChallengeComparison(gamePk),
      getGameUmpireInGameSummary(gamePk),
    ]);

    expect(game).not.toBeNull();
    expect(scoreboard).not.toBeNull();
    expect(scoreboard?.innings.length ?? 0).toBeGreaterThan(0);
    expect(counters).not.toBeNull();
    expect(liveStatus).not.toBeNull();
    expect(challenges.length).toBeGreaterThan(0);
    expect(timeline.length).toBeGreaterThan(0);
    expect(teamComparison).not.toBeNull();
    expect((teamComparison?.home.totalChallenges ?? 0) + (teamComparison?.away.totalChallenges ?? 0)).toBeGreaterThan(0);
    expect((teamComparison?.home.totalChallenges ?? 0) + (teamComparison?.away.totalChallenges ?? 0)).toBe(challenges.length);
    expect(umpireSummary).not.toBeNull();
    expect((umpireSummary?.totalChallenges ?? 0)).toBeGreaterThan(0);
  }, 30_000);

  it("hydrates live game route chart sources when an in-progress sample exists", async () => {
    if (skipIfSchemaMissing()) return;
    if (!sampleIds.liveGamePk) {
      return;
    }

    const window = await getLiveChallengeWindow(sampleIds.liveGamePk);
    const [challenges, teamComparison] = await Promise.all([
      getGameChallenges(sampleIds.liveGamePk),
      getGameTeamChallengeComparison(sampleIds.liveGamePk),
    ]);
    expect(window).not.toBeNull();
    expect(window?.estimatedLeverageIndex ?? 0).toBeGreaterThanOrEqual(0);
    expect(window?.scenarioTags.length ?? 0).toBeGreaterThanOrEqual(0);
    expect((teamComparison?.home.totalChallenges ?? 0) + (teamComparison?.away.totalChallenges ?? 0)).toBe(challenges.length);
  });
});

import { sql } from "@/lib/db";
import {
  formatBasesStateLabel,
  formatCountTransitionLabel,
  formatCountStateLabel,
  getChallengeCountState,
  getChallengeScenarioTags,
  formatScoreStateLabel,
  normalizeHalfInning,
} from "@/lib/challenge-context";
import { buildChallengeValueSnapshot, buildCountStateBaselineMap, type CountStateBaseline } from "@/lib/challenge-value";
import { summarizeEstimatedLeverage } from "@/lib/estimated-leverage";
import {
  buildPostgameAuditCoverage,
  buildPostgameAuditNarrative,
  buildPostgameAuditTeamVerdicts,
  buildPostgameAuditUmpireVerdict,
} from "@/lib/postgame-audit-copy";
import {
  buildHomeChallengeMoments,
  buildTeamLeaderboardEntries,
  buildUmpireLeaderboardEntries,
  type TeamStyleMetric,
} from "@/lib/page-models";
import { estimateChallengeDecisionValue, getOverturnProbabilityFallbackRows, type CalledPitch, type EdgeBucket } from "@/lib/server/challenge-decision-value";
import { withServerTiming } from "@/lib/server/performance";
import { getGameDataVersion, getGlobalLiveDataVersion, getLatestSuccessfulEtlDataVersion } from "@/lib/server/data-version";
import {
  resolveComparableExpectedWinValue,
  resolveDisplayedExpectedWinValue,
  resolvePostgameValueMode,
} from "@/lib/postgame-audit-metrics";
import { confidenceBandFromRank, getDecisionValueConfidenceBand, hasTrustedModelConfidenceBand } from "@/lib/server/run-environment";
import { getChallengeRunExpectancyDelta, getRunExpectancyFallbackRows, resolveRunExpectancyWithFallback } from "@/lib/server/run-expectancy";
import { getChallengeWinExpectancyDelta, getWinExpectancyFallbackRows, resolveWinExpectancyWithFallback } from "@/lib/server/win-expectancy";
import { getCacheKey, withCachedValue } from "@/lib/server/scale";
import type { GameScoreboardData } from "@/lib/game-scoreboard";
import {
  computeObservedZoneMissDistance,
  classifyNormalizedZoneLane,
  classifyObservedZoneAxisBucket,
  type NormalizedZoneLane,
  type ObservedZoneAxisBucket,
} from "@/lib/zone-model";
import type {
  ChallengeCountBaseline,
  ChallengeEvent,
  ChallengeHandednessBaseline,
  ChallengePitchLaneBaseline,
  ChallengePitchTypeBaseline,
  GameChallengeImpactSummary,
  GamePostgameAudit,
  GamePostgameAuditSide,
  GameTeamChallengeComparison,
  GameUmpireInGameSummary,
  GameChallengeOpportunityBoard,
  GameChallengeOpportunityCell,
  ChallengeValueTimelineEntry,
  GameLiveStatus,
  LiveChallengeWindow,
  GameReport,
  HomeChallengeMoment,
  LiveGameCard,
  PitchTimelineEntry,
  RangeKey,
  SituationalFilters,
  TeamLeaderboardEntry,
  TeamIdentity,
  TeamInningEfficiencyCell,
  TeamChallengeScenarioCell,
  TeamDecisionValueSummary,
  TeamDecisionValueReport,
  TeamDecisionBreakdownEntry,
  TeamDecisionBreakdownSection,
  TeamDecisionWindowEntry,
  TeamChallengeValueSummary,
  TeamSideSplit,
  TeamSummary,
  TeamTrendSparklinePoint,
  TeamScheduleGame,
  TeamTrendPoint,
  UmpireLeaderboardEntry,
  UmpireHandednessSplit,
  UmpireMatchupVulnerability,
  UmpirePitchTypeBreakdown,
  UmpireProfile,
  UmpirePerformanceDNA,
  UmpireSeasonTrendPoint,
  UmpireSummary,
  UmpireTrendPoint,
} from "@/lib/types";

type TeamDecisionMetricRow = {
  challengeId: string;
  teamId: number;
  teamName: string | null;
  isOverturned: boolean;
  inning: number | null;
  halfInning: string | null;
  outs: number | null;
  basesState: string | null;
  homeScore: number | null;
  awayScore: number | null;
  ballsBefore: number | null;
  strikesBefore: number | null;
  balls: number | null;
  strikes: number | null;
  calledDescription: string | null;
  edgeBucket: EdgeBucket | null;
  estimatedChallengesRemaining: number | null;
};

type TeamDecisionMetricAggregate = TeamDecisionValueSummary & {
  teamId: number;
  teamName: string | null;
};

type TeamDecisionWindowAggregate = {
  label: string;
  challenges: number;
  modeledChallenges: number;
  totalExpected: number;
  totalRealized: number;
  capturedValueCount: number;
  wastedValueCount: number;
  challengeRecommendations: number;
  holdRecommendations: number;
  winModeChallenges: number;
};

type TeamDecisionBreakdownAggregate = {
  label: string;
  challenges: number;
  modeledChallenges: number;
  totalExpected: number;
  totalRealized: number;
  capturedValueCount: number;
  wastedValueCount: number;
  winModeChallenges: number;
};

type ModeledTeamDecisionRow = {
  row: TeamDecisionMetricRow;
  label: string;
  expectedWpDelta: number;
  realizedWpDelta: number;
  recommendation: "challenge" | "hold" | "cannot_challenge";
  decisionValueMode: "win_expectancy" | "heuristic";
  highPressurePositive: boolean;
  lateClosePositive: boolean;
};

function isLateCloseDecisionContext(row: Pick<TeamDecisionMetricRow, "inning" | "homeScore" | "awayScore">) {
  return (
    (row.inning ?? 0) >= 7 &&
    row.homeScore !== null &&
    row.awayScore !== null &&
    Math.abs(row.homeScore - row.awayScore) <= 2
  );
}

async function withVersionedCache<T>(
  keyParts: Array<string | number | boolean | null | undefined>,
  versionPromise: Promise<string>,
  ttlMs: number,
  loader: () => Promise<T>,
) {
  const dataVersion = await versionPromise;
  return withCachedValue(getCacheKey([...keyParts, dataVersion]), ttlMs, loader);
}

async function withGameVersionedCache<T>(
  scope: string,
  gamePk: number,
  ttlMs: number,
  loader: () => Promise<T>,
) {
  return withVersionedCache([scope, gamePk], getGameDataVersion(gamePk), ttlMs, loader);
}

async function withGlobalLiveVersionedCache<T>(
  scope: string,
  ttlMs: number,
  loader: () => Promise<T>,
) {
  return withVersionedCache([scope], getGlobalLiveDataVersion(), ttlMs, loader);
}

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
  const clauses = ["TRUE"];
  const params: unknown[] = [];

  if (!filters) return { clause: "TRUE", params: [] };

  if (filters.inningRange === "early") clauses.push(`${alias}.inning <= 3`);
  else if (filters.inningRange === "middle") clauses.push(`${alias}.inning BETWEEN 4 AND 6`);
  else if (filters.inningRange === "late") clauses.push(`${alias}.inning BETWEEN 7 AND 9`);
  else if (filters.inningRange === "extras") clauses.push(`${alias}.inning > 9`);

  if (filters.result === "overturned") clauses.push(`${alias}.is_overturned = TRUE`);
  else if (filters.result === "confirmed") clauses.push(`${alias}.is_overturned = FALSE`);

  if (filters.side === "offense") {
    clauses.push(`((g.home_team_id = ${alias}.challenge_team_id AND ${alias}.half_inning = 'bottom') OR (g.away_team_id = ${alias}.challenge_team_id AND ${alias}.half_inning = 'top'))`);
  } else if (filters.side === "defense") {
    clauses.push(`((g.home_team_id = ${alias}.challenge_team_id AND ${alias}.half_inning = 'top') OR (g.away_team_id = ${alias}.challenge_team_id AND ${alias}.half_inning = 'bottom'))`);
  }

  // Leverage is tricky to do in SQL directly with the formula, 
  // but we can approximate for now if needed.
  // For simplicity in this step, focusing on the ones we strictly have columns for.

  return { clause: clauses.join(" AND "), params };
}

function hasActiveSituationalFilters(filters?: SituationalFilters): boolean {
  return Boolean(filters?.inningRange || filters?.leverage || filters?.side || filters?.result);
}

function getSituationalFilterCacheParts(filters?: SituationalFilters) {
  return [
    filters?.inningRange ?? "all",
    filters?.leverage ?? "all",
    filters?.side ?? "all",
    filters?.result ?? "all",
  ];
}

async function getCountStateBaselines(): Promise<CountStateBaseline[]> {
  return withCachedValue(getCacheKey(["count-state-baselines"]), 60_000, async () => {
    let rawRows: Array<{
      count_key: string;
      plate_appearances: number;
      walks: number;
      strikeouts: number;
      batting_average: number;
      positive_outcome_rate?: number;
      hits?: number;
    }> = [];
    try {
      rawRows = await sql<{
        count_key: string;
        plate_appearances: number;
        walks: number;
        strikeouts: number;
        batting_average: number;
        positive_outcome_rate: number;
      }>(
        `
        SELECT
          count_key,
          sample_size AS plate_appearances,
          ROUND(walk_rate * sample_size)::INTEGER AS walks,
          ROUND(strikeout_rate * sample_size)::INTEGER AS strikeouts,
          batting_average,
          positive_outcome_rate
        FROM serving_count_state_outcome_baselines
        `,
      );
    } catch {
      rawRows = [];
    }
    try {
      if (!rawRows.length) {
        rawRows = await sql<{
        count_key: string;
        plate_appearances: number;
        walks: number;
        strikeouts: number;
        batting_average: number;
        positive_outcome_rate: number;
        }>(
          `
          SELECT
            count_key,
            sample_size AS plate_appearances,
            ROUND(walk_rate * sample_size)::INTEGER AS walks,
            ROUND(strikeout_rate * sample_size)::INTEGER AS strikeouts,
            batting_average,
            positive_outcome_rate
          FROM mart_count_state_outcome_baselines_train_validation
          `,
        );
      }
    } catch {
      rawRows = await sql<{
        count_key: string;
        plate_appearances: number;
        walks: number;
        strikeouts: number;
        batting_average: number;
        hits: number;
      }>(`
        SELECT
          CONCAT(balls_before, '-', strikes_before) AS count_key,
          plate_appearances,
          walks,
          strikeouts,
          batting_average,
          hits
        FROM mart_count_state_baselines
      `);
    }
    const rows = Array.isArray(rawRows) ? rawRows : [];

    return rows.map((row) => ({
      countKey: row.count_key,
      plateAppearances: Number(row.plate_appearances),
      battingAverage: Number(row.batting_average ?? 0),
      walkRate: row.plate_appearances > 0 ? Number(row.walks) / Number(row.plate_appearances) : 0,
      strikeoutRate: row.plate_appearances > 0 ? Number(row.strikeouts) / Number(row.plate_appearances) : 0,
      positiveOutcomeRate:
        row.positive_outcome_rate !== undefined
          ? Number(row.positive_outcome_rate ?? 0)
          : row.plate_appearances > 0
            ? (Number(row.hits ?? 0) + Number(row.walks)) / Number(row.plate_appearances)
            : 0,
    }));
  });
}

async function getPitchTypeCountBaselines(): Promise<ChallengePitchTypeBaseline[]> {
  return withCachedValue(getCacheKey(["pitch-type-count-baselines"]), 60_000, async () => {
    const rawRows = await sql<{
      pitch_type_description: string | null;
      balls_before: number | null;
      strikes_before: number | null;
      pitch_count: number;
      avg_start_speed: number | null;
      avg_spin_rate: number | null;
      challenged_pitch_count: number;
    }>(
      `
      SELECT
        pitch_type_description,
        balls_before,
        strikes_before,
        pitch_count,
        avg_start_speed,
        avg_spin_rate,
        challenged_pitch_count
      FROM mart_pitch_type_count_baselines
      WHERE pitch_type_description IS NOT NULL
        AND balls_before IS NOT NULL
        AND strikes_before IS NOT NULL
      `,
    );

    return rawRows.map((row) => {
      const pitchCount = Number(row.pitch_count ?? 0);
      const challengedPitchCount = Number(row.challenged_pitch_count ?? 0);
      return {
        pitchType: row.pitch_type_description ?? "Unknown",
        countKey: `${row.balls_before}-${row.strikes_before}`,
        pitchCount,
        challengedPitchCount,
        challengeRate: pitchCount > 0 ? challengedPitchCount / pitchCount : 0,
        avgStartSpeed: row.avg_start_speed === null ? null : Number(row.avg_start_speed),
        avgSpinRate: row.avg_spin_rate === null ? null : Number(row.avg_spin_rate),
      };
    });
  });
}

function roundMetric(value: number | null, digits = 3) {
  if (value === null || Number.isNaN(value)) return null;
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function resolveUmpireCountState(
  ballsBefore: number | null,
  strikesBefore: number | null,
  ballsAfter: number | null,
  strikesAfter: number | null,
  isOverturned: boolean,
) {
  if (ballsBefore === null || strikesBefore === null) return null;
  if (!isOverturned) return ballsAfter === null || strikesAfter === null ? null : `${ballsAfter}-${strikesAfter}`;
  if (ballsAfter !== null && ballsAfter > ballsBefore) return `${ballsBefore}-${strikesBefore + 1}`;
  if (strikesAfter !== null && strikesAfter > strikesBefore) return `${ballsBefore + 1}-${strikesBefore}`;
  return ballsAfter === null || strikesAfter === null ? null : `${ballsAfter}-${strikesAfter}`;
}

function scoreDiffForBattingTeam(
  halfInning: string | null | undefined,
  homeScore: number | null | undefined,
  awayScore: number | null | undefined,
) {
  const normalizedHalf = normalizeHalfInning(halfInning);
  if (!normalizedHalf || homeScore === null || homeScore === undefined || awayScore === null || awayScore === undefined) {
    return 0;
  }
  return normalizedHalf === "Top" ? awayScore - homeScore : homeScore - awayScore;
}

function challengeTeamDelta(value: number | null, challengeSideRole?: string | null) {
  if (value === null) return null;
  return challengeSideRole === "fielding" ? roundMetric(-value, 4) : value;
}

function buildPitchTimelineDescription(row: {
  challenge_id: string | null;
  impact_summary: string;
  play_description: string | null;
  called_description: string | null;
  pitch_type_description: string | null;
}) {
  if (row.challenge_id && row.impact_summary) return row.impact_summary;
  if (row.play_description) return row.play_description;
  if (row.called_description && row.pitch_type_description) {
    return `${row.called_description} • ${row.pitch_type_description}`;
  }
  if (row.called_description) return row.called_description;
  if (row.pitch_type_description) return row.pitch_type_description;
  return row.challenge_id ? "Challenge event" : "Pitch event";
}

function buildCountBaselineDetail(
  countKey: string | null | undefined,
  baselineMap: Map<string, CountStateBaseline>,
): ChallengeCountBaseline | null {
  if (!countKey) return null;
  const baseline = baselineMap.get(countKey);
  if (!baseline) return null;
  return {
    countKey: baseline.countKey,
    plateAppearances: baseline.plateAppearances,
    battingAverage: baseline.battingAverage,
    walkRate: baseline.walkRate,
    strikeoutRate: baseline.strikeoutRate,
    positiveOutcomeRate: baseline.positiveOutcomeRate,
  };
}

function buildPitchTypeBaselineMap(rows: ChallengePitchTypeBaseline[]) {
  const map = new Map<string, ChallengePitchTypeBaseline>();
  rows.forEach((row) => {
    map.set(`${row.pitchType}::${row.countKey}`, row);
  });
  return map;
}

type HistoricalChallengeContextRow = {
  countKey: string;
  pitchType: string;
  batterStand: "R" | "L";
  pitcherThrows: "R" | "L";
  isOverturned: boolean;
  edgeDistance: number | null;
  px: number | null;
  pz: number | null;
  strikeZoneTop: number | null;
  strikeZoneBottom: number | null;
};

async function getHistoricalChallengeContextRows(
  countKeys: string[],
  pitchTypes: string[],
): Promise<HistoricalChallengeContextRow[]> {
  if (countKeys.length === 0 || pitchTypes.length === 0) return [];

  const rows = await sql<{
    count_key: string;
    pitch_type: string | null;
    batter_stand: "R" | "L";
    pitcher_throws: "R" | "L";
    is_overturned: boolean;
    edge_distance: number | null;
    px: number | null;
    pz: number | null;
    strike_zone_top: number | null;
    strike_zone_bottom: number | null;
  }>(
    `
    SELECT
      held_count_key AS count_key,
      COALESCE(pitch_name, pitch_type, 'Unknown') AS pitch_type,
      stand AS batter_stand,
      p_throws AS pitcher_throws,
      is_overturned,
      edge_distance,
      COALESCE(px, plate_x) AS px,
      COALESCE(pz, plate_z) AS pz,
      strike_zone_top,
      strike_zone_bottom
    FROM mart_historical_abs_overturn_inputs
    WHERE held_count_key = ANY($1::text[])
      AND COALESCE(pitch_name, pitch_type, 'Unknown') = ANY($2::text[])
      AND stand IN ('L', 'R')
      AND p_throws IN ('L', 'R')
    `,
    [countKeys, pitchTypes],
  );

  return rows.map((row) => ({
    countKey: row.count_key,
    pitchType: row.pitch_type ?? "Unknown",
    batterStand: row.batter_stand,
    pitcherThrows: row.pitcher_throws,
    isOverturned: row.is_overturned,
    edgeDistance: row.edge_distance === null ? null : Number(row.edge_distance),
    px: row.px === null ? null : Number(row.px),
    pz: row.pz === null ? null : Number(row.pz),
    strikeZoneTop: row.strike_zone_top === null ? null : Number(row.strike_zone_top),
    strikeZoneBottom: row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom),
  }));
}

function buildHistoricalHandednessBaselineMap(rows: HistoricalChallengeContextRow[]) {
  const map = new Map<string, ChallengeHandednessBaseline>();
  const edgeCounts = new Map<string, number>();

  for (const row of rows) {
    const key = `${row.countKey}::${row.pitcherThrows}::${row.batterStand}`;
    const current = map.get(key) ?? {
      countKey: row.countKey,
      pitcherThrows: row.pitcherThrows,
      batterStand: row.batterStand,
      sampleSize: 0,
      overturnRate: 0,
      avgEdgeDistance: null,
    };
    current.sampleSize += 1;
    current.overturnRate += row.isOverturned ? 1 : 0;
    if (row.edgeDistance !== null) {
      current.avgEdgeDistance = (current.avgEdgeDistance ?? 0) + row.edgeDistance;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
    map.set(key, current);
  }

  for (const [key, value] of map) {
    const edgeCount = edgeCounts.get(key) ?? 0;
    value.overturnRate = value.sampleSize > 0 ? value.overturnRate / value.sampleSize : 0;
    value.avgEdgeDistance =
      edgeCount > 0 && value.avgEdgeDistance !== null ? value.avgEdgeDistance / edgeCount : null;
    map.set(key, value);
  }

  return map;
}

function buildHistoricalPitchLaneBaselineMap(rows: HistoricalChallengeContextRow[]) {
  const map = new Map<string, ChallengePitchLaneBaseline>();
  const edgeCounts = new Map<string, number>();

  for (const row of rows) {
    const lane = classifyNormalizedZoneLane({
      px: row.px,
      pz: row.pz,
      strikeZoneTop: row.strikeZoneTop,
      strikeZoneBottom: row.strikeZoneBottom,
    });
    if (!lane) continue;

    const key = `${row.pitchType}::${row.countKey}::${lane}`;
    const current = map.get(key) ?? {
      pitchType: row.pitchType,
      countKey: row.countKey,
      lane,
      sampleSize: 0,
      overturnRate: 0,
      avgEdgeDistance: null,
    };
    current.sampleSize += 1;
    current.overturnRate += row.isOverturned ? 1 : 0;
    if (row.edgeDistance !== null) {
      current.avgEdgeDistance = (current.avgEdgeDistance ?? 0) + row.edgeDistance;
      edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1);
    }
    map.set(key, current);
  }

  for (const [key, value] of map) {
    value.overturnRate = value.sampleSize > 0 ? value.overturnRate / value.sampleSize : 0;
    const edgeCount = edgeCounts.get(key) ?? 0;
    value.avgEdgeDistance = edgeCount > 0 && value.avgEdgeDistance !== null ? value.avgEdgeDistance / edgeCount : null;
    map.set(key, value);
  }

  return map;
}

function countOccupiedBases(basesState: string | null | undefined) {
  if (!basesState) return 0;
  return basesState.split("").filter((base) => base === "1").length;
}

function getScoreDiffBattingTeam(halfInning: string | null, homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) return 0;
  const normalized = normalizeHalfInning(halfInning);
  if (normalized === "Top") return awayScore - homeScore;
  if (normalized === "Bottom") return homeScore - awayScore;
  return 0;
}

function resolveCalledPitchFromDescription(description: string | null | undefined): CalledPitch | null {
  const normalized = description?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "called_strike" || normalized === "strike") return "called_strike";
  if (normalized.startsWith("called strike")) return "called_strike";
  if (normalized.startsWith("ball")) return "ball";
  return null;
}

function resolveDecisionRecommendation(
  expectedChallengeValue: number | null | undefined,
  estimatedChallengesRemaining?: number | null,
): "challenge" | "hold" | "cannot_challenge" | null {
  if (typeof estimatedChallengesRemaining === "number" && estimatedChallengesRemaining <= 0) return "cannot_challenge";
  if (typeof expectedChallengeValue !== "number" || !Number.isFinite(expectedChallengeValue)) return null;
  return expectedChallengeValue > 0 ? "challenge" : "hold";
}

function buildDecisionWindowLabel(input: {
  basesState: string | null;
  outs: number | null;
  ballsBefore: number | null;
  strikesBefore: number | null;
}) {
  const baseLabel =
    input.basesState === "111"
      ? "Bases Loaded"
      : (input.basesState === "011" || input.basesState === "101" || input.basesState === "110") && (input.outs ?? 0) < 2
        ? "RISP, <2 Outs"
        : input.basesState === "011" || input.basesState === "101" || input.basesState === "110"
          ? "RISP, 2 Outs"
          : input.basesState === "000"
            ? "Bases Empty"
            : "Runner On";
  const ballsBefore = input.ballsBefore ?? 0;
  const strikesBefore = input.strikesBefore ?? 0;
  const countLabel =
    ballsBefore === 3 && strikesBefore === 2
      ? "Full Count"
      : ballsBefore > strikesBefore
        ? "Hitter Ahead"
        : ballsBefore < strikesBefore
          ? "Pitcher Ahead"
          : "Even Count";

  return `${baseLabel} • ${countLabel}`;
}

function buildDecisionInningLabel(inning: number | null | undefined) {
  if ((inning ?? 0) >= 10) return "Extras";
  if ((inning ?? 0) >= 7) return "Late (7-9)";
  if ((inning ?? 0) >= 4) return "Middle (4-6)";
  return "Early (1-3)";
}

function buildDecisionCountLabel(input: { ballsBefore: number | null; strikesBefore: number | null }) {
  const ballsBefore = input.ballsBefore ?? 0;
  const strikesBefore = input.strikesBefore ?? 0;

  if (ballsBefore === 3 && strikesBefore === 2) return "Full Count";
  if (ballsBefore > strikesBefore) return "Hitter Ahead";
  if (ballsBefore < strikesBefore) return "Pitcher Ahead";
  return "Even Count";
}

function buildDecisionBaseOutLabel(input: { basesState: string | null; outs: number | null }) {
  const outs = input.outs ?? 0;
  const basesState = input.basesState ?? "000";
  const occupied = countOccupiedBases(basesState);
  const hasRisp = basesState[1] === "1" || basesState[2] === "1";

  if (basesState === "111") return "Bases Loaded";
  if (hasRisp) return outs < 2 ? "RISP, <2 Outs" : "RISP, 2 Outs";
  if (occupied === 0) return outs < 2 ? "Bases Empty, <2 Outs" : "Bases Empty, 2 Outs";
  return outs < 2 ? "Runner On, <2 Outs" : "Runner On, 2 Outs";
}

async function getTeamDecisionMetricRows(range: RangeKey = "season", filters?: SituationalFilters, teamId?: number) {
  return withVersionedCache(
    ["team-decision-metric-rows", range, teamId ?? "all", ...getSituationalFilterCacheParts(filters)],
    getLatestSuccessfulEtlDataVersion(),
    30_000,
    async () => {
      const window = rangeWhere(range, "g.game_date");
      const situational = situationalWhere(filters, "c");
      const params = [...window.params, ...situational.params];
      const teamClause =
        teamId === undefined
          ? ""
          : `\n      AND c.challenge_team_id = $${params.push(teamId)}`;

      return sql<{
    challenge_id: string;
    team_id: number;
    team_name: string | null;
    is_overturned: boolean;
    inning: number | null;
    half_inning: string | null;
    outs: number | null;
    bases_state: string | null;
    home_score: number | null;
    away_score: number | null;
    balls_before: number | null;
    strikes_before: number | null;
    balls: number | null;
    strikes: number | null;
    called_description: string | null;
    edge_bucket: EdgeBucket | null;
    estimated_challenges_remaining: number | string | null;
  }>(
        `
    WITH challenge_context AS (
      SELECT
        c.*,
        GREATEST(
          0,
          2 - COUNT(*) FILTER (WHERE c.is_overturned = FALSE) OVER (
            PARTITION BY c.game_pk, c.challenge_team_id
            ORDER BY c.challenged_at NULLS LAST, c.challenge_id
            ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
          )
        ) AS estimated_challenges_remaining
      FROM mart_abs_pitch_challenges c
      WHERE c.challenge_team_id IS NOT NULL
    )
    SELECT
      c.challenge_id,
      c.challenge_team_id AS team_id,
      t.name AS team_name,
      c.is_overturned,
      c.inning,
      c.half_inning,
      c.outs,
      c.bases_state,
      c.home_score,
      c.away_score,
      p.balls_before,
      p.strikes_before,
      c.balls,
      c.strikes,
      c.original_call AS called_description,
      c.edge_bucket,
      c.estimated_challenges_remaining
    FROM challenge_context c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN teams t ON t.team_id = c.challenge_team_id
    LEFT JOIN pitches p
      ON p.game_pk = c.game_pk
     AND p.at_bat_index = c.at_bat_index
     AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
    WHERE c.challenge_team_id IS NOT NULL
      AND ${window.clause}
      AND ${situational.clause}
      ${teamClause}
    ORDER BY c.challenge_team_id ASC, c.challenged_at ASC NULLS LAST
    `,
        params,
      ).then((rows) =>
        rows.map((row) => ({
          challengeId: row.challenge_id,
          teamId: Number(row.team_id),
          teamName: row.team_name,
          isOverturned: row.is_overturned,
          inning: row.inning === null ? null : Number(row.inning),
          halfInning: row.half_inning,
          outs: row.outs === null ? null : Number(row.outs),
          basesState: row.bases_state,
          homeScore: row.home_score === null ? null : Number(row.home_score),
          awayScore: row.away_score === null ? null : Number(row.away_score),
          ballsBefore: row.balls_before === null ? null : Number(row.balls_before),
          strikesBefore: row.strikes_before === null ? null : Number(row.strikes_before),
          balls: row.balls === null ? null : Number(row.balls),
          strikes: row.strikes === null ? null : Number(row.strikes),
          calledDescription: row.called_description,
          edgeBucket: row.edge_bucket,
          estimatedChallengesRemaining:
            row.estimated_challenges_remaining === null ? null : Number(row.estimated_challenges_remaining),
        })),
      );
    },
  );
}

async function modelTeamDecisionRows(rows: TeamDecisionMetricRow[]) {
  const [overturnProbabilityRows, winExpectancyRows] = await Promise.all([
    getOverturnProbabilityFallbackRows(),
    getWinExpectancyFallbackRows(),
  ]);

  const modeledRows = await Promise.all(
    rows.map(async (row) => {
      const calledPitch = resolveCalledPitchFromDescription(row.calledDescription);
      if (!calledPitch) {
        return null;
      }

      const decision = await estimateChallengeDecisionValue(
        {
          inning: row.inning ?? 1,
          halfInning: normalizeHalfInning(row.halfInning) === "Bottom" ? "Bottom" : "Top",
          balls: row.ballsBefore ?? row.balls ?? 0,
          strikes: row.strikesBefore ?? row.strikes ?? 0,
          outs: row.outs ?? 0,
          scoreDiffBattingTeam: getScoreDiffBattingTeam(row.halfInning, row.homeScore, row.awayScore),
          basesState: row.basesState ?? "000",
          calledPitch,
          edgeBucket: row.edgeBucket,
          challengesRemaining: row.estimatedChallengesRemaining ?? 1,
        },
        { probabilityRows: overturnProbabilityRows, winRows: winExpectancyRows },
      );

      const realizedValue = row.isOverturned ? decision.wpDeltaIfSuccess : decision.wpDeltaIfFail;
      const highPressure = (row.inning ?? 0) >= 7 || Math.abs((row.homeScore ?? 0) - (row.awayScore ?? 0)) <= 2;
      const lateClose = isLateCloseDecisionContext(row);

      return {
        row,
        label: buildDecisionWindowLabel(row),
        expectedWpDelta: decision.expectedWpDelta,
        realizedWpDelta: realizedValue,
        recommendation: decision.recommendation,
        decisionValueMode: decision.decisionValueMode,
        highPressurePositive: highPressure && decision.expectedWpDelta > 0,
        lateClosePositive: lateClose && decision.expectedWpDelta > 0,
      } satisfies ModeledTeamDecisionRow;
    }),
  );

  return modeledRows.filter((row): row is ModeledTeamDecisionRow => row !== null);
}

async function buildTeamDecisionValueMetrics(rows: TeamDecisionMetricRow[], modeledRows?: ModeledTeamDecisionRow[]) {
  const resolvedModeledRows = modeledRows ?? (await modelTeamDecisionRows(rows));

  const aggregates = new Map<
    number,
    {
      teamId: number;
      teamName: string | null;
      totalChallenges: number;
      modeledChallenges: number;
      winModeChallenges: number;
      totalExpected: number;
      totalRealized: number;
      challengeRecommendations: number;
      holdRecommendations: number;
      capturedValueCount: number;
      wastedValueCount: number;
      highPressureExpectedCount: number;
      lateCloseChallengeCount: number;
      lateCloseExpectedCount: number;
      windows: Map<string, { totalExpected: number; count: number }>;
    }
  >();

  for (const row of rows) {
    const aggregate = aggregates.get(row.teamId) ?? {
      teamId: row.teamId,
      teamName: row.teamName,
      totalChallenges: 0,
      modeledChallenges: 0,
      winModeChallenges: 0,
      totalExpected: 0,
      totalRealized: 0,
      challengeRecommendations: 0,
      holdRecommendations: 0,
      capturedValueCount: 0,
      wastedValueCount: 0,
      highPressureExpectedCount: 0,
      lateCloseChallengeCount: 0,
      lateCloseExpectedCount: 0,
      windows: new Map(),
    };

    aggregate.totalChallenges += 1;
    if (isLateCloseDecisionContext(row)) {
      aggregate.lateCloseChallengeCount += 1;
    }
    aggregates.set(row.teamId, aggregate);
  }

  for (const modeled of resolvedModeledRows) {
    const aggregate = aggregates.get(modeled.row.teamId);
    if (!aggregate) continue;

    aggregate.modeledChallenges += 1;
    if (modeled.decisionValueMode === "win_expectancy") {
      aggregate.winModeChallenges += 1;
      aggregate.totalExpected += modeled.expectedWpDelta;
      aggregate.totalRealized += modeled.realizedWpDelta;
      if (modeled.recommendation === "challenge") {
        aggregate.challengeRecommendations += 1;
      } else if (modeled.recommendation === "hold") {
        aggregate.holdRecommendations += 1;
      }
      if (modeled.realizedWpDelta >= modeled.expectedWpDelta) {
        aggregate.capturedValueCount += 1;
      }
      if (modeled.expectedWpDelta <= 0) {
        aggregate.wastedValueCount += 1;
      }
      if (modeled.highPressurePositive) {
        aggregate.highPressureExpectedCount += 1;
      }
      if (modeled.lateClosePositive) {
        aggregate.lateCloseExpectedCount += 1;
      }

      const window = aggregate.windows.get(modeled.label) ?? { totalExpected: 0, count: 0 };
      window.totalExpected += modeled.expectedWpDelta;
      window.count += 1;
      aggregate.windows.set(modeled.label, window);
    }
  }

  return new Map<number, TeamDecisionMetricAggregate>(
    [...aggregates.values()].map((aggregate) => {
      const modeledWinCoverageRate =
        aggregate.modeledChallenges > 0 ? aggregate.winModeChallenges / aggregate.modeledChallenges : 0;
      const bestWindow =
        [...aggregate.windows.entries()]
          .map(([label, value]) => ({
            label,
            count: value.count,
            averageExpected: value.count > 0 ? value.totalExpected / value.count : null,
          }))
          .sort((left, right) => {
            const expectedGap = (right.averageExpected ?? -Infinity) - (left.averageExpected ?? -Infinity);
            if (expectedGap !== 0) return expectedGap;
            return right.count - left.count;
          })[0] ?? null;
      const averageExpectedChallengeValue =
        aggregate.winModeChallenges > 0 ? roundMetric(aggregate.totalExpected / aggregate.winModeChallenges, 4) : null;
      const averageRealizedChallengeValue =
        aggregate.winModeChallenges > 0 ? roundMetric(aggregate.totalRealized / aggregate.winModeChallenges, 4) : null;

      return [
        aggregate.teamId,
        {
          teamId: aggregate.teamId,
          teamName: aggregate.teamName,
          totalChallenges: aggregate.totalChallenges,
          averageExpectedChallengeValue,
          averageRealizedChallengeValue,
          decisionSurplus:
            averageExpectedChallengeValue === null || averageRealizedChallengeValue === null
              ? null
              : roundMetric(averageRealizedChallengeValue - averageExpectedChallengeValue, 4),
          challengeRecommendationRate:
            aggregate.winModeChallenges > 0 ? aggregate.challengeRecommendations / aggregate.winModeChallenges : 0,
          holdRecommendationRate:
            aggregate.winModeChallenges > 0 ? aggregate.holdRecommendations / aggregate.winModeChallenges : 0,
          capturedValueShare:
            aggregate.winModeChallenges > 0 ? aggregate.capturedValueCount / aggregate.winModeChallenges : 0,
          wastedValueShare:
            aggregate.winModeChallenges > 0 ? aggregate.wastedValueCount / aggregate.winModeChallenges : 0,
          highPressureExpectedValueShare:
            aggregate.winModeChallenges > 0 ? aggregate.highPressureExpectedCount / aggregate.winModeChallenges : 0,
          lateCloseChallengeShare:
            aggregate.totalChallenges > 0 ? aggregate.lateCloseChallengeCount / aggregate.totalChallenges : 0,
          lateCloseExpectedValueShare:
            aggregate.winModeChallenges > 0 ? aggregate.lateCloseExpectedCount / aggregate.winModeChallenges : 0,
          bestDecisionWindowLabel: bestWindow?.label ?? null,
          bestDecisionWindowExpectedValue:
            bestWindow?.averageExpected === null || bestWindow?.averageExpected === undefined
              ? null
              : roundMetric(bestWindow.averageExpected, 4),
          bestDecisionWindowChallenges: bestWindow?.count ?? 0,
          modelConfidence:
            aggregate.winModeChallenges > 0
              ? getDecisionValueConfidenceBand(aggregate.winModeChallenges, modeledWinCoverageRate)
              : null,
          modeledWinCoverageRate,
        } satisfies TeamDecisionMetricAggregate,
      ];
    }),
  );
}

async function buildTeamDecisionWindowReport(modeledRows: ModeledTeamDecisionRow[]) {
  const windows = new Map<string, TeamDecisionWindowAggregate>();

  for (const modeled of modeledRows) {
    const aggregate = windows.get(modeled.label) ?? {
      label: modeled.label,
      challenges: 0,
      modeledChallenges: 0,
      totalExpected: 0,
      totalRealized: 0,
      capturedValueCount: 0,
      wastedValueCount: 0,
      challengeRecommendations: 0,
      holdRecommendations: 0,
      winModeChallenges: 0,
    };

    aggregate.modeledChallenges += 1;
    if (modeled.decisionValueMode === "win_expectancy") {
      aggregate.challenges += 1;
      aggregate.winModeChallenges += 1;
      aggregate.totalExpected += modeled.expectedWpDelta;
      aggregate.totalRealized += modeled.realizedWpDelta;
      if (modeled.recommendation === "challenge") {
        aggregate.challengeRecommendations += 1;
      } else if (modeled.recommendation === "hold") {
        aggregate.holdRecommendations += 1;
      }
      if (modeled.realizedWpDelta >= modeled.expectedWpDelta) {
        aggregate.capturedValueCount += 1;
      }
      if (modeled.expectedWpDelta <= 0) {
        aggregate.wastedValueCount += 1;
      }
    }

    windows.set(modeled.label, aggregate);
  }

  const entries: TeamDecisionWindowEntry[] = [...windows.values()]
    .filter((window) => window.winModeChallenges > 0)
    .map((window) => {
      const averageExpectedChallengeValue =
        window.winModeChallenges > 0 ? roundMetric(window.totalExpected / window.winModeChallenges, 4) : null;
      const averageRealizedChallengeValue =
        window.winModeChallenges > 0 ? roundMetric(window.totalRealized / window.winModeChallenges, 4) : null;
      const modeledWinCoverageRate = window.modeledChallenges > 0 ? window.winModeChallenges / window.modeledChallenges : 0;

      return {
        label: window.label,
        challenges: window.challenges,
        averageExpectedChallengeValue,
        averageRealizedChallengeValue,
        decisionSurplus:
          averageExpectedChallengeValue === null || averageRealizedChallengeValue === null
            ? null
            : roundMetric(averageRealizedChallengeValue - averageExpectedChallengeValue, 4),
        capturedValueShare: window.winModeChallenges > 0 ? window.capturedValueCount / window.winModeChallenges : 0,
        wastedValueShare: window.winModeChallenges > 0 ? window.wastedValueCount / window.winModeChallenges : 0,
        challengeRecommendationRate:
          window.winModeChallenges > 0 ? window.challengeRecommendations / window.winModeChallenges : 0,
        holdRecommendationRate:
          window.winModeChallenges > 0 ? window.holdRecommendations / window.winModeChallenges : 0,
        modelConfidence:
          window.winModeChallenges > 0 ? getDecisionValueConfidenceBand(window.winModeChallenges, modeledWinCoverageRate) : null,
      };
    })
    .sort((left, right) => {
      const rightValue = right.decisionSurplus ?? -Infinity;
      const leftValue = left.decisionSurplus ?? -Infinity;
      if (rightValue !== leftValue) return rightValue - leftValue;
      return right.challenges - left.challenges;
    });

  const trustedEntries = entries.filter((entry) => hasTrustedModelConfidenceBand(entry.modelConfidence));
  const rankedEntries = trustedEntries.length > 0 ? trustedEntries : entries;

  return {
    strongestWindow: rankedEntries[0] ?? null,
    weakestWindow: rankedEntries.length > 0 ? rankedEntries[rankedEntries.length - 1] : null,
    topWindows: rankedEntries.slice(0, 4),
    bottomWindows: [...rankedEntries].reverse().slice(0, 4),
    positiveWindowCount: rankedEntries.filter((entry) => (entry.decisionSurplus ?? 0) > 0.0005).length,
    negativeWindowCount: rankedEntries.filter((entry) => (entry.decisionSurplus ?? 0) < -0.0005).length,
    neutralWindowCount: rankedEntries.filter((entry) => Math.abs(entry.decisionSurplus ?? 0) <= 0.0005).length,
  };
}

function buildTeamDecisionBreakdownSection(
  key: TeamDecisionBreakdownSection["key"],
  title: string,
  modeledRows: ModeledTeamDecisionRow[],
  labelBuilder: (modeled: ModeledTeamDecisionRow) => string,
): TeamDecisionBreakdownSection {
  const aggregates = new Map<string, TeamDecisionBreakdownAggregate>();

  for (const modeled of modeledRows) {
    const label = labelBuilder(modeled);
    const aggregate = aggregates.get(label) ?? {
      label,
      challenges: 0,
      modeledChallenges: 0,
      totalExpected: 0,
      totalRealized: 0,
      capturedValueCount: 0,
      wastedValueCount: 0,
      winModeChallenges: 0,
    };

    aggregate.modeledChallenges += 1;
    if (modeled.decisionValueMode === "win_expectancy") {
      aggregate.challenges += 1;
      aggregate.winModeChallenges += 1;
      aggregate.totalExpected += modeled.expectedWpDelta;
      aggregate.totalRealized += modeled.realizedWpDelta;
      if (modeled.realizedWpDelta >= modeled.expectedWpDelta) {
        aggregate.capturedValueCount += 1;
      }
      if (modeled.expectedWpDelta <= 0) {
        aggregate.wastedValueCount += 1;
      }
    }

    aggregates.set(label, aggregate);
  }

  const entries: TeamDecisionBreakdownEntry[] = [...aggregates.values()]
    .filter((aggregate) => aggregate.winModeChallenges > 0)
    .map((aggregate) => {
      const averageExpectedChallengeValue =
        aggregate.winModeChallenges > 0 ? roundMetric(aggregate.totalExpected / aggregate.winModeChallenges, 4) : null;
      const averageRealizedChallengeValue =
        aggregate.winModeChallenges > 0 ? roundMetric(aggregate.totalRealized / aggregate.winModeChallenges, 4) : null;
      const modeledWinCoverageRate =
        aggregate.modeledChallenges > 0 ? aggregate.winModeChallenges / aggregate.modeledChallenges : 0;

      return {
        label: aggregate.label,
        challenges: aggregate.challenges,
        averageExpectedChallengeValue,
        averageRealizedChallengeValue,
        decisionSurplus:
          averageExpectedChallengeValue === null || averageRealizedChallengeValue === null
            ? null
            : roundMetric(averageRealizedChallengeValue - averageExpectedChallengeValue, 4),
        capturedValueShare: aggregate.winModeChallenges > 0 ? aggregate.capturedValueCount / aggregate.winModeChallenges : 0,
        wastedValueShare: aggregate.winModeChallenges > 0 ? aggregate.wastedValueCount / aggregate.winModeChallenges : 0,
        modelConfidence:
          aggregate.winModeChallenges > 0 ? getDecisionValueConfidenceBand(aggregate.winModeChallenges, modeledWinCoverageRate) : null,
      };
    })
    .sort((left, right) => {
      const rightValue = right.decisionSurplus ?? -Infinity;
      const leftValue = left.decisionSurplus ?? -Infinity;
      if (rightValue !== leftValue) return rightValue - leftValue;
      return right.challenges - left.challenges;
    });

  const trustedEntries = entries.filter((entry) => hasTrustedModelConfidenceBand(entry.modelConfidence));
  const rankedEntries = trustedEntries.length > 0 ? trustedEntries : entries;

  return {
    key,
    title,
    bestEntry: rankedEntries[0] ?? null,
    weakestEntry: rankedEntries.length > 0 ? rankedEntries[rankedEntries.length - 1] : null,
    entries: rankedEntries,
    positiveCount: rankedEntries.filter((entry) => (entry.decisionSurplus ?? 0) > 0.0005).length,
    negativeCount: rankedEntries.filter((entry) => (entry.decisionSurplus ?? 0) < -0.0005).length,
    neutralCount: rankedEntries.filter((entry) => Math.abs(entry.decisionSurplus ?? 0) <= 0.0005).length,
  };
}

export async function getTeamDecisionValueLeaderboard(range: RangeKey = "season") {
  return withVersionedCache(
    ["team-decision-value-leaderboard", range],
    getLatestSuccessfulEtlDataVersion(),
    30_000,
    async () => {
      const rows = await getTeamDecisionMetricRows(range);
      return buildTeamDecisionValueMetrics(rows);
    },
  );
}

export async function getHomeTeamDecisionValueLeaders(range: RangeKey = "season") {
  const metrics = await getTeamDecisionValueLeaderboard(range);
  return [...metrics.values()].sort((left, right) => {
    const decisionGap = (right.decisionSurplus ?? -Infinity) - (left.decisionSurplus ?? -Infinity);
    if (decisionGap !== 0) return decisionGap;
    return right.capturedValueShare - left.capturedValueShare;
  });
}

export async function getTeamDecisionValueSummary(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
): Promise<TeamDecisionValueSummary> {
  return withVersionedCache(
    ["team-decision-value-summary", teamId, range, ...getSituationalFilterCacheParts(filters)],
    getLatestSuccessfulEtlDataVersion(),
    30_000,
    async () => {
      const rows = await getTeamDecisionMetricRows(range, filters, teamId);
      const metrics = await buildTeamDecisionValueMetrics(rows);
      return (
        metrics.get(teamId) ?? {
          totalChallenges: 0,
          averageExpectedChallengeValue: null,
          averageRealizedChallengeValue: null,
          decisionSurplus: null,
          challengeRecommendationRate: 0,
          holdRecommendationRate: 0,
          capturedValueShare: 0,
          wastedValueShare: 0,
          highPressureExpectedValueShare: 0,
          lateCloseChallengeShare: 0,
          lateCloseExpectedValueShare: 0,
          bestDecisionWindowLabel: null,
          bestDecisionWindowExpectedValue: null,
          bestDecisionWindowChallenges: 0,
          modelConfidence: null,
          modeledWinCoverageRate: 0,
        }
      );
    },
  );
}

export async function getTeamDecisionValueReport(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
): Promise<TeamDecisionValueReport> {
  return withVersionedCache(
    ["team-decision-value-report", teamId, range, ...getSituationalFilterCacheParts(filters)],
    getLatestSuccessfulEtlDataVersion(),
    30_000,
    async () => {
      const rows = await getTeamDecisionMetricRows(range, filters, teamId);
      const modeledRows = await modelTeamDecisionRows(rows);
      const [metrics, windows] = await Promise.all([
        buildTeamDecisionValueMetrics(rows, modeledRows),
        buildTeamDecisionWindowReport(modeledRows),
      ]);

      const summary =
        metrics.get(teamId) ?? {
          totalChallenges: 0,
          averageExpectedChallengeValue: null,
          averageRealizedChallengeValue: null,
          decisionSurplus: null,
          challengeRecommendationRate: 0,
          holdRecommendationRate: 0,
          capturedValueShare: 0,
          wastedValueShare: 0,
          highPressureExpectedValueShare: 0,
          lateCloseChallengeShare: 0,
          lateCloseExpectedValueShare: 0,
          bestDecisionWindowLabel: null,
          bestDecisionWindowExpectedValue: null,
          bestDecisionWindowChallenges: 0,
          modelConfidence: null,
          modeledWinCoverageRate: 0,
        };

      return {
        summary,
        ...windows,
        breakdownSections: [
          buildTeamDecisionBreakdownSection("inning_phase", "Inning Phase", modeledRows, (modeled) =>
            buildDecisionInningLabel(modeled.row.inning),
          ),
          buildTeamDecisionBreakdownSection("count_state", "Count State", modeledRows, (modeled) =>
            buildDecisionCountLabel(modeled.row),
          ),
          buildTeamDecisionBreakdownSection("base_out_state", "Base / Out State", modeledRows, (modeled) =>
            buildDecisionBaseOutLabel(modeled.row),
          ),
        ],
      };
    },
  );
}

export async function getLiveGames(): Promise<LiveGameCard[]> {
  return withServerTiming("data.getLiveGames", () =>
    withGlobalLiveVersionedCache("live-games", 5_000, async () => {
    const rows = await sql<{
      gamepk: number;
      gamedate: string;
      gametype: string;
      status: string;
      detailedstate: string | null;
      hometeamid: number;
      hometeamname: string;
      hometeamabbreviation: string | null;
      hometeamlogourl: string | null;
      hometeamcolor: string | null;
      homescore: number | null;
      awayteamid: number;
      awayteamname: string;
      awayteamabbreviation: string | null;
      awayteamlogourl: string | null;
      awayteamcolor: string | null;
      awayscore: number | null;
      homeabsremaining: number;
      awayabsremaining: number;
      challengecount: number;
      inning: number | null;
      inninghalf: string | null;
    }>(
      `
    WITH live_game_ids AS (
      SELECT
        g.game_pk,
        CASE WHEN g.status_abstract = 'Live' THEN 0 ELSE 1 END AS sort_bucket,
        g.game_date
      FROM games g
      WHERE (g.game_date::date = CURRENT_DATE OR g.status_abstract = 'Live')
      ORDER BY sort_bucket, g.game_date DESC
      LIMIT 20
    )
    SELECT
      g.game_pk AS gamePk,
      g.game_date AS gameDate,
      g.game_type AS gameType,
      g.status_abstract AS status,
      g.status_detailed AS detailedState,
      g.home_team_id AS homeTeamId,
      home.name AS homeTeamName,
      home.abbreviation AS homeTeamAbbreviation,
      home.logo_svg_url AS homeTeamLogoUrl,
      home.primary_color AS homeTeamColor,
      g.home_score AS homeScore,
      g.away_team_id AS awayTeamId,
      away.name AS awayTeamName,
      away.abbreviation AS awayTeamAbbreviation,
      away.logo_svg_url AS awayTeamLogoUrl,
      away.primary_color AS awayTeamColor,
      g.away_score AS awayScore,
      COALESCE(home_sum.remaining, 0) AS homeAbsRemaining,
      COALESCE(away_sum.remaining, 0) AS awayAbsRemaining,
      COALESCE(ch.cnt, 0) AS challengeCount,
      gss.inning AS inning,
      gss.half_inning AS inningHalf
    FROM live_game_ids ids
    JOIN games g ON g.game_pk = ids.game_pk
    LEFT JOIN teams home ON home.team_id = g.home_team_id
    LEFT JOIN teams away ON away.team_id = g.away_team_id
    LEFT JOIN team_abs_game_summary home_sum ON home_sum.game_pk = g.game_pk AND home_sum.team_side = 'home'
    LEFT JOIN team_abs_game_summary away_sum ON away_sum.game_pk = g.game_pk AND away_sum.team_side = 'away'
    LEFT JOIN LATERAL (
      SELECT snapshot.inning, snapshot.half_inning
      FROM game_state_snapshots snapshot
      WHERE snapshot.game_pk = g.game_pk
      ORDER BY snapshot.snapshot_time DESC
      LIMIT 1
    ) gss ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS cnt
      FROM mart_abs_pitch_challenges challenge
      WHERE challenge.game_pk = g.game_pk
    ) ch ON TRUE
    ORDER BY ids.sort_bucket, ids.game_date DESC
    `,
    );

    return rows.map((r) => ({
      gamePk: r.gamepk,
      gameDate: r.gamedate,
      gameType: r.gametype,
      status: r.status,
      detailedState: r.detailedstate,
      homeTeamId: r.hometeamid,
      homeTeamName: r.hometeamname,
      homeTeamAbbreviation: r.hometeamabbreviation,
      homeTeamLogoUrl: r.hometeamlogourl,
      homeTeamColor: r.hometeamcolor,
      homeScore: r.homescore,
      awayTeamId: r.awayteamid,
      awayTeamName: r.awayteamname,
      awayTeamAbbreviation: r.awayteamabbreviation,
      awayTeamLogoUrl: r.awayteamlogourl,
      awayTeamColor: r.awayteamcolor,
      awayScore: r.awayscore,
      homeAbsRemaining: Number(r.homeabsremaining ?? 0),
      awayAbsRemaining: Number(r.awayabsremaining ?? 0),
      challengeCount: Number(r.challengecount ?? 0),
      inning: r.inning,
      inningHalf: r.inninghalf,
    }));
    }),
  { warnAtMs: 500 });
}

export async function getHomeChallengeMoments(limit = 8): Promise<HomeChallengeMoment[]> {
  return withServerTiming(
    "data.getHomeChallengeMoments",
    () => withVersionedCache(["home-challenge-moments", limit], getLatestSuccessfulEtlDataVersion(), 15_000, async () => {
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
    gamestatus: string;
    balls: number | null;
    strikes: number | null;
    outs: number | null;
    basesstate: string | null;
    playername: string | null;
    pitchnumber: number | null;
    balls_before: number | null;
    strikes_before: number | null;
    balls_after: number | null;
    strikes_after: number | null;
    expected_challenge_value: number | string | null;
    wp_delta_if_success: number | string | null;
    wp_delta_if_fail: number | string | null;
    decision_value_mode: "win_expectancy" | "heuristic" | null;
    estimated_overturn_probability: number | string | null;
    overturn_probability_confidence: "high" | "medium" | "low" | null;
  }>(
    `
    WITH recent_challenges AS MATERIALIZED (
      SELECT c.*
      FROM mart_abs_pitch_challenges c
      WHERE c.challenged_at >= NOW() - INTERVAL '48 hours'
      ORDER BY c.challenged_at DESC NULLS LAST
      LIMIT $1
    )
    SELECT
      c.challenge_id AS challengeId,
      c.game_pk AS gamePk,
      c.challenged_at AS challengedAt,
      home.name AS homeTeam,
      away.name AS awayTeam,
      c.inning,
      c.half_inning AS halfInning,
      CASE
        WHEN c.original_call = 'called_strike' THEN 'Called Strike'
        WHEN c.original_call = 'ball' THEN 'Ball'
        ELSE COALESCE(p.called_description, c.called_description)
      END AS calledDescription,
      challenge_team.name AS challengeTeamName,
      c.is_overturned AS isOverturned,
      c.home_score AS homeScore,
      c.away_score AS awayScore,
      g.status_abstract AS gameStatus,
      c.balls,
      c.strikes,
      c.outs,
      c.bases_state AS basesState,
      c.challenge_player_name AS playerName,
      COALESCE(c.pitch_number, c.inferred_pitch_number) AS pitchNumber,
      p.balls_before,
      p.strikes_before,
      p.balls_after,
      p.strikes_after,
      cv.expected_challenge_value,
      cv.wp_delta_if_success,
      cv.wp_delta_if_fail,
      cv.decision_value_mode,
      cv.estimated_overturn_probability,
      cv.overturn_probability_confidence
    FROM recent_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN LATERAL (
      SELECT
        expected_challenge_value,
        wp_delta_if_success,
        wp_delta_if_fail,
        decision_value_mode,
        estimated_overturn_probability,
        overturn_probability_confidence
      FROM mart_game_abs_challenge_values cv
      WHERE cv.challenge_id = c.challenge_id
      LIMIT 1
    ) cv ON TRUE
    LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
    LEFT JOIN teams home ON home.team_id = g.home_team_id
    LEFT JOIN teams away ON away.team_id = g.away_team_id
    LEFT JOIN teams challenge_team ON challenge_team.team_id = c.challenge_team_id
    ORDER BY c.challenged_at DESC NULLS LAST
    `,
    [limit],
  );

      const moments = rows.map((r) => {
        const expectedChallengeValue =
          r.expected_challenge_value === null ? null : Number(r.expected_challenge_value);
        const wpDeltaIfSuccess = r.wp_delta_if_success === null ? null : Number(r.wp_delta_if_success);
        const wpDeltaIfFail = r.wp_delta_if_fail === null ? null : Number(r.wp_delta_if_fail);
        return {
        challengeId: r.challengeid,
        gamePk: Number(r.gamepk),
        challengedAt: r.challengedat,
        gameLabel: `${r.awayteam ?? "Away"} at ${r.hometeam ?? "Home"}`,
        inning: r.inning,
        halfInning: r.halfinning,
        calledDescription: r.calleddescription,
        challengeTeamName: r.challengeteamname,
        isOverturned: r.isoverturned,
        leverageScore: 0,
        gameStatus: r.gamestatus,
        balls: r.balls,
        strikes: r.strikes,
        outs: r.outs,
        basesState: r.basesstate,
        homeScore: r.homescore,
        awayScore: r.awayscore,
        impactType: null,
        realizedChallengeValue: wpDeltaIfSuccess !== null && wpDeltaIfFail !== null
          ? (r.isoverturned ? wpDeltaIfSuccess : wpDeltaIfFail)
          : null,
        expectedChallengeValue,
        overturnProbabilityConfidence: r.overturn_probability_confidence,
        decisionValueMode: r.decision_value_mode,
        umpireCount: (() => {
          if (r.balls_before === null || r.strikes_before === null) return null;
          if (!r.isoverturned) return r.balls_after === null || r.strikes_after === null ? null : `${r.balls_after}-${r.strikes_after}`;
          if (r.balls_after !== null && r.balls_after > r.balls_before) return `${r.balls_before}-${r.strikes_before + 1}`;
          if (r.strikes_after !== null && r.strikes_after > r.strikes_before) return `${r.balls_before + 1}-${r.strikes_before}`;
          return r.balls_after === null || r.strikes_after === null ? null : `${r.balls_after}-${r.strikes_after}`;
        })(),
        playerName: r.playername,
        pitchNumber: r.pitchnumber,
      };
      });

      return buildHomeChallengeMoments(moments);
    }),
    { warnAtMs: 500, metadata: { limit } },
  );
}

export async function getGame(gamePk: number) {
  return withServerTiming(
    "data.getGame",
    () => withGameVersionedCache("game", gamePk, 15_000, async () => {
    const rows = await sql<{
      gamepk: number;
      gamedate: string;
      gametype: string;
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
      g.game_type AS gameType,
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
    }),
    { warnAtMs: 900, metadata: { gamePk } },
  );
}

export async function getGameScoreboardData(gamePk: number): Promise<GameScoreboardData | null> {
  return withGameVersionedCache("game-scoreboard", gamePk, 15_000, async () => {
    const linescoreRows = await sql<{
      inningsjson: unknown;
      awayruns: number | null;
      homeruns: number | null;
      awayhits: number | null;
      homehits: number | null;
      awayerrors: number | null;
      homeerrors: number | null;
    }>(
      `
      SELECT
        innings_json AS inningsJson,
        away_runs AS awayRuns,
        home_runs AS homeRuns,
        away_hits AS awayHits,
        home_hits AS homeHits,
        away_errors AS awayErrors,
        home_errors AS homeErrors
      FROM ops.game_linescores
      WHERE game_pk = $1
      `,
      [gamePk],
    );

    const structuredLinescore = mapStoredLinescoreToScoreboardData(linescoreRows[0] ?? null);
    if (structuredLinescore) {
      return structuredLinescore;
    }

    const rows = await sql<{ payload: unknown }>(
      `
      SELECT payload
      FROM ops.source_snapshots
      WHERE source_name = 'mlb_statsapi.feed_live'
        AND entity_key = $1
      ORDER BY fetched_at DESC
      LIMIT 1
      `,
      [`game:${gamePk}`],
    );

    const payload = rows[0]?.payload as
      | {
          liveData?: {
            linescore?: {
              innings?: Array<{
                num?: number | null;
                home?: { runs?: number | null } | null;
                away?: { runs?: number | null } | null;
              }> | null;
              teams?: {
                home?: { runs?: number | null; hits?: number | null; errors?: number | null } | null;
                away?: { runs?: number | null; hits?: number | null; errors?: number | null } | null;
              } | null;
            } | null;
          } | null;
        }
      | undefined;

    const snapshotLinescore = payload?.liveData?.linescore;
    const linescore = snapshotLinescore ?? (await fetchMlbStatsApiLinescore(gamePk));
    if (!linescore) return null;

    return mapLinescoreToScoreboardData(linescore);
  });
}

type MlbStatsApiLinescore = {
  innings?: Array<{
    num?: number | null;
    home?: { runs?: number | null } | null;
    away?: { runs?: number | null } | null;
  }> | null;
  teams?: {
    home?: { runs?: number | null; hits?: number | null; errors?: number | null } | null;
    away?: { runs?: number | null; hits?: number | null; errors?: number | null } | null;
  } | null;
};

function mapLinescoreToScoreboardData(linescore: MlbStatsApiLinescore): GameScoreboardData {
  const innings = Array.isArray(linescore.innings)
    ? linescore.innings
        .map((entry, index) => ({
          inning: Number(entry?.num ?? index + 1),
          awayRuns: entry?.away?.runs ?? null,
          homeRuns: entry?.home?.runs ?? null,
        }))
        .filter((entry) => Number.isFinite(entry.inning))
    : [];

  return {
    innings,
    awayRuns: linescore.teams?.away?.runs ?? null,
    homeRuns: linescore.teams?.home?.runs ?? null,
    awayHits: linescore.teams?.away?.hits ?? null,
    homeHits: linescore.teams?.home?.hits ?? null,
    awayErrors: linescore.teams?.away?.errors ?? null,
    homeErrors: linescore.teams?.home?.errors ?? null,
  };
}

function mapStoredLinescoreToScoreboardData(row: {
  inningsjson: unknown;
  awayruns: number | null;
  homeruns: number | null;
  awayhits: number | null;
  homehits: number | null;
  awayerrors: number | null;
  homeerrors: number | null;
} | null): GameScoreboardData | null {
  if (!row) return null;

  const innings = Array.isArray(row.inningsjson)
    ? row.inningsjson
        .map((entry, index) => {
          if (!entry || typeof entry !== "object") {
            return null;
          }
          const inningEntry = entry as {
            inning?: unknown;
            awayRuns?: unknown;
            homeRuns?: unknown;
          };
          const inningValue = Number(inningEntry.inning ?? index + 1);
          if (!Number.isFinite(inningValue)) {
            return null;
          }
          return {
            inning: inningValue,
            awayRuns: typeof inningEntry.awayRuns === "number" ? inningEntry.awayRuns : null,
            homeRuns: typeof inningEntry.homeRuns === "number" ? inningEntry.homeRuns : null,
          };
        })
        .filter((entry): entry is GameScoreboardData["innings"][number] => entry !== null)
    : [];

  const hasAnyValue =
    innings.length > 0 ||
    row.awayruns !== null ||
    row.homeruns !== null ||
    row.awayhits !== null ||
    row.homehits !== null ||
    row.awayerrors !== null ||
    row.homeerrors !== null;

  if (!hasAnyValue) {
    return null;
  }

  return {
    innings,
    awayRuns: row.awayruns,
    homeRuns: row.homeruns,
    awayHits: row.awayhits,
    homeHits: row.homehits,
    awayErrors: row.awayerrors,
    homeErrors: row.homeerrors,
  };
}

async function fetchMlbStatsApiLinescore(gamePk: number): Promise<MlbStatsApiLinescore | null> {
  try {
    const response = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`, {
      next: { revalidate: 15 },
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      liveData?: {
        linescore?: MlbStatsApiLinescore | null;
      } | null;
    };

    return payload.liveData?.linescore ?? null;
  } catch {
    return null;
  }
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
  return withServerTiming(
    "data.getGameLiveStatus",
    () => withGameVersionedCache("game-live-status", gamePk, 3_000, async () => {
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
    }),
    { warnAtMs: 900, metadata: { gamePk } },
  );
}

async function getRecentGameChallenges(
  gamePk: number,
  minutes: number,
): Promise<Array<{ challengedAt: string | null; isOverturned: boolean }>> {
  const rows = await sql<{ challengedat: string | null; isoverturned: boolean }>(
    `
    SELECT challenged_at AS challengedAt, is_overturned AS isOverturned
    FROM mart_abs_pitch_challenges
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
  return withServerTiming(
    "data.getGameChallenges",
    () => withGameVersionedCache("game-challenges", gamePk, 10_000, () => getGamePageChallengeEvents(gamePk)),
    { warnAtMs: 1_200, metadata: { gamePk } },
  );
}

export async function getGamePageChallengeEvents(gamePk: number): Promise<ChallengeEvent[]> {
  return withServerTiming(
    "data.getGamePageChallengeEvents",
    () =>
      withCachedValue(getCacheKey(["game-page-challenge-events", gamePk]), 10_000, async () => {
        const rows = await sql<{
          challengeid: string;
          gamepk: number;
          pitchnumber: number | null;
          challengedat: string | null;
          inning: number | null;
          halfinning: string | null;
          balls: number | null;
          strikes: number | null;
          outs: number | null;
          bases_state: string | null;
          home_score: number | null;
          away_score: number | null;
          challenge_team_id: number | null;
          challengeteamname: string | null;
          challenge_player_name: string | null;
          batter_name: string | null;
          pitcher_name: string | null;
          calleddescription: string | null;
          original_call: CalledPitch | null;
          corrected_call: CalledPitch | null;
          challenge_direction: "strike_to_ball" | "ball_to_strike" | null;
          isoverturned: boolean;
          px: number | null;
          pz: number | null;
          strikezonetop: number | null;
          strikezonebottom: number | null;
          location_source: string | null;
          inference_method: string | null;
          inference_confidence: string | null;
          pitchtype: string | null;
          startspeed: number | string | null;
          spinrate: number | string | null;
          batter_stand: "R" | "L" | null;
          pitcher_throws: "R" | "L" | null;
          balls_before: number | null;
          strikes_before: number | null;
          balls_after: number | null;
          strikes_after: number | null;
          impact_type: string | null;
          impact_summary: string | null;
          edge_bucket: EdgeBucket | null;
          challenge_side_role: string | null;
          estimated_challenges_remaining: number | string | null;
        }>(
          `
          WITH challenged AS (
            SELECT
              c.*,
              GREATEST(
                0,
                2 - COUNT(*) FILTER (WHERE c.is_overturned = FALSE) OVER (
                  PARTITION BY c.game_pk, c.challenge_team_id
                  ORDER BY c.challenged_at NULLS LAST, c.challenge_id
                  ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
                )
              ) AS estimated_challenges_remaining
            FROM mart_abs_pitch_challenges c
            WHERE c.game_pk = $1
          )
          SELECT
            c.challenge_id AS challengeId,
            c.game_pk AS gamePk,
            COALESCE(c.pitch_number, c.inferred_pitch_number) AS pitchNumber,
            c.challenged_at AS challengedAt,
            c.inning,
            c.half_inning AS halfInning,
            c.balls,
            c.strikes,
            c.outs,
            c.bases_state,
            c.home_score,
            c.away_score,
            c.challenge_team_id,
            t.name AS challengeTeamName,
            c.challenge_player_name,
            c.batter_name,
            c.pitcher_name,
            c.called_description AS calledDescription,
            c.original_call,
            c.corrected_call,
            c.challenge_direction,
            c.is_overturned AS isOverturned,
            c.resolved_px AS px,
            c.resolved_pz AS pz,
            resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strikeZoneTop,
            resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strikeZoneBottom,
            c.resolved_location_source AS location_source,
            c.inference_method,
            c.inference_confidence,
            COALESCE(p.pitch_type_description, p.pitch_type_code) AS pitchType,
            p.start_speed AS startSpeed,
            p.spin_rate AS spinRate,
            NULLIF(batter_player.source_payload->'batSide'->>'code', '')::text AS batter_stand,
            NULLIF(pitcher_player.source_payload->'pitchHand'->>'code', '')::text AS pitcher_throws,
            COALESCE(p.balls_before, c.balls) AS balls_before,
            COALESCE(p.strikes_before, c.strikes) AS strikes_before,
            CASE
              WHEN p.balls_after IS NOT NULL THEN p.balls_after
              WHEN c.corrected_call = 'ball' AND c.balls IS NOT NULL THEN LEAST(c.balls + 1, 4)
              WHEN c.corrected_call = 'called_strike' THEN c.balls
              ELSE NULL
            END AS balls_after,
            CASE
              WHEN p.strikes_after IS NOT NULL THEN p.strikes_after
              WHEN c.corrected_call = 'called_strike' AND c.strikes IS NOT NULL THEN LEAST(c.strikes + 1, 3)
              WHEN c.corrected_call = 'ball' THEN c.strikes
              ELSE NULL
            END AS strikes_after,
            NULL::TEXT AS impact_type,
            NULL::TEXT AS impact_summary,
            c.edge_bucket,
            c.challenge_side_role,
            c.estimated_challenges_remaining
          FROM challenged c
          LEFT JOIN teams t ON t.team_id = c.challenge_team_id
          LEFT JOIN pitches p
            ON p.game_pk = c.game_pk
           AND p.at_bat_index = c.at_bat_index
           AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
          LEFT JOIN players batter_player ON batter_player.player_id = c.batter_id
          LEFT JOIN players pitcher_player ON pitcher_player.player_id = c.pitcher_id
          ORDER BY c.challenged_at ASC NULLS LAST, c.challenge_id ASC
          `,
          [gamePk],
        );
        const [runExpectancyRows, winExpectancyRows, overturnProbabilityRows] = await Promise.all([
          getRunExpectancyFallbackRows(),
          getWinExpectancyFallbackRows(),
          getOverturnProbabilityFallbackRows(),
        ]);

        return Promise.all(rows.map(async (row) => {
          const countBefore =
            row.balls_before === null || row.strikes_before === null ? null : `${Number(row.balls_before)}-${Number(row.strikes_before)}`;
          const ballsAfter = row.balls_after;
          const strikesAfter = row.strikes_after;
          const countAfter = ballsAfter === null || strikesAfter === null ? null : `${ballsAfter}-${strikesAfter}`;
          const umpireCount = resolveUmpireCountState(
            row.balls_before,
            row.strikes_before,
            ballsAfter,
            strikesAfter,
            row.isoverturned,
          );
          const leverage = summarizeEstimatedLeverage({
            inning: row.inning,
            balls: row.balls_before,
            strikes: row.strikes_before,
            outs: row.outs,
            basesState: row.bases_state,
            homeScore: row.home_score,
            awayScore: row.away_score,
            isOverturned: row.isoverturned,
          });

          const baseChallenge = {
            challengeId: row.challengeid,
            gamePk: Number(row.gamepk),
            pitchNumber: row.pitchnumber === null ? null : Number(row.pitchnumber),
            challengedAt: row.challengedat,
            inning: row.inning === null ? null : Number(row.inning),
            halfInning: row.halfinning,
            balls: row.balls,
            strikes: row.strikes,
            outs: row.outs,
            basesState: row.bases_state,
            homeScore: row.home_score,
            awayScore: row.away_score,
            challengeTeamId: row.challenge_team_id,
            challengeTeamName: row.challengeteamname,
            challengePlayerName: row.challenge_player_name,
            batterName: row.batter_name,
            pitcherName: row.pitcher_name,
            batterStand: row.batter_stand,
            pitcherThrows: row.pitcher_throws,
            calledDescription: row.calleddescription,
            originalCall: row.original_call,
            correctedCall: row.corrected_call,
            challengeDirection: row.challenge_direction,
            pitchType: row.pitchtype,
            startSpeed: row.startspeed === null ? null : Number(row.startspeed),
            spinRate: row.spinrate === null ? null : Number(row.spinrate),
            isOverturned: Boolean(row.isoverturned),
            px: row.px === null ? null : Number(row.px),
            pz: row.pz === null ? null : Number(row.pz),
            strikeZoneTop: row.strikezonetop === null ? null : Number(row.strikezonetop),
            strikeZoneBottom: row.strikezonebottom === null ? null : Number(row.strikezonebottom),
            countBefore,
            countAfter,
            umpireCount,
            impactType: row.impact_type,
            impactSummary: row.impact_summary,
            locationSource: row.location_source,
            inferenceMethod: row.inference_method,
            inferenceConfidence: row.inference_confidence,
            estimatedLeverageIndex: leverage.estimatedLeverageIndex,
            estimatedChallengeSwing: leverage.estimatedChallengeSwing,
            leverageBucket: leverage.leverageBucket,
            positiveOutcomeDelta: null,
            battingAverageDelta: null,
            walkRateDelta: null,
            strikeoutRateDelta: null,
          } satisfies ChallengeEvent;

          const runValue = getChallengeRunExpectancyDelta(baseChallenge, runExpectancyRows);
          const winValue = getChallengeWinExpectancyDelta(baseChallenge, winExpectancyRows);
          const estimatedChallengesRemaining =
            row.estimated_challenges_remaining === null ? 2 : Number(row.estimated_challenges_remaining);
          const decision =
            row.original_call && row.inning !== null && row.balls_before !== null && row.strikes_before !== null && row.outs !== null
              ? await estimateChallengeDecisionValue(
                  {
                    inning: Number(row.inning),
                    halfInning: normalizeHalfInning(row.halfinning) ?? "Top",
                    balls: Math.max(0, Math.min(3, Number(row.balls_before))),
                    strikes: Math.max(0, Math.min(2, Number(row.strikes_before))),
                    outs: Math.max(0, Math.min(2, Number(row.outs))),
                    scoreDiffBattingTeam: scoreDiffForBattingTeam(row.halfinning, row.home_score, row.away_score),
                    basesState: row.bases_state ?? "000",
                    calledPitch: row.original_call,
                    edgeBucket: row.edge_bucket,
                    challengesRemaining: estimatedChallengesRemaining,
                  },
                  { probabilityRows: overturnProbabilityRows, winRows: winExpectancyRows },
                )
              : null;

          return {
            ...baseChallenge,
            preRunExpectancy: runValue.preRunExpectancy,
            postRunExpectancy: runValue.postRunExpectancy,
            runExpectancyDelta: challengeTeamDelta(runValue.runExpectancyDelta, row.challenge_side_role),
            runExpectancyConfidence: runValue.runExpectancyConfidence,
            preWinExpectancy: winValue.preWinExpectancy,
            postWinExpectancy: winValue.postWinExpectancy,
            winExpectancyDelta: challengeTeamDelta(winValue.winExpectancyDelta, row.challenge_side_role),
            winExpectancyConfidence: winValue.winExpectancyConfidence,
            estimatedOverturnProbability: decision?.estimatedOverturnProbability ?? null,
            overturnProbabilityConfidence: decision?.overturnProbabilityConfidence ?? null,
            overturnProbabilityFallbackTier: null,
            expectedChallengeValue: decision?.expectedChallengeValue ?? null,
            decisionRecommendation: decision?.recommendation ?? null,
            decisionValueMode: decision?.decisionValueMode ?? null,
            heldCountBaseline: null,
            correctedCountBaseline: null,
            pitchTypeCountBaseline: null,
            handednessBaseline: null,
            pitchLaneBaseline: null,
          } satisfies ChallengeEvent;
        }));
      }),
    { warnAtMs: 700, metadata: { gamePk } },
  );
}

export async function getGameChallengeValueTimeline(gamePk: number): Promise<ChallengeValueTimelineEntry[]> {
  return withGameVersionedCache("game-challenge-value-timeline", gamePk, 10_000, async () => {
    const [challenges, baselines] = await Promise.all([getGamePageChallengeEvents(gamePk), getCountStateBaselines()]);
    const baselineMap = buildCountStateBaselineMap(baselines);

    return [...challenges]
      .sort((a, b) => {
        const left = a.challengedAt ? new Date(a.challengedAt).getTime() : 0;
        const right = b.challengedAt ? new Date(b.challengedAt).getTime() : 0;
        return left - right;
      })
      .map((challenge) => {
        const snapshot = buildChallengeValueSnapshot(challenge, baselineMap);
        return {
          challengeId: challenge.challengeId,
          challengedAt: challenge.challengedAt,
          inning: challenge.inning,
          halfInning: challenge.halfInning,
          challengeTeamName: challenge.challengeTeamName,
          batterName: challenge.batterName,
          pitcherName: challenge.pitcherName,
          calledDescription: challenge.calledDescription,
          isOverturned: challenge.isOverturned,
          countBefore: challenge.countBefore ?? null,
          umpireCount: challenge.umpireCount ?? null,
          countAfter: challenge.countAfter ?? null,
          outs: challenge.outs,
          basesState: challenge.basesState,
          homeScore: challenge.homeScore,
          awayScore: challenge.awayScore,
          impactType: challenge.impactType ?? null,
          impactSummary: challenge.impactSummary ?? null,
          estimatedLeverageIndex: snapshot.leverage.estimatedLeverageIndex,
          estimatedChallengeSwing: snapshot.leverage.estimatedChallengeSwing,
          leverageBucket: snapshot.leverage.leverageBucket,
          baseStateLabel: snapshot.baseStateLabel,
          scoreStateLabel: snapshot.scoreStateLabel,
          scenarioTags: snapshot.scenarioTags,
          positiveOutcomeDelta: roundMetric(snapshot.countStateDelta.positiveOutcomeDelta),
          battingAverageDelta: roundMetric(snapshot.countStateDelta.battingAverageDelta),
          walkRateDelta: roundMetric(snapshot.countStateDelta.walkRateDelta),
          preRunExpectancy: challenge.preRunExpectancy ?? null,
          postRunExpectancy: challenge.postRunExpectancy ?? null,
          runExpectancyDelta: challenge.runExpectancyDelta ?? null,
          runExpectancyConfidence: challenge.runExpectancyConfidence ?? null,
          preWinExpectancy: challenge.preWinExpectancy ?? null,
          postWinExpectancy: challenge.postWinExpectancy ?? null,
          winExpectancyDelta: challenge.winExpectancyDelta ?? null,
          winExpectancyConfidence: challenge.winExpectancyConfidence ?? null,
          estimatedOverturnProbability: challenge.estimatedOverturnProbability ?? null,
          overturnProbabilityConfidence: challenge.overturnProbabilityConfidence ?? null,
          expectedChallengeValue: challenge.expectedChallengeValue ?? null,
          decisionRecommendation: challenge.decisionRecommendation ?? null,
          decisionValueMode: challenge.decisionValueMode ?? null,
        };
      });
  });
}

function averageNullable(values: Array<number | null | undefined>) {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!present.length) return null;
  return roundMetric(present.reduce((sum, value) => sum + value, 0) / present.length, 4);
}

function sumNullable(values: Array<number | null | undefined>) {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!present.length) return null;
  return roundMetric(present.reduce((sum, value) => sum + value, 0), 4);
}

type GameAbsImpactMetricsViewRow = {
  total_challenges: number | string;
  overturned_challenges: number | string;
  confirmed_challenges: number | string;
  late_close_challenges: number | string;
  positive_expected_challenge_count: number | string;
  low_value_challenge_count: number | string;
  total_win_value: number | string | null;
  total_run_value: number | string | null;
  total_estimated_swing: number | string | null;
  expected_value_sum: number | string | null;
};

type GameAbsImpactMetrics = {
  totalChallenges: number;
  overturnedChallenges: number;
  confirmedChallenges: number;
  lateCloseChallenges: number;
  positiveExpectedChallengeCount: number;
  lowValueChallengeCount: number;
  totalWinValue: number | null;
  totalRunValue: number | null;
  totalEstimatedSwing: number | null;
  expectedValueSum: number | null;
};

function nullableMetric(value: number | string | null | undefined) {
  return value === null || value === undefined ? null : Number(value);
}

async function getGameAbsImpactMetrics(gamePk: number): Promise<GameAbsImpactMetrics | null> {
  return withGameVersionedCache("game-abs-impact-metrics-view", gamePk, 10_000, async () => {
    try {
      const rows = await sql<GameAbsImpactMetricsViewRow>(
        `
        SELECT
          total_challenges,
          overturned_challenges,
          confirmed_challenges,
          late_close_challenges,
          positive_expected_challenge_count,
          low_value_challenge_count,
          total_win_value,
          total_run_value,
          total_estimated_swing,
          expected_value_sum
        FROM mart_game_abs_impact_metrics
        WHERE game_pk = $1
        `,
        [gamePk],
      );
      const row = rows[0];
      if (!row) return null;

      return {
        totalChallenges: Number(row.total_challenges),
        overturnedChallenges: Number(row.overturned_challenges),
        confirmedChallenges: Number(row.confirmed_challenges),
        lateCloseChallenges: Number(row.late_close_challenges),
        positiveExpectedChallengeCount: Number(row.positive_expected_challenge_count),
        lowValueChallengeCount: Number(row.low_value_challenge_count),
        totalWinValue: nullableMetric(row.total_win_value),
        totalRunValue: nullableMetric(row.total_run_value),
        totalEstimatedSwing: nullableMetric(row.total_estimated_swing),
        expectedValueSum: nullableMetric(row.expected_value_sum),
      };
    } catch {
      return null;
    }
  });
}

function isLateCloseState(inning: number | null, homeScore: number | null, awayScore: number | null) {
  const safeInning = inning ?? 0;
  const scoreMargin =
    typeof homeScore === "number" && typeof awayScore === "number" ? Math.abs(homeScore - awayScore) : null;
  return safeInning >= 7 && (scoreMargin === null || scoreMargin <= 2);
}

function isLateCloseChallenge(challenge: ChallengeEvent) {
  return isLateCloseState(challenge.inning, challenge.homeScore, challenge.awayScore);
}

export async function getGameChallengeImpactSummary(gamePk: number): Promise<GameChallengeImpactSummary> {
  return withGameVersionedCache("game-challenge-impact-summary", gamePk, 10_000, async () => {
    const [entries, impactMetrics] = await Promise.all([
      getGameChallengeValueTimeline(gamePk),
      getGameAbsImpactMetrics(gamePk),
    ]);
    const biggestSwing =
      [...entries].sort((left, right) => Math.abs(right.estimatedChallengeSwing) - Math.abs(left.estimatedChallengeSwing))[0] ??
      null;
    const highestLeverage =
      [...entries].sort((left, right) => right.estimatedLeverageIndex - left.estimatedLeverageIndex)[0] ?? null;
    const biggestRunValue =
      [...entries]
        .filter((entry) => entry.runExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.runExpectancyConfidence))
        .sort((left, right) => Math.abs(right.runExpectancyDelta ?? 0) - Math.abs(left.runExpectancyDelta ?? 0))[0] ?? null;
    const biggestWinValue =
      [...entries]
        .filter((entry) => entry.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.winExpectancyConfidence))
        .sort((left, right) => Math.abs(right.winExpectancyDelta ?? 0) - Math.abs(left.winExpectancyDelta ?? 0))[0] ?? null;

    return {
      totalChallenges: impactMetrics?.totalChallenges ?? entries.length,
      overturnedChallenges: impactMetrics?.overturnedChallenges ?? entries.filter((entry) => entry.isOverturned).length,
      confirmedChallenges: impactMetrics?.confirmedChallenges ?? entries.filter((entry) => !entry.isOverturned).length,
      biggestSwing,
      highestLeverage,
      biggestRunValue,
      biggestWinValue,
    };
  });
}

function sumPresent(values: Array<number | null | undefined>) {
  const present = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!present.length) return null;
  return roundMetric(present.reduce((sum, value) => sum + value, 0), 4);
}

function resolveEntryActualValue(
  entry: ChallengeValueTimelineEntry,
  valueMode: GamePostgameAudit["valueMode"],
): number | null {
  if (valueMode === "win") {
    return entry.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.winExpectancyConfidence)
      ? entry.winExpectancyDelta
      : null;
  }

  if (valueMode === "run") {
    return entry.runExpectancyDelta !== null && hasTrustedModelConfidenceBand(entry.runExpectancyConfidence)
      ? entry.runExpectancyDelta
      : null;
  }

  return entry.estimatedChallengeSwing;
}

export async function getGamePostgameAudit(gamePk: number): Promise<GamePostgameAudit | null> {
  return withGameVersionedCache("game-postgame-audit", gamePk, 10_000, async () => {
    const [game, impactSummary, impactMetrics, teamComparison, umpireSummary, entries] = await Promise.all([
      getGame(gamePk),
      getGameChallengeImpactSummary(gamePk),
      getGameAbsImpactMetrics(gamePk),
      getGameTeamChallengeComparison(gamePk),
      getGameUmpireInGameSummary(gamePk),
      getGameChallengeValueTimeline(gamePk),
    ]);

    if (!game || !teamComparison) return null;
    if (!["Final", "Game Over"].includes(game.statusabstract)) return null;

    const rawTotalExpectedValue = impactMetrics?.expectedValueSum ?? sumPresent(entries.map((entry) => resolveComparableExpectedWinValue(entry)));
    const totalExpectedValue = resolveDisplayedExpectedWinValue(teamComparison.valueMode, rawTotalExpectedValue);

    const totalActualValue =
      teamComparison.valueMode === "win"
        ? impactMetrics?.totalWinValue ?? sumPresent(entries.map((entry) => resolveEntryActualValue(entry, teamComparison.valueMode)))
        : teamComparison.valueMode === "run"
          ? impactMetrics?.totalRunValue ?? sumPresent(entries.map((entry) => resolveEntryActualValue(entry, teamComparison.valueMode)))
          : impactMetrics?.totalEstimatedSwing ?? sumPresent(entries.map((entry) => resolveEntryActualValue(entry, teamComparison.valueMode)));
    const totalValueSurplus =
      teamComparison.valueMode === "win" && totalExpectedValue !== null && totalActualValue !== null
        ? roundMetric(totalActualValue - totalExpectedValue, 4)
        : null;

    const buildAuditSide = (side: GameTeamChallengeComparison["home"], teamName: string): GamePostgameAuditSide => {
      const overturnedChallenges = entries.filter(
        (entry) => entry.challengeTeamName === teamName && entry.isOverturned,
      ).length;

      return {
        teamId: side.teamId,
        teamName,
        abbreviation: side.abbreviation,
        primaryColor: side.primaryColor,
        totalChallenges: side.totalChallenges,
        overturnedChallenges,
        overturnRate: side.overturnRate,
        averageLeverage: side.averageLeverage,
        lateCloseShare: side.lateCloseShare,
        totalValue:
          teamComparison.valueMode === "win"
            ? side.totalWinValue
            : teamComparison.valueMode === "run"
              ? side.totalRunValue
              : side.totalEstimatedSwing,
        expectedValueSum: resolveDisplayedExpectedWinValue(teamComparison.valueMode, side.expectedValueSum),
        valueSurplus:
          teamComparison.valueMode === "win" &&
          side.expectedValueSum !== null &&
          side.totalWinValue !== null
            ? roundMetric(side.totalWinValue - side.expectedValueSum, 4)
            : null,
      };
    };

    const baseAudit = {
      gamePk,
      gameDate: game.gamedate,
      statusAbstract: game.statusabstract,
      venue: game.venue,
      homeTeamName: game.hometeamname,
      awayTeamName: game.awayteamname,
      homeScore: game.homescore,
      awayScore: game.awayscore,
      totalChallenges: impactSummary.totalChallenges,
      overturnedChallenges: impactSummary.overturnedChallenges,
      confirmedChallenges: impactSummary.confirmedChallenges,
      lateCloseChallenges:
        impactMetrics?.lateCloseChallenges ??
        entries.filter((entry) => isLateCloseState(entry.inning, entry.homeScore, entry.awayScore)).length,
      positiveExpectedChallengeCount:
        impactMetrics?.positiveExpectedChallengeCount ??
        entries.filter(
          (entry) =>
            entry.decisionValueMode === "win_expectancy" &&
            typeof entry.expectedChallengeValue === "number" &&
            entry.expectedChallengeValue > 0.0005,
        ).length,
      lowValueChallengeCount:
        impactMetrics?.lowValueChallengeCount ??
        entries.filter(
          (entry) =>
            entry.decisionValueMode === "win_expectancy" &&
            typeof entry.expectedChallengeValue === "number" &&
            entry.expectedChallengeValue <= 0.0005,
        ).length,
      valueMode: teamComparison.valueMode,
      totalExpectedValue,
      totalActualValue,
      totalValueSurplus,
      home: buildAuditSide(teamComparison.home, game.hometeamname),
      away: buildAuditSide(teamComparison.away, game.awayteamname),
      impactSummary,
      umpireSummary,
    } satisfies Omit<
      GamePostgameAudit,
      "narrative" | "coverage" | "teamVerdicts" | "umpireVerdict"
    >;

    return {
      ...baseAudit,
      narrative: buildPostgameAuditNarrative(baseAudit as GamePostgameAudit),
      coverage: buildPostgameAuditCoverage(baseAudit as GamePostgameAudit),
      teamVerdicts: buildPostgameAuditTeamVerdicts(baseAudit as GamePostgameAudit),
      umpireVerdict: buildPostgameAuditUmpireVerdict(baseAudit as GamePostgameAudit),
    };
  });
}

export async function getGameTeamChallengeComparison(gamePk: number): Promise<GameTeamChallengeComparison | null> {
  return withGameVersionedCache("game-team-challenge-comparison", gamePk, 10_000, async () => {
    const [game, challenges] = await Promise.all([
      getGame(gamePk),
      getGamePageChallengeEvents(gamePk),
    ]);
    if (!game) return null;

    const homeTeamId = Number(game.hometeamid);
    const awayTeamId = Number(game.awayteamid);

    const homeBucket = challenges.filter((challenge) => Number(challenge.challengeTeamId) === homeTeamId);
    const awayBucket = challenges.filter((challenge) => Number(challenge.challengeTeamId) === awayTeamId);

    const buildSide = (
      bucket: ChallengeEvent[],
      teamId: number,
      abbreviation: string | null,
      primaryColor: string | null,
    ) => ({
      teamId,
      abbreviation,
      primaryColor,
      totalChallenges: bucket.length,
      overturnRate: bucket.length ? roundMetric(bucket.filter((challenge) => challenge.isOverturned).length / bucket.length, 4) : null,
      averageLeverage: averageNullable(bucket.map((challenge) => challenge.estimatedLeverageIndex ?? null)),
      lateCloseShare: bucket.length ? roundMetric(bucket.filter(isLateCloseChallenge).length / bucket.length, 4) : null,
      totalWinValue: sumNullable(
        bucket
          .filter(
            (challenge) =>
              typeof challenge.winExpectancyDelta === "number" &&
              hasTrustedModelConfidenceBand(challenge.winExpectancyConfidence),
          )
          .map((challenge) => challenge.winExpectancyDelta ?? null),
      ),
      totalRunValue: sumNullable(
        bucket
          .filter(
            (challenge) =>
              typeof challenge.runExpectancyDelta === "number" &&
              hasTrustedModelConfidenceBand(challenge.runExpectancyConfidence),
          )
          .map((challenge) => challenge.runExpectancyDelta ?? null),
      ),
      totalEstimatedSwing: roundMetric(
        bucket.reduce((sum, challenge) => sum + (challenge.estimatedChallengeSwing ?? 0), 0),
        2,
      ) ?? 0,
      expectedValueSum: sumNullable(bucket.map((challenge) => resolveComparableExpectedWinValue(challenge))),
    });

    const home = buildSide(homeBucket, homeTeamId, game.homeabbreviation, game.homeprimarycolor);
    const away = buildSide(awayBucket, awayTeamId, game.awayabbreviation, game.awayprimarycolor);
    const valueMode = resolvePostgameValueMode(home, away);

    return { home, away, valueMode };
  });
}

export async function getGameUmpireInGameSummary(gamePk: number): Promise<GameUmpireInGameSummary | null> {
  return withGameVersionedCache("game-umpire-in-game-summary", gamePk, 10_000, async () => {
    const challenges = await getGamePageChallengeEvents(gamePk);
    if (!challenges.length) return null;

    const splitMap = new Map<string, ChallengeEvent[]>();
    const pitchMap = new Map<string, ChallengeEvent[]>();
    const laneMap = new Map<string, ChallengeEvent[]>();

    for (const challenge of challenges) {
      if (challenge.pitcherThrows && challenge.batterStand) {
        const splitKey = `${challenge.pitcherThrows}::${challenge.batterStand}`;
        splitMap.set(splitKey, [...(splitMap.get(splitKey) ?? []), challenge]);
      }
      if (challenge.pitchType) {
        pitchMap.set(challenge.pitchType, [...(pitchMap.get(challenge.pitchType) ?? []), challenge]);
      }
      const lane = classifyNormalizedZoneLane({
        px: challenge.px,
        pz: challenge.pz,
        strikeZoneTop: challenge.strikeZoneTop,
        strikeZoneBottom: challenge.strikeZoneBottom,
      });
      if (lane) {
        laneMap.set(lane, [...(laneMap.get(lane) ?? []), challenge]);
      }
    }

    const splits = [...splitMap.entries()]
      .map(([key, bucket]) => {
        const [pitcherThrows, batterStand] = key.split("::") as ["R" | "L", "R" | "L"];
        return {
          pitcherThrows,
          batterStand,
          sampleSize: bucket.length,
          overturnRate: bucket.filter((challenge) => challenge.isOverturned).length / bucket.length,
          averageLeverage: averageNullable(bucket.map((challenge) => challenge.estimatedLeverageIndex ?? null)),
          averageWinDelta: averageNullable(
            bucket
              .filter((challenge) => challenge.winExpectancyDelta !== null && hasTrustedModelConfidenceBand(challenge.winExpectancyConfidence))
              .map((challenge) => challenge.winExpectancyDelta ?? null),
          ),
          averageRunDelta: averageNullable(
            bucket
              .filter((challenge) => challenge.runExpectancyDelta !== null && hasTrustedModelConfidenceBand(challenge.runExpectancyConfidence))
              .map((challenge) => challenge.runExpectancyDelta ?? null),
          ),
        };
      })
      .sort((left, right) => {
        if (right.sampleSize !== left.sampleSize) return right.sampleSize - left.sampleSize;
        return right.overturnRate - left.overturnRate;
      });

    const pitchProfiles = [...pitchMap.entries()]
      .map(([pitchType, bucket]) => ({
        pitchType,
        sampleSize: bucket.length,
        overturnRate: bucket.filter((challenge) => challenge.isOverturned).length / bucket.length,
        averageLeverage: averageNullable(bucket.map((challenge) => challenge.estimatedLeverageIndex ?? null)),
      }))
      .sort((left, right) => {
        if (right.sampleSize !== left.sampleSize) return right.sampleSize - left.sampleSize;
        return right.overturnRate - left.overturnRate;
      });

    const laneProfiles = [...laneMap.entries()]
      .map(([lane, bucket]) => ({
        lane,
        sampleSize: bucket.length,
        overturnRate: bucket.filter((challenge) => challenge.isOverturned).length / bucket.length,
        averageLeverage: averageNullable(bucket.map((challenge) => challenge.estimatedLeverageIndex ?? null)),
      }))
      .sort((left, right) => {
        if (right.sampleSize !== left.sampleSize) return right.sampleSize - left.sampleSize;
        return right.overturnRate - left.overturnRate;
      });

    const highestRiskSplit =
      [...splits].sort((left, right) => {
        if (right.overturnRate !== left.overturnRate) return right.overturnRate - left.overturnRate;
        return right.sampleSize - left.sampleSize;
      })[0] ?? null;

    return {
      totalChallenges: challenges.length,
      overturnedChallenges: challenges.filter((challenge) => challenge.isOverturned).length,
      mostTargetedSplit: splits[0] ?? null,
      highestRiskSplit,
      topPitchType: pitchProfiles[0] ?? null,
      topLane: laneProfiles[0] ?? null,
      splits,
    };
  });
}

export async function getGameChallengeOpportunityBoard(gamePk: number): Promise<GameChallengeOpportunityBoard | null> {
  return withGameVersionedCache("game-challenge-opportunity-board", gamePk, 30_000, async () => {
    const game = await getGame(gamePk);
    if (!game) return null;

    const [homeCells, awayCells] = await Promise.all([
      getTeamChallengeScenarioMatrix(Number(game.hometeamid), "season", undefined, { includeValueMetrics: false }),
      getTeamChallengeScenarioMatrix(Number(game.awayteamid), "season", undefined, { includeValueMetrics: false }),
    ]);

    const rowDefs = [
      { key: "empty", label: "Bases Empty" },
      { key: "traffic", label: "Runner On" },
      { key: "risp_lt2", label: "RISP, <2 Outs" },
      { key: "risp_2", label: "RISP, 2 Outs" },
      { key: "loaded", label: "Bases Loaded" },
    ] as const;
    const colDefs = [
      { key: "pitcher", label: "Pitcher Ahead" },
      { key: "even", label: "Even Count" },
      { key: "hitter", label: "Hitter Ahead" },
      { key: "full", label: "Full Count" },
    ] as const;

    const homeMap = new Map(homeCells.map((cell) => [`${cell.rowKey}:${cell.colKey}`, cell]));
    const awayMap = new Map(awayCells.map((cell) => [`${cell.rowKey}:${cell.colKey}`, cell]));

    const cells = rowDefs.flatMap((row) =>
      colDefs.map((col) => {
        const home = homeMap.get(`${row.key}:${col.key}`);
        const away = awayMap.get(`${row.key}:${col.key}`);
        return {
          rowKey: row.key,
          rowLabel: row.label,
          colKey: col.key,
          colLabel: col.label,
          homeChallenges: home?.challenges ?? 0,
          awayChallenges: away?.challenges ?? 0,
          homeAvgEstimatedLeverage: home?.avgEstimatedLeverage ?? 0,
          awayAvgEstimatedLeverage: away?.avgEstimatedLeverage ?? 0,
          homeHighPressureShare: home?.highPressureShare ?? 0,
          awayHighPressureShare: away?.highPressureShare ?? 0,
        } satisfies GameChallengeOpportunityCell;
      }),
    );

    return {
      homeTeamId: Number(game.hometeamid),
      awayTeamId: Number(game.awayteamid),
      homeAbbreviation: game.homeabbreviation,
      awayAbbreviation: game.awayabbreviation,
      homePrimaryColor: game.homeprimarycolor,
      homeSecondaryColor: game.homesecondarycolor,
      awayPrimaryColor: game.awayprimarycolor,
      awaySecondaryColor: game.awaysecondarycolor,
      cells,
    };
  });
}

export async function getLiveChallengeWindow(gamePk: number): Promise<LiveChallengeWindow | null> {
  return withGameVersionedCache("live-challenge-window", gamePk, 5_000, async () => {
    const [liveStatus, challenges, baselines, runExpectancyRows, winExpectancyRows, overturnProbabilityRows] = await Promise.all([
      getGameLiveStatus(gamePk),
      getGamePageChallengeEvents(gamePk),
      getCountStateBaselines(),
      getRunExpectancyFallbackRows(),
      getWinExpectancyFallbackRows(),
      getOverturnProbabilityFallbackRows(),
    ]);

    if (!liveStatus) return null;

    const latestChallenge = challenges.at(-1) ?? null;
    const balls = liveStatus.balls ?? latestChallenge?.balls ?? null;
    const strikes = liveStatus.strikes ?? latestChallenge?.strikes ?? null;
    const outs = liveStatus.outs ?? latestChallenge?.outs ?? null;
    const basesState = latestChallenge?.basesState ?? null;
    const homeScore = liveStatus.homeScore ?? latestChallenge?.homeScore ?? null;
    const awayScore = liveStatus.awayScore ?? latestChallenge?.awayScore ?? null;
    const currentCountKey =
      balls === null || strikes === null ? null : `${Math.max(0, Math.min(3, balls))}-${Math.max(0, Math.min(2, strikes))}`;
    const nextBallLookupCountKey =
      balls === null || strikes === null || balls >= 3 ? null : `${Math.min(3, balls + 1)}-${Math.max(0, Math.min(2, strikes))}`;
    const nextStrikeLookupCountKey =
      balls === null || strikes === null || strikes >= 2 ? null : `${Math.max(0, Math.min(3, balls))}-${Math.min(2, strikes + 1)}`;
    const nextBallCountKey =
      balls === null || strikes === null ? null : `${Math.min(4, Math.max(0, balls + 1))}-${Math.max(0, Math.min(2, strikes))}`;
    const nextStrikeCountKey =
      balls === null || strikes === null ? null : `${Math.max(0, Math.min(3, balls))}-${Math.min(3, Math.max(0, strikes + 1))}`;

    const baselineMap = buildCountStateBaselineMap(baselines);
    const currentBaseline = currentCountKey ? baselineMap.get(currentCountKey) ?? null : null;
    const nextBallBaseline = nextBallLookupCountKey ? baselineMap.get(nextBallLookupCountKey) ?? null : null;
    const nextStrikeBaseline = nextStrikeLookupCountKey ? baselineMap.get(nextStrikeLookupCountKey) ?? null : null;
    const currentRunExpectancy = resolveRunExpectancyWithFallback(
      {
        inning: liveStatus.inning,
        halfInning: liveStatus.halfInning,
        outs,
        basesState,
        countKey: currentCountKey,
        homeScore,
        awayScore,
      },
      runExpectancyRows,
    );
    const nextBallRunExpectancy = resolveRunExpectancyWithFallback(
      {
        inning: liveStatus.inning,
        halfInning: liveStatus.halfInning,
        outs,
        basesState,
        countKey: nextBallLookupCountKey,
        homeScore,
        awayScore,
      },
      runExpectancyRows,
    );
    const nextStrikeRunExpectancy = resolveRunExpectancyWithFallback(
      {
        inning: liveStatus.inning,
        halfInning: liveStatus.halfInning,
        outs,
        basesState,
        countKey: nextStrikeLookupCountKey,
        homeScore,
        awayScore,
      },
      runExpectancyRows,
    );
    const currentWinExpectancy = resolveWinExpectancyWithFallback(
      {
        inning: liveStatus.inning,
        halfInning: liveStatus.halfInning,
        outs,
        basesState,
        countKey: currentCountKey,
        homeScore,
        awayScore,
      },
      winExpectancyRows,
    );
    const nextBallWinExpectancy = resolveWinExpectancyWithFallback(
      {
        inning: liveStatus.inning,
        halfInning: liveStatus.halfInning,
        outs,
        basesState,
        countKey: nextBallLookupCountKey,
        homeScore,
        awayScore,
      },
      winExpectancyRows,
    );
    const nextStrikeWinExpectancy = resolveWinExpectancyWithFallback(
      {
        inning: liveStatus.inning,
        halfInning: liveStatus.halfInning,
        outs,
        basesState,
        countKey: nextStrikeLookupCountKey,
        homeScore,
        awayScore,
      },
      winExpectancyRows,
    );
    const leverage = summarizeEstimatedLeverage({
      inning: liveStatus.inning,
      balls,
      strikes,
      outs,
      homeScore,
      awayScore,
      basesState,
    });
    const battingSide = liveStatus.halfInning === "Bottom" ? "home" : "away";
    const challengesRemaining = battingSide === "home" ? liveStatus.homeRemaining : liveStatus.awayRemaining;
    const scoreDiffBattingTeam = getScoreDiffBattingTeam(liveStatus.halfInning, homeScore, awayScore);
    const [nextBallDecision, nextStrikeDecision] = await Promise.all([
      estimateChallengeDecisionValue(
        {
          inning: liveStatus.inning ?? 1,
          halfInning: liveStatus.halfInning === "Bottom" ? "Bottom" : "Top",
          balls: balls ?? 0,
          strikes: strikes ?? 0,
          outs: outs ?? 0,
          scoreDiffBattingTeam,
          basesState: basesState ?? "000",
          calledPitch: "called_strike",
          challengesRemaining,
        },
        { probabilityRows: overturnProbabilityRows, winRows: winExpectancyRows },
      ),
      estimateChallengeDecisionValue(
        {
          inning: liveStatus.inning ?? 1,
          halfInning: liveStatus.halfInning === "Bottom" ? "Bottom" : "Top",
          balls: balls ?? 0,
          strikes: strikes ?? 0,
          outs: outs ?? 0,
          scoreDiffBattingTeam,
          basesState: basesState ?? "000",
          calledPitch: "ball",
          challengesRemaining,
        },
        { probabilityRows: overturnProbabilityRows, winRows: winExpectancyRows },
      ),
    ]);

    return {
      inning: liveStatus.inning,
      halfInning: liveStatus.halfInning,
      balls,
      strikes,
      outs,
      basesState,
      homeScore,
      awayScore,
      estimatedLeverageIndex: leverage.estimatedLeverageIndex,
      leverageBucket: leverage.leverageBucket,
      baseStateLabel: formatBasesStateLabel(basesState),
      scoreStateLabel: formatScoreStateLabel({ homeScore, awayScore }),
      scenarioTags: getChallengeScenarioTags({
        challengeId: "live-window",
        gamePk,
        challengedAt: null,
        inning: liveStatus.inning,
        halfInning: liveStatus.halfInning,
        balls,
        strikes,
        outs,
        basesState,
        homeScore,
        awayScore,
        challengeTeamId: null,
        challengeTeamName: null,
        challengePlayerName: null,
        batterName: null,
        pitcherName: null,
        calledDescription: null,
        pitchNumber: null,
        pitchType: null,
        startSpeed: null,
        spinRate: null,
        isOverturned: false,
        px: null,
        pz: null,
        strikeZoneTop: null,
        strikeZoneBottom: null,
      }),
      currentCountKey,
      currentPositiveOutcomeRate: currentBaseline ? roundMetric(currentBaseline.positiveOutcomeRate) : null,
      currentRunExpectancy: currentRunExpectancy ? roundMetric(currentRunExpectancy.expectedRunsToEndInning) : null,
      currentWinExpectancy: currentWinExpectancy ? roundMetric(currentWinExpectancy.battingTeamWinProbability, 4) : null,
      nextBallCountKey,
      nextBallPositiveOutcomeDelta:
        currentBaseline && nextBallBaseline ? roundMetric(nextBallBaseline.positiveOutcomeRate - currentBaseline.positiveOutcomeRate) : null,
      nextBallRunExpectancyDelta:
        currentRunExpectancy && nextBallRunExpectancy
          ? roundMetric(nextBallRunExpectancy.expectedRunsToEndInning - currentRunExpectancy.expectedRunsToEndInning)
          : null,
      nextBallWinExpectancyDelta:
        currentWinExpectancy && nextBallWinExpectancy
          ? roundMetric(nextBallWinExpectancy.battingTeamWinProbability - currentWinExpectancy.battingTeamWinProbability, 4)
          : null,
      nextBallOverturnProbability: nextBallDecision.estimatedOverturnProbability,
      nextBallOverturnProbabilityConfidence: nextBallDecision.overturnProbabilityConfidence,
      nextBallExpectedChallengeValue: nextBallDecision.expectedWpDelta,
      nextBallDecisionRecommendation: nextBallDecision.recommendation,
      nextBallDecisionValueMode: nextBallDecision.decisionValueMode,
      nextStrikeCountKey,
      nextStrikePositiveOutcomeDelta:
        currentBaseline && nextStrikeBaseline ? roundMetric(nextStrikeBaseline.positiveOutcomeRate - currentBaseline.positiveOutcomeRate) : null,
      nextStrikeRunExpectancyDelta:
        currentRunExpectancy && nextStrikeRunExpectancy
          ? roundMetric(nextStrikeRunExpectancy.expectedRunsToEndInning - currentRunExpectancy.expectedRunsToEndInning)
          : null,
      nextStrikeWinExpectancyDelta:
        currentWinExpectancy && nextStrikeWinExpectancy
          ? roundMetric(nextStrikeWinExpectancy.battingTeamWinProbability - currentWinExpectancy.battingTeamWinProbability, 4)
          : null,
      nextStrikeOverturnProbability: nextStrikeDecision.estimatedOverturnProbability,
      nextStrikeOverturnProbabilityConfidence: nextStrikeDecision.overturnProbabilityConfidence,
      nextStrikeExpectedChallengeValue: nextStrikeDecision.expectedWpDelta,
      nextStrikeDecisionRecommendation: nextStrikeDecision.recommendation,
      nextStrikeDecisionValueMode: nextStrikeDecision.decisionValueMode,
      runExpectancyConfidence:
        currentRunExpectancy?.confidenceBand ?? nextBallRunExpectancy?.confidenceBand ?? nextStrikeRunExpectancy?.confidenceBand ?? null,
      winExpectancyConfidence:
        currentWinExpectancy?.confidenceBand ?? nextBallWinExpectancy?.confidenceBand ?? nextStrikeWinExpectancy?.confidenceBand ?? null,
    };
  });
}

export async function getGamePitchTimeline(
  gamePk: number,
  options: {
    atBatIndex?: number;
    batterId?: number;
    pitcherId?: number;
    challengedOnly?: boolean;
    limit?: number;
  } = {},
): Promise<PitchTimelineEntry[]> {
  const safeLimit = Math.min(Math.max(options.limit ?? 150, 1), 500);
  const cacheKey = getCacheKey([
    "game-pitch-timeline",
    gamePk,
    options.atBatIndex,
    options.batterId,
    options.pitcherId,
    options.challengedOnly,
    safeLimit,
  ]);
  return withCachedValue(cacheKey, 8_000, async () => {
    const filters = ["game_pk = $1"];
    const params: unknown[] = [gamePk];

    if (options.atBatIndex !== undefined) {
      params.push(options.atBatIndex);
      filters.push(`at_bat_index = $${params.length}`);
    }
    if (options.batterId !== undefined) {
      params.push(options.batterId);
      filters.push(`batter_id = $${params.length}`);
    }
    if (options.pitcherId !== undefined) {
      params.push(options.pitcherId);
      filters.push(`pitcher_id = $${params.length}`);
    }
    if (options.challengedOnly) {
      filters.push("challenge_id IS NOT NULL");
    }

    params.push(safeLimit);

    const rows = await sql<{
      game_pk: number;
      at_bat_index: number;
      pitch_number: number;
      play_event_index: number | null;
      inning: number | null;
      half_inning: string | null;
      batter_id: number | null;
      batter_name: string | null;
      pitcher_id: number | null;
      pitcher_name: string | null;
      called_code: string | null;
      called_description: string | null;
      play_description: string | null;
      pitch_type_code: string | null;
      pitch_type_description: string | null;
      start_speed: number | null;
      spin_rate: number | null;
      px: number | null;
      pz: number | null;
      strike_zone_top: number | null;
      strike_zone_bottom: number | null;
      zone: number | null;
      balls_before: number | null;
      strikes_before: number | null;
      outs_before: number | null;
      balls_after: number | null;
      strikes_after: number | null;
      outs_after: number | null;
      bases_state_before: string | null;
      bases_state_after: string | null;
      is_in_play: boolean;
      ended_plate_appearance: boolean;
      challenge_id: string | null;
      challenge_player_name: string | null;
      challenge_team_id: number | null;
      is_overturned: boolean | null;
      location_source: string | null;
      inference_method: string | null;
      inference_confidence: string | null;
      impact_type: string;
      impact_summary: string;
    }>(
      `
    SELECT
      game_pk,
      at_bat_index,
      pitch_number,
      play_event_index,
      inning,
      half_inning,
      batter_id,
      batter_name,
      pitcher_id,
      pitcher_name,
      called_code,
      called_description,
      play_description,
      pitch_type_code,
      pitch_type_description,
      start_speed,
      spin_rate,
      px,
      pz,
      strike_zone_top,
      strike_zone_bottom,
      zone,
      balls_before,
      strikes_before,
      outs_before,
      balls_after,
      strikes_after,
      outs_after,
      bases_state_before,
      bases_state_after,
      is_in_play,
      ended_plate_appearance,
      challenge_id,
      challenge_player_name,
      challenge_team_id,
      is_overturned,
      location_source,
      inference_method,
      inference_confidence,
      impact_type,
      impact_summary
    FROM mart_game_pitch_timeline
    WHERE ${filters.join(" AND ")}
    ORDER BY inning ASC NULLS LAST, at_bat_index ASC, pitch_number ASC
    LIMIT $${params.length}
    `,
      params,
    );

    return rows.map((row) => {
      const countBefore =
        row.balls_before === null || row.strikes_before === null ? null : `${row.balls_before}-${row.strikes_before}`;
      const countAfter =
        row.balls_after === null || row.strikes_after === null ? null : `${row.balls_after}-${row.strikes_after}`;
      const umpireCount =
        row.balls_before === null || row.strikes_before === null
          ? null
          : resolveUmpireCountState(
              row.balls_before,
              row.strikes_before,
              row.balls_after,
              row.strikes_after,
              Boolean(row.is_overturned),
            );
      const countState = getChallengeCountState(countBefore, umpireCount, countAfter);
      const description = buildPitchTimelineDescription(row);
      const terminalOutcome =
        countState.terminalOutcome === "Walk" || countState.terminalOutcome === "Strikeout"
          ? countState.terminalOutcome
          : null;
      const eventId =
        row.challenge_id ??
        `pitch:${row.game_pk}:${row.at_bat_index}:${row.pitch_number}:${row.play_event_index ?? 0}`;

      return {
        eventId,
        gamePk: Number(row.game_pk),
        atBatIndex: Number(row.at_bat_index),
        pitchNumber: Number(row.pitch_number),
        playEventIndex: row.play_event_index === null ? null : Number(row.play_event_index),
        inning: row.inning,
        halfInning: row.half_inning,
        batterId: row.batter_id === null ? null : Number(row.batter_id),
        batterName: row.batter_name,
        pitcherId: row.pitcher_id === null ? null : Number(row.pitcher_id),
        pitcherName: row.pitcher_name,
        calledCode: row.called_code,
        calledDescription: row.called_description,
        playDescription: row.play_description,
        pitchTypeCode: row.pitch_type_code,
        pitchType: row.pitch_type_description,
        startSpeed: row.start_speed === null ? null : Number(row.start_speed),
        spinRate: row.spin_rate === null ? null : Number(row.spin_rate),
        px: row.px === null ? null : Number(row.px),
        pz: row.pz === null ? null : Number(row.pz),
        strikeZoneTop: row.strike_zone_top === null ? null : Number(row.strike_zone_top),
        strikeZoneBottom: row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom),
        zone: row.zone === null ? null : Number(row.zone),
        countBefore,
        countAfter,
        umpireCount,
        countBeforeLabel: formatCountStateLabel(countBefore),
        countAfterLabel: formatCountStateLabel(countAfter),
        umpireCountLabel: formatCountStateLabel(umpireCount),
        countTransitionLabel: formatCountTransitionLabel(umpireCount ?? countBefore, countAfter),
        terminalOutcome,
        outsBefore: row.outs_before,
        outsAfter: row.outs_after,
        basesStateBefore: row.bases_state_before,
        basesStateAfter: row.bases_state_after,
        isInPlay: row.is_in_play,
        endedPlateAppearance: row.ended_plate_appearance,
        isChallenge: Boolean(row.challenge_id),
        description,
        challengeId: row.challenge_id,
        challengePlayerName: row.challenge_player_name,
        challengeTeamId: row.challenge_team_id === null ? null : Number(row.challenge_team_id),
        isOverturned: row.is_overturned,
        locationSource: row.location_source,
        inferenceMethod: row.inference_method,
        inferenceConfidence: row.inference_confidence,
        impactType: row.impact_type,
        impactSummary: row.impact_summary,
      };
    });
  });
}

export async function getUmpireLeaderboard(range: RangeKey = "season"): Promise<UmpireSummary[]> {
  return withServerTiming(
    "data.getUmpireLeaderboard",
    () => withCachedValue(getCacheKey(["umpire-leaderboard", range]), 30_000, async () => {
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
    WITH filtered_summary AS (
      SELECT s.*
      FROM umpire_abs_game_summary s
      JOIN games g ON g.game_pk = s.game_pk
      WHERE ${window.clause}
    ),
    home_plate_officials AS (
      SELECT DISTINCT ON (o.official_id)
        o.official_id,
        o.official_name
      FROM officials o
      WHERE o.official_type = 'Home Plate'
      ORDER BY o.official_id, o.game_pk DESC
    )
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
    FROM home_plate_officials o
    LEFT JOIN filtered_summary s ON s.umpire_id = o.official_id
    GROUP BY o.official_id, o.official_name
    ORDER BY challengedCalls DESC, o.official_name ASC
    `,
    window.params,
  );

      return rows.map((r) => ({
        umpireId: Number(r.umpireid),
        umpireName: r.umpirename,
        challengedCalls: Number(r.challengedcalls),
        overturnedCalls: Number(r.overturnedcalls),
        confirmedCalls: Number(r.confirmedcalls),
        overturnRate: Number(r.overturnrate),
        gamesWorked: Number(r.gamesworked),
      }));
    }),
    { warnAtMs: 700, metadata: { range } },
  );
}

async function getUmpireRubricMetrics(range: RangeKey = "season") {
  return withVersionedCache(
    ["umpire-rubric-metrics", range],
    getLatestSuccessfulEtlDataVersion(),
    30_000,
    async () => {
      const window = rangeWhere(range, "g.game_date");
      const rows = await sql<{
      umpireid: number;
      overturnratevariance: number | null;
      recentoverturnrate: number | null;
    }>(
      `
    WITH filtered AS (
      SELECT
        s.umpire_id AS umpireId,
        s.game_pk,
        s.challenged_calls,
        s.overturned_calls,
        CASE
          WHEN s.challenged_calls > 0 THEN s.overturned_calls::NUMERIC / s.challenged_calls
          ELSE NULL
        END AS gameOverturnRate,
        ROW_NUMBER() OVER (
          PARTITION BY s.umpire_id
          ORDER BY g.game_date DESC, s.game_pk DESC
        ) AS recentRank
      FROM umpire_abs_game_summary s
      JOIN games g ON g.game_pk = s.game_pk
      WHERE ${window.clause}
    )
    SELECT
      umpireId,
      COALESCE(STDDEV_POP(gameOverturnRate), 0)::NUMERIC AS overturnRateVariance,
      CASE
        WHEN SUM(challenged_calls) FILTER (WHERE recentRank <= 5) > 0
          THEN SUM(overturned_calls) FILTER (WHERE recentRank <= 5)::NUMERIC
            / SUM(challenged_calls) FILTER (WHERE recentRank <= 5)
        ELSE NULL
      END AS recentOverturnRate
    FROM filtered
    GROUP BY umpireId
    `,
      window.params,
    );

      return new Map(
        rows.map((row) => [
          Number(row.umpireid),
          {
            umpireId: Number(row.umpireid),
            overturnRateVariance: Number(row.overturnratevariance ?? 0),
            recentOverturnRate: row.recentoverturnrate === null ? null : Number(row.recentoverturnrate),
            averageRunExpectancyDelta: null,
            averageWinExpectancyDelta: null,
          },
        ]),
      );
    },
  );
}

export async function getUmpireLeaderboardModel(range: RangeKey = "season"): Promise<UmpireLeaderboardEntry[]> {
  return withServerTiming(
    "data.getUmpireLeaderboardModel",
    () => withCachedValue(getCacheKey(["umpire-leaderboard-model", range]), 30_000, async () => {
      const [umpires, metrics] = await Promise.all([getUmpireLeaderboard(range), getUmpireRubricMetrics(range)]);
      return buildUmpireLeaderboardEntries(umpires, metrics);
    }),
    { warnAtMs: 1_000, metadata: { range } },
  );
}

export async function getUmpireSummary(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<UmpireSummary | null> {
  return withServerTiming(
    "data.getUmpireSummary",
    () =>
      withCachedValue(
        getCacheKey([
          "umpire-summary",
          umpireId,
          range,
          filters?.inningRange ?? "all",
          filters?.leverage ?? "all",
          filters?.side ?? "all",
          filters?.result ?? "all",
        ]),
        15_000,
        async () => {
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
    WITH home_plate_games AS (
      SELECT DISTINCT game_pk
      FROM officials
      WHERE official_id = $1
        AND official_type = 'Home Plate'
    ),
    filtered_challenges AS (
      SELECT c.*
      FROM mart_abs_pitch_challenges c
      JOIN home_plate_games hp ON hp.game_pk = c.game_pk
      JOIN games g ON g.game_pk = c.game_pk
      WHERE ${window.clause}
        AND ${situational.clause}
    )
    SELECT
      $1::INT AS umpireId,
      o.umpireName,
      COUNT(c.challenge_id) AS challengedCalls,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturnedCalls,
      COUNT(*) FILTER (WHERE c.is_overturned = FALSE AND c.challenge_id IS NOT NULL) AS confirmedCalls,
      CASE WHEN COUNT(c.challenge_id) > 0
        THEN COUNT(*) FILTER (WHERE c.is_overturned = TRUE)::NUMERIC / COUNT(c.challenge_id)
        ELSE 0
      END AS overturnRate,
      COUNT(DISTINCT c.game_pk) AS gamesWorked
    FROM (
      SELECT official_name AS umpireName
      FROM officials
      WHERE official_id = $1
      LIMIT 1
    ) o
    LEFT JOIN filtered_challenges c ON TRUE
    GROUP BY 1, 2
    `,
    [umpireId, ...window.params, ...situational.params],
          );

          const r = rows[0];
          if (!r) {
            const fallbackRows = await sql<{ umpirename: string | null }>(
      `
      SELECT official_name AS umpireName
      FROM officials
      WHERE official_id = $1
      LIMIT 1
      `,
      [umpireId],
            );
            const fallback = fallbackRows[0];
            if (!fallback?.umpirename) return null;
            return {
              umpireId,
              umpireName: fallback.umpirename,
              challengedCalls: 0,
              overturnedCalls: 0,
              confirmedCalls: 0,
              overturnRate: 0,
              gamesWorked: 0,
            };
          }
          return {
            umpireId: Number(r.umpireid),
            umpireName: r.umpirename,
            challengedCalls: Number(r.challengedcalls),
            overturnedCalls: Number(r.overturnedcalls),
            confirmedCalls: Number(r.confirmedcalls),
            overturnRate: Number(r.overturnrate),
            gamesWorked: Number(r.gamesworked),
          };
        },
      ),
    { warnAtMs: 500, metadata: { umpireId, range } },
  );
}

export async function getUmpirePageChallengeEvents(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
): Promise<ChallengeEvent[]> {
  return withServerTiming(
    "data.getUmpirePageChallengeEvents",
    () =>
      withCachedValue(
        getCacheKey([
          "umpire-page-challenge-events",
          umpireId,
          range,
          filters?.inningRange ?? "all",
          filters?.leverage ?? "all",
          filters?.side ?? "all",
          filters?.result ?? "all",
        ]),
        10_000,
        async () => {
          const window = rangeWhere(range, "g.game_date");
          const situational = situationalWhere(filters, "c");
          const rows = await sql<{
            challengeid: string;
            gamepk: number;
            pitchnumber: number | null;
            challengedat: string | null;
            inning: number | null;
            halfinning: string | null;
            balls: number | null;
            strikes: number | null;
            outs: number | null;
            bases_state: string | null;
            home_score: number | null;
            away_score: number | null;
            challenge_team_id: number | null;
            challengeteamname: string | null;
            challenge_player_name: string | null;
            batter_name: string | null;
            pitcher_name: string | null;
            calleddescription: string | null;
            original_call: CalledPitch | null;
            corrected_call: CalledPitch | null;
            challenge_direction: "strike_to_ball" | "ball_to_strike" | null;
            isoverturned: boolean;
            px: number | null;
            pz: number | null;
            strikezonetop: number | null;
            strikezonebottom: number | null;
            batter_stand: "R" | "L" | null;
            pitcher_throws: "R" | "L" | null;
            pitchtype: string | null;
            startspeed: number | string | null;
            spinrate: number | string | null;
            balls_before: number | null;
            strikes_before: number | null;
            balls_after: number | null;
            strikes_after: number | null;
            impact_type: string | null;
            impact_summary: string | null;
            location_source: string | null;
            inference_method: string | null;
            inference_confidence: string | null;
            edge_bucket: EdgeBucket | null;
            challenge_side_role: string | null;
            estimated_challenges_remaining: number | string | null;
          }>(
            `
            WITH home_plate_games AS (
              SELECT DISTINCT game_pk
              FROM officials
              WHERE official_id = $1
                AND official_type = 'Home Plate'
            ),
            filtered AS (
              SELECT c.*
              FROM mart_abs_pitch_challenges c
              JOIN home_plate_games hp ON hp.game_pk = c.game_pk
              JOIN games g ON g.game_pk = c.game_pk
              WHERE ${window.clause}
                AND ${situational.clause}
            ),
            challenged AS (
              SELECT
                filtered.*,
                GREATEST(
                  0,
                  2 - COUNT(*) FILTER (WHERE filtered.is_overturned = FALSE) OVER (
                    PARTITION BY filtered.game_pk, filtered.challenge_team_id
                    ORDER BY filtered.challenged_at NULLS LAST, filtered.challenge_id
                    ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
                  )
                ) AS estimated_challenges_remaining
              FROM filtered
            )
            SELECT
              c.challenge_id AS challengeId,
              c.game_pk AS gamePk,
              COALESCE(c.pitch_number, c.inferred_pitch_number) AS pitchNumber,
              c.challenged_at AS challengedAt,
              c.inning,
              c.half_inning AS halfInning,
              c.balls,
              c.strikes,
              c.outs,
              c.bases_state,
              c.home_score,
              c.away_score,
              c.challenge_team_id,
              t.name AS challengeTeamName,
              c.challenge_player_name,
              c.batter_name,
              c.pitcher_name,
              c.called_description AS calledDescription,
              c.original_call,
              c.corrected_call,
              c.challenge_direction,
              c.is_overturned AS isOverturned,
              c.resolved_px AS px,
              c.resolved_pz AS pz,
              resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strikeZoneTop,
              resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strikeZoneBottom,
              NULLIF(batter_player.source_payload->'batSide'->>'code', '')::text AS batter_stand,
              NULLIF(pitcher_player.source_payload->'pitchHand'->>'code', '')::text AS pitcher_throws,
              COALESCE(p.pitch_type_description, p.pitch_type_code) AS pitchType,
              p.start_speed AS startSpeed,
              p.spin_rate AS spinRate,
              COALESCE(p.balls_before, c.balls) AS balls_before,
              COALESCE(p.strikes_before, c.strikes) AS strikes_before,
              CASE
                WHEN p.balls_after IS NOT NULL THEN p.balls_after
                WHEN c.corrected_call = 'ball' AND c.balls IS NOT NULL THEN LEAST(c.balls + 1, 4)
                WHEN c.corrected_call = 'called_strike' THEN c.balls
                ELSE NULL
              END AS balls_after,
              CASE
                WHEN p.strikes_after IS NOT NULL THEN p.strikes_after
                WHEN c.corrected_call = 'called_strike' AND c.strikes IS NOT NULL THEN LEAST(c.strikes + 1, 3)
                WHEN c.corrected_call = 'ball' THEN c.strikes
                ELSE NULL
              END AS strikes_after,
              NULL::TEXT AS impact_type,
              NULL::TEXT AS impact_summary,
              c.resolved_location_source AS location_source,
              c.inference_method,
              c.inference_confidence,
              c.edge_bucket,
              c.challenge_side_role,
              c.estimated_challenges_remaining
            FROM challenged c
            JOIN games g ON g.game_pk = c.game_pk
            LEFT JOIN teams t ON t.team_id = c.challenge_team_id
            LEFT JOIN pitches p
              ON p.game_pk = c.game_pk
             AND p.at_bat_index = c.at_bat_index
             AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
            LEFT JOIN players batter_player ON batter_player.player_id = c.batter_id
            LEFT JOIN players pitcher_player ON pitcher_player.player_id = c.pitcher_id
            ORDER BY c.challenged_at DESC NULLS LAST, c.challenge_id DESC
            LIMIT 250
            `,
            [umpireId, ...window.params, ...situational.params],
          );
          const [runExpectancyRows, winExpectancyRows, overturnProbabilityRows] = await Promise.all([
            getRunExpectancyFallbackRows(),
            getWinExpectancyFallbackRows(),
            getOverturnProbabilityFallbackRows(),
          ]);

          return Promise.all(rows.map(async (row) => {
            const countBefore =
              row.balls_before === null || row.strikes_before === null ? null : `${Number(row.balls_before)}-${Number(row.strikes_before)}`;
            const ballsAfter = row.balls_after;
            const strikesAfter = row.strikes_after;
            const countAfter = ballsAfter === null || strikesAfter === null ? null : `${ballsAfter}-${strikesAfter}`;
            const umpireCount = resolveUmpireCountState(
              row.balls_before,
              row.strikes_before,
              ballsAfter,
              strikesAfter,
              row.isoverturned,
            );
            const leverage = summarizeEstimatedLeverage({
              inning: row.inning,
              balls: row.balls_before,
              strikes: row.strikes_before,
              outs: row.outs,
              basesState: row.bases_state,
              homeScore: row.home_score,
              awayScore: row.away_score,
              isOverturned: row.isoverturned,
            });

            const baseChallenge = {
              challengeId: row.challengeid,
              gamePk: Number(row.gamepk),
              pitchNumber: row.pitchnumber === null ? null : Number(row.pitchnumber),
              challengedAt: row.challengedat,
              inning: row.inning === null ? null : Number(row.inning),
              halfInning: row.halfinning,
              balls: row.balls,
              strikes: row.strikes,
              outs: row.outs,
              basesState: row.bases_state,
              homeScore: row.home_score,
              awayScore: row.away_score,
              challengeTeamId: row.challenge_team_id,
              challengeTeamName: row.challengeteamname,
              challengePlayerName: row.challenge_player_name,
              batterName: row.batter_name,
              pitcherName: row.pitcher_name,
              batterStand: row.batter_stand,
              pitcherThrows: row.pitcher_throws,
              calledDescription: row.calleddescription,
              originalCall: row.original_call,
              correctedCall: row.corrected_call,
              challengeDirection: row.challenge_direction,
              pitchType: row.pitchtype,
              startSpeed: row.startspeed === null ? null : Number(row.startspeed),
              spinRate: row.spinrate === null ? null : Number(row.spinrate),
              isOverturned: Boolean(row.isoverturned),
              px: row.px === null ? null : Number(row.px),
              pz: row.pz === null ? null : Number(row.pz),
              strikeZoneTop: row.strikezonetop === null ? null : Number(row.strikezonetop),
              strikeZoneBottom: row.strikezonebottom === null ? null : Number(row.strikezonebottom),
              countBefore,
              countAfter,
              umpireCount,
              impactType: row.impact_type,
              impactSummary: row.impact_summary,
              locationSource: row.location_source,
              inferenceMethod: row.inference_method,
              inferenceConfidence: row.inference_confidence,
              estimatedLeverageIndex: leverage.estimatedLeverageIndex,
              estimatedChallengeSwing: leverage.estimatedChallengeSwing,
              leverageBucket: leverage.leverageBucket,
              positiveOutcomeDelta: null,
              battingAverageDelta: null,
              walkRateDelta: null,
              strikeoutRateDelta: null,
            } satisfies ChallengeEvent;

            const runValue = getChallengeRunExpectancyDelta(baseChallenge, runExpectancyRows);
            const winValue = getChallengeWinExpectancyDelta(baseChallenge, winExpectancyRows);
            const estimatedChallengesRemaining =
              row.estimated_challenges_remaining === null ? 2 : Number(row.estimated_challenges_remaining);
            const decision =
              row.original_call && row.inning !== null && row.balls_before !== null && row.strikes_before !== null && row.outs !== null
                ? await estimateChallengeDecisionValue(
                    {
                      inning: Number(row.inning),
                      halfInning: normalizeHalfInning(row.halfinning) ?? "Top",
                      balls: Math.max(0, Math.min(3, Number(row.balls_before))),
                      strikes: Math.max(0, Math.min(2, Number(row.strikes_before))),
                      outs: Math.max(0, Math.min(2, Number(row.outs))),
                      scoreDiffBattingTeam: scoreDiffForBattingTeam(row.halfinning, row.home_score, row.away_score),
                      basesState: row.bases_state ?? "000",
                      calledPitch: row.original_call,
                      edgeBucket: row.edge_bucket,
                      challengesRemaining: estimatedChallengesRemaining,
                    },
                    { probabilityRows: overturnProbabilityRows, winRows: winExpectancyRows },
                  )
                : null;

            return {
              ...baseChallenge,
              preRunExpectancy: runValue.preRunExpectancy,
              postRunExpectancy: runValue.postRunExpectancy,
              runExpectancyDelta: challengeTeamDelta(runValue.runExpectancyDelta, row.challenge_side_role),
              runExpectancyConfidence: runValue.runExpectancyConfidence,
              preWinExpectancy: winValue.preWinExpectancy,
              postWinExpectancy: winValue.postWinExpectancy,
              winExpectancyDelta: challengeTeamDelta(winValue.winExpectancyDelta, row.challenge_side_role),
              winExpectancyConfidence: winValue.winExpectancyConfidence,
              estimatedOverturnProbability: decision?.estimatedOverturnProbability ?? null,
              overturnProbabilityConfidence: decision?.overturnProbabilityConfidence ?? null,
              overturnProbabilityFallbackTier: null,
              expectedChallengeValue: decision?.expectedChallengeValue ?? null,
              decisionRecommendation: decision?.recommendation ?? null,
              decisionValueMode: decision?.decisionValueMode ?? null,
              heldCountBaseline: null,
              correctedCountBaseline: null,
              pitchTypeCountBaseline: null,
              handednessBaseline: null,
              pitchLaneBaseline: null,
            } satisfies ChallengeEvent;
          }));
        },
      ),
    { warnAtMs: 700, metadata: { umpireId, range } },
  );
}

export async function getUmpireProfile(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<UmpireProfile> {
  return withServerTiming(
    "data.getUmpireProfile",
    () =>
      withCachedValue(
        getCacheKey([
          "umpire-profile",
          umpireId,
          range,
          filters?.inningRange ?? "all",
          filters?.leverage ?? "all",
          filters?.side ?? "all",
          filters?.result ?? "all",
        ]),
        15_000,
        async () => {
          const window = rangeWhere(range, "g.game_date");
          const situational = situationalWhere(filters, "c");
          const rows = await sql<{
            is_overturned: boolean;
            challenge_direction: "strike_to_ball" | "ball_to_strike" | string | null;
            balls: number | null;
            strikes: number | null;
            px: number | string | null;
            pz: number | string | null;
            strike_zone_top: number | string | null;
            strike_zone_bottom: number | string | null;
            pitcher_throws: "R" | "L" | null;
            batter_stand: "R" | "L" | null;
          }>(
            `
            WITH home_plate_games AS (
              SELECT DISTINCT game_pk
              FROM officials
              WHERE official_id = $1
                AND official_type = 'Home Plate'
            )
            SELECT
              c.is_overturned,
              c.challenge_direction,
              c.balls,
              c.strikes,
              c.resolved_px AS px,
              c.resolved_pz AS pz,
              resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strike_zone_top,
              resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strike_zone_bottom,
              NULLIF(pitcher_player.source_payload->'pitchHand'->>'code', '')::text AS pitcher_throws,
              NULLIF(batter_player.source_payload->'batSide'->>'code', '')::text AS batter_stand
            FROM mart_abs_pitch_challenges c
            JOIN home_plate_games hp ON hp.game_pk = c.game_pk
            JOIN games g ON g.game_pk = c.game_pk
            LEFT JOIN players batter_player ON batter_player.player_id = c.batter_id
            LEFT JOIN players pitcher_player ON pitcher_player.player_id = c.pitcher_id
            WHERE ${window.clause}
              AND ${situational.clause}
            `,
            [umpireId, ...window.params, ...situational.params],
          );

          const direction = {
            strikeToBall: 0,
            ballToStrike: 0,
            otherOverturns: 0,
            confirmed: 0,
          };
          const zoneBucketTotals = new Map<ObservedZoneAxisBucket, { challenges: number; overturned: number }>();
          const hotspotTotals = new Map<string, { challenges: number; overturned: number }>();
          const handednessMap = new Map<string, UmpireHandednessSplit>();

          for (const row of rows) {
            if (row.is_overturned) {
              if (row.challenge_direction === "strike_to_ball") direction.strikeToBall += 1;
              else if (row.challenge_direction === "ball_to_strike") direction.ballToStrike += 1;
              else if (row.challenge_direction) direction.otherOverturns += 1;
            } else {
              direction.confirmed += 1;
            }

            const bucket = classifyObservedZoneAxisBucket({
      px: row.px === null ? null : Number(row.px),
      pz: row.pz === null ? null : Number(row.pz),
      strikeZoneTop: row.strike_zone_top === null ? null : Number(row.strike_zone_top),
      strikeZoneBottom: row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom),
    });
            if (bucket) {
              const current = zoneBucketTotals.get(bucket) ?? { challenges: 0, overturned: 0 };
              current.challenges += 1;
              if (row.is_overturned) current.overturned += 1;
              zoneBucketTotals.set(bucket, current);
            }

            const countKey = `${row.balls ?? 0}-${row.strikes ?? 0}`;
            const hotspot = hotspotTotals.get(countKey) ?? { challenges: 0, overturned: 0 };
            hotspot.challenges += 1;
            if (row.is_overturned) hotspot.overturned += 1;
            hotspotTotals.set(countKey, hotspot);

            if ((row.pitcher_throws === "R" || row.pitcher_throws === "L") && (row.batter_stand === "R" || row.batter_stand === "L")) {
              const handednessKey = `${row.pitcher_throws}-${row.batter_stand}`;
              const handedness = handednessMap.get(handednessKey) ?? {
                pitcherThrows: row.pitcher_throws,
                batterStand: row.batter_stand,
                challengedCount: 0,
                overturnedCount: 0,
                overturnRate: 0,
              };
              handedness.challengedCount += 1;
              if (row.is_overturned) handedness.overturnedCount += 1;
              handedness.overturnRate =
                handedness.challengedCount > 0 ? handedness.overturnedCount / handedness.challengedCount : 0;
              handednessMap.set(handednessKey, handedness);
            }
          }
          const handednessOrder: Array<Pick<UmpireHandednessSplit, "pitcherThrows" | "batterStand">> = [
    { pitcherThrows: "R", batterStand: "R" },
    { pitcherThrows: "R", batterStand: "L" },
    { pitcherThrows: "L", batterStand: "L" },
    { pitcherThrows: "L", batterStand: "R" },
          ];

          return {
            directionalBias: {
      strikeToBall: direction.strikeToBall,
      ballToStrike: direction.ballToStrike,
      otherOverturns: direction.otherOverturns,
      confirmed: direction.confirmed,
    },
    zoneBuckets: [...zoneBucketTotals.entries()]
      .map(([zone, totals]) => ({
        zone,
        challenges: totals.challenges,
        overturnRate: totals.challenges > 0 ? totals.overturned / totals.challenges : 0,
      }))
      .sort((left, right) => right.challenges - left.challenges),
    countHotspots: [...hotspotTotals.entries()]
      .map(([countKey, totals]) => ({
        countKey,
        challenges: totals.challenges,
        overturnRate: totals.challenges > 0 ? totals.overturned / totals.challenges : 0,
      }))
      .sort((left, right) => right.challenges - left.challenges)
      .slice(0, 6),
            handednessSplits: handednessOrder.map(({ pitcherThrows, batterStand }) => {
      const key = `${pitcherThrows}-${batterStand}`;
      return (
        handednessMap.get(key) ?? {
          pitcherThrows,
          batterStand,
          challengedCount: 0,
          overturnedCount: 0,
          overturnRate: 0,
        }
              );
            }),
          };
        },
      ),
    { warnAtMs: 700, metadata: { umpireId, range } },
  );
}

export async function getTeamLeaderboard(range: RangeKey = "season"): Promise<TeamSummary[]> {
  return withServerTiming(
    "data.getTeamLeaderboard",
    () => withCachedValue(getCacheKey(["team-leaderboard", range]), 30_000, async () => {
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
    WITH filtered_summary AS (
      SELECT s.*
      FROM team_abs_game_summary s
      JOIN games g ON g.game_pk = s.game_pk
      WHERE ${window.clause}
    )
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
    LEFT JOIN filtered_summary s ON s.team_id = t.team_id
    GROUP BY t.team_id, t.name
    ORDER BY challengesTotal DESC, t.name ASC
    `,
    window.params,
  );

      return rows.map((r) => ({
        teamId: Number(r.teamid),
        teamName: r.teamname,
        gamesTracked: Number(r.gamestracked),
        usedSuccessful: Number(r.usedsuccessful),
        usedFailed: Number(r.usedfailed),
        challengesTotal: Number(r.challengestotal),
        avgRemaining: Number(r.avgremaining),
        overturnRate: Number(r.overturnrate),
      }));
    }),
    { warnAtMs: 700, metadata: { range } },
  );
}

async function getTeamStyleMetrics(
  range: RangeKey = "season",
  options?: { includeValueMetrics?: boolean },
) {
  void options;
  const includeValueMetrics = false;
  const window = rangeWhere(range, "g.game_date");
  const rows = await sql<{
    teamid: number;
    lateleverageshare: number | null;
    earlylowleverageshare: number | null;
    avgrunexpectancydelta: number | null;
    highrunvalueshare: number | null;
    runvalueconfidencerank: number | null;
    avgwinexpectancydelta: number | null;
    highwinvalueshare: number | null;
    winvalueconfidencerank: number | null;
  }>(
    `
    WITH filtered_challenges AS (
      SELECT c.*
      FROM mart_abs_pitch_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      WHERE c.challenge_team_id IS NOT NULL
        AND ${window.clause}
    ),
    challenge_style AS (
      SELECT
        c.challenge_team_id AS teamId,
        AVG(
          CASE
            WHEN c.inning >= 7 OR ABS(COALESCE(c.home_score, 0) - COALESCE(c.away_score, 0)) <= 2 THEN 1.0
            ELSE 0.0
          END
        )::NUMERIC AS lateLeverageShare,
        AVG(
          CASE
            WHEN c.inning <= 3 AND ABS(COALESCE(c.home_score, 0) - COALESCE(c.away_score, 0)) >= 3 THEN 1.0
            ELSE 0.0
          END
        )::NUMERIC AS earlyLowLeverageShare
      FROM filtered_challenges c
      GROUP BY c.challenge_team_id
    )
    SELECT
      cs.teamId,
      cs.lateLeverageShare,
      cs.earlyLowLeverageShare,
      ${
        includeValueMetrics
          ? `rv.avg_re_delta::NUMERIC AS avgRunExpectancyDelta,
      rv.high_re_share::NUMERIC AS highRunValueShare,
      CASE rv.confidence_band WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END AS runValueConfidenceRank,
      wv.avg_we_delta::NUMERIC AS avgWinExpectancyDelta,
      wv.high_we_share::NUMERIC AS highWinValueShare,
      CASE wv.confidence_band WHEN 'high' THEN 3 WHEN 'medium' THEN 2 WHEN 'low' THEN 1 ELSE 0 END AS winValueConfidenceRank`
          : `NULL::NUMERIC AS avgRunExpectancyDelta,
      NULL::NUMERIC AS highRunValueShare,
      NULL::INT AS runValueConfidenceRank,
      NULL::NUMERIC AS avgWinExpectancyDelta,
      NULL::NUMERIC AS highWinValueShare,
      NULL::INT AS winValueConfidenceRank`
      }
    FROM challenge_style cs
    ${
      includeValueMetrics
        ? `LEFT JOIN mart_team_challenge_run_value rv ON rv.team_id = cs.teamId
    LEFT JOIN mart_team_challenge_win_value wv ON wv.team_id = cs.teamId`
        : ""
    }
    `,
    window.params,
  );

  return new Map<number, TeamStyleMetric>(
    rows.map((row) => [
      Number(row.teamid),
      {
        teamId: Number(row.teamid),
        lateLeverageShare: Number(row.lateleverageshare ?? 0),
        earlyLowLeverageShare: Number(row.earlylowleverageshare ?? 0),
        avgRunExpectancyDelta: row.avgrunexpectancydelta === null ? null : Number(row.avgrunexpectancydelta),
        highRunValueShare: Number(row.highrunvalueshare ?? 0),
        runValueConfidence: confidenceBandFromRank(row.runvalueconfidencerank === null ? null : Number(row.runvalueconfidencerank)),
        avgWinExpectancyDelta: row.avgwinexpectancydelta === null ? null : Number(row.avgwinexpectancydelta),
        highWinValueShare: Number(row.highwinvalueshare ?? 0),
        winValueConfidence: confidenceBandFromRank(row.winvalueconfidencerank === null ? null : Number(row.winvalueconfidencerank)),
        averageExpectedChallengeValue: null,
        averageRealizedChallengeValue: null,
        decisionSurplus: null,
        challengeRecommendationRate: 0,
        holdRecommendationRate: 0,
        capturedValueShare: 0,
        wastedValueShare: 0,
        highPressureExpectedValueShare: 0,
        lateCloseChallengeShare: 0,
        lateCloseExpectedValueShare: 0,
        bestDecisionWindowLabel: null,
        bestDecisionWindowExpectedValue: null,
        decisionValueConfidence: null,
      } satisfies TeamStyleMetric,
    ]),
  );
}

function mergeTeamStyleAndDecisionMetrics(
  styleMetrics: Awaited<ReturnType<typeof getTeamStyleMetrics>>,
  decisionMetrics: Awaited<ReturnType<typeof getTeamDecisionValueLeaderboard>>,
) {
  const merged = new Map(styleMetrics);

  for (const [teamId, decision] of decisionMetrics.entries()) {
    const existing: TeamStyleMetric = merged.get(teamId) ?? {
      teamId,
      lateLeverageShare: 0,
      earlyLowLeverageShare: 0,
      avgRunExpectancyDelta: null,
      highRunValueShare: 0,
      runValueConfidence: null,
      avgWinExpectancyDelta: null,
      highWinValueShare: 0,
      winValueConfidence: null,
      averageExpectedChallengeValue: null,
      averageRealizedChallengeValue: null,
      decisionSurplus: null,
      challengeRecommendationRate: 0,
      holdRecommendationRate: 0,
      capturedValueShare: 0,
      wastedValueShare: 0,
      highPressureExpectedValueShare: 0,
      lateCloseChallengeShare: 0,
      lateCloseExpectedValueShare: 0,
      bestDecisionWindowLabel: null,
      bestDecisionWindowExpectedValue: null,
      decisionValueConfidence: null,
    };

    merged.set(teamId, {
      ...existing,
      averageExpectedChallengeValue: decision.averageExpectedChallengeValue,
      averageRealizedChallengeValue: decision.averageRealizedChallengeValue,
      decisionSurplus: decision.decisionSurplus,
      challengeRecommendationRate: decision.challengeRecommendationRate,
      holdRecommendationRate: decision.holdRecommendationRate,
      capturedValueShare: decision.capturedValueShare,
      wastedValueShare: decision.wastedValueShare,
      highPressureExpectedValueShare: decision.highPressureExpectedValueShare,
      lateCloseChallengeShare: decision.lateCloseChallengeShare,
      lateCloseExpectedValueShare: decision.lateCloseExpectedValueShare,
      bestDecisionWindowLabel: decision.bestDecisionWindowLabel,
      bestDecisionWindowExpectedValue: decision.bestDecisionWindowExpectedValue,
      decisionValueConfidence: decision.modelConfidence,
    });
  }

  return merged;
}

export async function getTeamLeaderboardModel(
  range: RangeKey = "season",
  options?: { includeDecisionMetrics?: boolean; includeValueMetrics?: boolean },
): Promise<TeamLeaderboardEntry[]> {
  const includeDecisionMetrics = options?.includeDecisionMetrics ?? true;
  const includeValueMetrics = options?.includeValueMetrics ?? true;
  return withServerTiming(
    "data.getTeamLeaderboardModel",
    () => withCachedValue(getCacheKey(["team-leaderboard-model", range, includeDecisionMetrics ? "decision" : "style-only", includeValueMetrics ? "value" : "no-value"]), 30_000, async () => {
      const [teams, styleMetrics, decisionMetrics] = await Promise.all([
        getTeamLeaderboard(range),
        getTeamStyleMetrics(range, { includeValueMetrics }),
        includeDecisionMetrics ? getTeamDecisionValueLeaderboard(range) : Promise.resolve(new Map()),
      ]);
      return buildTeamLeaderboardEntries(teams, mergeTeamStyleAndDecisionMetrics(styleMetrics, decisionMetrics));
    }),
    { warnAtMs: 1_000, metadata: { range, includeDecisionMetrics, includeValueMetrics } },
  );
}

export async function getTeamSummary(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<TeamSummary | null> {
  return withServerTiming(
    "data.getTeamSummary",
    () =>
      withCachedValue(
        getCacheKey([
          "team-summary",
          teamId,
          range,
          filters?.inningRange ?? "all",
          filters?.leverage ?? "all",
          filters?.side ?? "all",
          filters?.result ?? "all",
        ]),
        15_000,
        async () => {
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
    WITH filtered_challenges AS (
      SELECT c.*
      FROM mart_abs_pitch_challenges c
      JOIN games g ON g.game_pk = c.game_pk
      WHERE c.challenge_team_id = $1
        AND ${window.clause}
        AND ${situational.clause}
    )
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
    LEFT JOIN filtered_challenges c ON c.challenge_team_id = t.team_id
    LEFT JOIN team_abs_game_summary s ON s.game_pk = c.game_pk AND s.team_id = t.team_id
    WHERE t.team_id = $1
    GROUP BY t.name
    `,
    [teamId, ...window.params, ...situational.params],
          );

          const r = rows[0];
          if (!r) {
            const fallbackRows = await sql<{ teamid: number; teamname: string }>(
      `
      SELECT team_id AS teamId, name AS teamName
      FROM teams
      WHERE team_id = $1
      LIMIT 1
      `,
      [teamId],
            );
            const fallback = fallbackRows[0];
            if (!fallback) return null;
            return {
              teamId: Number(fallback.teamid),
              teamName: fallback.teamname,
              gamesTracked: 0,
              usedSuccessful: 0,
              usedFailed: 0,
              challengesTotal: 0,
              avgRemaining: 0,
              overturnRate: 0,
            };
          }
          return {
            teamId: Number(r.teamid),
            teamName: r.teamname,
            gamesTracked: Number(r.gamestracked),
            usedSuccessful: Number(r.usedsuccessful),
            usedFailed: Number(r.usedfailed),
            challengesTotal: Number(r.challengestotal),
            avgRemaining: Number(r.avgremaining),
            overturnRate: Number(r.overturnrate),
          };
        },
      ),
    { warnAtMs: 500, metadata: { teamId, range } },
  );
}

export async function getTeamIdentity(teamId: number): Promise<TeamIdentity | null> {
  const rows = await sql<{
    teamid: number;
    teamname: string;
    abbreviation: string;
    primarycolor: string | null;
    secondarycolor: string | null;
    logosvgurl: string | null;
    divisionname: string | null;
    leaguename: string | null;
    snapshot_wins: number | null;
    snapshot_losses: number | null;
    snapshot_division_rank: number | null;
    snapshot_wildcard_rank: number | null;
    calc_wins: number | null;
    calc_losses: number | null;
  }>(
    `
    WITH latest_snapshot AS (
      SELECT wins, losses, division_rank, wild_card_rank
      FROM editorial.standings_snapshots
      WHERE team_id = $1
      ORDER BY snapshot_date DESC
      LIMIT 1
    ),
    calculated_record AS (
      SELECT
        COUNT(*) FILTER (WHERE (home_team_id = $1 AND home_score > away_score) OR (away_team_id = $1 AND away_score > home_score)) AS wins,
        COUNT(*) FILTER (WHERE (home_team_id = $1 AND home_score < away_score) OR (away_team_id = $1 AND away_score < home_score)) AS losses
      FROM games
      WHERE (home_team_id = $1 OR away_team_id = $1)
        AND status_abstract = 'Final'
        AND game_type = 'R'
        AND season = EXTRACT(YEAR FROM CURRENT_DATE)::INT
    )
    SELECT
      t.team_id AS teamId,
      t.name AS teamName,
      t.abbreviation AS abbreviation,
      t.primary_color AS primaryColor,
      t.secondary_color AS secondaryColor,
      t.logo_svg_url AS logoSvgUrl,
      t.division_name AS divisionName,
      t.league_name AS leagueName,
      s.wins AS snapshot_wins,
      s.losses AS snapshot_losses,
      s.division_rank AS snapshot_division_rank,
      s.wild_card_rank AS snapshot_wildcard_rank,
      c.wins AS calc_wins,
      c.losses AS calc_losses
    FROM teams t
    LEFT JOIN latest_snapshot s ON TRUE
    LEFT JOIN calculated_record c ON TRUE
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
    divisionName: row.divisionname,
    leagueName: row.leaguename,
    wins: (row.snapshot_wins ?? row.calc_wins) ?? 0,
    losses: (row.snapshot_losses ?? row.calc_losses) ?? 0,
    divisionRank: row.snapshot_division_rank ?? undefined,
    wildCardRank: row.snapshot_wildcard_rank ?? undefined,
  };
}

export async function getTeamTrend(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<TeamTrendPoint[]> {
  return withServerTiming(
    "data.getTeamTrend",
    () =>
      withCachedValue(
        getCacheKey([
          "team-trend",
          teamId,
          range,
          filters?.inningRange ?? "all",
          filters?.leverage ?? "all",
          filters?.side ?? "all",
          filters?.result ?? "all",
        ]),
        15_000,
        async () => {
          const window = rangeWhere(range, "g.game_date");
          const situational = situationalWhere(filters, "c");

  const rows = await sql<{
    gamepk: number;
    gamedate: string;
    gametype: string;
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
      g.game_type AS gameType,
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
    FROM mart_abs_pitch_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN teams home ON home.team_id = g.home_team_id
    LEFT JOIN teams away ON away.team_id = g.away_team_id
    LEFT JOIN team_abs_game_summary s ON s.game_pk = c.game_pk AND s.team_id = $1
    WHERE c.challenge_team_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY
      c.game_pk,
      g.game_date,
      g.game_type,
      g.home_team_id,
      g.away_team_id,
      home.abbreviation,
      away.abbreviation,
      away.name,
      home.name,
      s.remaining
    ORDER BY g.game_date DESC
    LIMIT 24
    `,
    [teamId, ...window.params, ...situational.params],
          );

          return rows.map((r) => ({
    gamePk: Number(r.gamepk),
    gameDate: r.gamedate,
    gameType: r.gametype,
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
        },
      ),
    { warnAtMs: 500, metadata: { teamId, range } },
  );
}

export async function getTeamTrendSparklines(range: RangeKey = "season"): Promise<TeamTrendSparklinePoint[]> {
  const window = rangeWhere(range, "g.game_date");
  const rows = await sql<{
    teamid: number;
    values: number[];
  }>(
    `
    WITH daily AS (
      SELECT
        s.team_id AS team_id,
        g.game_date::date AS game_day,
        SUM(s.used_successful) AS used_successful,
        SUM(s.challenges_total) AS challenges_total
      FROM team_abs_game_summary s
      JOIN games g ON g.game_pk = s.game_pk
      WHERE ${window.clause}
      GROUP BY s.team_id, g.game_date::date
    ),
    ranked AS (
      SELECT
        team_id,
        game_day,
        CASE
          WHEN challenges_total > 0 THEN used_successful::NUMERIC / challenges_total
          ELSE 0
        END AS overturn_rate,
        ROW_NUMBER() OVER (PARTITION BY team_id ORDER BY game_day DESC) AS row_number
      FROM daily
    )
    SELECT
      team_id AS teamId,
      ARRAY_AGG(ROUND((overturn_rate * 100)::numeric, 2) ORDER BY game_day ASC) AS values
    FROM ranked
    WHERE row_number <= 10
    GROUP BY team_id
    `,
    window.params,
  );

  return rows.map((row) => ({
    teamId: Number(row.teamid),
    values: Array.isArray(row.values) ? row.values.map((value) => Number(value)) : [],
  }));
}

export async function getTeamInningEfficiency(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
): Promise<TeamInningEfficiencyCell[]> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    inning: number;
    category: "Offensive" | "Defensive";
    sample_size: number;
    overturn_rate: number;
  }>(
    `
    SELECT
      c.inning,
      CASE
        WHEN (g.home_team_id = $1 AND c.half_inning = 'bottom') OR (g.away_team_id = $1 AND c.half_inning = 'top')
          THEN 'Offensive'
        ELSE 'Defensive'
      END AS category,
      COUNT(*) AS sample_size,
      AVG(CASE WHEN c.is_overturned THEN 1.0 ELSE 0.0 END)::NUMERIC AS overturn_rate
    FROM mart_abs_pitch_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    WHERE c.challenge_team_id = $1
      AND c.inning BETWEEN 1 AND 9
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY c.inning, category
    ORDER BY c.inning ASC, category ASC
    `,
    [teamId, ...window.params, ...situational.params],
  );

  return rows.map((row) => ({
    inning: Number(row.inning),
    category: row.category,
    sampleSize: Number(row.sample_size),
    overturnRate: Number(row.overturn_rate ?? 0),
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
    FROM mart_abs_pitch_challenges c
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

type TeamChallengeAnalyticsResult = {
  matrix: TeamChallengeScenarioCell[];
  summary: TeamChallengeValueSummary;
};

async function getTeamChallengeAnalytics(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
  options?: { includeValueMetrics?: boolean },
): Promise<TeamChallengeAnalyticsResult> {
  const includeValueMetrics = options?.includeValueMetrics ?? true;
  return withCachedValue(
    getCacheKey([
      "team-challenge-analytics",
      teamId,
      range,
      includeValueMetrics ? "value" : "light",
      filters?.inningRange ?? "all",
      filters?.leverage ?? "all",
      filters?.side ?? "all",
      filters?.result ?? "all",
    ]),
    30_000,
    async () => {
      const window = rangeWhere(range, "g.game_date");
      const situational = situationalWhere(filters, "c");
      const [rows, baselines, runExpectancyRows, winExpectancyRows] = await Promise.all([
        sql<{
          challenge_id: string;
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
          is_overturned: boolean;
          balls_before: number | null;
          strikes_before: number | null;
          balls_after: number | null;
          strikes_after: number | null;
          impact_type: string | null;
          impact_summary: string | null;
          run_expectancy_delta: number | string | null;
          win_expectancy_delta: number | string | null;
          challenge_side_role: string | null;
        }>(
          `
          SELECT DISTINCT ON (c.challenge_id)
            c.challenge_id,
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
            ${includeValueMetrics ? "COALESCE(p.called_description, c.called_description)" : "c.called_description"} AS called_description,
            c.is_overturned,
            ${
              includeValueMetrics
                ? `COALESCE(p.balls_before, c.balls) AS balls_before,
            COALESCE(p.strikes_before, c.strikes) AS strikes_before,
            CASE
              WHEN p.balls_after IS NOT NULL THEN p.balls_after
              WHEN c.corrected_call = 'ball' AND c.balls IS NOT NULL THEN LEAST(c.balls + 1, 4)
              WHEN c.corrected_call = 'called_strike' THEN c.balls
              ELSE NULL
            END AS balls_after,
            CASE
              WHEN p.strikes_after IS NOT NULL THEN p.strikes_after
              WHEN c.corrected_call = 'called_strike' AND c.strikes IS NOT NULL THEN LEAST(c.strikes + 1, 3)
              WHEN c.corrected_call = 'ball' THEN c.strikes
              ELSE NULL
            END AS strikes_after,
            NULL::TEXT AS impact_type,
            NULL::TEXT AS impact_summary`
                : `c.balls AS balls_before,
            c.strikes AS strikes_before,
            CASE
              WHEN c.corrected_call = 'ball' AND c.balls IS NOT NULL THEN LEAST(c.balls + 1, 4)
              WHEN c.corrected_call = 'called_strike' THEN c.balls
              ELSE NULL
            END AS balls_after,
            CASE
              WHEN c.corrected_call = 'called_strike' AND c.strikes IS NOT NULL THEN LEAST(c.strikes + 1, 3)
              WHEN c.corrected_call = 'ball' THEN c.strikes
              ELSE NULL
            END AS strikes_after,
            NULL::TEXT AS impact_type,
            NULL::TEXT AS impact_summary`
            },
            NULL::NUMERIC AS run_expectancy_delta,
            NULL::NUMERIC AS win_expectancy_delta,
            c.challenge_side_role
          FROM mart_abs_pitch_challenges c
          JOIN games g ON g.game_pk = c.game_pk
          LEFT JOIN teams t ON t.team_id = c.challenge_team_id
          ${
            includeValueMetrics
              ? `LEFT JOIN pitches p
            ON p.game_pk = c.game_pk
            AND p.at_bat_index = c.at_bat_index
            AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
          `
              : ""
          }
          WHERE c.challenge_team_id = $1
            AND ${window.clause}
            AND ${situational.clause}
          ORDER BY c.challenge_id, c.challenged_at ASC NULLS LAST
          `,
          [teamId, ...window.params, ...situational.params],
        ),
        getCountStateBaselines(),
        includeValueMetrics ? getRunExpectancyFallbackRows() : Promise.resolve([]),
        includeValueMetrics ? getWinExpectancyFallbackRows() : Promise.resolve([]),
      ]);

      const baselineMap = buildCountStateBaselineMap(baselines);
      const challenges: ChallengeEvent[] = rows.map((row) => {
        const challengeBase: ChallengeEvent = {
          challengeId: row.challenge_id,
          gamePk: 0,
          challengedAt: row.challenged_at,
          inning: row.inning,
          halfInning: row.half_inning,
          balls: row.balls,
          strikes: row.strikes,
          outs: row.outs,
          basesState: row.bases_state,
          homeScore: row.home_score,
          awayScore: row.away_score,
          challengeTeamId: row.challenge_team_id,
          challengeTeamName: row.challenge_team_name,
          challengePlayerName: row.challenge_player_name,
          batterName: row.batter_name,
          pitcherName: row.pitcher_name,
          calledDescription: row.called_description,
          pitchNumber: null,
          pitchType: null,
          startSpeed: null,
          spinRate: null,
          isOverturned: row.is_overturned,
          px: null,
          pz: null,
          strikeZoneTop: null,
          strikeZoneBottom: null,
          countBefore:
            row.balls_before === null || row.strikes_before === null ? null : `${row.balls_before}-${row.strikes_before}`,
          countAfter:
            row.balls_after === null || row.strikes_after === null ? null : `${row.balls_after}-${row.strikes_after}`,
          umpireCount: (() => {
          if (row.balls_before === null || row.strikes_before === null) return null;
          if (!row.is_overturned) return row.balls_after === null || row.strikes_after === null ? null : `${row.balls_after}-${row.strikes_after}`;
          if (row.balls_after !== null && row.balls_after > row.balls_before) return `${row.balls_before}-${row.strikes_before + 1}`;
          if (row.strikes_after !== null && row.strikes_after > row.strikes_before) return `${row.balls_before + 1}-${row.strikes_before}`;
          return row.balls_after === null || row.strikes_after === null ? null : `${row.balls_after}-${row.strikes_after}`;
          })(),
          impactType: row.impact_type ?? null,
          impactSummary: row.impact_summary ?? null,
        };
        const runValue = includeValueMetrics ? getChallengeRunExpectancyDelta(challengeBase, runExpectancyRows) : null;
        const winValue = includeValueMetrics ? getChallengeWinExpectancyDelta(challengeBase, winExpectancyRows) : null;
        return {
          ...challengeBase,
          runExpectancyDelta:
            row.run_expectancy_delta === null
              ? challengeTeamDelta(runValue?.runExpectancyDelta ?? null, row.challenge_side_role)
              : Number(row.run_expectancy_delta),
          runExpectancyConfidence: runValue?.runExpectancyConfidence ?? null,
          winExpectancyDelta:
            row.win_expectancy_delta === null
              ? challengeTeamDelta(winValue?.winExpectancyDelta ?? null, row.challenge_side_role)
              : Number(row.win_expectancy_delta),
          winExpectancyConfidence: winValue?.winExpectancyConfidence ?? null,
        };
      });

      const rowDefs = [
        { key: "empty", label: "Bases Empty" },
        { key: "traffic", label: "Runner On" },
        { key: "risp_lt2", label: "RISP, <2 Outs" },
        { key: "risp_2", label: "RISP, 2 Outs" },
        { key: "loaded", label: "Bases Loaded" },
      ] as const;
      const colDefs = [
        { key: "pitcher", label: "Pitcher Ahead" },
        { key: "even", label: "Even Count" },
        { key: "hitter", label: "Hitter Ahead" },
        { key: "full", label: "Full Count" },
      ] as const;

      const aggregates = new Map<
        string,
        {
          rowKey: string;
          rowLabel: string;
          colKey: string;
          colLabel: string;
          challenges: number;
          overturned: number;
          totalLeverage: number;
          totalPositiveOutcomeDelta: number;
          positiveOutcomeSamples: number;
          totalRunExpectancyDelta: number;
          runExpectancySamples: number;
          totalWinExpectancyDelta: number;
          winExpectancySamples: number;
          highPressure: number;
        }
      >();

      let highPressureCount = 0;
      let lowPressureCount = 0;
      let rispLessThanTwoOutsCount = 0;
      let totalLeverage = 0;
      let totalPositiveOutcomeDelta = 0;
      let positiveOutcomeSamples = 0;
      const runExpectancyDeltas: number[] = [];
      const winExpectancyDeltas: number[] = [];

      challenges.forEach((challenge) => {
        const snapshot = buildChallengeValueSnapshot(challenge, baselineMap);
        const runExpectancyDelta = challenge.runExpectancyDelta ?? null;
        const winExpectancyDelta = challenge.winExpectancyDelta ?? null;
        const key = `${snapshot.baseBucket.key}:${snapshot.countBucket.key}`;
        const existing = aggregates.get(key) ?? {
          rowKey: snapshot.baseBucket.key,
          rowLabel: snapshot.baseBucket.label,
          colKey: snapshot.countBucket.key,
          colLabel: snapshot.countBucket.label,
          challenges: 0,
          overturned: 0,
          totalLeverage: 0,
          totalPositiveOutcomeDelta: 0,
          positiveOutcomeSamples: 0,
          totalRunExpectancyDelta: 0,
          runExpectancySamples: 0,
          totalWinExpectancyDelta: 0,
          winExpectancySamples: 0,
          highPressure: 0,
        };

        existing.challenges += 1;
        existing.overturned += challenge.isOverturned ? 1 : 0;
        existing.totalLeverage += snapshot.leverage.estimatedLeverageIndex;
        if (snapshot.countStateDelta.positiveOutcomeDelta !== null) {
          existing.totalPositiveOutcomeDelta += snapshot.countStateDelta.positiveOutcomeDelta;
          existing.positiveOutcomeSamples += 1;
          totalPositiveOutcomeDelta += snapshot.countStateDelta.positiveOutcomeDelta;
          positiveOutcomeSamples += 1;
        }
        if (runExpectancyDelta !== null) {
          existing.totalRunExpectancyDelta += runExpectancyDelta;
          existing.runExpectancySamples += 1;
          runExpectancyDeltas.push(runExpectancyDelta);
        }
        if (winExpectancyDelta !== null) {
          existing.totalWinExpectancyDelta += winExpectancyDelta;
          existing.winExpectancySamples += 1;
          winExpectancyDeltas.push(winExpectancyDelta);
        }
        if (snapshot.leverage.leverageBucket === "high") {
          existing.highPressure += 1;
          highPressureCount += 1;
        }
        if (snapshot.leverage.leverageBucket === "low") {
          lowPressureCount += 1;
        }
        if (snapshot.baseBucket.key === "risp_lt2" || snapshot.baseBucket.key === "loaded") {
          rispLessThanTwoOutsCount += 1;
        }
        totalLeverage += snapshot.leverage.estimatedLeverageIndex;

        aggregates.set(key, existing);
      });

      const matrix = rowDefs.flatMap((rowDef) =>
        colDefs.map((colDef) => {
          const entry = aggregates.get(`${rowDef.key}:${colDef.key}`);
          return {
            rowKey: rowDef.key,
            rowLabel: rowDef.label,
            colKey: colDef.key,
            colLabel: colDef.label,
            challenges: entry?.challenges ?? 0,
            overturned: entry?.overturned ?? 0,
            overturnRate: entry && entry.challenges > 0 ? entry.overturned / entry.challenges : 0,
            avgEstimatedLeverage:
              entry && entry.challenges > 0 ? Math.round((entry.totalLeverage / entry.challenges) * 10) / 10 : 0,
            avgPositiveOutcomeDelta:
              entry && entry.positiveOutcomeSamples > 0
                ? roundMetric(entry.totalPositiveOutcomeDelta / entry.positiveOutcomeSamples)
                : null,
            avgRunExpectancyDelta:
              entry && entry.runExpectancySamples > 0
                ? roundMetric(entry.totalRunExpectancyDelta / entry.runExpectancySamples)
                : null,
            avgWinExpectancyDelta:
              entry && entry.winExpectancySamples > 0
                ? roundMetric(entry.totalWinExpectancyDelta / entry.winExpectancySamples, 4)
                : null,
            highPressureShare: entry && entry.challenges > 0 ? entry.highPressure / entry.challenges : 0,
          } satisfies TeamChallengeScenarioCell;
        }),
      );

      const preferredScenarioMetric =
        winExpectancyDeltas.length >= 40 ? "we" : runExpectancyDeltas.length >= 25 ? "re" : "count";
      const bestScenario = matrix
        .filter((cell) => cell.challenges > 0)
        .sort((left, right) => {
          const primaryGap =
            preferredScenarioMetric === "we"
              ? (right.avgWinExpectancyDelta ?? -Infinity) - (left.avgWinExpectancyDelta ?? -Infinity)
              : preferredScenarioMetric === "re"
                ? (right.avgRunExpectancyDelta ?? -Infinity) - (left.avgRunExpectancyDelta ?? -Infinity)
                : (right.avgPositiveOutcomeDelta ?? -Infinity) - (left.avgPositiveOutcomeDelta ?? -Infinity);
          if (primaryGap !== 0) return primaryGap;
          const pressureGap = right.highPressureShare - left.highPressureShare;
          if (pressureGap !== 0) return pressureGap;
          return right.challenges - left.challenges;
        })[0];

      return {
        matrix,
        summary: {
          totalChallenges: challenges.length,
          highPressureShare: challenges.length > 0 ? highPressureCount / challenges.length : 0,
          lowPressureShare: challenges.length > 0 ? lowPressureCount / challenges.length : 0,
          rispLessThanTwoOutsShare: challenges.length > 0 ? rispLessThanTwoOutsCount / challenges.length : 0,
          averageEstimatedLeverage: challenges.length > 0 ? Math.round((totalLeverage / challenges.length) * 10) / 10 : 0,
          averagePositiveOutcomeDelta:
            positiveOutcomeSamples > 0 ? roundMetric(totalPositiveOutcomeDelta / positiveOutcomeSamples) : null,
          averageRunExpectancyDelta:
            runExpectancyDeltas.length > 0
              ? roundMetric(runExpectancyDeltas.reduce((sum, value) => sum + value, 0) / runExpectancyDeltas.length)
              : null,
          medianRunExpectancyDelta:
            runExpectancyDeltas.length > 0
              ? roundMetric(
                  [...runExpectancyDeltas].sort((left, right) => left - right)[Math.floor(runExpectancyDeltas.length / 2)],
                )
              : null,
          highRunValueShare:
            runExpectancyDeltas.length > 0
              ? runExpectancyDeltas.filter((value) => value > 0).length / runExpectancyDeltas.length
              : 0,
          lowRunValueBurnShare:
            runExpectancyDeltas.length > 0
              ? runExpectancyDeltas.filter((value) => value <= 0).length / runExpectancyDeltas.length
              : 0,
          lateCloseRunValueShare:
            challenges.length > 0
              ? challenges.filter(
                  (challenge) =>
                    (challenge.inning ?? 0) >= 7 &&
                    challenge.homeScore !== null &&
                    challenge.awayScore !== null &&
                    Math.abs(challenge.homeScore - challenge.awayScore) <= 2,
                ).length / challenges.length
              : 0,
          runExpectancyConfidence:
            runExpectancyDeltas.length >= 80 ? "high" : runExpectancyDeltas.length >= 25 ? "medium" : runExpectancyDeltas.length > 0 ? "low" : null,
          averageWinExpectancyDelta:
            winExpectancyDeltas.length > 0
              ? roundMetric(winExpectancyDeltas.reduce((sum, value) => sum + value, 0) / winExpectancyDeltas.length, 4)
              : null,
          medianWinExpectancyDelta:
            winExpectancyDeltas.length > 0
              ? roundMetric(
                  [...winExpectancyDeltas].sort((left, right) => left - right)[Math.floor(winExpectancyDeltas.length / 2)],
                  4,
                )
              : null,
          highWinValueShare:
            winExpectancyDeltas.length > 0
              ? winExpectancyDeltas.filter((value) => value > 0).length / winExpectancyDeltas.length
              : 0,
          lowWinValueBurnShare:
            winExpectancyDeltas.length > 0
              ? winExpectancyDeltas.filter((value) => value <= 0).length / winExpectancyDeltas.length
              : 0,
          lateCloseWinValueShare:
            challenges.length > 0
              ? challenges.filter(
                  (challenge) =>
                    (challenge.inning ?? 0) >= 7 &&
                    challenge.homeScore !== null &&
                    challenge.awayScore !== null &&
                    Math.abs(challenge.homeScore - challenge.awayScore) <= 2,
                ).length / challenges.length
              : 0,
          winExpectancyConfidence:
            winExpectancyDeltas.length >= 120
              ? "high"
              : winExpectancyDeltas.length >= 40
                ? "medium"
                : winExpectancyDeltas.length > 0
                  ? "low"
                  : null,
          bestScenarioLabel: bestScenario ? `${bestScenario.rowLabel} • ${bestScenario.colLabel}` : null,
          bestScenarioChallenges: bestScenario?.challenges ?? 0,
        },
      };
    },
  );
}

async function getTeamChallengeScenarioMatrixLight(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
): Promise<TeamChallengeScenarioCell[]> {
  return withVersionedCache(
    ["team-challenge-scenario-matrix-light", teamId, range, ...getSituationalFilterCacheParts(filters)],
    getLatestSuccessfulEtlDataVersion(),
    30_000,
    async () => {
      const window = rangeWhere(range, "g.game_date");
      const situational = situationalWhere(filters, "c");
      const rows = await sql<{
        row_key: string;
        col_key: string;
        challenges: number | string;
        overturned: number | string;
        avg_estimated_leverage: number | string | null;
        high_pressure_share: number | string | null;
      }>(
        `
        WITH filtered AS (
          SELECT
            c.*,
            CASE
              WHEN c.bases_state = '111' OR LOWER(COALESCE(c.bases_state, '')) = 'bases loaded' THEN 3
              WHEN c.bases_state ~ '^[01]{3}$' THEN LENGTH(REPLACE(c.bases_state, '0', ''))
              ELSE
                CASE WHEN LOWER(COALESCE(c.bases_state, '')) LIKE '%1b%' OR LOWER(COALESCE(c.bases_state, '')) LIKE '%first%' THEN 1 ELSE 0 END
                + CASE WHEN LOWER(COALESCE(c.bases_state, '')) LIKE '%2b%' OR LOWER(COALESCE(c.bases_state, '')) LIKE '%second%' THEN 1 ELSE 0 END
                + CASE WHEN LOWER(COALESCE(c.bases_state, '')) LIKE '%3b%' OR LOWER(COALESCE(c.bases_state, '')) LIKE '%third%' THEN 1 ELSE 0 END
            END AS runners_on_base
          FROM mart_abs_pitch_challenges c
          JOIN games g ON g.game_pk = c.game_pk
          WHERE c.challenge_team_id = $1
            AND ${window.clause}
            AND ${situational.clause}
        ),
        scored AS (
          SELECT
            CASE
              WHEN bases_state = '111' OR LOWER(COALESCE(bases_state, '')) = 'bases loaded' THEN 'loaded'
              WHEN bases_state IN ('011', '101', '110') AND COALESCE(outs, 0) < 2 THEN 'risp_lt2'
              WHEN bases_state IN ('011', '101', '110') THEN 'risp_2'
              WHEN bases_state = '000' THEN 'empty'
              ELSE 'traffic'
            END AS row_key,
            CASE
              WHEN COALESCE(balls, 0) = 3 AND COALESCE(strikes, 0) = 2 THEN 'full'
              WHEN COALESCE(balls, 0) > COALESCE(strikes, 0) THEN 'hitter'
              WHEN COALESCE(balls, 0) < COALESCE(strikes, 0) THEN 'pitcher'
              ELSE 'even'
            END AS col_key,
            is_overturned,
            GREATEST(
              0,
              LEAST(
                100,
                (
                  CASE WHEN COALESCE(inning, 1) >= 9 THEN 28 WHEN COALESCE(inning, 1) >= 7 THEN 22 WHEN COALESCE(inning, 1) >= 5 THEN 14 ELSE 8 END
                  + CASE
                    WHEN ABS(COALESCE(home_score, 0) - COALESCE(away_score, 0)) = 0 THEN 28
                    WHEN ABS(COALESCE(home_score, 0) - COALESCE(away_score, 0)) = 1 THEN 24
                    WHEN ABS(COALESCE(home_score, 0) - COALESCE(away_score, 0)) = 2 THEN 18
                    WHEN ABS(COALESCE(home_score, 0) - COALESCE(away_score, 0)) = 3 THEN 12
                    ELSE 6
                  END
                  + CASE WHEN COALESCE(outs, 0) >= 2 THEN 14 WHEN COALESCE(outs, 0) = 1 THEN 9 ELSE 5 END
                  + CASE WHEN runners_on_base >= 3 THEN 14 WHEN runners_on_base = 2 THEN 11 WHEN runners_on_base = 1 THEN 8 ELSE 0 END
                  + CASE
                    WHEN COALESCE(balls, 0) = 3 AND COALESCE(strikes, 0) = 2 THEN 16
                    WHEN COALESCE(strikes, 0) >= 2 THEN 12
                    WHEN COALESCE(balls, 0) >= 3 THEN 10
                    ELSE 5
                  END
                )
              )
            )::NUMERIC AS estimated_leverage
          FROM filtered
        )
        SELECT
          row_key,
          col_key,
          COUNT(*) AS challenges,
          COUNT(*) FILTER (WHERE is_overturned) AS overturned,
          AVG(estimated_leverage)::NUMERIC AS avg_estimated_leverage,
          AVG(CASE WHEN estimated_leverage >= 65 THEN 1.0 ELSE 0.0 END)::NUMERIC AS high_pressure_share
        FROM scored
        GROUP BY row_key, col_key
        `,
        [teamId, ...window.params, ...situational.params],
      );

      const rowDefs = [
        { key: "empty", label: "Bases Empty" },
        { key: "traffic", label: "Runner On" },
        { key: "risp_lt2", label: "RISP, <2 Outs" },
        { key: "risp_2", label: "RISP, 2 Outs" },
        { key: "loaded", label: "Bases Loaded" },
      ] as const;
      const colDefs = [
        { key: "pitcher", label: "Pitcher Ahead" },
        { key: "even", label: "Even Count" },
        { key: "hitter", label: "Hitter Ahead" },
        { key: "full", label: "Full Count" },
      ] as const;
      const rowMap = new Map(rows.map((row) => [`${row.row_key}:${row.col_key}`, row]));

      return rowDefs.flatMap((rowDef) =>
        colDefs.map((colDef) => {
          const row = rowMap.get(`${rowDef.key}:${colDef.key}`);
          const challenges = Number(row?.challenges ?? 0);
          const overturned = Number(row?.overturned ?? 0);
          return {
            rowKey: rowDef.key,
            rowLabel: rowDef.label,
            colKey: colDef.key,
            colLabel: colDef.label,
            challenges,
            overturned,
            overturnRate: challenges > 0 ? overturned / challenges : 0,
            avgEstimatedLeverage:
              row?.avg_estimated_leverage === null || row?.avg_estimated_leverage === undefined
                ? 0
                : Math.round(Number(row.avg_estimated_leverage) * 10) / 10,
            avgPositiveOutcomeDelta: null,
            avgRunExpectancyDelta: null,
            avgWinExpectancyDelta: null,
            highPressureShare: row?.high_pressure_share === null || row?.high_pressure_share === undefined ? 0 : Number(row.high_pressure_share),
          } satisfies TeamChallengeScenarioCell;
        }),
      );
    },
  );
}

export async function getTeamChallengeScenarioMatrix(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
  options?: { includeValueMetrics?: boolean },
): Promise<TeamChallengeScenarioCell[]> {
  if (options?.includeValueMetrics === false) {
    return getTeamChallengeScenarioMatrixLight(teamId, range, filters);
  }
  const analytics = await getTeamChallengeAnalytics(teamId, range, filters, options);
  return analytics.matrix;
}

export async function getTeamChallengeValueSummary(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
  options?: { includeValueMetrics?: boolean },
): Promise<TeamChallengeValueSummary> {
  const analytics = await getTeamChallengeAnalytics(teamId, range, filters, options);
  return analytics.summary;
}

export async function getGameReport(gamePk: number): Promise<GameReport | null> {
  const rows = await sql<{
    gamepk: number;
    generatedat: string;
    model_name: string | null;
    generation_id: string | null;
    narrativemd: string;
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
    WHERE r.game_pk = $1
    `,
    [gamePk],
  );

  const r = rows[0];
  if (!r) return null;
  return {
    gamePk: r.gamepk,
    generatedAt: r.generatedat,
    modelName: r.model_name,
    generationId: r.generation_id,
    narrativeMd: r.narrativemd,
    chartSpec: r.chart_spec,
  };
}

export async function getUmpireTrend(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<UmpireTrendPoint[]> {
  return withServerTiming(
    "data.getUmpireTrend",
    () =>
      withCachedValue(
        getCacheKey([
          "umpire-trend",
          umpireId,
          range,
          filters?.inningRange ?? "all",
          filters?.leverage ?? "all",
          filters?.side ?? "all",
          filters?.result ?? "all",
        ]),
        15_000,
        async () => {
          const window = rangeWhere(range, "g.game_date");
          const situational = situationalWhere(filters, "c");
          const rows = !hasActiveSituationalFilters(filters)
            ? await sql<{
                gamepk: number;
                gamedate: string;
                gametype: string;
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
                  s.game_pk AS gamePk,
                  g.game_date AS gameDate,
                  g.game_type AS gameType,
                  g.home_team_id AS homeTeamId,
                  g.away_team_id AS awayTeamId,
                  home.abbreviation AS homeTeamAbbr,
                  away.abbreviation AS awayTeamAbbr,
                  s.challenged_calls,
                  s.overturned_calls,
                  s.confirmed_calls
                FROM umpire_abs_game_summary s
                JOIN games g ON g.game_pk = s.game_pk
                LEFT JOIN teams home ON home.team_id = g.home_team_id
                LEFT JOIN teams away ON away.team_id = g.away_team_id
                WHERE s.umpire_id = $1
                  AND ${window.clause}
                ORDER BY g.game_date DESC
                LIMIT 20
                `,
                [umpireId, ...window.params],
              )
            : await sql<{
                gamepk: number;
                gamedate: string;
                gametype: string;
                hometeamid: number;
                awayteamid: number;
                hometeamabbr: string;
                awayteamabbr: string;
                challenged_calls: number;
                overturned_calls: number;
                confirmed_calls: number;
              }>(
                `
                WITH home_plate_games AS (
                  SELECT DISTINCT game_pk
                  FROM officials
                  WHERE official_id = $1
                    AND official_type = 'Home Plate'
                ),
                filtered AS (
                  SELECT c.*
                  FROM mart_abs_pitch_challenges c
                  JOIN home_plate_games hp ON hp.game_pk = c.game_pk
                  JOIN games g ON g.game_pk = c.game_pk
                  WHERE ${window.clause}
                    AND ${situational.clause}
                )
                SELECT
                  c.game_pk AS gamePk,
                  g.game_date AS gameDate,
                  g.game_type AS gameType,
                  g.home_team_id AS homeTeamId,
                  g.away_team_id AS awayTeamId,
                  home.abbreviation AS homeTeamAbbr,
                  away.abbreviation AS awayTeamAbbr,
                  COUNT(*) AS challenged_calls,
                  COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturned_calls,
                  COUNT(*) FILTER (WHERE c.is_overturned = FALSE) AS confirmed_calls
                FROM filtered c
                JOIN games g ON g.game_pk = c.game_pk
                LEFT JOIN teams home ON home.team_id = g.home_team_id
                LEFT JOIN teams away ON away.team_id = g.away_team_id
                GROUP BY
                  c.game_pk,
                  g.game_date,
                  g.game_type,
                  g.home_team_id,
                  g.away_team_id,
                  home.abbreviation,
                  away.abbreviation
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
      gameType: r.gametype,
      homeTeamId: Number(r.hometeamid),
      awayTeamId: Number(r.awayteamid),
      homeTeamAbbr: r.hometeamabbr ?? "???",
      awayTeamAbbr: r.awayteamabbr ?? "???",
      accuracy,
      challengedCount: total,
      overturnedCount: overturned,
            };
          });
        },
      ),
    { warnAtMs: 500, metadata: { umpireId, range } },
  );
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
    FROM mart_abs_pitch_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    WHERE c.challenge_team_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY 1
    ORDER BY 
      MIN(CASE 
        WHEN c.inning <= 3 THEN 1 
        WHEN c.inning BETWEEN 4 AND 6 THEN 2 
        WHEN c.inning BETWEEN 7 AND 9 THEN 3 
        ELSE 4 
      END) ASC
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
  filters?: SituationalFilters,
  options?: { includeContextBaselines?: boolean },
): Promise<ChallengeEvent[]> {
  const includeContextBaselines = options?.includeContextBaselines ?? true;
  return withServerTiming(
    "data.getUmpireChallenges",
    () =>
      withCachedValue(
        getCacheKey([
          "umpire-challenges",
          umpireId,
          range,
          includeContextBaselines ? "context" : "light",
          filters?.inningRange ?? "all",
          filters?.leverage ?? "all",
          filters?.side ?? "all",
          filters?.result ?? "all",
        ]),
        10_000,
        async () => {
          const window = rangeWhere(range, "g.game_date");
          const situational = situationalWhere(filters, "c");
          const [rows, baselines, pitchTypeBaselines] = await Promise.all([
            sql<{
    challengeid: string;
    gamepk: number;
    atbatindex: number | null;
    pitchnumber: number | null;
    location_source: string | null;
    inference_method: string | null;
    inference_confidence: string | null;
    inning: number | null;
    halfinning: string | null;
    bases_state: string | null;
    home_score: number | null;
    away_score: number | null;
    challenge_team_id: number | null;
    challenge_player_name: string | null;
    batter_name: string | null;
    pitcher_name: string | null;
    isoverturned: boolean;
    calleddescription: string | null;
    original_call: CalledPitch | null;
    corrected_call: CalledPitch | null;
    challenge_direction: "strike_to_ball" | "ball_to_strike" | null;
    px: number | null;
    pz: number | null;
    strikezonetop: number | null;
    strikezonebottom: number | null;
    challengedat: string | null;
    balls: number | null;
    strikes: number | null;
    outs: number | null;
    pitchtype: string | null;
    startspeed: number | null;
    spinrate: number | null;
    challengeteamname: string | null;
    balls_before: number | null;
    strikes_before: number | null;
    balls_after: number | null;
    strikes_after: number | null;
    impact_type: string | null;
    impact_summary: string | null;
    batter_stand: "R" | "L" | null;
    pitcher_throws: "R" | "L" | null;
    pre_run_expectancy: number | string | null;
    post_run_expectancy: number | string | null;
    run_expectancy_delta: number | string | null;
    run_expectancy_confidence: "high" | "medium" | "low" | null;
    pre_win_expectancy: number | string | null;
    post_win_expectancy: number | string | null;
    win_expectancy_delta: number | string | null;
    win_expectancy_confidence: "high" | "medium" | "low" | null;
    estimated_overturn_probability: number | string | null;
    overturn_probability_confidence: "high" | "medium" | "low" | null;
    expected_challenge_value: number | string | null;
    decision_value_mode: "win_expectancy" | "heuristic" | null;
    estimated_challenges_remaining: number | string | null;
  }>(
    `
    SELECT DISTINCT ON (c.challenge_id)
      c.challenge_id AS challengeId,
      c.game_pk AS gamePk,
      c.at_bat_index AS atBatIndex,
      COALESCE(c.pitch_number, c.inferred_pitch_number) AS pitchNumber,
      c.resolved_location_source AS location_source,
      c.inference_method,
      c.inference_confidence,
      c.inning,
      c.half_inning AS halfInning,
      c.bases_state,
      c.home_score,
      c.away_score,
      c.challenge_team_id,
      c.challenge_player_name,
      c.batter_name,
      c.pitcher_name,
      c.is_overturned AS isOverturned,
      c.called_description AS calledDescription,
      c.original_call,
      c.corrected_call,
      c.challenge_direction,
      c.resolved_px AS px,
      c.resolved_pz AS pz,
      resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strikeZoneTop,
      resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strikeZoneBottom,
      c.challenged_at AS challengedAt,
      c.balls,
      c.strikes,
      c.outs,
      ${includeContextBaselines ? "COALESCE(hist.pitch_name, hist.pitch_type)" : "NULL::TEXT"} AS pitchType,
      ${includeContextBaselines ? "hist.start_speed" : "NULL::NUMERIC"} AS startSpeed,
      ${includeContextBaselines ? "hist.spin_rate" : "NULL::NUMERIC"} AS spinRate,
      t.name AS challengeTeamName,
      c.balls AS balls_before,
      c.strikes AS strikes_before,
      CASE
        WHEN c.corrected_call = 'ball' AND c.balls IS NOT NULL THEN LEAST(c.balls + 1, 4)
        WHEN c.corrected_call = 'called_strike' THEN c.balls
        ELSE NULL
      END AS balls_after,
      CASE
        WHEN c.corrected_call = 'called_strike' AND c.strikes IS NOT NULL THEN LEAST(c.strikes + 1, 3)
        WHEN c.corrected_call = 'ball' THEN c.strikes
        ELSE NULL
      END AS strikes_after,
      timeline.impact_type,
      timeline.impact_summary,
      cv.pre_run_expectancy,
      cv.post_run_expectancy,
      cv.run_expectancy_delta,
      cv.run_expectancy_confidence,
      cv.pre_win_expectancy,
      cv.post_win_expectancy,
      cv.win_expectancy_delta,
      cv.win_expectancy_confidence,
      cv.estimated_overturn_probability,
      cv.overturn_probability_confidence,
      cv.expected_challenge_value,
      cv.decision_value_mode,
      cv.estimated_challenges_remaining,
      ${
        includeContextBaselines
          ? `COALESCE(
        hist.stand,
        NULLIF(batter_player.source_payload->'batSide'->>'code', '')
      )::text`
          : "NULLIF(batter_player.source_payload->'batSide'->>'code', '')::text"
      } AS batter_stand,
      ${
        includeContextBaselines
          ? `COALESCE(
        hist.p_throws,
        NULLIF(pitcher_player.source_payload->'pitchHand'->>'code', '')
      )::text`
          : "NULLIF(pitcher_player.source_payload->'pitchHand'->>'code', '')::text"
      } AS pitcher_throws
    FROM mart_abs_pitch_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN players batter_player ON batter_player.player_id = c.batter_id
    LEFT JOIN players pitcher_player ON pitcher_player.player_id = c.pitcher_id
    ${
      includeContextBaselines
        ? `LEFT JOIN LATERAL (
      SELECT hist.stand, hist.p_throws, hist.pitch_type, hist.pitch_name, hist.start_speed, hist.spin_rate
      FROM mart_historical_abs_overturn_inputs hist
      WHERE hist.game_pk = c.game_pk
        AND hist.at_bat_number = c.at_bat_index + 1
        AND (
          COALESCE(c.pitch_number, c.inferred_pitch_number) IS NULL
          OR hist.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
          OR ABS(COALESCE(hist.pitch_number, COALESCE(c.pitch_number, c.inferred_pitch_number)) - COALESCE(c.pitch_number, c.inferred_pitch_number)) <= 1
        )
      ORDER BY
        CASE WHEN hist.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number) THEN 0 ELSE 1 END,
        CASE WHEN hist.batter_id = c.batter_id THEN 0 ELSE 1 END,
        CASE WHEN hist.pitcher_id = c.pitcher_id THEN 0 ELSE 1 END,
        ABS(COALESCE(hist.pitch_number, COALESCE(c.pitch_number, c.inferred_pitch_number)) - COALESCE(c.pitch_number, c.inferred_pitch_number)),
        hist.imported_at DESC
      LIMIT 1
    ) hist ON TRUE`
        : ""
    }
    JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
    LEFT JOIN teams t ON t.team_id = c.challenge_team_id
    ${
      includeContextBaselines
        ? `LEFT JOIN mart_game_pitch_timeline timeline ON timeline.challenge_id = c.challenge_id
    LEFT JOIN LATERAL (
      SELECT
        pre_run_expectancy,
        post_run_expectancy,
        run_expectancy_delta,
        run_expectancy_confidence,
        pre_win_expectancy,
        post_win_expectancy,
        win_expectancy_delta,
        win_expectancy_confidence,
        estimated_overturn_probability,
        overturn_probability_confidence,
        expected_challenge_value,
        decision_value_mode,
        estimated_challenges_remaining
      FROM mart_game_abs_challenge_values cv
      WHERE cv.challenge_id = c.challenge_id
      LIMIT 1
    ) cv ON TRUE`
        : ""
    }
    WHERE o.official_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    ORDER BY c.challenge_id, c.challenged_at ASC NULLS LAST
    `,
    [umpireId, ...window.params, ...situational.params],
            ),
            includeContextBaselines ? getCountStateBaselines() : Promise.resolve([]),
            includeContextBaselines ? getPitchTypeCountBaselines() : Promise.resolve([]),
          ]);
          const baselineMap = buildCountStateBaselineMap(baselines);
          const pitchTypeBaselineMap = buildPitchTypeBaselineMap(pitchTypeBaselines);
          const historicalContextRows = includeContextBaselines
            ? await getHistoricalChallengeContextRows(
                Array.from(
                  new Set(
                    rows.flatMap((row) => [
                      resolveUmpireCountState(row.balls_before, row.strikes_before, row.balls_after, row.strikes_after, row.isoverturned),
                      row.balls_after === null || row.strikes_after === null ? null : `${row.balls_after}-${row.strikes_after}`,
                    ]).filter((value): value is string => Boolean(value)),
                  ),
                ),
                Array.from(new Set(rows.map((row) => row.pitchtype).filter((value): value is string => Boolean(value)))),
              )
            : [];
          const historicalHandednessMap = buildHistoricalHandednessBaselineMap(historicalContextRows);
          const historicalPitchLaneMap = buildHistoricalPitchLaneBaselineMap(historicalContextRows);

          return Promise.all(
            rows.map(async (r) => {
              const umpireCount = resolveUmpireCountState(
                r.balls_before,
                r.strikes_before,
                r.balls_after,
                r.strikes_after,
                r.isoverturned,
              );
              const challenge: ChallengeEvent = {
                challengeId: r.challengeid,
                gamePk: Number(r.gamepk),
                pitchNumber: r.pitchnumber === null ? null : Number(r.pitchnumber),
                challengedAt: r.challengedat,
                inning: r.inning === null ? null : Number(r.inning),
                halfInning: r.halfinning,
                balls: r.balls,
                strikes: r.strikes,
                outs: r.outs,
                basesState: r.bases_state,
                homeScore: r.home_score,
                awayScore: r.away_score,
                challengeTeamId: r.challenge_team_id,
                challengeTeamName: r.challengeteamname,
                challengePlayerName: r.challenge_player_name,
                batterName: r.batter_name,
                pitcherName: r.pitcher_name,
                batterStand: r.batter_stand,
                pitcherThrows: r.pitcher_throws,
                calledDescription: r.calleddescription,
                originalCall: r.original_call,
                correctedCall: r.corrected_call,
                challengeDirection: r.challenge_direction,
                pitchType: r.pitchtype,
                startSpeed: r.startspeed === null ? null : Number(r.startspeed),
                spinRate: r.spinrate === null ? null : Number(r.spinrate),
                isOverturned: Boolean(r.isoverturned),
                px: r.px === null ? null : Number(r.px),
                pz: r.pz === null ? null : Number(r.pz),
                strikeZoneTop: r.strikezonetop === null ? null : Number(r.strikezonetop),
                strikeZoneBottom: r.strikezonebottom === null ? null : Number(r.strikezonebottom),
                countBefore:
                  r.balls_before === null || r.strikes_before === null ? null : `${r.balls_before}-${r.strikes_before}`,
                countAfter:
                  r.balls_after === null || r.strikes_after === null ? null : `${r.balls_after}-${r.strikes_after}`,
                umpireCount,
                impactType: r.impact_type,
                impactSummary: r.impact_summary,
                locationSource: r.location_source,
                inferenceMethod: r.inference_method,
                inferenceConfidence: r.inference_confidence,
              };

              const snapshot = buildChallengeValueSnapshot(challenge, baselineMap);
              const expectedChallengeValue =
                r.expected_challenge_value === null ? null : Number(r.expected_challenge_value);
              const estimatedChallengesRemaining =
                r.estimated_challenges_remaining === null ? null : Number(r.estimated_challenges_remaining);

              return {
                ...challenge,
                estimatedLeverageIndex: snapshot.leverage.estimatedLeverageIndex,
                estimatedChallengeSwing: snapshot.leverage.estimatedChallengeSwing,
                leverageBucket: snapshot.leverage.leverageBucket,
                positiveOutcomeDelta: roundMetric(snapshot.countStateDelta.positiveOutcomeDelta),
                battingAverageDelta: roundMetric(snapshot.countStateDelta.battingAverageDelta),
                walkRateDelta: roundMetric(snapshot.countStateDelta.walkRateDelta),
                strikeoutRateDelta: roundMetric(snapshot.countStateDelta.strikeoutRateDelta),
                preRunExpectancy: r.pre_run_expectancy === null ? null : Number(r.pre_run_expectancy),
                postRunExpectancy: r.post_run_expectancy === null ? null : Number(r.post_run_expectancy),
                runExpectancyDelta: r.run_expectancy_delta === null ? null : Number(r.run_expectancy_delta),
                runExpectancyConfidence: r.run_expectancy_confidence,
                preWinExpectancy: r.pre_win_expectancy === null ? null : Number(r.pre_win_expectancy),
                postWinExpectancy: r.post_win_expectancy === null ? null : Number(r.post_win_expectancy),
                winExpectancyDelta: r.win_expectancy_delta === null ? null : Number(r.win_expectancy_delta),
                winExpectancyConfidence: r.win_expectancy_confidence,
                estimatedOverturnProbability:
                  r.estimated_overturn_probability === null ? null : Number(r.estimated_overturn_probability),
                overturnProbabilityConfidence: r.overturn_probability_confidence,
                overturnProbabilityFallbackTier: null,
                expectedChallengeValue,
                decisionRecommendation: resolveDecisionRecommendation(expectedChallengeValue, estimatedChallengesRemaining),
                decisionValueMode: r.decision_value_mode,
                heldCountBaseline: buildCountBaselineDetail(challenge.umpireCount ?? challenge.countBefore, baselineMap),
                correctedCountBaseline: buildCountBaselineDetail(challenge.countAfter, baselineMap),
                pitchTypeCountBaseline:
                  challenge.pitchType && (challenge.umpireCount ?? challenge.countBefore)
                    ? pitchTypeBaselineMap.get(`${challenge.pitchType}::${challenge.umpireCount ?? challenge.countBefore}`) ?? null
                    : null,
                handednessBaseline:
                  challenge.batterStand && challenge.pitcherThrows && (challenge.umpireCount ?? challenge.countBefore)
                    ? historicalHandednessMap.get(
                        `${challenge.umpireCount ?? challenge.countBefore}::${challenge.pitcherThrows}::${challenge.batterStand}`,
                      ) ?? null
                    : null,
                pitchLaneBaseline: (() => {
                  const lane = classifyNormalizedZoneLane({
                    px: challenge.px,
                    pz: challenge.pz,
                    strikeZoneTop: challenge.strikeZoneTop,
                    strikeZoneBottom: challenge.strikeZoneBottom,
                  });
                  if (!lane || !challenge.pitchType || !(challenge.umpireCount ?? challenge.countBefore)) return null;
                  return historicalPitchLaneMap.get(
                    `${challenge.pitchType}::${challenge.umpireCount ?? challenge.countBefore}::${lane}`,
                  ) ?? null;
                })(),
              };
            }),
          );
        },
      ),
    { warnAtMs: 700, metadata: { umpireId, range } },
  );
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
  const rows = await sql<{
    gamepk: number;
    inning: number;
    is_overturned: boolean;
    called_description: string | null;
    game_date: string;
    home_abbr: string;
    away_abbr: string;
  }>(
    `
    SELECT
      c.game_pk AS gamePk,
      c.inning,
      c.is_overturned,
      p.called_description,
      g.game_date,
      h.abbreviation AS home_abbr,
      a.abbreviation AS away_abbr
    FROM mart_abs_pitch_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
    JOIN teams h ON h.team_id = g.home_team_id
    JOIN teams a ON a.team_id = g.away_team_id
    WHERE c.challenge_team_id = $1
      AND ${situational.clause}
    ORDER BY g.game_date DESC, c.inning DESC
    LIMIT $2
    `,
    [teamId, limit, ...situational.params],
  );

  return rows.map((r) => {
    const isOverturned = Boolean(r.is_overturned);
    const result = isOverturned ? 'overturned' : 'confirmed';
    const matchup = `${r.away_abbr} @ ${r.home_abbr}`;

    // Construct a narrative title
    let title = isOverturned ? 'Crucial Overturn' : 'Stands as Called';
    if (Number(r.inning) >= 8) title = isOverturned ? 'High-Leverage Late Overturn' : 'Late Review Stands';

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

export async function getTeamSchedule(teamId: number, season = 2026): Promise<TeamScheduleGame[]> {
  return withServerTiming(
    "data.getTeamSchedule",
    () =>
      withCachedValue(getCacheKey(["team-schedule", teamId, season]), 60_000, async () => {
        const rows = await sql<{
    gamepk: number;
    gamedate: string;
    gametype: string;
    status: string;
    hometeamid: number;
    awayteamid: number;
    homeabbr: string;
    awayabbr: string;
    homelogourl: string;
    awaylogourl: string;
  }>(
    `
    SELECT 
      g.game_pk AS gamePk,
      g.game_date AS gameDate,
      g.game_type AS gameType,
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
    gameType: r.gametype,
    status: r.status,
    homeTeamId: Number(r.hometeamid),
    awayTeamId: Number(r.awayteamid),
    homeAbbr: r.homeabbr,
    awayAbbr: r.awayabbr,
    homeLogoUrl: r.homelogourl,
          awayLogoUrl: r.awaylogourl
        }));
      }),
    { warnAtMs: 400, metadata: { teamId, season } },
  );
}

export async function getUmpireSchedule(umpireId: number, season = 2026): Promise<TeamScheduleGame[]> {
  return withServerTiming(
    "data.getUmpireSchedule",
    () =>
      withCachedValue(getCacheKey(["umpire-schedule", umpireId, season]), 60_000, async () => {
        const rows = await sql<{
    gamepk: number;
    gamedate: string;
    gametype: string;
    status: string;
    hometeamid: number;
    awayteamid: number;
    homeabbr: string;
    awayabbr: string;
    homelogourl: string;
    awaylogourl: string;
  }>(
    `
    SELECT DISTINCT
      g.game_pk AS gamePk,
      g.game_date AS gameDate,
      g.game_type AS gameType,
      g.status_abstract AS status,
      g.home_team_id AS homeTeamId,
      g.away_team_id AS awayTeamId,
      home.abbreviation AS homeAbbr,
      away.abbreviation AS awayAbbr,
      home.logo_svg_url AS homeLogoUrl,
      away.logo_svg_url AS awayLogoUrl
    FROM officials o
    JOIN games g ON g.game_pk = o.game_pk
    JOIN teams home ON home.team_id = g.home_team_id
    JOIN teams away ON away.team_id = g.away_team_id
    WHERE o.official_id = $1
      AND o.official_type = 'Home Plate'
      AND EXTRACT(YEAR FROM g.game_date) = $2
    ORDER BY g.game_date ASC
    `,
    [umpireId, season],
        );

        return rows.map((row) => ({
    gamePk: Number(row.gamepk),
    gameDate: row.gamedate,
    gameType: row.gametype,
    status: row.status,
    homeTeamId: Number(row.hometeamid),
    awayTeamId: Number(row.awayteamid),
    homeAbbr: row.homeabbr,
    awayAbbr: row.awayabbr,
    homeLogoUrl: row.homelogourl,
          awayLogoUrl: row.awaylogourl,
        }));
      }),
    { warnAtMs: 400, metadata: { umpireId, season } },
  );
}

export async function getUmpirePerformanceDNA(umpireId: number, range: RangeKey = "season"): Promise<UmpirePerformanceDNA> {
  const window = rangeWhere(range, "g.game_date");
  const rhythm = await sql<{
    inning: number;
    total: number;
    overturned: number;
    accuracy: number;
  }>(
    `
        SELECT 
            c.inning,
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturned,
            CASE WHEN COUNT(*) > 0 
                THEN COUNT(*) FILTER (WHERE c.is_overturned = FALSE)::NUMERIC / COUNT(*)
                ELSE 1.0
            END AS accuracy
        FROM (
          SELECT DISTINCT game_pk
          FROM officials
          WHERE official_id = $1
            AND official_type = 'Home Plate'
        ) hp
        JOIN mart_abs_pitch_challenges c ON c.game_pk = hp.game_pk
        JOIN games g ON g.game_pk = c.game_pk
        WHERE ${window.clause}
          AND c.inning IS NOT NULL
        GROUP BY c.inning
        ORDER BY c.inning ASC
        `,
    [umpireId, ...window.params]
  );

  const extremes = await sql<{
    challengeid: string;
    gamepk: number;
    inning: number;
    px: number;
    pz: number;
    strike_zone_top: number;
    strike_zone_bottom: number;
    is_overturned: boolean;
    called_description: string | null;
  }>(
    `
        SELECT 
            c.challenge_id AS challengeId,
            c.game_pk AS gamePk,
            c.inning,
            c.resolved_px AS px,
            c.resolved_pz AS pz,
            resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strike_zone_top,
            resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strike_zone_bottom,
            c.is_overturned,
            p.called_description
        FROM (
          SELECT DISTINCT game_pk
          FROM officials
          WHERE official_id = $1
            AND official_type = 'Home Plate'
        ) hp
        JOIN mart_abs_pitch_challenges c ON c.game_pk = hp.game_pk
        JOIN games g ON g.game_pk = c.game_pk
        LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
        WHERE ${window.clause}
          AND c.resolved_px IS NOT NULL
          AND c.resolved_pz IS NOT NULL
          AND resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) IS NOT NULL
          AND resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NOT NULL
        `,
    [umpireId, ...window.params]
  );

  const rankedExtremes = extremes
    .map((r) => {
      const px = Number(r.px);
      const pz = Number(r.pz);
      const szTop = Number(r.strike_zone_top);
      const szBottom = Number(r.strike_zone_bottom);
      return {
        challengeId: r.challengeid,
        gamePk: Number(r.gamepk),
        inning: Number(r.inning),
        px,
        pz,
        szTop,
        szBottom,
        isOverturned: Boolean(r.is_overturned),
        calledDescription: r.called_description,
        missDistance: computeObservedZoneMissDistance({
          px,
          pz,
          strikeZoneTop: szTop,
          strikeZoneBottom: szBottom,
        }) ?? 0,
      };
    })
    .sort((left, right) => right.missDistance - left.missDistance)
    .slice(0, 10);

  return {
    rhythm: rhythm.map((r) => ({
      inning: Number(r.inning),
      total: Number(r.total),
      overturned: Number(r.overturned),
      accuracy: Number(r.accuracy)
    })),
    extremes: rankedExtremes
  };
}

/**
 * D-8: Umpire pitch type breakdown.
 * Groups challenges by pitch type and computes overturn rate per type.
 */
export async function getUmpirePitchTypeBreakdown(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
): Promise<UmpirePitchTypeBreakdown[]> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    pitch_type_code: string;
    pitch_type_name: string;
    challenged_count: number;
    overturned_count: number;
    overturn_rate: number;
  }>(
    `
    SELECT
      COALESCE(p.pitch_type_code, 'UN') AS pitch_type_code,
      COALESCE(p.pitch_type_description, 'Unknown') AS pitch_type_name,
      COUNT(*) AS challenged_count,
      COUNT(*) FILTER (WHERE c.is_overturned = TRUE) AS overturned_count,
      CASE WHEN COUNT(*) > 0
        THEN COUNT(*) FILTER (WHERE c.is_overturned = TRUE)::NUMERIC / COUNT(*)
        ELSE 0
      END AS overturn_rate
    FROM mart_abs_pitch_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    JOIN officials o ON o.game_pk = c.game_pk AND o.official_type = 'Home Plate'
    LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
    WHERE o.official_id = $1
      AND ${window.clause}
      AND ${situational.clause}
    GROUP BY p.pitch_type_code, p.pitch_type_description
    ORDER BY challenged_count DESC
    `,
    [umpireId, ...window.params, ...situational.params],
  );

  return rows.map((r) => ({
    pitchTypeCode: r.pitch_type_code,
    pitchTypeName: r.pitch_type_name,
    challengedCount: Number(r.challenged_count),
    overturnedCount: Number(r.overturned_count),
    overturnRate: Number(r.overturn_rate),
  }));
}

export async function getUmpireMatchupVulnerabilities(
  umpireId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters,
): Promise<UmpireMatchupVulnerability[]> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    pitcher_throws: "R" | "L";
    batter_stand: "R" | "L";
    pitch_type_code: string;
    pitch_type_name: string;
    px: number | null;
    pz: number | null;
    strike_zone_top: number | null;
    strike_zone_bottom: number | null;
    challenged_count: number;
    overturned_count: number;
  }>(
    `
    WITH home_plate_games AS (
      SELECT DISTINCT game_pk
      FROM officials
      WHERE official_id = $1
        AND official_type = 'Home Plate'
    ),
    filtered AS (
      SELECT
        NULLIF(pitcher_player.source_payload->'pitchHand'->>'code', '')::text AS pitcher_throws,
        NULLIF(batter_player.source_payload->'batSide'->>'code', '')::text AS batter_stand,
        COALESCE(p.pitch_type_code, 'UN') AS pitch_type_code,
        COALESCE(p.pitch_type_description, 'Unknown') AS pitch_type_name,
        c.resolved_px AS px,
        c.resolved_pz AS pz,
        resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strike_zone_top,
        resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strike_zone_bottom,
        c.is_overturned
      FROM mart_abs_pitch_challenges c
      JOIN home_plate_games hp ON hp.game_pk = c.game_pk
      JOIN games g ON g.game_pk = c.game_pk
      LEFT JOIN pitches p ON p.game_pk = c.game_pk AND p.at_bat_index = c.at_bat_index AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
      LEFT JOIN players batter_player ON batter_player.player_id = c.batter_id
      LEFT JOIN players pitcher_player ON pitcher_player.player_id = c.pitcher_id
      WHERE ${window.clause}
        AND ${situational.clause}
    )
    SELECT
      pitcher_throws,
      batter_stand,
      pitch_type_code,
      pitch_type_name,
      px,
      pz,
      strike_zone_top,
      strike_zone_bottom,
      COUNT(*) AS challenged_count,
      COUNT(*) FILTER (WHERE is_overturned = TRUE) AS overturned_count
    FROM filtered
    WHERE batter_stand IN ('L', 'R')
      AND pitcher_throws IN ('L', 'R')
    GROUP BY 1, 2, 3, 4, 5, 6, 7, 8
    ORDER BY challenged_count DESC, overturned_count DESC
    `,
    [umpireId, ...window.params, ...situational.params],
  );

  const matchupOrder: Array<Pick<UmpireMatchupVulnerability, "pitcherThrows" | "batterStand">> = [
    { pitcherThrows: "R", batterStand: "R" },
    { pitcherThrows: "R", batterStand: "L" },
    { pitcherThrows: "L", batterStand: "L" },
    { pitcherThrows: "L", batterStand: "R" },
  ];

  return matchupOrder.map(({ pitcherThrows, batterStand }) => {
    const matchupRows = rows.filter((row) => row.pitcher_throws === pitcherThrows && row.batter_stand === batterStand);
    const challengedCount = matchupRows.reduce((sum, row) => sum + Number(row.challenged_count), 0);
    const overturnedCount = matchupRows.reduce((sum, row) => sum + Number(row.overturned_count), 0);
    const pitchRows = new Map<string, { pitchTypeCode: string; pitchTypeName: string; challengedCount: number; overturnedCount: number }>();
    const zoneRows = new Map<ObservedZoneAxisBucket, { challengedCount: number; overturnedCount: number }>();

    for (const row of matchupRows) {
      const pitchKey = `${row.pitch_type_code}:${row.pitch_type_name}`;
      const existingPitch = pitchRows.get(pitchKey) ?? {
        pitchTypeCode: row.pitch_type_code,
        pitchTypeName: row.pitch_type_name,
        challengedCount: 0,
        overturnedCount: 0,
      };
      existingPitch.challengedCount += Number(row.challenged_count);
      existingPitch.overturnedCount += Number(row.overturned_count);
      pitchRows.set(pitchKey, existingPitch);

      const zoneBucket = classifyObservedZoneAxisBucket({
        px: row.px === null ? null : Number(row.px),
        pz: row.pz === null ? null : Number(row.pz),
        strikeZoneTop: row.strike_zone_top === null ? null : Number(row.strike_zone_top),
        strikeZoneBottom: row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom),
      });
      if (zoneBucket) {
        const existingZone = zoneRows.get(zoneBucket) ?? { challengedCount: 0, overturnedCount: 0 };
        existingZone.challengedCount += Number(row.challenged_count);
        existingZone.overturnedCount += Number(row.overturned_count);
        zoneRows.set(zoneBucket, existingZone);
      }
    }

    const topPitch = [...pitchRows.values()]
      .map((pitch) => ({
        ...pitch,
        overturnRate: pitch.challengedCount > 0 ? pitch.overturnedCount / pitch.challengedCount : 0,
      }))
      .sort((left, right) => {
        if (right.overturnRate !== left.overturnRate) return right.overturnRate - left.overturnRate;
        return right.challengedCount - left.challengedCount;
      })[0] ?? null;

    const topZone = [...zoneRows.entries()]
      .map(([zone, totals]) => ({
        zone,
        overturnRate: totals.challengedCount > 0 ? totals.overturnedCount / totals.challengedCount : 0,
        challengedCount: totals.challengedCount,
      }))
      .sort((left, right) => {
        if (right.overturnRate !== left.overturnRate) return right.overturnRate - left.overturnRate;
        return right.challengedCount - left.challengedCount;
      })[0] ?? null;

    return {
      pitcherThrows,
      batterStand,
      challengedCount,
      overturnedCount,
      overturnRate: challengedCount > 0 ? overturnedCount / challengedCount : 0,
      topPitchTypeCode: topPitch?.pitchTypeCode ?? null,
      topPitchTypeName: topPitch?.pitchTypeName ?? null,
      topPitchTypeOverturnRate: topPitch?.overturnRate ?? null,
      topZone: topZone?.zone ?? null,
      topZoneOverturnRate: topZone?.overturnRate ?? null,
    };
  });
}

/**
 * D-7: Umpire season-over-season trend.
 * Returns one aggregated point per season the umpire has worked.
 */
export async function getUmpireSeasonTrend(
  umpireId: number,
): Promise<UmpireSeasonTrendPoint[]> {
  const rows = await sql<{
    season: number;
    challenged_calls: number;
    overturned_calls: number;
    overturn_rate: number;
    games_worked: number;
  }>(
    `
    SELECT
      g.season,
      COALESCE(SUM(s.challenged_calls), 0) AS challenged_calls,
      COALESCE(SUM(s.overturned_calls), 0) AS overturned_calls,
      CASE WHEN COALESCE(SUM(s.challenged_calls), 0) > 0
        THEN COALESCE(SUM(s.overturned_calls), 0)::NUMERIC / SUM(s.challenged_calls)
        ELSE 0
      END AS overturn_rate,
      COUNT(*) FILTER (WHERE s.challenged_calls > 0) AS games_worked
    FROM umpire_abs_game_summary s
    JOIN games g ON g.game_pk = s.game_pk
    WHERE s.umpire_id = $1
    GROUP BY g.season
    ORDER BY g.season ASC
    `,
    [umpireId],
  );

  return rows.map((r) => ({
    season: Number(r.season),
    challengedCalls: Number(r.challenged_calls),
    overturnedCalls: Number(r.overturned_calls),
    overturnRate: Number(r.overturn_rate),
    gamesWorked: Number(r.games_worked),
  }));
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
    FROM mart_abs_pitch_challenges c
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

export type HittersEyeZone = NormalizedZoneLane;

export async function getTeamHitterEyeHeatmap(
  teamId: number,
  range: RangeKey = "season",
  filters?: SituationalFilters
): Promise<Array<{ zone: HittersEyeZone; challenges: number; overturnRate: number; }>> {
  const window = rangeWhere(range, "g.game_date");
  const situational = situationalWhere(filters, "c");
  const rows = await sql<{
    px: number | null;
    pz: number | null;
    strike_zone_top: number | null;
    strike_zone_bottom: number | null;
    is_overturned: boolean;
  }>(
    `
    SELECT
      c.resolved_px AS px,
      c.resolved_pz AS pz,
      resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strike_zone_top,
      resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strike_zone_bottom,
      c.is_overturned
    FROM mart_abs_pitch_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    WHERE c.challenge_team_id = $1
      AND c.resolved_px IS NOT NULL
      AND c.resolved_pz IS NOT NULL
      AND resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) IS NOT NULL
      AND resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NOT NULL
      AND ${window.clause}
      AND ${situational.clause}
    `,
    [teamId, ...window.params, ...situational.params],
  );

  const laneTotals = new Map<HittersEyeZone, { challenges: number; overturned: number }>();

  for (const row of rows) {
    const lane = classifyNormalizedZoneLane({
      px: row.px === null ? null : Number(row.px),
      pz: row.pz === null ? null : Number(row.pz),
      strikeZoneTop: row.strike_zone_top === null ? null : Number(row.strike_zone_top),
      strikeZoneBottom: row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom),
    });
    if (!lane) continue;
    const current = laneTotals.get(lane) ?? { challenges: 0, overturned: 0 };
    current.challenges += 1;
    if (row.is_overturned) current.overturned += 1;
    laneTotals.set(lane, current);
  }

  return [...laneTotals.entries()].map(([zone, totals]) => ({
    zone,
    challenges: totals.challenges,
    overturnRate: totals.challenges > 0 ? totals.overturned / totals.challenges : 0,
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
    FROM mart_abs_pitch_challenges c
    JOIN games g ON g.game_pk = c.game_pk
    WHERE c.challenge_team_id = $1
      AND (
        (g.home_team_id = $1 AND c.half_inning = 'top') OR
        (g.away_team_id = $1 AND c.half_inning = 'bottom')
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

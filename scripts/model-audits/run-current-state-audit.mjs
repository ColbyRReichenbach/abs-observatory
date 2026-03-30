import fs from "fs/promises";
import path from "path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  ROOT as repoRoot,
  formatAuditDateLabel,
} from "./audit-runtime.mjs";

const ARTIFACT_DIR = path.join(repoRoot, "docs", "models", "audits", "artifacts");
const MARKDOWN_PATH = path.join(repoRoot, "docs", "models", "audits", `${AUDIT_DATE}-current-state-audit.md`);
const JSON_PATH = path.join(ARTIFACT_DIR, `${AUDIT_DATE}-current-state-audit.json`);

function parseEnvContent(content) {
  const vars = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    vars[key] = value;
  }
  return vars;
}

async function loadLocalEnv() {
  for (const filename of [".env", ".env.local"]) {
    const envPath = path.join(repoRoot, filename);
    try {
      const content = await fs.readFile(envPath, "utf8");
      const parsed = parseEnvContent(content);
      for (const [key, value] of Object.entries(parsed)) {
        process.env[key] = value;
      }
    } catch {
      // ignore missing local env files
    }
  }
}

function clamp(value, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function zScore(value, mean, stdDev) {
  if (!Number.isFinite(stdDev) || stdDev <= 0) return 0;
  return (value - mean) / stdDev;
}

function computeRegressedRate(successes, attempts, priorRate, priorSampleSize = 20) {
  const boundedAttempts = Math.max(0, attempts);
  const boundedSuccesses = clamp(successes, 0, boundedAttempts);
  return (boundedSuccesses + priorSampleSize * priorRate) / (boundedAttempts + priorSampleSize);
}

function confidenceFromSampleSize(sampleSize) {
  if (sampleSize >= 25) return "high";
  if (sampleSize >= 10) return "medium";
  return "low";
}

function scoreFromRelativeDelta(value, baseline, positiveIsBetter = true, multiplier = 40) {
  if (!Number.isFinite(value) || !Number.isFinite(baseline) || baseline === 0) return 50;
  const delta = (value - baseline) / Math.abs(baseline);
  const signed = positiveIsBetter ? delta : -delta;
  return clamp(50 + signed * multiplier);
}

function mapUmpireGrade(score) {
  if (score >= 84) return "A";
  if (score >= 68) return "B";
  if (score >= 50) return "C";
  if (score >= 35) return "D";
  return "F";
}

function mapDisplayGradeFromPercentile(percentile) {
  if (percentile >= 0.9) return "A";
  if (percentile >= 0.7) return "B";
  if (percentile >= 0.3) return "C";
  if (percentile >= 0.1) return "D";
  return "F";
}

function softenExtremeGradeForConfidence(grade, confidence) {
  if (confidence === "high") return grade;
  if (grade === "A") return "B";
  if (grade === "F") return "D";
  return grade;
}

function computeUmpireReportCard(input) {
  const regressedOverturnRate = computeRegressedRate(
    input.overturnedCalls,
    input.challengedCalls,
    input.leagueOverturnRate,
    20,
  );
  const recentRate = input.recentOverturnRate ?? regressedOverturnRate;
  const rateScore = clamp(50 - 14 * zScore(regressedOverturnRate, input.leagueOverturnRate, input.leagueOverturnRateStdDev));
  const accuracyScore = clamp(100 - regressedOverturnRate * 100);
  const consistencyScore = clamp(50 - 10 * zScore(input.umpireVariance, input.leagueVarianceMean, input.leagueVarianceStdDev));
  const recentFormScore = clamp(50 - 8 * zScore(recentRate - regressedOverturnRate, 0, input.leagueOverturnRateStdDev));
  const score = clamp(0.45 * rateScore + 0.3 * accuracyScore + 0.15 * consistencyScore + 0.1 * recentFormScore);
  return {
    score,
    grade: mapUmpireGrade(score),
    confidence: confidenceFromSampleSize(input.challengedCalls),
  };
}

function computeOrgWatchRisk(input) {
  const directionalBiasSeverity = clamp(input.directionalBiasSeverity);
  const zoneConcentrationSeverity = clamp(input.zoneConcentrationSeverity);
  const recentTrendRisk = clamp(input.recentTrendRisk);
  const countHotspotVolatility = clamp(input.countHotspotVolatility);
  const umpireScore = clamp(input.umpireScore);

  const baseRisk =
    0.4 * (100 - umpireScore) +
    0.2 * directionalBiasSeverity +
    0.15 * zoneConcentrationSeverity +
    0.15 * recentTrendRisk +
    0.1 * countHotspotVolatility;

  const hotSignalCount = [
    directionalBiasSeverity,
    zoneConcentrationSeverity,
    recentTrendRisk,
    countHotspotVolatility,
  ].filter((value) => value >= 65).length;

  let stackedSignalBonus = 0;
  if (hotSignalCount >= 2) stackedSignalBonus += 2;
  if (hotSignalCount >= 3) stackedSignalBonus += 1;
  if (umpireScore <= 35 && hotSignalCount >= 3) stackedSignalBonus += 1;

  const riskScore = clamp(baseRisk + stackedSignalBonus);
  let tier = "Low";
  const qualifiesForHighRisk = riskScore >= 80 || (riskScore >= 72 && hotSignalCount >= 3 && umpireScore <= 40);
  if (qualifiesForHighRisk) tier = "High";
  else if (riskScore >= 56 || (riskScore >= 50 && hotSignalCount >= 2)) tier = "Elevated";
  else if (riskScore >= 34) tier = "Moderate";

  const confidence = input.confidence;
  if (confidence === "low") {
    if (tier === "High") tier = "Elevated";
    else if (tier === "Low") tier = "Moderate";
  }

  return { riskScore, tier };
}

function calibrateUmpireDisplayGrades(inputs) {
  const sorted = [...inputs].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.umpireId - right.umpireId;
  });

  const percentileById = new Map();
  let index = 0;
  while (index < sorted.length) {
    let end = index;
    while (end + 1 < sorted.length && sorted[end + 1].score === sorted[index].score) {
      end += 1;
    }
    const averageRank = (index + end) / 2;
    const percentile = sorted.length <= 1 ? 1 : 1 - averageRank / (sorted.length - 1);
    for (let cursor = index; cursor <= end; cursor += 1) {
      percentileById.set(sorted[cursor].umpireId, percentile);
    }
    index = end + 1;
  }

  return new Map(
    inputs.map((input) => {
      const percentile = percentileById.get(input.umpireId) ?? 0.5;
      return [input.umpireId, softenExtremeGradeForConfidence(mapDisplayGradeFromPercentile(percentile), input.confidence)];
    }),
  );
}

function computeTeamChallengeStyle(input) {
  const aggressionScore = scoreFromRelativeDelta(input.challengeRatePerGame, input.leagueChallengeRatePerGame, true);
  const lateLeverageScore = scoreFromRelativeDelta(input.lateLeverageShare, input.leagueLateLeverageShare, true);
  const disciplineScore = scoreFromRelativeDelta(
    input.earlyLowLeverageShare,
    input.leagueEarlyLowLeverageShare,
    false,
  );
  const conservationScore = scoreFromRelativeDelta(
    input.averageChallengesRemaining,
    input.leagueAverageChallengesRemaining,
    true,
  );
  const efficiencyScore = scoreFromRelativeDelta(input.overturnRate, input.leagueOverturnRate, true, 30);

  const scores = {
    Clutch: 0.3 * lateLeverageScore + 0.25 * efficiencyScore + 0.2 * aggressionScore + 0.25 * conservationScore,
    Calculated: 0.3 * disciplineScore + 0.3 * conservationScore + 0.25 * efficiencyScore + 0.15 * lateLeverageScore,
    "Trigger-Happy":
      0.35 * aggressionScore +
      0.3 * (100 - disciplineScore) +
      0.2 * (100 - conservationScore) +
      0.15 * (100 - efficiencyScore),
    Passive:
      0.35 * (100 - aggressionScore) +
      0.3 * conservationScore +
      0.2 * (100 - lateLeverageScore) +
      0.15 * disciplineScore,
    Hybrid: 0,
  };

  const ranked = Object.entries(scores)
    .filter(([style]) => style !== "Hybrid")
    .map(([style, score]) => ({ style, score }))
    .sort((a, b) => b.score - a.score);

  const topScore = ranked[0]?.score ?? 0;
  const runnerUpScore = ranked[1]?.score ?? 0;
  const topGap = topScore - runnerUpScore;
  const centeredAggression = 100 - Math.min(100, Math.abs(aggressionScore - 50) * 2);
  const centeredLeverage = 100 - Math.min(100, Math.abs(lateLeverageScore - 50) * 2);
  const centeredDiscipline = 100 - Math.min(100, Math.abs(disciplineScore - 50) * 2);
  const efficiencyNeutrality = 100 - Math.min(100, Math.abs(efficiencyScore - 50) * 2);

  scores.Hybrid =
    0.35 * clamp(100 - topGap * 10) +
    0.2 * centeredAggression +
    0.2 * centeredLeverage +
    0.15 * centeredDiscipline +
    0.1 * efficiencyNeutrality;

  let winner = ranked[0]?.style ?? "Hybrid";
  if (ranked.length > 1 && topGap <= 4) {
    if (lateLeverageScore >= 60 && aggressionScore >= 50) winner = "Clutch";
    else if (aggressionScore >= 60 && conservationScore <= 45) winner = "Trigger-Happy";
    else if (disciplineScore >= 55 && conservationScore >= 55) winner = "Calculated";
    else winner = "Passive";
  }

  const decisiveLateIdentity = lateLeverageScore >= 60 && aggressionScore >= 50;
  const decisiveAggressiveIdentity = aggressionScore >= 60 && conservationScore <= 45;
  const decisiveDisciplinedIdentity = disciplineScore >= 55 && conservationScore >= 55;

  const shouldUseHybrid =
    input.sampleSize >= 12 &&
    !decisiveLateIdentity &&
    !decisiveAggressiveIdentity &&
    !decisiveDisciplinedIdentity &&
    (topGap <= 3 ||
      (topGap <= 7 && efficiencyScore >= 45 && efficiencyScore <= 58) ||
      (topScore < 64 && scores.Hybrid >= topScore - 2));

  if (shouldUseHybrid) winner = "Hybrid";
  return { style: winner, confidence: confidenceFromSampleSize(input.sampleSize), scores };
}

function countBaseRunners(basesState) {
  return (basesState ?? "").split("").filter((char) => char === "1").length;
}

function leverageApprox(req) {
  const inningFactor = Math.max(0.1, Math.min(req.inning / 9, 1.7));
  const closeGameFactor = Math.max(0.3, Math.min(1.5 - Math.abs(req.scoreDiffBattingTeam) * 0.15, 1.5));
  const countFactor = req.balls === 3 && req.strikes === 2 ? 1.2 : req.strikes === 2 ? 1.1 : 1.0;
  const baseOutFactor = req.runnersOnBase > 0 ? 1 + req.runnersOnBase * 0.12 : 0.95;
  return Number(Math.max(0.2, Math.min(inningFactor * closeGameFactor * countFactor * baseOutFactor, 3.0)).toFixed(3));
}

function calculateHeuristicSuccessDelta(req, li) {
  let successPerLi = 0.009;
  if (req.inning >= 8 && Math.abs(req.scoreDiffBattingTeam) <= 1) successPerLi += 0.0015;
  if (req.runnersOnBase > 0) successPerLi += 0.0005;
  if (req.balls >= 2 || req.strikes >= 2) successPerLi += 0.0005;
  return Number((successPerLi * li).toFixed(4));
}

function formatPercent(value, digits = 1) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return `${(value * 100).toFixed(digits)}%`;
}

function formatNumber(value, digits = 4) {
  if (value == null || Number.isNaN(value)) return "n/a";
  return Number(value).toFixed(digits);
}

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${columns.map((column) => String(column.render(row))).join(" | ")} |`);
  return [header, separator, ...body].join("\n");
}

function summarizeFallbackPairs(rows) {
  const total = rows.reduce((sum, row) => sum + Number(row.challenges), 0);
  return rows.map((row) => ({
    ...row,
    challenges: Number(row.challenges),
    pct: total > 0 ? Number(row.challenges) / total : 0,
  }));
}

async function main() {
  await loadLocalEnv();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();

  try {
    await client.query(`
      CREATE TEMP TABLE audit_challenge_states AS
      SELECT
        c.challenge_id,
        c.game_pk,
        c.is_overturned,
        c.inning,
        CASE WHEN c.half_inning IS NULL THEN NULL ELSE INITCAP(c.half_inning) END AS half_inning,
        c.outs,
        c.bases_state,
        c.home_score,
        c.away_score,
        COALESCE(p.balls_before, c.balls, 0) AS balls_before,
        COALESCE(p.strikes_before, c.strikes, 0) AS strikes_before,
        CASE
          WHEN c.inning >= 9 THEN '9+'
          WHEN c.inning >= 7 THEN '7-8'
          WHEN c.inning >= 4 THEN '4-6'
          ELSE '1-3'
        END AS inning_bucket,
        CASE
          WHEN COALESCE(c.pitch_number, c.inferred_pitch_number) IS NULL THEN NULL
          WHEN p.balls_before IS NULL OR p.strikes_before IS NULL THEN NULL
          WHEN c.is_overturned = FALSE THEN
            CASE WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL ELSE CONCAT(p.balls_after, '-', p.strikes_after) END
          WHEN p.balls_after IS NOT NULL AND p.balls_before IS NOT NULL AND p.balls_after > p.balls_before THEN CONCAT(p.balls_before, '-', p.strikes_before + 1)
          WHEN p.strikes_after IS NOT NULL AND p.strikes_before IS NOT NULL AND p.strikes_after > p.strikes_before THEN CONCAT(p.balls_before + 1, '-', p.strikes_before)
          ELSE CASE WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL ELSE CONCAT(p.balls_after, '-', p.strikes_after) END
        END AS held_count_key,
        CASE
          WHEN p.balls_after IS NULL OR p.strikes_after IS NULL THEN NULL
          ELSE CONCAT(p.balls_after, '-', p.strikes_after)
        END AS corrected_count_key,
        CASE
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'called strike%' THEN 'called_strike'
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'ball%' THEN 'ball'
          ELSE NULL
        END AS called_pitch,
        CASE
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'called strike%' THEN 'strike_to_ball'
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'ball%' THEN 'ball_to_strike'
          ELSE NULL
        END AS challenge_direction,
        CASE
          WHEN LOWER(c.half_inning) = 'top' THEN
            CASE
              WHEN c.away_score IS NULL OR c.home_score IS NULL THEN NULL
              WHEN c.away_score - c.home_score <= -4 THEN 'trail4plus'
              WHEN c.away_score - c.home_score = -3 THEN 'trail3'
              WHEN c.away_score - c.home_score = -2 THEN 'trail2'
              WHEN c.away_score - c.home_score = -1 THEN 'trail1'
              WHEN c.away_score - c.home_score = 0 THEN 'tied'
              WHEN c.away_score - c.home_score = 1 THEN 'lead1'
              WHEN c.away_score - c.home_score = 2 THEN 'lead2'
              WHEN c.away_score - c.home_score = 3 THEN 'lead3'
              ELSE 'lead4plus'
            END
          WHEN LOWER(c.half_inning) = 'bottom' THEN
            CASE
              WHEN c.home_score IS NULL OR c.away_score IS NULL THEN NULL
              WHEN c.home_score - c.away_score <= -4 THEN 'trail4plus'
              WHEN c.home_score - c.away_score = -3 THEN 'trail3'
              WHEN c.home_score - c.away_score = -2 THEN 'trail2'
              WHEN c.home_score - c.away_score = -1 THEN 'trail1'
              WHEN c.home_score - c.away_score = 0 THEN 'tied'
              WHEN c.home_score - c.away_score = 1 THEN 'lead1'
              WHEN c.home_score - c.away_score = 2 THEN 'lead2'
              WHEN c.home_score - c.away_score = 3 THEN 'lead3'
              ELSE 'lead4plus'
            END
          ELSE NULL
        END AS score_diff_bucket,
        CASE
          WHEN COALESCE(c.px, c.inferred_px) IS NULL
            OR COALESCE(c.pz, c.inferred_pz) IS NULL
            OR resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) IS NULL
            OR resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NULL
          THEN NULL
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'called strike%' THEN
            CASE
              WHEN SQRT(
                POWER(GREATEST(ABS(COALESCE(c.px, c.inferred_px)) - 0.8291666667, 0), 2)
                + POWER(
                  GREATEST(
                    resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) - COALESCE(c.pz, c.inferred_pz),
                    COALESCE(c.pz, c.inferred_pz) - resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top),
                    0
                  ),
                  2
                )
              ) <= 0.015 THEN 'edge'
              WHEN SQRT(
                POWER(GREATEST(ABS(COALESCE(c.px, c.inferred_px)) - 0.8291666667, 0), 2)
                + POWER(
                  GREATEST(
                    resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) - COALESCE(c.pz, c.inferred_pz),
                    COALESCE(c.pz, c.inferred_pz) - resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top),
                    0
                  ),
                  2
                )
              ) <= 0.16 THEN 'near_edge'
              ELSE 'clear_miss'
            END
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'ball%' THEN
            CASE
              WHEN GREATEST(
                LEAST(
                  0.8291666667 - ABS(COALESCE(c.px, c.inferred_px)),
                  COALESCE(c.pz, c.inferred_pz) - resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom),
                  resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) - COALESCE(c.pz, c.inferred_pz)
                ),
                0
              ) <= 0.003 THEN 'edge'
              ELSE 'near_edge'
            END
          ELSE NULL
        END AS edge_bucket
      FROM abs_challenges c
      LEFT JOIN pitches p
        ON p.game_pk = c.game_pk
       AND p.at_bat_index = c.at_bat_index
       AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number);
    `);

    await client.query(`
      CREATE INDEX audit_challenge_states_re_idx
        ON audit_challenge_states (inning_bucket, outs, bases_state, held_count_key, corrected_count_key);
      CREATE INDEX audit_challenge_states_we_idx
        ON audit_challenge_states (inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, held_count_key, corrected_count_key);
      CREATE INDEX audit_challenge_states_overturn_idx
        ON audit_challenge_states (challenge_direction, edge_bucket);
    `);

    await client.query(`
      CREATE TEMP TABLE audit_re_fallbacks AS
      SELECT * FROM mart_run_expectancy_fallbacks;
      CREATE INDEX audit_re_fallbacks_idx
        ON audit_re_fallbacks (fallback_tier, inning_bucket, outs, bases_state, count_key);
    `);

    await client.query(`
      CREATE TEMP TABLE audit_we_fallbacks AS
      SELECT * FROM mart_win_expectancy_fallbacks;
      CREATE INDEX audit_we_fallbacks_idx
        ON audit_we_fallbacks (fallback_tier, inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key);
    `);

    await client.query(`
      CREATE TEMP TABLE audit_overturn_fallbacks AS
      SELECT * FROM mart_historical_abs_overturn_probability_fallbacks;
      CREATE INDEX audit_overturn_fallbacks_idx
        ON audit_overturn_fallbacks (fallback_tier, challenge_direction, edge_bucket);
    `);

    const overview = (await client.query(`
      SELECT
        (SELECT COUNT(*) FROM games) AS games,
        (SELECT MIN(game_date)::date FROM games) AS first_game_date,
        (SELECT MAX(game_date)::date FROM games) AS last_game_date,
        (SELECT COUNT(*) FROM abs_challenges) AS challenges,
        (SELECT COUNT(*) FROM pitches) AS pitches,
        (SELECT COUNT(*) FROM historical_pitch_states) AS historical_pitch_states
    `)).rows[0];

    const reMart = (await client.query(`
      SELECT fallback_tier, confidence_band, COUNT(*) AS rows, SUM(sample_size)::BIGINT AS total_sample
      FROM audit_re_fallbacks
      GROUP BY 1, 2
      ORDER BY 1, 2
    `)).rows;

    const weMart = (await client.query(`
      SELECT fallback_tier, confidence_band, COUNT(*) AS rows, SUM(sample_size)::BIGINT AS total_sample
      FROM audit_we_fallbacks
      GROUP BY 1, 2
      ORDER BY 1, 2
    `)).rows;

    const overturnMart = (await client.query(`
      SELECT fallback_tier, confidence_band, COUNT(*) AS rows, SUM(sample_size)::BIGINT AS total_sample
      FROM audit_overturn_fallbacks
      GROUP BY 1, 2
      ORDER BY 1, 2
    `)).rows;

    const reUsageRaw = (await client.query(`
      WITH re_resolved AS (
        SELECT
          cs.challenge_id,
          COALESCE(pre_exact.fallback_tier, pre_drop_inning.fallback_tier, pre_drop_count.fallback_tier) AS pre_tier,
          COALESCE(post_exact.fallback_tier, post_drop_inning.fallback_tier, post_drop_count.fallback_tier) AS post_tier
        FROM audit_challenge_states cs
        LEFT JOIN audit_re_fallbacks pre_exact
          ON pre_exact.fallback_tier = 'exact'
         AND pre_exact.inning_bucket = cs.inning_bucket
         AND pre_exact.outs = cs.outs
         AND pre_exact.bases_state = cs.bases_state
         AND pre_exact.count_key = cs.held_count_key
        LEFT JOIN audit_re_fallbacks post_exact
          ON post_exact.fallback_tier = 'exact'
         AND post_exact.inning_bucket = cs.inning_bucket
         AND post_exact.outs = cs.outs
         AND post_exact.bases_state = cs.bases_state
         AND post_exact.count_key = cs.corrected_count_key
        LEFT JOIN audit_re_fallbacks pre_drop_inning
          ON pre_drop_inning.fallback_tier = 'drop_inning_bucket'
         AND pre_drop_inning.outs = cs.outs
         AND pre_drop_inning.bases_state = cs.bases_state
         AND pre_drop_inning.count_key = cs.held_count_key
        LEFT JOIN audit_re_fallbacks post_drop_inning
          ON post_drop_inning.fallback_tier = 'drop_inning_bucket'
         AND post_drop_inning.outs = cs.outs
         AND post_drop_inning.bases_state = cs.bases_state
         AND post_drop_inning.count_key = cs.corrected_count_key
        LEFT JOIN audit_re_fallbacks pre_drop_count
          ON pre_drop_count.fallback_tier = 'drop_count_key'
         AND pre_drop_count.outs = cs.outs
         AND pre_drop_count.bases_state = cs.bases_state
        LEFT JOIN audit_re_fallbacks post_drop_count
          ON post_drop_count.fallback_tier = 'drop_count_key'
         AND post_drop_count.outs = cs.outs
         AND post_drop_count.bases_state = cs.bases_state
      )
      SELECT COALESCE(pre_tier, 'unresolved') AS pre_tier, COALESCE(post_tier, 'unresolved') AS post_tier, COUNT(*)::INT AS challenges
      FROM re_resolved
      GROUP BY 1, 2
      ORDER BY challenges DESC, 1, 2
    `)).rows;

    const weUsageRaw = (await client.query(`
      WITH we_resolved AS (
        SELECT
          cs.challenge_id,
          COALESCE(pre_exact.fallback_tier, pre_bucket.fallback_tier, pre_drop_count_exact.fallback_tier, pre_drop_count_bucket.fallback_tier) AS pre_tier,
          COALESCE(post_exact.fallback_tier, post_bucket.fallback_tier, post_drop_count_exact.fallback_tier, post_drop_count_bucket.fallback_tier) AS post_tier
        FROM audit_challenge_states cs
        LEFT JOIN audit_we_fallbacks pre_exact
          ON pre_exact.fallback_tier = 'exact'
         AND pre_exact.inning = cs.inning
         AND pre_exact.half_inning = cs.half_inning
         AND pre_exact.score_diff_bucket = cs.score_diff_bucket
         AND pre_exact.outs = cs.outs
         AND pre_exact.bases_state = cs.bases_state
         AND pre_exact.count_key = cs.held_count_key
        LEFT JOIN audit_we_fallbacks post_exact
          ON post_exact.fallback_tier = 'exact'
         AND post_exact.inning = cs.inning
         AND post_exact.half_inning = cs.half_inning
         AND post_exact.score_diff_bucket = cs.score_diff_bucket
         AND post_exact.outs = cs.outs
         AND post_exact.bases_state = cs.bases_state
         AND post_exact.count_key = cs.corrected_count_key
        LEFT JOIN audit_we_fallbacks pre_bucket
          ON pre_bucket.fallback_tier = 'drop_inning_to_bucket'
         AND pre_bucket.inning_bucket = cs.inning_bucket
         AND pre_bucket.half_inning = cs.half_inning
         AND pre_bucket.score_diff_bucket = cs.score_diff_bucket
         AND pre_bucket.outs = cs.outs
         AND pre_bucket.bases_state = cs.bases_state
         AND pre_bucket.count_key = cs.held_count_key
        LEFT JOIN audit_we_fallbacks post_bucket
          ON post_bucket.fallback_tier = 'drop_inning_to_bucket'
         AND post_bucket.inning_bucket = cs.inning_bucket
         AND post_bucket.half_inning = cs.half_inning
         AND post_bucket.score_diff_bucket = cs.score_diff_bucket
         AND post_bucket.outs = cs.outs
         AND post_bucket.bases_state = cs.bases_state
         AND post_bucket.count_key = cs.corrected_count_key
        LEFT JOIN audit_we_fallbacks pre_drop_count_exact
          ON pre_drop_count_exact.fallback_tier = 'drop_count_key_exact_inning'
         AND pre_drop_count_exact.inning = cs.inning
         AND pre_drop_count_exact.half_inning = cs.half_inning
         AND pre_drop_count_exact.score_diff_bucket = cs.score_diff_bucket
         AND pre_drop_count_exact.outs = cs.outs
         AND pre_drop_count_exact.bases_state = cs.bases_state
        LEFT JOIN audit_we_fallbacks post_drop_count_exact
          ON post_drop_count_exact.fallback_tier = 'drop_count_key_exact_inning'
         AND post_drop_count_exact.inning = cs.inning
         AND post_drop_count_exact.half_inning = cs.half_inning
         AND post_drop_count_exact.score_diff_bucket = cs.score_diff_bucket
         AND post_drop_count_exact.outs = cs.outs
         AND post_drop_count_exact.bases_state = cs.bases_state
        LEFT JOIN audit_we_fallbacks pre_drop_count_bucket
          ON pre_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
         AND pre_drop_count_bucket.inning_bucket = cs.inning_bucket
         AND pre_drop_count_bucket.half_inning = cs.half_inning
         AND pre_drop_count_bucket.score_diff_bucket = cs.score_diff_bucket
         AND pre_drop_count_bucket.outs = cs.outs
         AND pre_drop_count_bucket.bases_state = cs.bases_state
        LEFT JOIN audit_we_fallbacks post_drop_count_bucket
          ON post_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
         AND post_drop_count_bucket.inning_bucket = cs.inning_bucket
         AND post_drop_count_bucket.half_inning = cs.half_inning
         AND post_drop_count_bucket.score_diff_bucket = cs.score_diff_bucket
         AND post_drop_count_bucket.outs = cs.outs
         AND post_drop_count_bucket.bases_state = cs.bases_state
      )
      SELECT COALESCE(pre_tier, 'unresolved') AS pre_tier, COALESCE(post_tier, 'unresolved') AS post_tier, COUNT(*)::INT AS challenges
      FROM we_resolved
      GROUP BY 1, 2
      ORDER BY challenges DESC, 1, 2
    `)).rows;

    const overturnUsage = (await client.query(`
      WITH overturn_resolved AS (
        SELECT
          cs.challenge_id,
          COALESCE(exact.fallback_tier, direction_only.fallback_tier, global_row.fallback_tier, 'unresolved') AS fallback_tier,
          COALESCE(exact.confidence_band, direction_only.confidence_band, global_row.confidence_band) AS confidence_band,
          COALESCE(exact.overturn_probability, direction_only.overturn_probability, global_row.overturn_probability) AS overturn_probability,
          cs.is_overturned
        FROM audit_challenge_states cs
        LEFT JOIN audit_overturn_fallbacks exact
          ON exact.fallback_tier = 'exact'
         AND exact.challenge_direction = cs.challenge_direction
         AND exact.edge_bucket = cs.edge_bucket
        LEFT JOIN audit_overturn_fallbacks direction_only
          ON direction_only.fallback_tier = 'direction_only'
         AND direction_only.challenge_direction = cs.challenge_direction
        LEFT JOIN audit_overturn_fallbacks global_row
          ON global_row.fallback_tier = 'global'
      )
      SELECT
        fallback_tier,
        COALESCE(confidence_band, 'n/a') AS confidence_band,
        COUNT(*)::INT AS challenges,
        AVG(overturn_probability)::NUMERIC(8,4) AS avg_predicted_overturn,
        AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::NUMERIC(8,4) AS realized_overturn_rate
      FROM overturn_resolved
      GROUP BY 1, 2
      ORDER BY challenges DESC, fallback_tier
    `)).rows;

    const overturnCalibration = (await client.query(`
      WITH overturn_resolved AS (
        SELECT
          cs.challenge_id,
          cs.is_overturned,
          COALESCE(exact.overturn_probability, direction_only.overturn_probability, global_row.overturn_probability) AS overturn_probability
        FROM audit_challenge_states cs
        LEFT JOIN audit_overturn_fallbacks exact
          ON exact.fallback_tier = 'exact'
         AND exact.challenge_direction = cs.challenge_direction
         AND exact.edge_bucket = cs.edge_bucket
        LEFT JOIN audit_overturn_fallbacks direction_only
          ON direction_only.fallback_tier = 'direction_only'
         AND direction_only.challenge_direction = cs.challenge_direction
        LEFT JOIN audit_overturn_fallbacks global_row
          ON global_row.fallback_tier = 'global'
      )
      SELECT
        CASE
          WHEN overturn_probability IS NULL THEN 'unresolved'
          ELSE CONCAT(LPAD((FLOOR(overturn_probability * 10) * 10)::TEXT, 2, '0'), '-', LPAD(((FLOOR(overturn_probability * 10) * 10) + 9)::TEXT, 2, '0'), '%')
        END AS predicted_bucket,
        COUNT(*)::INT AS challenges,
        AVG(overturn_probability)::NUMERIC(8,4) AS avg_predicted_overturn,
        AVG(CASE WHEN is_overturned THEN 1 ELSE 0 END)::NUMERIC(8,4) AS realized_overturn_rate
      FROM overturn_resolved
      GROUP BY 1
      ORDER BY 1
    `)).rows;

    const decisionRows = (await client.query(`
      WITH overturn_resolved AS (
        SELECT
          cs.challenge_id,
          cs.is_overturned,
          cs.inning,
          cs.half_inning,
          cs.balls_before,
          cs.strikes_before,
          cs.bases_state,
          cs.home_score,
          cs.away_score,
          COALESCE(exact.overturn_probability, direction_only.overturn_probability, global_row.overturn_probability, 0.5) AS overturn_probability
        FROM audit_challenge_states cs
        LEFT JOIN audit_overturn_fallbacks exact
          ON exact.fallback_tier = 'exact'
         AND exact.challenge_direction = cs.challenge_direction
         AND exact.edge_bucket = cs.edge_bucket
        LEFT JOIN audit_overturn_fallbacks direction_only
          ON direction_only.fallback_tier = 'direction_only'
         AND direction_only.challenge_direction = cs.challenge_direction
        LEFT JOIN audit_overturn_fallbacks global_row
          ON global_row.fallback_tier = 'global'
      ),
      we_resolved AS (
        SELECT
          cs.challenge_id,
          COALESCE(post_exact.batting_team_win_probability, post_bucket.batting_team_win_probability, post_drop_count_exact.batting_team_win_probability, post_drop_count_bucket.batting_team_win_probability)
          - COALESCE(pre_exact.batting_team_win_probability, pre_bucket.batting_team_win_probability, pre_drop_count_exact.batting_team_win_probability, pre_drop_count_bucket.batting_team_win_probability) AS success_we_delta
        FROM audit_challenge_states cs
        LEFT JOIN audit_we_fallbacks pre_exact
          ON pre_exact.fallback_tier = 'exact'
         AND pre_exact.inning = cs.inning
         AND pre_exact.half_inning = cs.half_inning
         AND pre_exact.score_diff_bucket = cs.score_diff_bucket
         AND pre_exact.outs = cs.outs
         AND pre_exact.bases_state = cs.bases_state
         AND pre_exact.count_key = cs.held_count_key
        LEFT JOIN audit_we_fallbacks post_exact
          ON post_exact.fallback_tier = 'exact'
         AND post_exact.inning = cs.inning
         AND post_exact.half_inning = cs.half_inning
         AND post_exact.score_diff_bucket = cs.score_diff_bucket
         AND post_exact.outs = cs.outs
         AND post_exact.bases_state = cs.bases_state
         AND post_exact.count_key = cs.corrected_count_key
        LEFT JOIN audit_we_fallbacks pre_bucket
          ON pre_bucket.fallback_tier = 'drop_inning_to_bucket'
         AND pre_bucket.inning_bucket = cs.inning_bucket
         AND pre_bucket.half_inning = cs.half_inning
         AND pre_bucket.score_diff_bucket = cs.score_diff_bucket
         AND pre_bucket.outs = cs.outs
         AND pre_bucket.bases_state = cs.bases_state
         AND pre_bucket.count_key = cs.held_count_key
        LEFT JOIN audit_we_fallbacks post_bucket
          ON post_bucket.fallback_tier = 'drop_inning_to_bucket'
         AND post_bucket.inning_bucket = cs.inning_bucket
         AND post_bucket.half_inning = cs.half_inning
         AND post_bucket.score_diff_bucket = cs.score_diff_bucket
         AND post_bucket.outs = cs.outs
         AND post_bucket.bases_state = cs.bases_state
         AND post_bucket.count_key = cs.corrected_count_key
        LEFT JOIN audit_we_fallbacks pre_drop_count_exact
          ON pre_drop_count_exact.fallback_tier = 'drop_count_key_exact_inning'
         AND pre_drop_count_exact.inning = cs.inning
         AND pre_drop_count_exact.half_inning = cs.half_inning
         AND pre_drop_count_exact.score_diff_bucket = cs.score_diff_bucket
         AND pre_drop_count_exact.outs = cs.outs
         AND pre_drop_count_exact.bases_state = cs.bases_state
        LEFT JOIN audit_we_fallbacks post_drop_count_exact
          ON post_drop_count_exact.fallback_tier = 'drop_count_key_exact_inning'
         AND post_drop_count_exact.inning = cs.inning
         AND post_drop_count_exact.half_inning = cs.half_inning
         AND post_drop_count_exact.score_diff_bucket = cs.score_diff_bucket
         AND post_drop_count_exact.outs = cs.outs
         AND post_drop_count_exact.bases_state = cs.bases_state
        LEFT JOIN audit_we_fallbacks pre_drop_count_bucket
          ON pre_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
         AND pre_drop_count_bucket.inning_bucket = cs.inning_bucket
         AND pre_drop_count_bucket.half_inning = cs.half_inning
         AND pre_drop_count_bucket.score_diff_bucket = cs.score_diff_bucket
         AND pre_drop_count_bucket.outs = cs.outs
         AND pre_drop_count_bucket.bases_state = cs.bases_state
        LEFT JOIN audit_we_fallbacks post_drop_count_bucket
          ON post_drop_count_bucket.fallback_tier = 'drop_count_key_bucketed_inning'
         AND post_drop_count_bucket.inning_bucket = cs.inning_bucket
         AND post_drop_count_bucket.half_inning = cs.half_inning
         AND post_drop_count_bucket.score_diff_bucket = cs.score_diff_bucket
         AND post_drop_count_bucket.outs = cs.outs
         AND post_drop_count_bucket.bases_state = cs.bases_state
      )
      SELECT
        o.challenge_id,
        o.is_overturned,
        o.inning,
        o.half_inning,
        o.balls_before,
        o.strikes_before,
        o.bases_state,
        o.home_score,
        o.away_score,
        o.overturn_probability,
        w.success_we_delta
      FROM overturn_resolved o
      LEFT JOIN we_resolved w ON w.challenge_id = o.challenge_id
    `)).rows;

    const teamRows = (await client.query(`
      WITH team_summary AS (
        SELECT
          t.team_id AS "teamId",
          t.name AS "teamName",
          COUNT(DISTINCT s.game_pk)::INT AS "gamesTracked",
          COALESCE(SUM(s.used_successful), 0)::INT AS "usedSuccessful",
          COALESCE(SUM(s.used_failed), 0)::INT AS "usedFailed",
          COALESCE(SUM(s.challenges_total), 0)::INT AS "challengesTotal",
          COALESCE(AVG(s.remaining), 0)::NUMERIC AS "avgRemaining",
          CASE WHEN SUM(s.challenges_total) > 0
            THEN SUM(s.used_successful)::NUMERIC / SUM(s.challenges_total)
            ELSE 0
          END AS "overturnRate"
        FROM teams t
        LEFT JOIN team_abs_game_summary s ON s.team_id = t.team_id
        LEFT JOIN games g ON g.game_pk = s.game_pk
        GROUP BY t.team_id, t.name
      ),
      style_metrics AS (
        SELECT
          c.challenge_team_id AS "teamId",
          AVG(CASE WHEN c.inning >= 7 OR ABS(COALESCE(c.home_score, 0) - COALESCE(c.away_score, 0)) <= 2 THEN 1.0 ELSE 0.0 END)::NUMERIC AS "lateLeverageShare",
          AVG(CASE WHEN c.inning <= 3 AND ABS(COALESCE(c.home_score, 0) - COALESCE(c.away_score, 0)) >= 3 THEN 1.0 ELSE 0.0 END)::NUMERIC AS "earlyLowLeverageShare"
        FROM abs_challenges c
        JOIN games g ON g.game_pk = c.game_pk
        WHERE c.challenge_team_id IS NOT NULL
        GROUP BY c.challenge_team_id
      )
      SELECT s.*, m."lateLeverageShare", m."earlyLowLeverageShare"
      FROM team_summary s
      LEFT JOIN style_metrics m ON m."teamId" = s."teamId"
      WHERE s."challengesTotal" > 0
    `)).rows;

    const umpireRows = (await client.query(`
      WITH umpire_summary AS (
        SELECT
          o.official_id AS "umpireId",
          o.official_name AS "umpireName",
          COALESCE(SUM(s.challenged_calls), 0)::INT AS "challengedCalls",
          COALESCE(SUM(s.overturned_calls), 0)::INT AS "overturnedCalls",
          COALESCE(SUM(s.confirmed_calls), 0)::INT AS "confirmedCalls",
          CASE WHEN SUM(s.challenged_calls) > 0
            THEN SUM(s.overturned_calls)::NUMERIC / SUM(s.challenged_calls)
            ELSE 0
          END AS "overturnRate",
          COUNT(DISTINCT s.game_pk)::INT AS "gamesWorked"
        FROM (SELECT DISTINCT official_id, official_name FROM officials WHERE official_type = 'Home Plate') o
        LEFT JOIN umpire_abs_game_summary s ON s.umpire_id = o.official_id
        LEFT JOIN games g ON g.game_pk = s.game_pk
        GROUP BY o.official_id, o.official_name
      ),
      rubric_metrics AS (
        WITH filtered AS (
          SELECT
            s.umpire_id AS "umpireId",
            s.game_pk,
            s.challenged_calls,
            s.overturned_calls,
            CASE WHEN s.challenged_calls > 0 THEN s.overturned_calls::NUMERIC / s.challenged_calls ELSE NULL END AS "gameOverturnRate",
            ROW_NUMBER() OVER (PARTITION BY s.umpire_id ORDER BY g.game_date DESC, s.game_pk DESC) AS "recentRank"
          FROM umpire_abs_game_summary s
          JOIN games g ON g.game_pk = s.game_pk
        )
        SELECT
          "umpireId",
          COALESCE(STDDEV_POP("gameOverturnRate"), 0)::NUMERIC AS "overturnRateVariance",
          CASE
            WHEN SUM(challenged_calls) FILTER (WHERE "recentRank" <= 5) > 0
              THEN SUM(overturned_calls) FILTER (WHERE "recentRank" <= 5)::NUMERIC / SUM(challenged_calls) FILTER (WHERE "recentRank" <= 5)
            ELSE NULL
          END AS "recentOverturnRate"
        FROM filtered
        GROUP BY "umpireId"
      )
      SELECT s.*, m."overturnRateVariance", m."recentOverturnRate"
      FROM umpire_summary s
      LEFT JOIN rubric_metrics m ON m."umpireId" = s."umpireId"
      WHERE s."challengedCalls" > 0
    `)).rows;

    const reUsage = summarizeFallbackPairs(reUsageRaw);
    const weUsage = summarizeFallbackPairs(weUsageRaw);

    const decisionAudit = [];
    for (const row of decisionRows) {
      const inning = Number(row.inning ?? 0);
      const balls = Number(row.balls_before ?? 0);
      const strikes = Number(row.strikes_before ?? 0);
      const basesState = row.bases_state ?? "000";
      const runnersOnBase = countBaseRunners(basesState);
      const scoreDiffBattingTeam =
        row.half_inning === "Top"
          ? Number(row.away_score ?? 0) - Number(row.home_score ?? 0)
          : Number(row.home_score ?? 0) - Number(row.away_score ?? 0);
      const li = leverageApprox({ inning, balls, strikes, runnersOnBase, scoreDiffBattingTeam });
      const successWeDelta = row.success_we_delta === null ? null : Number(row.success_we_delta);
      const successDelta = successWeDelta ?? calculateHeuristicSuccessDelta({ inning, balls, strikes, runnersOnBase, scoreDiffBattingTeam }, li);
      const failDelta = Number((-0.003 * li).toFixed(4));
      const overturnProbability = Number(row.overturn_probability ?? 0.5);
      const expectedWpDelta = Number((overturnProbability * successDelta + (1 - overturnProbability) * failDelta).toFixed(4));
      const realizedWpDelta = row.is_overturned ? successDelta : failDelta;

      decisionAudit.push({
        mode: successWeDelta !== null ? "win_expectancy" : "heuristic",
        expectedWpDelta,
        realizedWpDelta,
        recommendation: expectedWpDelta > 0.0005 ? "challenge" : "hold",
      });
    }

    const decisionModeSummary = ["win_expectancy", "heuristic"].map((mode) => {
      const rows = decisionAudit.filter((row) => row.mode === mode);
      const total = rows.length;
      return {
        mode,
        challenges: total,
        pct: decisionAudit.length > 0 ? total / decisionAudit.length : 0,
        avgExpectedWpDelta: total > 0 ? rows.reduce((sum, row) => sum + row.expectedWpDelta, 0) / total : null,
        avgRealizedWpDelta: total > 0 ? rows.reduce((sum, row) => sum + row.realizedWpDelta, 0) / total : null,
        challengeRecommendationRate: total > 0 ? rows.filter((row) => row.recommendation === "challenge").length / total : null,
        positiveRealizedRate: total > 0 ? rows.filter((row) => row.realizedWpDelta > 0).length / total : null,
      };
    });

    const overallExpected = decisionAudit.reduce((sum, row) => sum + row.expectedWpDelta, 0) / Math.max(decisionAudit.length, 1);
    const overallRealized = decisionAudit.reduce((sum, row) => sum + row.realizedWpDelta, 0) / Math.max(decisionAudit.length, 1);
    const signAgreement =
      decisionAudit.filter((row) => Math.sign(row.expectedWpDelta) === Math.sign(row.realizedWpDelta)).length /
      Math.max(decisionAudit.length, 1);

    const leagueChallengeRatePerGame =
      teamRows.reduce((sum, row) => sum + (Number(row.gamesTracked) > 0 ? Number(row.challengesTotal) / Number(row.gamesTracked) : 0), 0) /
      Math.max(teamRows.length, 1);
    const leagueLateLeverageShare =
      teamRows.reduce((sum, row) => sum + Number(row.lateLeverageShare ?? 0), 0) / Math.max(teamRows.length, 1);
    const leagueEarlyLowLeverageShare =
      teamRows.reduce((sum, row) => sum + Number(row.earlyLowLeverageShare ?? 0), 0) / Math.max(teamRows.length, 1);
    const leagueAverageChallengesRemaining =
      teamRows.reduce((sum, row) => sum + Number(row.avgRemaining ?? 0), 0) / Math.max(teamRows.length, 1);
    const leagueOverturnRate =
      teamRows.reduce((sum, row) => sum + Number(row.usedSuccessful), 0) /
      Math.max(1, teamRows.reduce((sum, row) => sum + Number(row.challengesTotal), 0));

    const teamStyleCounts = new Map();
    for (const row of teamRows) {
      const style = computeTeamChallengeStyle({
        sampleSize: Number(row.challengesTotal),
        challengeRatePerGame: Number(row.gamesTracked) > 0 ? Number(row.challengesTotal) / Number(row.gamesTracked) : 0,
        leagueChallengeRatePerGame,
        lateLeverageShare: Number(row.lateLeverageShare ?? 0),
        leagueLateLeverageShare,
        earlyLowLeverageShare: Number(row.earlyLowLeverageShare ?? 0),
        leagueEarlyLowLeverageShare,
        averageChallengesRemaining: Number(row.avgRemaining ?? 0),
        leagueAverageChallengesRemaining,
        overturnRate: Number(row.overturnRate ?? 0),
        leagueOverturnRate,
      }).style;
      teamStyleCounts.set(style, (teamStyleCounts.get(style) ?? 0) + 1);
    }

    const trackedUmpires = umpireRows.map((row) => ({
      ...row,
      challengedCalls: Number(row.challengedCalls),
      overturnedCalls: Number(row.overturnedCalls),
      overturnRate: Number(row.overturnRate ?? 0),
      overturnRateVariance: Number(row.overturnRateVariance ?? 0),
      recentOverturnRate: row.recentOverturnRate === null ? null : Number(row.recentOverturnRate),
    }));
    const leagueUmpireOverturnRate =
      trackedUmpires.reduce((sum, row) => sum + row.overturnedCalls, 0) /
      Math.max(1, trackedUmpires.reduce((sum, row) => sum + row.challengedCalls, 0));
    const overturnRates = trackedUmpires.map((row) => row.overturnRate);
    const meanOverturnRate = overturnRates.reduce((sum, value) => sum + value, 0) / Math.max(overturnRates.length, 1);
    const leagueOverturnRateStdDev = Math.sqrt(
      overturnRates.reduce((sum, value) => sum + (value - meanOverturnRate) ** 2, 0) / Math.max(overturnRates.length, 1),
    );
    const variances = trackedUmpires.map((row) => row.overturnRateVariance);
    const leagueVarianceMean = variances.reduce((sum, value) => sum + value, 0) / Math.max(variances.length, 1);
    const leagueVarianceStdDev = Math.sqrt(
      variances.reduce((sum, value) => sum + (value - leagueVarianceMean) ** 2, 0) / Math.max(variances.length, 1),
    );

    const rubricRows = trackedUmpires.map((row) => {
      const report = computeUmpireReportCard({
        challengedCalls: row.challengedCalls,
        overturnedCalls: row.overturnedCalls,
        leagueOverturnRate: leagueUmpireOverturnRate,
        leagueOverturnRateStdDev,
        umpireVariance: row.overturnRateVariance,
        leagueVarianceMean,
        leagueVarianceStdDev,
        recentOverturnRate: row.recentOverturnRate,
      });
      const risk = computeOrgWatchRisk({
        umpireScore: report.score,
        directionalBiasSeverity: clamp((row.overturnedCalls / Math.max(1, row.challengedCalls)) * 100),
        zoneConcentrationSeverity: clamp(row.overturnRateVariance * 100),
        recentTrendRisk: clamp((row.recentOverturnRate ?? row.overturnRate) * 100),
        countHotspotVolatility: clamp(row.overturnRateVariance * 85),
        confidence: report.confidence,
      });
      return { ...row, report, risk };
    });

    const displayGrades = calibrateUmpireDisplayGrades(
      rubricRows.map((row) => ({
        umpireId: row.umpireId,
        score: row.report.score,
        confidence: row.report.confidence,
      })),
    );

    const gradeCounts = new Map();
    const riskCounts = new Map();
    for (const row of rubricRows) {
      const grade = displayGrades.get(row.umpireId) ?? row.report.grade;
      gradeCounts.set(grade, (gradeCounts.get(grade) ?? 0) + 1);
      riskCounts.set(row.risk.tier, (riskCounts.get(row.risk.tier) ?? 0) + 1);
    }

    const artifact = {
      auditDate: AUDIT_DATE,
      dataWindow: {
        start: overview.first_game_date,
        end: overview.last_game_date,
      },
      overview,
      martCoverage: {
        runExpectancy: reMart,
        winExpectancy: weMart,
        overturnProbability: overturnMart,
      },
      actualUsage: {
        runExpectancy: reUsage,
        winExpectancy: weUsage,
        overturnProbability: overturnUsage,
      },
      overturnCalibration,
      decisionValue: {
        byMode: decisionModeSummary,
        overallExpectedWpDelta: overallExpected,
        overallRealizedWpDelta: overallRealized,
        signAgreement,
      },
      rubricDistributions: {
        teamStyles: Object.fromEntries([...teamStyleCounts.entries()].sort()),
        umpireGrades: Object.fromEntries([...gradeCounts.entries()].sort()),
        orgRiskTiers: Object.fromEntries([...riskCounts.entries()].sort()),
      },
    };

    const topReExact = reUsage.find((row) => row.pre_tier === "exact" && row.post_tier === "exact");
    const topWeExact = weUsage.find((row) => row.pre_tier === "exact" && row.post_tier === "exact");
    const topWeUnresolved = weUsage.find((row) => row.pre_tier === "unresolved" || row.post_tier === "unresolved");
    const weModeRow = decisionModeSummary.find((row) => row.mode === "win_expectancy");
    const heuristicRow = decisionModeSummary.find((row) => row.mode === "heuristic");

    const findings = [
      `RE resolves exact-to-exact on ${formatPercent(topReExact?.pct ?? 0)} of live spring challenges; the remainder is almost entirely base/out fallback rather than unresolved traffic.`,
      `WE resolves exact-to-exact on ${formatPercent(topWeExact?.pct ?? 0)} of live spring challenges${topWeUnresolved ? `, with ${formatPercent(topWeUnresolved.pct)} still unresolved.` : " and shows no unresolved challenge states in the current window."}`,
      `Decision value is running in full WE mode on ${formatPercent(weModeRow?.pct ?? 0)} of audited challenges and heuristic mode on ${formatPercent(heuristicRow?.pct ?? 0)}.`,
      `Overturn-probability calibration is strongest in the heavy mid-range spring buckets; exact edge-bucket usage should still be monitored because the public join pattern in \`mart_team_challenge_decision_value\` currently does not use edge-specific exact rows.`,
      `Rubric spread is no longer collapsed into one label family: team styles distribute across ${Object.keys(artifact.rubricDistributions.teamStyles).length} buckets and umpire grades across ${Object.keys(artifact.rubricDistributions.umpireGrades).length} buckets in the current sample.`,
    ];

    const markdown = `# Current-State Audit

Date: ${formatAuditDateLabel()}

## Scope

- Data window: ${overview.first_game_date} through ${overview.last_game_date}
- Games tracked: ${overview.games}
- Challenges tracked: ${overview.challenges}
- Pitches tracked: ${overview.pitches}
- Historical pitch states available to the model: ${overview.historical_pitch_states}

## Key Findings

${findings.map((finding) => `- ${finding}`).join("\n")}

## Mart Coverage

### Run Expectancy Fallback Mart

${toMarkdownTable(reMart, [
      { label: "Tier", render: (row) => row.fallback_tier },
      { label: "Confidence", render: (row) => row.confidence_band },
      { label: "Rows", render: (row) => row.rows },
      { label: "Total Sample", render: (row) => row.total_sample },
    ])}

### Win Expectancy Fallback Mart

${toMarkdownTable(weMart, [
      { label: "Tier", render: (row) => row.fallback_tier },
      { label: "Confidence", render: (row) => row.confidence_band },
      { label: "Rows", render: (row) => row.rows },
      { label: "Total Sample", render: (row) => row.total_sample },
    ])}

### Overturn Probability Fallback Mart

${toMarkdownTable(overturnMart, [
      { label: "Tier", render: (row) => row.fallback_tier },
      { label: "Confidence", render: (row) => row.confidence_band },
      { label: "Rows", render: (row) => row.rows },
      { label: "Total Sample", render: (row) => row.total_sample },
    ])}

## Actual Challenge Resolution Usage

### Run Expectancy Resolution On Spring Challenges

${toMarkdownTable(reUsage, [
      { label: "Held Tier", render: (row) => row.pre_tier },
      { label: "Corrected Tier", render: (row) => row.post_tier },
      { label: "Challenges", render: (row) => row.challenges },
      { label: "Share", render: (row) => formatPercent(row.pct) },
    ])}

### Win Expectancy Resolution On Spring Challenges

${toMarkdownTable(weUsage, [
      { label: "Held Tier", render: (row) => row.pre_tier },
      { label: "Corrected Tier", render: (row) => row.post_tier },
      { label: "Challenges", render: (row) => row.challenges },
      { label: "Share", render: (row) => formatPercent(row.pct) },
    ])}

### Overturn Probability Resolution On Spring Challenges

${toMarkdownTable(overturnUsage, [
      { label: "Tier", render: (row) => row.fallback_tier },
      { label: "Confidence", render: (row) => row.confidence_band },
      { label: "Challenges", render: (row) => row.challenges },
      { label: "Avg Predicted", render: (row) => formatPercent(Number(row.avg_predicted_overturn), 1) },
      { label: "Realized", render: (row) => formatPercent(Number(row.realized_overturn_rate), 1) },
    ])}

## Overturn Probability Calibration

${toMarkdownTable(overturnCalibration, [
      { label: "Predicted Bucket", render: (row) => row.predicted_bucket },
      { label: "Challenges", render: (row) => row.challenges },
      { label: "Avg Predicted", render: (row) => formatPercent(Number(row.avg_predicted_overturn), 1) },
      { label: "Realized", render: (row) => formatPercent(Number(row.realized_overturn_rate), 1) },
    ])}

## Decision-Value Audit

### By Mode

${toMarkdownTable(decisionModeSummary, [
      { label: "Mode", render: (row) => row.mode },
      { label: "Challenges", render: (row) => row.challenges },
      { label: "Share", render: (row) => formatPercent(row.pct) },
      { label: "Avg Expected WPA", render: (row) => formatNumber(row.avgExpectedWpDelta) },
      { label: "Avg Realized WPA", render: (row) => formatNumber(row.avgRealizedWpDelta) },
      { label: "Challenge Rate", render: (row) => formatPercent(row.challengeRecommendationRate) },
      { label: "Positive Realized", render: (row) => formatPercent(row.positiveRealizedRate) },
    ])}

### Overall

- Overall average expected WPA delta: ${formatNumber(overallExpected)}
- Overall average realized WPA delta: ${formatNumber(overallRealized)}
- Expected/realized sign agreement: ${formatPercent(signAgreement)}

## Rubric Distribution Audit

### Team Styles

${toMarkdownTable(Object.entries(artifact.rubricDistributions.teamStyles).map(([style, count]) => ({ style, count })), [
      { label: "Style", render: (row) => row.style },
      { label: "Teams", render: (row) => row.count },
    ])}

### Umpire Grades

${toMarkdownTable(Object.entries(artifact.rubricDistributions.umpireGrades).map(([grade, count]) => ({ grade, count })), [
      { label: "Grade", render: (row) => row.grade },
      { label: "Umpires", render: (row) => row.count },
    ])}

### Org Risk Tiers

${toMarkdownTable(Object.entries(artifact.rubricDistributions.orgRiskTiers).map(([tier, count]) => ({ tier, count })), [
      { label: "Risk Tier", render: (row) => row.tier },
      { label: "Umpires", render: (row) => row.count },
    ])}

## Notes

- This audit uses the current shared model contracts and the current local spring-training window through March 22, 2026.
- The challenge-level WE audit requires canonicalizing \`half_inning\` to match the fallback mart’s \`Top/Bottom\` values; without that normalization, the raw DB join appears unresolved even though the shared server model normalizes it.
- The current SQL view \`mart_team_challenge_decision_value\` appears to join overturn-probability fallbacks without using edge-specific exact rows. That is a real follow-up item for the next calibration pass because it can underuse the strongest overturn-context signal in the mart.
`;

    await fs.mkdir(ARTIFACT_DIR, { recursive: true });
    await fs.writeFile(JSON_PATH, JSON.stringify(artifact, null, 2));
    await fs.writeFile(MARKDOWN_PATH, markdown);

    console.log(`Wrote ${path.relative(repoRoot, MARKDOWN_PATH)}`);
    console.log(`Wrote ${path.relative(repoRoot, JSON_PATH)}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

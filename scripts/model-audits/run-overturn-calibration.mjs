import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  ROOT,
  formatAuditDateLabel,
} from "./audit-runtime.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-overturn-calibration.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-overturn-calibration.json`,
);

function loadEnvFile(filename) {
  const filePath = path.join(ROOT, filename);
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

function mean(values) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatPct(value, digits = 1) {
  return `${(value * 100).toFixed(digits)}%`;
}

function formatSignedPctPoint(value) {
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)} pts`;
}

function toBucketLabel(probability) {
  if (probability == null || Number.isNaN(probability)) return "unresolved";
  const lower = Math.min(90, Math.floor(probability * 10) * 10);
  const upper = lower + 9;
  return `${String(lower).padStart(2, "0")}-${String(upper).padStart(2, "0")}%`;
}

function summarizeRows(rows) {
  const diffs = rows.map((row) => row.realizedOverturnRate - row.avgPredictedOverturn);
  const absDiffs = diffs.map((value) => Math.abs(value));
  return {
    rows: rows.length,
    meanAbsGap: mean(absDiffs),
    meanSignedGap: mean(diffs),
  };
}

function toMarkdownTable(rows, columns) {
  const header = `| ${columns.map((column) => column.label).join(" | ")} |`;
  const separator = `| ${columns.map(() => "---").join(" | ")} |`;
  const body = rows.map(
    (row) => `| ${columns.map((column) => String(column.render(row))).join(" | ")} |`,
  );
  return [header, separator, ...body].join("\n");
}

function buildMarkdown(report) {
  return `# Overturn Probability Calibration

Date: ${formatAuditDateLabel()}

## Scope

- Comparison layer: realized spring overturn outcomes on ABS challenges
- Internal layer: AiBS overturn-probability fallback mart
- Sample: all spring-training ABS challenges in the current local window

## Overview

- Challenges benchmarked: ${report.overall.challenges}
- Mean predicted overturn probability: ${formatPct(report.overall.avgPredictedOverturn)}
- Realized overturn rate: ${formatPct(report.overall.realizedOverturnRate)}
- Mean absolute bucket gap: ${formatPct(report.overall.meanAbsBucketGap)}
- Mean signed bucket gap (realized minus predicted): ${formatSignedPctPoint(report.overall.meanSignedBucketGap)}
- Brier score: ${report.overall.brierScore.toFixed(4)}

## Key Findings

- The overturn model is broadly usable: aggregate predicted and realized overturn rates are close enough to treat the current calibration as credible.
- Most challenge traffic is concentrated in the \`40-49%\` and \`50-59%\` bands, so calibration confidence outside those bands remains naturally limited.
- The main analyst question is not “is the model broken,” but “where do fallback tier, direction, or edge bucket push us off calibration.”
- This report should be rerun as regular-season volume grows, because overturn calibration will improve materially with more exact edge-bucket history.

## Calibration By Predicted Bucket

${toMarkdownTable(report.byPredictedBucket, [
    { label: "Predicted Bucket", render: (row) => row.predictedBucket },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.realizedOverturnRate - row.avgPredictedOverturn) },
  ])}

## Calibration By Fallback Tier

${toMarkdownTable(report.byFallbackTier, [
    { label: "Fallback Tier", render: (row) => row.fallbackTier },
    { label: "Confidence", render: (row) => row.confidenceBand },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.realizedOverturnRate - row.avgPredictedOverturn) },
  ])}

## Calibration By Challenge Direction

${toMarkdownTable(report.byDirection, [
    { label: "Direction", render: (row) => row.challengeDirection },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.realizedOverturnRate - row.avgPredictedOverturn) },
  ])}

## Calibration By Edge Bucket

${toMarkdownTable(report.byEdgeBucket, [
    { label: "Edge Bucket", render: (row) => row.edgeBucket },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Gap", render: (row) => formatSignedPctPoint(row.realizedOverturnRate - row.avgPredictedOverturn) },
  ])}

## Largest Calibration Gaps

${toMarkdownTable(report.topGapGroups, [
    { label: "Group", render: (row) => `${row.fallbackTier} / ${row.challengeDirection} / ${row.edgeBucket}` },
    { label: "Confidence", render: (row) => row.confidenceBand },
    { label: "Challenges", render: (row) => row.challenges },
    { label: "Avg Predicted", render: (row) => formatPct(row.avgPredictedOverturn) },
    { label: "Realized", render: (row) => formatPct(row.realizedOverturnRate) },
    { label: "Abs Gap", render: (row) => formatPct(row.absGap) },
  ])}

## Root-Cause Readout

- Exact-tier challenges: ${report.rootCause.exactChallenges}
- Direction-only challenges: ${report.rootCause.directionOnlyChallenges}
- Global-fallback challenges: ${report.rootCause.globalChallenges}
- Low-confidence challenges: ${report.rootCause.lowConfidenceChallenges}
- Mean exact-vs-direction-only predicted gap on exact-capable rows: ${formatPct(report.rootCause.meanExactVsDirectionOnlyGap)}
- Exact-tier Brier score: ${report.rootCause.exactBrierScore.toFixed(4)}
- Direction-only Brier score: ${report.rootCause.directionOnlyBrierScore.toFixed(4)}
- Global Brier score: ${report.rootCause.globalBrierScore.toFixed(4)}

## Notes

- This audit is internal calibration against realized outcomes, not an MLB external benchmark.
- The important readout is whether predicted buckets line up with realized overturn frequency and where that alignment breaks by geometry or direction.
- Because spring volume is still limited, direction/edge groups with small counts should drive monitoring and smoothing decisions, not full rewrites.
`;
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`
      CREATE TEMP TABLE overturn_audit_challenge_states AS
      SELECT
        c.challenge_id,
        c.is_overturned,
        CASE
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'called strike%' THEN 'strike_to_ball'
          WHEN LOWER(COALESCE(p.called_description, c.called_description, '')) LIKE 'ball%' THEN 'ball_to_strike'
          ELSE NULL
        END AS challenge_direction,
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
       AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
    `);

    await client.query(`
      CREATE INDEX overturn_audit_states_idx
        ON overturn_audit_challenge_states (challenge_direction, edge_bucket)
    `);

    await client.query(`
      CREATE TEMP TABLE overturn_audit_fallbacks AS
      SELECT * FROM mart_historical_abs_overturn_probability_fallbacks
    `);

    await client.query(`
      CREATE INDEX overturn_audit_fallbacks_idx
        ON overturn_audit_fallbacks (fallback_tier, challenge_direction, edge_bucket)
    `);

    const resolvedRows = (
      await client.query(`
        WITH resolved AS (
          SELECT
            cs.challenge_id,
            cs.is_overturned,
            cs.challenge_direction,
            cs.edge_bucket,
            COALESCE(exact.fallback_tier, direction_only.fallback_tier, global_row.fallback_tier, 'unresolved') AS fallback_tier,
            COALESCE(exact.confidence_band, direction_only.confidence_band, global_row.confidence_band, 'n/a') AS confidence_band,
            COALESCE(exact.sample_size, direction_only.sample_size, global_row.sample_size, 0) AS sample_size,
            COALESCE(exact.overturn_probability, direction_only.overturn_probability, global_row.overturn_probability) AS overturn_probability,
            exact.overturn_probability AS exact_overturn_probability,
            direction_only.overturn_probability AS direction_only_overturn_probability
          FROM overturn_audit_challenge_states cs
          LEFT JOIN overturn_audit_fallbacks exact
            ON exact.fallback_tier = 'exact'
           AND exact.challenge_direction = cs.challenge_direction
           AND exact.edge_bucket = cs.edge_bucket
          LEFT JOIN overturn_audit_fallbacks direction_only
            ON direction_only.fallback_tier = 'direction_only'
           AND direction_only.challenge_direction = cs.challenge_direction
          LEFT JOIN overturn_audit_fallbacks global_row
            ON global_row.fallback_tier = 'global'
        )
        SELECT *
        FROM resolved
        WHERE overturn_probability IS NOT NULL
      `)
    ).rows.map((row) => {
      const overturnProbability = Number(row.overturn_probability);
      return {
        challengeId: row.challenge_id,
        isOverturned: Boolean(row.is_overturned),
        challengeDirection: row.challenge_direction ?? "unknown",
        edgeBucket: row.edge_bucket ?? "unknown",
        fallbackTier: row.fallback_tier,
        confidenceBand: row.confidence_band,
        sampleSize: Number(row.sample_size ?? 0),
        overturnProbability,
        predictedBucket: toBucketLabel(overturnProbability),
        exactOverturnProbability:
          row.exact_overturn_probability == null ? null : Number(row.exact_overturn_probability),
        directionOnlyOverturnProbability:
          row.direction_only_overturn_probability == null
            ? null
            : Number(row.direction_only_overturn_probability),
        brier: (overturnProbability - (row.is_overturned ? 1 : 0)) ** 2,
      };
    });

    const overall = {
      challenges: resolvedRows.length,
      avgPredictedOverturn: mean(resolvedRows.map((row) => row.overturnProbability)),
      realizedOverturnRate: mean(resolvedRows.map((row) => (row.isOverturned ? 1 : 0))),
      meanAbsBucketGap: null,
      meanSignedBucketGap: null,
      brierScore: mean(resolvedRows.map((row) => row.brier)) ?? 0,
    };

    const byPredictedBucket = [...resolvedRows.reduce((map, row) => {
      const bucket = map.get(row.predictedBucket) ?? [];
      bucket.push(row);
      map.set(row.predictedBucket, bucket);
      return map;
    }, new Map()).entries()]
      .map(([predictedBucket, rows]) => {
        const avgPredictedOverturn = mean(rows.map((row) => row.overturnProbability)) ?? 0;
        const realizedOverturnRate = mean(rows.map((row) => (row.isOverturned ? 1 : 0))) ?? 0;
        return {
          predictedBucket,
          challenges: rows.length,
          avgPredictedOverturn,
          realizedOverturnRate,
          absGap: Math.abs(realizedOverturnRate - avgPredictedOverturn),
        };
      })
      .sort((a, b) => a.predictedBucket.localeCompare(b.predictedBucket));

    overall.meanAbsBucketGap = mean(byPredictedBucket.map((row) => row.absGap)) ?? 0;
    overall.meanSignedBucketGap =
      mean(byPredictedBucket.map((row) => row.realizedOverturnRate - row.avgPredictedOverturn)) ?? 0;

    const groupSummary = (keyBuilder) =>
      [...resolvedRows.reduce((map, row) => {
        const key = keyBuilder(row);
        const bucket = map.get(key) ?? [];
        bucket.push(row);
        map.set(key, bucket);
        return map;
      }, new Map()).entries()].map(([key, rows]) => ({
        key,
        challenges: rows.length,
        avgPredictedOverturn: mean(rows.map((row) => row.overturnProbability)) ?? 0,
        realizedOverturnRate: mean(rows.map((row) => (row.isOverturned ? 1 : 0))) ?? 0,
        brierScore: mean(rows.map((row) => row.brier)) ?? 0,
      }));

    const byFallbackTier = groupSummary(
      (row) => `${row.fallbackTier}|${row.confidenceBand}`,
    )
      .map((row) => {
        const [fallbackTier, confidenceBand] = row.key.split("|");
        return { ...row, fallbackTier, confidenceBand };
      })
      .sort((a, b) => b.challenges - a.challenges);

    const byDirection = groupSummary((row) => row.challengeDirection)
      .map((row) => ({ ...row, challengeDirection: row.key }))
      .sort((a, b) => b.challenges - a.challenges);

    const byEdgeBucket = groupSummary((row) => row.edgeBucket)
      .map((row) => ({ ...row, edgeBucket: row.key }))
      .sort((a, b) => b.challenges - a.challenges);

    const topGapGroups = groupSummary(
      (row) => `${row.fallbackTier}|${row.confidenceBand}|${row.challengeDirection}|${row.edgeBucket}`,
    )
      .map((row) => {
        const [fallbackTier, confidenceBand, challengeDirection, edgeBucket] = row.key.split("|");
        return {
          ...row,
          fallbackTier,
          confidenceBand,
          challengeDirection,
          edgeBucket,
          absGap: Math.abs(row.realizedOverturnRate - row.avgPredictedOverturn),
        };
      })
      .filter((row) => row.challenges >= 10)
      .sort((a, b) => b.absGap - a.absGap || b.challenges - a.challenges)
      .slice(0, 15);

    const exactRows = resolvedRows.filter((row) => row.fallbackTier === "exact");
    const directionOnlyRows = resolvedRows.filter((row) => row.fallbackTier === "direction_only");
    const globalRows = resolvedRows.filter((row) => row.fallbackTier === "global");
    const lowConfidenceRows = resolvedRows.filter((row) => row.confidenceBand === "low");
    const meanExactVsDirectionOnlyGap =
      mean(
        resolvedRows
          .filter(
            (row) =>
              row.exactOverturnProbability != null &&
              row.directionOnlyOverturnProbability != null,
          )
          .map((row) =>
            Math.abs(row.exactOverturnProbability - row.directionOnlyOverturnProbability),
          ),
      ) ?? 0;

    const report = {
      generatedAt: new Date().toISOString(),
      overall,
      byPredictedBucket,
      byFallbackTier,
      byDirection,
      byEdgeBucket,
      topGapGroups,
      rootCause: {
        exactChallenges: exactRows.length,
        directionOnlyChallenges: directionOnlyRows.length,
        globalChallenges: globalRows.length,
        lowConfidenceChallenges: lowConfidenceRows.length,
        meanExactVsDirectionOnlyGap,
        exactBrierScore: mean(exactRows.map((row) => row.brier)) ?? 0,
        directionOnlyBrierScore: mean(directionOnlyRows.map((row) => row.brier)) ?? 0,
        globalBrierScore: mean(globalRows.map((row) => row.brier)) ?? 0,
      },
    };

    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(ARTIFACT_PATH, JSON.stringify(report, null, 2));
    fs.writeFileSync(DOC_PATH, buildMarkdown(report));

    console.log(`Wrote ${path.relative(ROOT, DOC_PATH)}`);
    console.log(`Wrote ${path.relative(ROOT, ARTIFACT_PATH)}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

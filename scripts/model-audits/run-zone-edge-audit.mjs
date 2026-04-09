import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  describeAuditDatabaseTarget,
  loadAuditEnv,
  resolveAuditDatabaseUrl,
} from "./audit-runtime.mjs";
import {
  AUDIT_DATE,
  AUDIT_END,
  ROOT,
  SPRING_START,
  computeDirectionalZoneDistance,
  formatAuditDateLabel,
  formatMaybeNumber,
  formatPct,
  getCalledPitch,
  getEdgeBucketForChallenge,
  loadEnvFile,
  mean,
  median,
  percentile,
  toMarkdownTable,
} from "./shared-audit-utils.mjs";

const DOC_PATH = path.join(ROOT, `docs/models/audits/${AUDIT_DATE}-zone-edge-audit.md`);
const ARTIFACT_PATH = path.join(
  ROOT,
  `docs/models/audits/artifacts/${AUDIT_DATE}-zone-edge-audit.json`,
);

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);

function summarizeBy(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups.entries()].map(([key, grouped]) => ({
    key,
    rows: grouped.length,
    share: grouped.length / rows.length,
    overturnRate: grouped.filter((row) => row.isOverturned).length / grouped.length,
    meanMissDistance: mean(grouped.map((row) => row.missDistance).filter((value) => value !== null)),
    medianMissDistance: median(grouped.map((row) => row.missDistance).filter((value) => value !== null)),
    p90MissDistance: percentile(grouped.map((row) => row.missDistance).filter((value) => value !== null), 0.9),
  }));
}

function buildMarkdown(report) {
  return `# Zone / Edge Audit

Date: ${formatAuditDateLabel()}

## Scope

- Comparison layer: spring ABS challenge geometry and realized overturn outcomes
- Internal layer: AiBS observed miss-distance and edge-bucket logic
- Sample: final spring-training ABS challenges from ${SPRING_START} through ${AUDIT_END}

## Overview

- Challenges benchmarked: ${report.overall.rows}
- Exact pitch-location coverage: ${formatPct(report.overall.locationCoverage)}
- Reviewed-pitch source share: ${formatPct(report.overall.reviewedPitchShare)}
- Inferred-location source share: ${formatPct(report.overall.inferredLocationShare)}

## Key Findings

- The geometry audit is mainly asking whether miss distance and edge buckets behave consistently enough to support overturn grouping.
- For \`strike_to_ball\` challenges, farther misses should generally overturn more often than borderline edge spots.
- For \`ball_to_strike\` challenges, AiBS now uses a conservative two-band geometry split until deeper inside-zone traffic is more stable.

## By Location Source

${toMarkdownTable(report.byLocationSource, [
    { label: "Location Source", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Share", render: (row) => `${(row.share * 100).toFixed(1)}%` },
    { label: "Overturn Rate", render: (row) => formatPct(row.overturnRate) },
    { label: "Mean Miss Distance", render: (row) => formatMaybeNumber(row.meanMissDistance, 3) },
  ])}

## By Edge Bucket

${toMarkdownTable(report.byEdgeBucket, [
    { label: "Bucket", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Share", render: (row) => `${(row.share * 100).toFixed(1)}%` },
    { label: "Overturn Rate", render: (row) => formatPct(row.overturnRate) },
    { label: "Mean Miss Distance", render: (row) => formatMaybeNumber(row.meanMissDistance, 3) },
    { label: "Median Miss Distance", render: (row) => formatMaybeNumber(row.medianMissDistance, 3) },
  ])}

## By Direction And Edge Bucket

${toMarkdownTable(report.byDirectionAndBucket, [
    { label: "Direction / Bucket", render: (row) => row.key },
    { label: "Rows", render: (row) => row.rows },
    { label: "Overturn Rate", render: (row) => formatPct(row.overturnRate) },
    { label: "Mean Miss Distance", render: (row) => formatMaybeNumber(row.meanMissDistance, 3) },
  ])}

## Root-Cause Readout

- Rows missing location after source fallback: ${report.rootCause.missingLocationRows}
- Rows with \`reviewed_pitch_px_pz\` source: ${report.rootCause.reviewedPitchRows}
- Rows with inferred location source: ${report.rootCause.inferredRows}
- \`strike_to_ball\` monotonicity check (\`edge < near_edge < clear_miss\` overturn): ${report.rootCause.strikeToBallMonotonic ? "PASS" : "FAIL"}
- \`ball_to_strike\` monotonicity check (\`edge < near_edge\` overturn, conservative two-band mode): ${report.rootCause.ballToStrikeMonotonic ? "PASS" : "FAIL"}

## Notes

- This is not a deterministic ABS adjudication audit; it is a sanity check on the geometry layer we use to bucket challenge context.
- The important readout is whether the bucket families tell a coherent baseball story by challenge direction and whether source coverage is strong enough to trust the geometry-based grouping.
`;
}

async function main() {
  console.info(
    `[zone-edge-audit] database_role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`,
  );
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    const rows = (
      await client.query(
        `
        SELECT
          c.challenge_id,
          c.is_overturned,
          c.location_source,
          COALESCE(c.px, c.inferred_px) AS px,
          COALESCE(c.pz, c.inferred_pz) AS pz,
          resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) AS strike_zone_top,
          resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) AS strike_zone_bottom,
          COALESCE(p.called_description, c.called_description) AS called_description
        FROM abs_challenges c
        JOIN games g ON g.game_pk = c.game_pk
        LEFT JOIN pitches p
          ON p.game_pk = c.game_pk
         AND p.at_bat_index = c.at_bat_index
         AND p.pitch_number = COALESCE(c.pitch_number, c.inferred_pitch_number)
        WHERE g.status_detailed = 'Final'
          AND g.game_date BETWEEN $1::date AND $2::date
          AND c.challenge_team_id IS NOT NULL
        `,
        [SPRING_START, AUDIT_END],
      )
    ).rows.map((row) => {
      const calledPitch = getCalledPitch(row.called_description);
      const direction =
        calledPitch === "called_strike" ? "strike_to_ball" : calledPitch === "ball" ? "ball_to_strike" : "unknown";
      const geometry = {
        px: row.px === null ? null : Number(row.px),
        pz: row.pz === null ? null : Number(row.pz),
        strikeZoneTop: row.strike_zone_top === null ? null : Number(row.strike_zone_top),
        strikeZoneBottom: row.strike_zone_bottom === null ? null : Number(row.strike_zone_bottom),
        calledPitch,
        challengeDirection: direction === "unknown" ? null : direction,
      };
      const missDistance = computeDirectionalZoneDistance(geometry);
      return {
        challengeId: row.challenge_id,
        isOverturned: row.is_overturned,
        locationSource: row.location_source ?? "unknown",
        calledPitch,
        direction,
        missDistance,
        edgeBucket: getEdgeBucketForChallenge(geometry) ?? "unknown",
      };
    });

    const measuredRows = rows.filter((row) => row.missDistance !== null && row.calledPitch);
    const byLocationSource = summarizeBy(rows, (row) => row.locationSource).sort((a, b) => b.rows - a.rows);
    const byEdgeBucket = summarizeBy(measuredRows, (row) => row.edgeBucket).sort((a, b) =>
      ["edge", "near_edge", "clear_miss", "unknown"].indexOf(a.key) -
      ["edge", "near_edge", "clear_miss", "unknown"].indexOf(b.key),
    );
    const byDirectionAndBucket = summarizeBy(measuredRows, (row) => `${row.direction} / ${row.edgeBucket}`).sort(
      (a, b) => b.rows - a.rows,
    );

    const strikeRows = byDirectionAndBucket.reduce((acc, row) => {
      if (row.key.startsWith("strike_to_ball / ")) {
        acc[row.key.replace("strike_to_ball / ", "")] = row.overturnRate;
      }
      return acc;
    }, {});
    const ballRows = byDirectionAndBucket.reduce((acc, row) => {
      if (row.key.startsWith("ball_to_strike / ")) {
        acc[row.key.replace("ball_to_strike / ", "")] = row.overturnRate;
      }
      return acc;
    }, {});

    const report = {
      auditDate: AUDIT_DATE,
      springWindow: { start: SPRING_START, end: AUDIT_END },
      overall: {
        rows: rows.length,
        locationCoverage: measuredRows.length / rows.length,
        reviewedPitchShare: rows.filter((row) => row.locationSource === "reviewed_pitch_px_pz").length / rows.length,
        inferredLocationShare: rows.filter((row) => row.locationSource !== "reviewed_pitch_px_pz").length / rows.length,
      },
      byLocationSource,
      byEdgeBucket,
      byDirectionAndBucket,
      rootCause: {
        missingLocationRows: rows.filter((row) => row.missDistance === null).length,
        reviewedPitchRows: rows.filter((row) => row.locationSource === "reviewed_pitch_px_pz").length,
        inferredRows: rows.filter((row) => row.locationSource !== "reviewed_pitch_px_pz").length,
        strikeToBallMonotonic:
          (strikeRows.edge ?? -1) <= (strikeRows.near_edge ?? -1) &&
          (strikeRows.near_edge ?? -1) <= (strikeRows.clear_miss ?? -1),
        ballToStrikeMonotonic:
          (ballRows.edge ?? -1) <= (ballRows.near_edge ?? -1),
      },
    };

    fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(DOC_PATH, buildMarkdown(report));
    console.log(`Wrote ${DOC_PATH}`);
    console.log(`Wrote ${ARTIFACT_PATH}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

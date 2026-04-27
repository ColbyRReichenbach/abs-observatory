import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  ROOT,
  auditArtifactPath,
  auditDocPath,
  formatAuditDateLabel,
  loadAuditEnv,
  resolveAuditDatabaseUrl,
  describeAuditDatabaseTarget,
} from "./audit-runtime.mjs";

const DOC_PATH = auditDocPath("abs-product-qa", ROOT, AUDIT_DATE);
const ARTIFACT_PATH = auditArtifactPath("abs-product-qa", ROOT, AUDIT_DATE);
const WRITE_ARTIFACTS = process.env.MODEL_AUDIT_WRITE_ARTIFACTS !== "false";

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);
console.log(`[audit:abs-product-qa] role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`);

function toMarkdown(report) {
  const checks = report.checks
    .map(
      (check) =>
        `| ${check.label} | ${check.value} | ${check.status.toUpperCase()} | ${check.note} |`,
    )
    .join("\n");

  return `# ABS Product QA

Date: ${formatAuditDateLabel()}

## Scope

- Post-ingest sanity checks for the shared ABS geometry and player-profile path
- Intended to run before the full model audit suite

## Summary

- Overall status: ${report.ok ? "PASS" : "FAIL"}
- Checks run: ${report.checks.length}

## Checks

| Check | Value | Status | Note |
| --- | --- | --- | --- |
${checks}

## Manual Spot-Check Reminder

- Review one real game page, one umpire page, and one team page after major ABS logic changes.
- Confirm strike-zone visuals, challenge explorer points, and ABS copy all align with the resolved MLB zone profile.
`;
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query("SET statement_timeout = '45s'");

    async function fetchScalar(sql) {
      const result = await client.query(sql);
      return result.rows[0]?.value ?? 0;
    }

    const stats = {
      player_profiles: await fetchScalar(
        "SELECT COUNT(*) AS value FROM players",
      ),
      official_abs_profiles: await fetchScalar(
        `
          SELECT COUNT(*) AS value
          FROM players
          WHERE abs_strike_zone_top IS NOT NULL
            AND abs_strike_zone_bottom IS NOT NULL
        `,
      ),
      challenge_batters: await fetchScalar(
        `
          SELECT COUNT(DISTINCT batter_id) AS value
          FROM mart_abs_pitch_challenges
          WHERE batter_id IS NOT NULL
        `,
      ),
      missing_challenge_profiles: await fetchScalar(
        `
          WITH challenge_batters AS MATERIALIZED (
            SELECT DISTINCT batter_id
            FROM mart_abs_pitch_challenges
            WHERE batter_id IS NOT NULL
          )
          SELECT COUNT(*) AS value
          FROM challenge_batters cb
          LEFT JOIN players p ON p.player_id = cb.batter_id
          WHERE p.player_id IS NULL
        `,
      ),
      unresolved_challenge_zones: await fetchScalar(
        `
          SELECT COUNT(*) AS value
          FROM mart_abs_pitch_challenges c
          WHERE resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) IS NULL
             OR resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NULL
        `,
      ),
      missing_horizontal_locations: await fetchScalar(
        `
          SELECT COUNT(*) AS value
          FROM mart_abs_pitch_challenges c
          WHERE c.resolved_px IS NULL
        `,
      ),
      missing_vertical_locations: await fetchScalar(
        `
          SELECT COUNT(*) AS value
          FROM mart_abs_pitch_challenges c
          WHERE c.resolved_pz IS NULL
        `,
      ),
      serving_lookup_duplicate_keys: await fetchScalar(
        `
          WITH we_dupes AS (
            SELECT 1
            FROM serving_win_expectancy_fallbacks
            GROUP BY fallback_tier, inning, inning_bucket, half_inning, score_diff_bucket, outs, bases_state, count_key
            HAVING COUNT(*) > 1
          ),
          re_dupes AS (
            SELECT 1
            FROM serving_run_expectancy_fallbacks
            GROUP BY fallback_tier, inning_bucket, outs, bases_state, count_key
            HAVING COUNT(*) > 1
          ),
          overturn_dupes AS (
            SELECT 1
            FROM serving_abs_overturn_probability_fallbacks
            GROUP BY fallback_tier, geometry_variant, challenge_direction, edge_bucket
            HAVING COUNT(*) > 1
          )
          SELECT (
            (SELECT COUNT(*) FROM we_dupes)
            + (SELECT COUNT(*) FROM re_dupes)
            + (SELECT COUNT(*) FROM overturn_dupes)
          ) AS value
        `,
      ),
      excluded_non_pitch_reviews: await fetchScalar(
        `
          SELECT COUNT(*) AS value
          FROM mart_abs_challenge_classification
          WHERE is_abs_pitch_challenge = FALSE
            AND effective_pitch_number IS NULL
        `,
      ),
      overturned_direction_mismatches: await fetchScalar(
        `
          SELECT COUNT(*) AS value
          FROM mart_abs_pitch_challenges
          WHERE is_overturned = TRUE
            AND count_challenge_direction IS NOT NULL
            AND challenge_direction IS DISTINCT FROM count_challenge_direction
        `,
      ),
      team_summary_mismatches: await fetchScalar(
        `
          WITH fact AS (
            SELECT
              game_pk,
              challenge_team_id AS team_id,
              COUNT(*) FILTER (WHERE is_overturned = TRUE) AS used_successful,
              COUNT(*) FILTER (WHERE is_overturned = FALSE) AS used_failed
            FROM mart_abs_pitch_challenges
            WHERE challenge_team_id IS NOT NULL
            GROUP BY game_pk, challenge_team_id
          )
          SELECT COUNT(*) AS value
          FROM team_abs_game_summary s
          FULL OUTER JOIN fact f ON f.game_pk = s.game_pk AND f.team_id = s.team_id
          WHERE COALESCE(s.used_successful, 0) <> COALESCE(f.used_successful, 0)
             OR COALESCE(s.used_failed, 0) <> COALESCE(f.used_failed, 0)
        `,
      ),
    };

    const checks = [
      {
        label: "Player profiles present",
        value: Number(stats.player_profiles),
        status: Number(stats.player_profiles) > 0 ? "pass" : "fail",
        note: "Profiles power official ABS top/bottom zone resolution.",
      },
      {
        label: "Official ABS profile coverage",
        value: `${Number(stats.official_abs_profiles)}/${Number(stats.player_profiles)}`,
        status:
          Number(stats.player_profiles) > 0 &&
          Number(stats.official_abs_profiles) === Number(stats.player_profiles)
            ? "pass"
            : "warn",
        note: "Falling back to inferred top/bottom is acceptable temporarily, but should not dominate.",
      },
      {
        label: "Challenge batters missing profile",
        value: Number(stats.missing_challenge_profiles),
        status: Number(stats.missing_challenge_profiles) === 0 ? "pass" : "fail",
        note: "Every challenged batter should map cleanly to a player profile.",
      },
      {
        label: "Challenges with unresolved ABS zone",
        value: Number(stats.unresolved_challenge_zones),
        status: Number(stats.unresolved_challenge_zones) === 0 ? "pass" : "fail",
        note: "Resolved zone top/bottom must exist for every challenge visual and model path.",
      },
      {
        label: "Challenges missing horizontal location",
        value: Number(stats.missing_horizontal_locations),
        status: Number(stats.missing_horizontal_locations) === 0 ? "pass" : "warn",
        note: "Missing px forces weaker geometry reasoning.",
      },
      {
        label: "Challenges missing vertical location",
        value: Number(stats.missing_vertical_locations),
        status: Number(stats.missing_vertical_locations) === 0 ? "pass" : "warn",
        note: "Missing pz forces weaker geometry reasoning.",
      },
      {
        label: "Serving fallback duplicate lookup keys",
        value: Number(stats.serving_lookup_duplicate_keys),
        status: Number(stats.serving_lookup_duplicate_keys) === 0 ? "pass" : "fail",
        note: "Challenge-value marts must join to unique serving fallback rows.",
      },
      {
        label: "Excluded non-pitch reviews",
        value: Number(stats.excluded_non_pitch_reviews),
        status: "pass",
        note: "Raw review rows may exist, but user-facing ABS views must exclude them.",
      },
      {
        label: "Overturned direction mismatches",
        value: Number(stats.overturned_direction_mismatches),
        status: Number(stats.overturned_direction_mismatches) === 0 ? "pass" : "fail",
        note: "Canonical direction must agree with count movement when count movement is available.",
      },
      {
        label: "Team summary mismatches",
        value: Number(stats.team_summary_mismatches),
        status: Number(stats.team_summary_mismatches) === 0 ? "pass" : "fail",
        note: "Team summaries must reconcile to canonical ABS pitch facts.",
      },
    ];

    const report = {
      auditDate: AUDIT_DATE,
      ok: checks.every((check) => check.status !== "fail"),
      checks,
    };

    if (WRITE_ARTIFACTS) {
      fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
      fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(report, null, 2)}\n`);
      fs.writeFileSync(DOC_PATH, toMarkdown(report));
    }

    console.log(JSON.stringify(report, null, 2));

    if (!report.ok) {
      process.exitCode = 1;
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

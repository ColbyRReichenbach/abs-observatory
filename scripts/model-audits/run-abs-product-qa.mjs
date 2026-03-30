import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { AUDIT_DATE, ROOT, auditArtifactPath, auditDocPath, formatAuditDateLabel } from "./audit-runtime.mjs";
import { loadEnvFile } from "./shared-audit-utils.mjs";

const DOC_PATH = auditDocPath("abs-product-qa", ROOT, AUDIT_DATE);
const ARTIFACT_PATH = auditArtifactPath("abs-product-qa", ROOT, AUDIT_DATE);

loadEnvFile(".env");
loadEnvFile(".env.local");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

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
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const stats = (
      await client.query(`
        WITH challenge_batters AS (
          SELECT DISTINCT batter_id
          FROM abs_challenges
          WHERE batter_id IS NOT NULL
        )
        SELECT
          (SELECT COUNT(*) FROM players) AS player_profiles,
          (
            SELECT COUNT(*)
            FROM players
            WHERE abs_strike_zone_top IS NOT NULL
              AND abs_strike_zone_bottom IS NOT NULL
          ) AS official_abs_profiles,
          (SELECT COUNT(*) FROM challenge_batters) AS challenge_batters,
          (
            SELECT COUNT(*)
            FROM challenge_batters cb
            LEFT JOIN players p ON p.player_id = cb.batter_id
            WHERE p.player_id IS NULL
          ) AS missing_challenge_profiles,
          (
            SELECT COUNT(*)
            FROM abs_challenges c
            WHERE resolve_abs_strike_zone_top(c.batter_id, c.strike_zone_top, c.inferred_strike_zone_top) IS NULL
               OR resolve_abs_strike_zone_bottom(c.batter_id, c.strike_zone_bottom, c.inferred_strike_zone_bottom) IS NULL
          ) AS unresolved_challenge_zones,
          (
            SELECT COUNT(*)
            FROM abs_challenges c
            WHERE c.px IS NULL AND c.inferred_px IS NULL
          ) AS missing_horizontal_locations,
          (
            SELECT COUNT(*)
            FROM abs_challenges c
            WHERE c.pz IS NULL AND c.inferred_pz IS NULL
          ) AS missing_vertical_locations
      `)
    ).rows[0];

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
    ];

    const report = {
      auditDate: AUDIT_DATE,
      ok: checks.every((check) => check.status !== "fail"),
      checks,
    };

    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(report, null, 2)}\n`);
    fs.writeFileSync(DOC_PATH, toMarkdown(report));

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

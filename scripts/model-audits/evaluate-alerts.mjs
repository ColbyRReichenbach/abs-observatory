import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  AUDIT_DATE,
  ROOT,
  auditArtifactPath,
  auditDocPath,
  describeAuditDatabaseTarget,
  formatAuditDateLabel,
  loadAuditEnv,
  resolveAuditDatabaseUrl,
} from "./audit-runtime.mjs";

loadAuditEnv();
const DATABASE_URL = resolveAuditDatabaseUrl();
const DATABASE_TARGET = describeAuditDatabaseTarget(DATABASE_URL);

const DOC_PATH = auditDocPath("model-alert-evaluation", ROOT, AUDIT_DATE);
const ARTIFACT_PATH = auditArtifactPath("model-alert-evaluation", ROOT, AUDIT_DATE);

function readArtifact(slug) {
  const artifactPath = auditArtifactPath(slug, ROOT, AUDIT_DATE);
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Missing audit artifact: ${path.relative(ROOT, artifactPath)}`);
  }
  return JSON.parse(fs.readFileSync(artifactPath, "utf8"));
}

function severityFromThreshold(value, thresholds) {
  if (thresholds.high !== undefined && value >= thresholds.high) return "high";
  if (thresholds.medium !== undefined && value >= thresholds.medium) return "medium";
  if (thresholds.low !== undefined && value >= thresholds.low) return "low";
  return null;
}

function absoluteSeverityFromThreshold(value, thresholds) {
  const absValue = Math.abs(value);
  return severityFromThreshold(absValue, thresholds);
}

function lessThanSeverity(value, thresholds) {
  if (thresholds.high !== undefined && value <= thresholds.high) return "high";
  if (thresholds.medium !== undefined && value <= thresholds.medium) return "medium";
  if (thresholds.low !== undefined && value <= thresholds.low) return "low";
  return null;
}

function buildBreaches(artifacts) {
  const breaches = [];
  const push = (breach) => breaches.push(breach);

  if (!artifacts.suite.ok) {
    push({
      alertKey: "suite_failed",
      metricKey: "audit_suite_ok",
      severity: "high",
      comparison: "=",
      observedValue: 0,
      thresholdValue: 1,
      summary: "The full model audit suite did not complete cleanly.",
      recommendedAction: "Fix the failing audit runner before trusting the current model package.",
      details: { failedRuns: artifacts.suite.runs.filter((run) => run.status !== "passed") },
    });
  }

  const qaChecks = new Map(artifacts.qa.checks.map((check) => [check.label, check]));
  const missingProfiles = Number(qaChecks.get("Challenge batters missing profile")?.value ?? 0);
  if (missingProfiles > 0) {
    push({
      alertKey: "abs_missing_profiles",
      metricKey: "challenge_batters_missing_profile",
      severity: "high",
      comparison: ">",
      observedValue: missingProfiles,
      thresholdValue: 0,
      summary: `${missingProfiles} challenged batters are missing a linked player profile.`,
      recommendedAction: "Resync player profiles before trusting ABS-resolved zone bounds in visuals and models.",
      details: { check: "Challenge batters missing profile" },
    });
  }

  const unresolvedZones = Number(qaChecks.get("Challenges with unresolved ABS zone")?.value ?? 0);
  if (unresolvedZones > 0) {
    push({
      alertKey: "abs_unresolved_zones",
      metricKey: "unresolved_abs_zone_challenges",
      severity: "high",
      comparison: ">",
      observedValue: unresolvedZones,
      thresholdValue: 0,
      summary: `${unresolvedZones} challenges failed to resolve an ABS strike-zone profile.`,
      recommendedAction: "Fix zone resolution before tuning downstream overturn or strike-zone visuals.",
      details: { check: "Challenges with unresolved ABS zone" },
    });
  }

  const missingPx = Number(qaChecks.get("Challenges missing horizontal location")?.value ?? 0);
  const missingPz = Number(qaChecks.get("Challenges missing vertical location")?.value ?? 0);
  const missingGeometry = missingPx + missingPz;
  const missingGeometrySeverity = severityFromThreshold(missingGeometry, { medium: 10, low: 1 });
  if (missingGeometrySeverity) {
    push({
      alertKey: "abs_missing_geometry",
      metricKey: "missing_challenge_geometry_fields",
      severity: missingGeometrySeverity,
      comparison: ">=",
      observedValue: missingGeometry,
      thresholdValue: missingGeometrySeverity === "medium" ? 10 : 1,
      summary: `${missingGeometry} challenge geometry fields are missing across px/pz.`,
      recommendedAction: "Monitor source quality; if this grows, inspect ingest or source gaps before reading edge-bucket behavior.",
      details: { missingHorizontal: missingPx, missingVertical: missingPz },
    });
  }

  const weMeanAbsSeverity = severityFromThreshold(Number(artifacts.we.overall.meanAbsDiff ?? 0), {
    high: 0.04,
    medium: 0.03,
  });
  if (weMeanAbsSeverity) {
    push({
      alertKey: "we_mean_abs_gap",
      metricKey: "we_mean_abs_diff",
      severity: weMeanAbsSeverity,
      comparison: ">=",
      observedValue: Number(artifacts.we.overall.meanAbsDiff),
      thresholdValue: weMeanAbsSeverity === "high" ? 0.04 : 0.03,
      summary: "MLB WE benchmark mean absolute gap drifted above the acceptable range.",
      recommendedAction: "Review tied/one-run states and recent low-confidence exact rows before adjusting WE logic.",
      details: { overall: artifacts.we.overall },
    });
  }

  const weBiasSeverity = absoluteSeverityFromThreshold(Number(artifacts.we.overall.meanSignedDiff ?? 0), {
    high: 0.02,
    medium: 0.015,
  });
  if (weBiasSeverity) {
    push({
      alertKey: "we_signed_bias",
      metricKey: "we_mean_signed_diff",
      severity: weBiasSeverity,
      comparison: "abs>=",
      observedValue: Number(artifacts.we.overall.meanSignedDiff),
      thresholdValue: weBiasSeverity === "high" ? 0.02 : 0.015,
      summary: "MLB WE benchmark shows a sustained directional bias relative to MLB.",
      recommendedAction: "Inspect whether home-side optimism or pessimism is concentrating in a specific score/inning bucket.",
      details: { overall: artifacts.we.overall },
    });
  }

  const reBiasSeverity = absoluteSeverityFromThreshold(Number(artifacts.re.overall.meanSignedDiff ?? 0), {
    high: 0.4,
    medium: 0.3,
  });
  if (reBiasSeverity) {
    push({
      alertKey: "re_signed_bias",
      metricKey: "re_mean_signed_diff",
      severity: reBiasSeverity,
      comparison: "abs>=",
      observedValue: Number(artifacts.re.overall.meanSignedDiff),
      thresholdValue: reBiasSeverity === "high" ? 0.4 : 0.3,
      summary: "Run expectancy is showing meaningful directional optimism/pessimism against realized spring runs.",
      recommendedAction: "Recheck high-pressure no-out runner states before retuning the broader RE ladder.",
      details: { overall: artifacts.re.overall },
    });
  }

  const overturnGapSeverity = severityFromThreshold(Number(artifacts.overturn.overall.meanAbsBucketGap ?? 0), {
    high: 0.04,
    medium: 0.025,
  });
  if (overturnGapSeverity) {
    push({
      alertKey: "overturn_bucket_gap",
      metricKey: "overturn_mean_abs_bucket_gap",
      severity: overturnGapSeverity,
      comparison: ">=",
      observedValue: Number(artifacts.overturn.overall.meanAbsBucketGap),
      thresholdValue: overturnGapSeverity === "high" ? 0.04 : 0.025,
      summary: "Overturn calibration bucket gap moved outside the acceptable range.",
      recommendedAction: "Review direction/edge buckets before touching the global overturn model.",
      details: { overall: artifacts.overturn.overall, topGapGroups: artifacts.overturn.topGapGroups?.slice(0, 5) },
    });
  }

  const gradeBucketSeverity = lessThanSeverity(Number(artifacts.rubric.summary.umpireGradeBuckets ?? 0), {
    high: 3,
    medium: 4,
  });
  if (gradeBucketSeverity) {
    push({
      alertKey: "rubric_umpire_grade_compression",
      metricKey: "umpire_grade_bucket_count",
      severity: gradeBucketSeverity,
      comparison: "<=",
      observedValue: Number(artifacts.rubric.summary.umpireGradeBuckets),
      thresholdValue: gradeBucketSeverity === "high" ? 3 : 4,
      summary: "Umpire display grades are collapsing into too few buckets again.",
      recommendedAction: "Review the display-grade mapping before touching the underlying umpire score.",
      details: { summary: artifacts.rubric.summary },
    });
  }

  const topStyleShare = Number(artifacts.rubric.summary.topTeamStyle?.share ?? 0);
  const topStyleSeverity = severityFromThreshold(topStyleShare, { high: 0.8, medium: 0.7 });
  if (topStyleSeverity) {
    push({
      alertKey: "rubric_team_style_dominance",
      metricKey: "top_team_style_share",
      severity: topStyleSeverity,
      comparison: ">=",
      observedValue: topStyleShare,
      thresholdValue: topStyleSeverity === "high" ? 0.8 : 0.7,
      summary: "One team-style label is dominating the distribution too heavily.",
      recommendedAction: "Check whether team-style thresholds are collapsing the public story into one label family.",
      details: { topTeamStyle: artifacts.rubric.summary.topTeamStyle },
    });
  }

  return breaches;
}

function toMarkdown(summary) {
  const rows = summary.alerts.length
    ? summary.alerts
        .map(
          (alert) =>
            `| ${alert.alertKey} | ${alert.severity.toUpperCase()} | ${alert.metricKey} | ${alert.observedValue ?? "—"} | ${alert.thresholdValue ?? "—"} | ${alert.consecutiveBreachCount} | ${alert.summary} |`,
        )
        .join("\n")
    : "| None | — | — | — | — | — | No thresholds breached |";

  return `# Model Alert Evaluation

Date: ${formatAuditDateLabel()}

## Overview

- Evaluation status: ${summary.ok ? "PASS" : "ALERTS OPEN"}
- Alerts created this run: ${summary.alerts.length}
- Triggered by: ${summary.triggeredBy}

## Alerts

| Alert Key | Severity | Metric | Observed | Threshold | Consecutive | Summary |
| --- | --- | --- | --- | --- | --- | --- |
${rows}
`;
}

async function main() {
  console.info(
    `[model-alert-evaluation] database_role=${DATABASE_TARGET.role} host=${DATABASE_TARGET.host} db=${DATABASE_TARGET.database}`,
  );
  const artifacts = {
    suite: readArtifact("audit-suite-summary"),
    qa: readArtifact("abs-product-qa"),
    we: readArtifact("mlb-we-benchmark"),
    re: readArtifact("re-benchmark"),
    overturn: readArtifact("overturn-calibration"),
    rubric: readArtifact("rubric-audit"),
  };

  const breaches = buildBreaches(artifacts);
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();

  try {
    await client.query("BEGIN");

    const runRow = (
      await client.query(
        `
        INSERT INTO ops.model_audit_runs (audit_date, triggered_by, job_run_id, suite_ok, summary, updated_at)
        VALUES ($1::date, $2, $3::uuid, $4, $5::jsonb, NOW())
        ON CONFLICT (audit_date)
        DO UPDATE SET
          triggered_by = EXCLUDED.triggered_by,
          job_run_id = EXCLUDED.job_run_id,
          suite_ok = EXCLUDED.suite_ok,
          summary = EXCLUDED.summary,
          updated_at = NOW()
        RETURNING audit_run_id
        `,
        [
          AUDIT_DATE,
          process.env.MODEL_AUDIT_TRIGGERED_BY ?? "manual",
          process.env.MODEL_AUDIT_JOB_RUN_ID ?? null,
          breaches.length === 0,
          JSON.stringify({
            suiteOk: artifacts.suite.ok,
            alertsCreated: breaches.length,
          }),
        ],
      )
    ).rows[0];

    const auditRunId = runRow.audit_run_id;
    const alertKeys = breaches.map((breach) => breach.alertKey);

    for (const breach of breaches) {
      const previous = (
        await client.query(
          `
          SELECT a.consecutive_breach_count, a.status
          FROM ops.model_audit_alerts a
          JOIN ops.model_audit_runs r ON r.audit_run_id = a.audit_run_id
          WHERE a.alert_key = $1
            AND r.audit_date < $2::date
          ORDER BY r.audit_date DESC, a.created_at DESC
          LIMIT 1
          `,
          [breach.alertKey, AUDIT_DATE],
        )
      ).rows[0];

      const consecutiveCount =
        previous && previous.status !== "resolved" ? Number(previous.consecutive_breach_count) + 1 : 1;

      await client.query(
        `
        INSERT INTO ops.model_audit_alerts (
          audit_run_id,
          alert_key,
          metric_key,
          severity,
          status,
          comparison,
          observed_value,
          threshold_value,
          consecutive_breach_count,
          summary,
          recommended_action,
          details
        )
        VALUES ($1, $2, $3, $4, 'new', $5, $6, $7, $8, $9, $10, $11::jsonb)
        ON CONFLICT (audit_run_id, alert_key)
        DO UPDATE SET
          metric_key = EXCLUDED.metric_key,
          severity = EXCLUDED.severity,
          status = 'new',
          comparison = EXCLUDED.comparison,
          observed_value = EXCLUDED.observed_value,
          threshold_value = EXCLUDED.threshold_value,
          consecutive_breach_count = EXCLUDED.consecutive_breach_count,
          summary = EXCLUDED.summary,
          recommended_action = EXCLUDED.recommended_action,
          details = EXCLUDED.details,
          updated_at = NOW(),
          resolved_at = NULL
        `,
        [
          auditRunId,
          breach.alertKey,
          breach.metricKey,
          breach.severity,
          breach.comparison,
          breach.observedValue ?? null,
          breach.thresholdValue ?? null,
          consecutiveCount,
          breach.summary,
          breach.recommendedAction ?? null,
          JSON.stringify({
            ...breach.details,
            artifactDate: AUDIT_DATE,
          }),
        ],
      );
    }

    if (alertKeys.length === 0) {
      await client.query(
        `
        UPDATE ops.model_audit_alerts
        SET
          status = 'resolved',
          updated_at = NOW(),
          resolved_at = NOW()
        WHERE status IN ('new', 'triaged')
        `,
      );
    } else {
      await client.query(
        `
        UPDATE ops.model_audit_alerts
        SET
          status = 'resolved',
          updated_at = NOW(),
          resolved_at = NOW()
        WHERE alert_key NOT IN (${alertKeys.map((_, index) => `$${index + 1}`).join(", ")})
          AND status IN ('new', 'triaged')
        `,
        alertKeys,
      );
    }

    await client.query("COMMIT");

    const summary = {
      auditDate: AUDIT_DATE,
      ok: breaches.length === 0,
      triggeredBy: process.env.MODEL_AUDIT_TRIGGERED_BY ?? "manual",
      alerts: (
        await client.query(
          `
          SELECT alert_key, consecutive_breach_count
          FROM ops.model_audit_alerts
          WHERE audit_run_id = $1
          `,
          [auditRunId],
        )
      ).rows.map((row) => ({
        ...breaches.find((breach) => breach.alertKey === row.alert_key),
        consecutiveBreachCount: Number(row.consecutive_breach_count),
      })),
    };

    fs.mkdirSync(path.dirname(ARTIFACT_PATH), { recursive: true });
    fs.writeFileSync(ARTIFACT_PATH, `${JSON.stringify(summary, null, 2)}\n`);
    fs.writeFileSync(DOC_PATH, toMarkdown(summary));
    console.log(JSON.stringify(summary, null, 2));

    if (!summary.ok) {
      process.exitCode = 0;
    }
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

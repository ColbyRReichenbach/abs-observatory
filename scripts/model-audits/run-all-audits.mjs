import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { AUDIT_DATE, ROOT, auditArtifactPath, auditDocPath, formatAuditDateLabel } from "./audit-runtime.mjs";

const SUITE = [
  { slug: "abs-product-qa", label: "ABS product QA", script: "run-abs-product-qa.mjs" },
  { slug: "current-state-audit", label: "Current-state audit", script: "run-current-state-audit.mjs" },
  { slug: "re-benchmark", label: "RE benchmark", script: "run-re-benchmark.mjs" },
  { slug: "we-benchmark", label: "WE benchmark", script: "run-we-benchmark.mjs" },
  { slug: "mlb-we-benchmark", label: "MLB WE benchmark", script: "run-mlb-we-benchmark.mjs" },
  { slug: "overturn-calibration", label: "Overturn calibration", script: "run-overturn-calibration.mjs" },
  { slug: "rubric-audit", label: "Rubric audit", script: "run-rubric-audit.mjs" },
  { slug: "leverage-audit", label: "Leverage audit", script: "run-leverage-audit.mjs" },
  { slug: "controversy-audit", label: "Controversy audit", script: "run-controversy-audit.mjs" },
  { slug: "decision-value-audit", label: "Decision-value audit", script: "run-decision-value-audit.mjs" },
  { slug: "zone-edge-audit", label: "Zone-edge audit", script: "run-zone-edge-audit.mjs" },
];

const SUMMARY_DOC_PATH = auditDocPath("audit-suite-summary", ROOT, AUDIT_DATE);
const SUMMARY_ARTIFACT_PATH = auditArtifactPath("audit-suite-summary", ROOT, AUDIT_DATE);

function runAudit(entry) {
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", "model-audits", entry.script)], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
  });
  const durationMs = Date.now() - startedAt;
  const stdout = (result.stdout ?? "").trim();
  const stderr = (result.stderr ?? "").trim();
  return {
    slug: entry.slug,
    label: entry.label,
    script: entry.script,
    status: result.status === 0 ? "passed" : "failed",
    exitCode: result.status ?? 1,
    durationMs,
    artifactPath: path.relative(ROOT, auditArtifactPath(entry.slug, ROOT, AUDIT_DATE)),
    markdownPath: path.relative(ROOT, auditDocPath(entry.slug, ROOT, AUDIT_DATE)),
    stdoutPreview: stdout.split("\n").slice(-8).join("\n"),
    stderrPreview: stderr.split("\n").slice(-8).join("\n"),
  };
}

function toMarkdown(summary) {
  const rows = summary.runs
    .map(
      (run) =>
        `| ${run.label} | ${run.status.toUpperCase()} | ${run.durationMs} ms | ${run.markdownPath} | ${run.artifactPath} |`,
    )
    .join("\n");

  const failed = summary.runs.filter((run) => run.status === "failed");
  const failureSection = failed.length
    ? `## Failures

${failed
  .map(
    (run) => `### ${run.label}

\`\`\`
${run.stderrPreview || run.stdoutPreview || "No output captured"}
\`\`\``,
  )
  .join("\n\n")}
`
    : "## Failures\n\n- None\n";

  return `# Audit Suite Summary

Date: ${formatAuditDateLabel()}

## Overview

- Suite status: ${summary.ok ? "PASS" : "FAIL"}
- Steps run: ${summary.runs.length}

## Runs

| Audit | Status | Duration | Markdown | Artifact |
| --- | --- | --- | --- | --- |
${rows}

${failureSection}
`;
}

function main() {
  const runs = SUITE.map(runAudit);
  const summary = {
    auditDate: AUDIT_DATE,
    ok: runs.every((run) => run.status === "passed"),
    runs,
  };

  fs.mkdirSync(path.dirname(SUMMARY_ARTIFACT_PATH), { recursive: true });
  fs.writeFileSync(SUMMARY_ARTIFACT_PATH, `${JSON.stringify(summary, null, 2)}\n`);
  fs.writeFileSync(SUMMARY_DOC_PATH, toMarkdown(summary));

  console.log(JSON.stringify(summary, null, 2));

  if (!summary.ok) {
    process.exitCode = 1;
  }
}

main();

# Model Operating Procedure

Last updated: March 23, 2026

This is the default analyst workflow after ABS data refreshes. The goal is to make model review repeatable, evidence-based, and easy to hand off.

## Core Principle

Do not tune models from a screenshot or one ugly chart. Refresh data, run the QA and audit suite, read the dated artifacts, then decide whether the evidence warrants a change.

## Standard Post-Ingest Run

After ingest completes and final games are available:

```bash
npm run qa:abs
npm run model:audit:all
npm run model:audit:evaluate-alerts
```

This writes a full dated package into:

- `docs/models/audits/`
- `docs/models/audits/artifacts/`

## What `qa:abs` Checks

- player profile coverage for challenged batters
- official ABS top/bottom profile coverage
- unresolved strike-zone resolver gaps
- missing pitch-location geometry on challenges

This is the fast gate that answers: “Can the ABS-sensitive visuals and model logic be trusted before we even read the deeper audit outputs?”

## What `model:audit:all` Runs

- ABS product QA
- current-state audit
- RE benchmark
- MLB WE benchmark
- overturn calibration
- rubric audit
- leverage audit
- controversy audit
- decision-value audit
- zone-edge audit

The suite also writes a dated audit summary that shows pass/fail status and links to the per-model artifacts.

## What `model:audit:evaluate-alerts` Does

- reads the latest dated audit artifacts
- compares the highest-signal benchmark and QA metrics against thresholds
- writes alert rows into `ops.model_audit_runs` and `ops.model_audit_alerts`
- resolves older open alerts automatically when the latest run no longer breaches

The same evaluation can also be queued from `/admin/ai` so the threshold review runs through the existing async job system.

## Review Cadence

### Daily or post-refresh

- run `qa:abs`
- run `model:audit:all`
- scan the latest summary plus any audit that moved materially

### Weekly analyst review

- compare the latest audit package to the prior week
- summarize:
  - no change
  - monitor
  - recalibrate
  - rebuild

## Override Date

By default, the suite writes artifacts for the current New York date.

To backfill or rerun a specific day:

```bash
MODEL_AUDIT_DATE=2026-03-23 npm run model:audit:all
```

Optional audit-end override:

```bash
MODEL_AUDIT_DATE=2026-03-23 MODEL_AUDIT_END=2026-03-23 npm run model:audit:all
```

## Manual Product Spot Check

Even with the automated suite, major ABS logic changes should still be visually checked on:

- one game page
- one umpire page
- one team page
- one strike-zone-heavy surface

The automated suite protects the model layer. The manual check protects the story the product is telling with that model.

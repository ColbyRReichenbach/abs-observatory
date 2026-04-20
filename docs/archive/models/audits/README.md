# Model Audits

Last updated: March 23, 2026

This folder stores dated model audits.

Each audit should capture:

- audit window
- data source window
- exact questions being tested
- scripts or queries used
- artifacts produced
- findings
- follow-up actions

## Naming Convention

Use dated files:

- `YYYY-MM-DD-baseline-reconstruction.md`
- `YYYY-MM-DD-current-state-audit.md`
- `YYYY-MM-DD-benchmark-comparison.md`
- `YYYY-MM-DD-re-benchmark.md`
- `YYYY-MM-DD-mlb-we-benchmark.md`

## Audit Types

### Baseline reconstruction

Used when documenting the origin state after the fact.

These must explicitly say:

- reconstructed from code/docs/commits
- not a contemporaneous analyst record

### Current-state audit

Used for empirical checks against the live model and current data window.

Expected sections:

- coverage and fallback usage
- calibration checks
- monotonicity checks
- rubric distribution checks
- recommended changes

### Benchmark comparison

Used for comparisons against external references such as MLB public win-probability context, or against realized out-of-sample outcomes when no comparable public benchmark exists.

These should treat the external source as a benchmark, not unquestioned truth.

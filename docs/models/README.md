# Model Audit Framework

Last updated: March 23, 2026

This folder tracks the analyst trail behind AiBS model work.

It is intended to answer four questions:

1. what the model layer originally looked like
2. what data volume and limitations existed at the time
3. what audits were run as coverage improved
4. what changed because of those audits

## Folder Layout

- `model-history.md`
  - reconstructed lineage of the shared RE, WE/WPA, overturn-probability, and rubric layers
- `audits/`
  - dated audit documents and current-state audit plans
- `benchmarking-plan.md`
  - external-comparison policy, including MLB benchmark strategy
- `audit-cadence.md`
  - repeatable daily and weekly audit workflow as the data window grows

## Ground Rules

- Baseline history can be reconstructed from code, docs, and commits, but it must be labeled as reconstruction when it was not captured contemporaneously.
- Forward audits should be reproducible and tied to real scripts, queries, or saved artifacts.
- Model audits should separate:
  - shared model quality
  - benchmark comparison
  - product-layer rubric/descriptor calibration
- Any major model or rubric change should reference:
  - the audit that justified it
  - the code touched
  - the data window used

## Current Focus

The next audit cycle should use the expanded spring-training sample through March 22, 2026 to review:

- run expectancy coverage and fallback behavior
- win expectancy / WPA coverage and fallback behavior
- overturn-probability calibration
- decision-value behavior
- rubric output distribution

That current-state audit should become the first fully reproducible audit in this folder, with the baseline documented beside it so future changes have a clear starting point.

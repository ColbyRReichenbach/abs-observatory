# Current-State Audit Plan

Status: `Executed`

Final audit output:

- `docs/models/audits/2026-03-23-current-state-audit.md`
- `docs/models/audits/artifacts/2026-03-23-current-state-audit.json`

High-level outcome:

- RE and WE exact coverage are both strong enough to trust the current spring sample as a real model audit window.
- Decision value is almost entirely using the full WE path rather than falling back to heuristics.
- Rubric spread is no longer collapsed into a single label family.
- The audit-identified SQL follow-up on overturn exact-edge rows has now been completed in the mart layer, so the next model step is external benchmarking rather than more internal SQL cleanup.

Date: March 23, 2026

## Audit Window

- Data window: February 20, 2026 through March 22, 2026
- Scope: shared RE, WE/WPA, overturn-probability, decision-value, and rubric layers

## Goal

Use the broader spring-training sample to determine whether the current shared model layer still looks defensible, and identify whether the next changes belong in:

- mart/model recalibration
- fallback policy
- heuristic decision-value logic
- rubric thresholds and descriptor compression

## Audit Phases

### Phase 1: Coverage And Fallback Usage

Questions:

- how much of the resolved traffic is exact-state vs fallback-state
- which fallback tiers dominate by model
- where are confidence bands still weak
- are there high-traffic states still relying on coarse buckets

Deliverables:

- RE fallback-tier usage table
- WE fallback-tier usage table
- confidence-band distribution
- sparse-state inventory

### Phase 2: Calibration And Monotonicity

Questions:

- does WE respond sensibly to inning, score, and base/out pressure
- does RE respond sensibly to base/out and count-state differences
- is overturn probability reasonably calibrated by predicted bucket
- does expected decision value point in the same direction as realized outcomes often enough to remain trustworthy

Deliverables:

- WE monotonicity checks
- RE monotonicity checks
- overturn-probability calibration buckets
- expected-vs-realized challenge-value summaries

### Phase 3: Rubric Distribution Audit

Questions:

- are umpire grades clustering too tightly
- are org risk tiers too aggressive or too compressed
- are team styles still producing meaningful separation
- are controversy/top-moment layers overrating drama relative to modeled value

Deliverables:

- grade distribution summary
- risk-tier distribution summary
- team-style distribution summary
- controversy/ranking outlier review

## Evidence To Produce

Each phase should produce:

- a saved artifact or query output
- a short findings summary
- recommended next action:
  - no change
  - investigate further
  - recalibrate
  - document limitation

## Success Standard

The model layer should be able to answer:

- where exact empirical coverage is strong
- where fallback dependence remains acceptable
- where the model is weak but honestly labeled
- where a real recalibration is justified by data instead of aesthetics

# Model Audit Cadence

Last updated: March 23, 2026

This document defines the repeatable analyst workflow for AiBS model audits as data grows through spring training and the regular season.

## Operating Principle

Model changes should be driven by reproducible audit evidence, not by isolated screenshots or anecdotal bad states.

Each audit cycle should leave behind:

- a runnable script
- a dated markdown report
- a dated JSON artifact
- a short recommendation:
  - no change
  - monitor
  - recalibrate
  - rebuild

## Daily Post-Refresh Checks

Run after the day’s data ingest is complete and final games are available:

```bash
npm run qa:abs
npm run model:audit:all
npm run model:audit:evaluate-alerts
```

Manual single-audit reruns are still available when deeper drilldown is needed:

```bash
npm run model:audit:current
npm run model:audit:controversy
npm run model:audit:decision-value
npm run model:audit:leverage
npm run model:audit:re-benchmark
npm run model:audit:mlb-we-benchmark
npm run model:audit:overturn-calibration
npm run model:audit:rubric
npm run model:audit:zone-edge
```

Daily review questions:

- did RE or WE fallback usage shift materially
- did sparse-state dependence increase
- did any benchmark gap move enough to justify deeper review
- did new outlier states appear repeatedly

Daily outputs should be reviewed quickly and only escalated when:

- mean error rises materially
- p90 error rises materially
- new high-volume outlier states appear
- benchmark bias moves in one direction for multiple consecutive runs

## Weekly Analyst Review

Once per week, review the accumulated daily artifacts together.

Weekly review should focus on:

- RE divergence / convergence state groups
- WE divergence / convergence state groups
- overturn-probability calibration buckets
- decision-value expected-vs-realized behavior
- rubric distribution drift

Weekly decisions:

- keep current model
- tighten fallback rules
- add blending / shrinkage
- expand state buckets
- add more training data
- retune rubric thresholds

## After Major Data Milestones

Run a deeper audit when:

- spring training sample materially expands
- first regular-season week completes
- first month of regular season completes
- model logic changes
- new benchmark layers are introduced

Expected deliverables:

- refreshed benchmark artifact
- updated audit markdown
- explicit change log in `docs/archive/models/audits/`
- linked code commit if the model changes

## Reporting Standard

Each audit report should say:

- what data window was used
- what model layer was tested
- what comparison target was used
- what the largest divergences were
- whether the issue is:
  - sparse exact states
  - thin fallback buckets
  - broad model bias
  - benchmark mismatch
  - rubric overstatement

## Current Coverage

Currently implemented:

- ABS post-ingest product QA
- current-state internal audit
- controversy ranking audit
- decision-value composite audit
- leverage benchmark against internal WE pressure
- spring RE benchmark against realized inning outcomes
- spring WE benchmark against MLB public win probability
- overturn-probability calibration audit
- rubric distribution / threshold audit
- zone / edge geometry audit

Next audits to add:

- threshold-based alerting for repeated audit breaches

See also:

- [operating-procedure.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/operating-procedure.md)

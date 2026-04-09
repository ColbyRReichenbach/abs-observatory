# Publication Checklist

Current status: not ready for external statistical publication.

This checklist is the final gate for external methodology, model, or org-facing publication claims. Product-launch checks can live elsewhere. This document is for statistical, data, and governance readiness.

## Current Blockers

- [ ] `Challenge-now` remains below publication standard for autonomous policy claims.
- [ ] `Overturn probability` geometry choice is still provisional.
- [ ] Model cards need periodic refresh as the 2026 sample grows.
- [ ] Claim boundaries and evidence package still need a final editorial pass before external publication.

## Data Platform And Governance

- [x] Warehouse and serving databases are separated by contract.
- [x] Warehouse is the canonical ingest and modeling authority.
- [x] Serving is populated by controlled publish logic, not ad hoc querying.
- [x] Historical Statcast backbone is present in Warehouse.
- [x] 2026 ABS challenge data is present in Warehouse.
- [x] `modeling.called_pitch_decisions` exists and is split-materialized.
- [x] Base-state and score context are complete for the current called-pitch dataset.
- [x] Warehouse/serving reconciliation tooling exists.
- [x] Publish manifests exist.
- [ ] Automated drift alerting is fully hardened for ongoing ops.

## Leakage And Split Control

- [x] `historical_pitch_states` uses explicit split governance.
- [x] `called_pitch_decisions` uses explicit split governance.
- [x] RE audit uses train-only fit against held-out rows.
- [x] WE audit uses train-only fit against held-out rows.
- [x] Overturn calibration uses train / validation / test separation.
- [x] Challenge-now audit scores the full held-out opportunity set rather than only actual challenges.
- [ ] Counterfactual policy-evaluation design is mature enough for strong org-facing deployment claims.

## Active Model Cards

- [x] Called-pitch geometry card written.
- [x] Count-state value card written.
- [x] Run expectancy card written.
- [x] Win expectancy card written.
- [x] Overturn probability card written.
- [x] Challenge-now policy card written.
- [x] Leverage card written.
- [x] Rubrics and descriptors card written.
- [x] Controversy card written.

## Audit Evidence

- [x] Count-state audit refreshed:
  - [2026-04-08-count-state-audit.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-count-state-audit.md)
- [x] RE benchmark refreshed:
  - [2026-04-08-re-benchmark.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-re-benchmark.md)
- [x] WE benchmark refreshed:
  - [2026-04-08-we-benchmark.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-we-benchmark.md)
- [x] MLB WE benchmark retained as secondary evidence:
  - [2026-04-08-mlb-we-benchmark.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-mlb-we-benchmark.md)
- [x] Overturn calibration refreshed:
  - [2026-04-08-overturn-calibration.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-overturn-calibration.md)
- [x] Decision-value audit refreshed:
  - [2026-04-08-decision-value-audit.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-decision-value-audit.md)
- [x] Inventory-cost audit refreshed:
  - [2026-04-08-inventory-cost-audit.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-inventory-cost-audit.md)
- [x] Leverage audit refreshed:
  - [2026-04-08-leverage-audit.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-leverage-audit.md)
- [x] Controversy audit refreshed:
  - [2026-04-08-controversy-audit.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-controversy-audit.md)
- [x] Rubric audit refreshed:
  - [2026-04-08-rubric-audit.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/audits/2026-04-08-rubric-audit.md)

## Claim Boundaries

- [x] Leverage is described as a heuristic pressure proxy, not a calibrated predictive model.
- [x] Rubrics are described as descriptive translation layers, not predictive truth.
- [x] Controversy is described as an editorial ranking layer, not a predictive model.
- [x] MLB public WE is described as secondary external shape validation, not training truth.
- [x] Overturn geometry is described as provisional.
- [ ] Challenge-now is limited to experimental fan-facing/live framing and postgame retrospective analysis until stronger policy evaluation exists.

## Release Decision

- [ ] All unchecked blocker items above are resolved.
- [ ] Publication copy is reviewed against current evidence and model cards.
- [ ] External-facing claims are narrower than the evidence, not broader.
- [ ] Final publication package cites the dated audit files directly.

# Final Sprint Plan

Date: April 8, 2026

Purpose:

- close the remaining yellow and red publication blockers
- distinguish data-maturity problems from methodology problems
- define the exact final sprint before any external statistical publication

## Executive Priority Order

1. Called-pitch geometry decision
2. Overturn uncertainty and calibration refinement
3. Challenge-now policy-evaluation refinement
4. Final publication copy review

## Workstream 1: Called-Pitch Geometry

Current rating:

- `yellow`

Why:

- validation favored `center_only`
- held-out test slightly favored `radius_adjusted`
- current evidence is not decisive enough to claim final geometry truth

Primary problem type:

- mixed `data maturity + validation design`

Targeted fixes:

1. segment geometry comparison by:
   - challenge direction
   - edge bucket
   - competition phase
2. add confidence intervals to the geometry head-to-head comparison
3. keep both geometry variants in the dataset until one variant is clearly preferred
4. update the model card and readiness memo with the current winner only if the split evidence becomes materially clearer

Primary file targets:

- [report_called_pitch_geometry_validation.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/report_called_pitch_geometry_validation.py)
- [called-pitch-geometry.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/model-cards/called-pitch-geometry.md)
- [publication-readiness.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/publication-readiness.md)

Acceptance criteria:

- geometry comparison includes segmented analysis
- geometry comparison includes interval framing, not only point metrics
- publication docs still describe geometry as provisional unless the evidence clearly separates

Current progress:

- segmented interval-backed validation is now in place
- first segmented pass points more strongly toward `center_only`
- final closure still depends on more regular-season evidence

## Workstream 2: Overturn Probability

Current rating:

- `yellow`

Why:

- held-out framework is now correct
- geometry input is still provisional
- calibration is usable, but still light for external claims

Primary problem type:

- mostly `calibration refinement + additional evidence`

Targeted fixes:

1. add confidence intervals by:
   - predicted bucket
   - challenge direction
   - edge bucket
2. expose sparse-group uncertainty more honestly in outputs and docs
3. keep geometry version and fallback tier visible in all scored outputs
4. rerun held-out calibration after new regular-season sample refreshes

Primary file targets:

- [run-overturn-calibration.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-overturn-calibration.mjs)
- [overturn-probability.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/model-cards/overturn-probability.md)
- [publication-readiness.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/publication-readiness.md)

Acceptance criteria:

- audit tables include interval framing
- docs no longer imply precision that the sample does not support
- overturn remains clearly held-out and challenge-time-only

## Workstream 3: Challenge-Now Policy

Current rating:

- `red`

Why:

- the policy is structurally much better than before
- but current policy evaluation is still descriptive, not causal
- the inventory layer is improved, but not strong enough for autonomous or org-grade deployment claims

Primary problem type:

- mostly `methodology and evaluation design`, not raw data absence

Targeted fixes:

1. keep challenge-now framed as decision support
2. route current product usage toward:
   - experimental fan-facing live discussion
   - postgame challenge evaluation
   - missed-opportunity review
3. avoid more org-grade optimization tuning unless new evidence materially changes the policy readout
4. only promote the model out of `red` once the policy readout is credible enough to support stronger decision-quality claims

Primary file targets:

- [run-decision-value-audit.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-decision-value-audit.mjs)
- [challenge-now-policy.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/model-cards/challenge-now-policy.md)
- [publication-checklist.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/publication-checklist.md)
- [publication-readiness.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/publication-readiness.md)

Acceptance criteria:

- policy audit explicitly states recommendation-rate behavior under tested inventory assumptions
- docs keep the layer below autonomous deployment claims
- claim boundary remains narrower than the evidence

Current progress:

- threshold-envelope reporting is now in the audit
- recommendation-rate behavior is more transparent than before
- team-game budget-constrained reporting is now in the audit
- `called_pitch_decisions` now carries canonical batting, fielding, opportunity-team, and actual-challenge-team identifiers
- the current validation slice still shows no overlap between budget-selected and historically challenged rows
- the unresolved gap is still the lack of stronger counterfactual or causal policy evidence
- because of that, the current recommended product framing is:
  - experimental live/fan lens
  - serious retrospective postgame analysis
  - not org-grade live optimization

## Workstream 4: Final Publication Pass

Current rating:

- `open governance task`

Why:

- the code and audits are much stronger now
- remaining failure mode is overstating what they prove

Primary problem type:

- `editorial / governance`

Targeted fixes:

1. align external copy to the readiness memo
2. ensure publication artifacts cite dated audits directly
3. ensure no doc claims stronger than the model cards allow
4. mark any remaining yellow/red items explicitly in the publication package

Primary file targets:

- [publication-checklist.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/publication-checklist.md)
- [publication-readiness.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/publication-readiness.md)
- [model-cards/README.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/model-cards/README.md)

Acceptance criteria:

- every external claim maps cleanly to an audit artifact
- every yellow/red item is disclosed honestly
- publication recommendation can be made without caveat inflation

## Summary Judgment

What needs more data:

- geometry separation confidence
- overturn calibration stability

What needs better modeling or evaluation design:

- challenge-now policy evidence
- uncertainty communication
- final publication copy discipline

What should be paused for now:

- further org-grade live challenge-now optimization work that depends on stronger causal evidence than the current public-data setup can support

This is a strong place to be. The main remaining work is no longer building the stack from scratch. It is making the last few claims honest, measurable, and hard to poke holes in.

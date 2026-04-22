# Model Refresh Comparison

Date: March 25, 2026

## Goal

Evaluate a historical-data refresh of the run expectancy and win expectancy fallback marts and only promote the change if it improved the audited product surface.

## Baseline

- Audit suite: `MODEL_AUDIT_DATE=2026-03-25 npm run model:audit:all`
- Archived in:
  - `.runtime/audits-baseline`

## Candidate 1

- Approach:
  - broad recency weighting across historical states
  - shrinkage applied across exact and fallback tiers
  - materialized marts for heavy fallback lookups
- Result:
  - rejected
- Why:
  - modest RE improvement
  - MLB WE benchmark regression
  - weaker decision-value alignment
- Archived in:
  - `.runtime/audits-candidate`

## Candidate 2

- Approach:
  - baseline marts preserved for medium/high-confidence states
  - only exact rows with very small samples are blended with broader priors
  - fallback tiers remain on baseline aggregation behavior
- Result:
  - promoted locally
- Why:
  - MLB WE benchmark stayed flat to microscopically better
  - RE benchmark stayed unchanged
  - full audit suite passed

## Key Comparison

- MLB WE mean absolute difference:
  - baseline: `0.0249117211`
  - candidate 2: `0.0249116499`
- MLB WE median absolute difference:
  - baseline: `0.0223067916`
  - candidate 2: `0.0223067916`
- RE mean absolute difference:
  - baseline: `0.6034367173`
  - candidate 2: `0.6034367173`
- Decision-value sign agreement:
  - baseline: `0.9377940408`
  - candidate 2: `0.9404077365`

## Promotion Decision

- Keep candidate 2 as the active local model revision.
- Reject candidate 1.
- Publish the promoted serving schema only after the serving sync completes cleanly.


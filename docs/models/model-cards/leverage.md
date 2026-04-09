# Model Card: Leverage

## Summary

- Layer type: heuristic pressure proxy
- Audit source: [2026-04-08-leverage-audit.md](../audits/2026-04-08-leverage-audit.md)
- Current status: active, explicitly heuristic

## Purpose

Provide an interpretable pressure ordering for product storytelling and lightweight filtering.

## Target

None. This is not a probabilistic predictive model.

## Inputs

- inning bucket
- score bucket
- runner state
- outs
- count phase

## Current Evidence

- Sample benchmarked: `1,426` spring ABS challenges
- Pearson correlation with absolute WE swing: `0.190`
- mean abs WE swing:
  - high bucket: `5.5%`
  - medium bucket: `3.3%`
  - low bucket: `2.2%`

## Intended Use

- pressure ordering
- UI labeling
- editorial context

## Disallowed Use

- direct substitution for WE
- policy optimization
- publication claims that leverage is a calibrated model

## Publication Boundary

Safe claim:

- leverage is an estimated pressure proxy that is directionally aligned with WE-backed swing.

Unsafe claim:

- leverage is itself modeled win probability or a calibrated leverage index

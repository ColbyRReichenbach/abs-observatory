# Model Card: Overturn Probability

## Summary

- Layer type: empirical binary classification via grouped fallback rates
- Source table: `modeling.called_pitch_decisions`
- Audit source: [2026-04-08-overturn-calibration.md](../audits/2026-04-08-overturn-calibration.md)
- Current status: active, provisional geometry choice

## Purpose

Estimate `P(overturn | challenge-time information)` for challenge-eligible taken pitches.

## Target

- `overturned`
- `confirmed`

## Training Population

- challenged rows only
- train split for fit
- validation split for geometry selection
- test split for held-out reporting
- split policy: `called_pitch_decisions_phase_time_v1`

## Features

- challenge direction
- geometry variant
- edge bucket
- exact baseball state
- pitch-time context available immediately after the pitch

Current fallback hierarchy:

- `direction + edge bucket`
- `direction only`
- `global`

## Current Evidence

- Challenged rows available: `2,564`
- Train / validation / test: `2,197 / 122 / 245`
- Validation geometry winner: `center_only`

Held-out performance for `center_only`:

- Brier: `0.2519`
- log loss: `0.6970`
- mean absolute bucket gap: `8.3%`

## Serving Contract

- emit probability
- emit fallback tier
- emit geometry version
- keep geometry choice explicit in downstream outputs

## Known Limitations

- sample is still early and only covers 2026 ABS challenges
- geometry variant is not fully settled
- fallback estimates are still relatively coarse

## Publication Boundary

Safe claim:

- AiBS overturn probability is held-out and split-aware, using only challenge-time features.

Unsafe claim:

- the current overturn layer is final, vendor-grade, or fully geometry-settled

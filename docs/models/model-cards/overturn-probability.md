# Model Card: Overturn Probability

## Summary

- Layer type: empirical binary classification via grouped fallback rates
- Source table: `modeling.called_pitch_decisions`
- Audit source: [2026-04-24-overturn-calibration.md](../audits/2026-04-24-overturn-calibration.md)
- Current status: active, canonical/radius product default with diagnostic geometry retained

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
- canonical ABS geometry variant
- edge bucket
- exact baseball state
- pitch-time context available immediately after the pitch

Current fallback hierarchy:

- `direction + edge bucket`
- `direction only`
- `global`

## Current Evidence

- Challenged rows available: `3,448`
- Train / validation / test: `2,197 / 122 / 1,129`
- Validation geometry winner: `center_only` by a very small margin
- Product default: `radius_adjusted` / canonical Savant-compatible geometry

Held-out performance for `radius_adjusted`:

- Brier: `0.2556`
- log loss: `0.7043`

Held-out performance for `center_only`:

- Brier: `0.2567`
- log loss: `0.7067`

## Serving Contract

- emit probability
- emit fallback tier
- emit geometry version
- prefer canonical/radius rows first; fall back to center-only only when canonical rows are unavailable

## Known Limitations

- sample is still early and only covers 2026 ABS challenges
- empirical geometry validation is not fully settled, even though product geometry is canonicalized
- fallback estimates are still relatively coarse

## Publication Boundary

Safe claim:

- AiBS overturn probability is held-out and split-aware, using only challenge-time features.

Unsafe claim:

- the current overturn layer is final, vendor-grade, or fully geometry-settled

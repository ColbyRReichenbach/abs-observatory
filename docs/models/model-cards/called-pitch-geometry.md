# Model Card: Called-Pitch Geometry

## Summary

- Layer type: deterministic geometry foundation
- Current source table: `modeling.called_pitch_decisions`
- Current status: active foundation, canonical public geometry selected

## Purpose

Create a canonical one-row-per-taken-pitch dataset with:

- observed umpire call
- derived ABS-style zone outcome
- edge distance fields
- challenge linkage
- exact pre-pitch baseball context

This layer is the base for overturn probability and challenge-now.

## Population

- Taken pitches only
- Current window in warehouse: spring + early regular season 2026
- Context backfilled from Statcast, Savant ABS, and MLB live-feed tables

## Core Fields

- `observed_call`
- `abs_zone_outcome_center_only`
- `abs_zone_outcome_radius_adjusted`
- `challenge_outcome`
- `bases_state`
- score context
- count
- inning / half / outs
- pitch traits
- split label

## Geometry Policy

One canonical public field drives product behavior:

- `canonical_abs_margin`: Savant `edge_distance_calc` when present, otherwise radius-adjusted ABS edge distance.

Two candidate interpretations are retained for validation and diagnostics:

1. `center_only`
2. `radius_adjusted`

The stack does not claim that public coordinates prove every detail of MLB's internal ABS system. The product contract is narrower: user-facing zone and value surfaces should use the canonical Savant/radius-compatible margin, while diagnostic audits can still compare center-only and radius-adjusted variants.

## Current Evidence

Evidence source:

- [2026-04-24-overturn-calibration.md](../audits/2026-04-24-overturn-calibration.md)

Current readout:

- challenged rows available: `3,448`
- train / validation / test rows: `2,197 / 122 / 1,129`
- validation geometry winner: `center_only` by a very small Brier margin
- held-out test Brier:
  - `center_only`: `0.2567`
  - `radius_adjusted`: `0.2556`

Interpretation:

- validation and test do not cleanly settle the empirical variant choice
- user-facing logic defaults to canonical Savant/radius-compatible geometry because it is the better baseball/ABS contract for public display
- `center_only` remains a diagnostic candidate, not a competing product truth
- geometry evidence should continue to be monitored as the regular-season sample grows

## Known Limitations

- public pitch coordinates may not perfectly match MLB operational ABS internals
- 2026 sample is still early
- current evidence is challenge-linked, not a direct vendor-grade zone-certification study

## Publication Boundary

Safe claim:

- AiBS uses one canonical ABS margin for product logic, backed by Savant edge distance when available and radius-adjusted fallback math when not, while retaining diagnostic geometry variants for validation.

Unsafe claim:

- AiBS has proven the exact MLB internal ABS geometry implementation.

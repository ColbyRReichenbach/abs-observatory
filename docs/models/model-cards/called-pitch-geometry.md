# Model Card: Called-Pitch Geometry

## Summary

- Layer type: deterministic geometry foundation
- Current source table: `modeling.called_pitch_decisions`
- Current status: active foundation, geometry choice still provisional

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

Two candidate interpretations are retained:

1. `center_only`
2. `radius_adjusted`

The stack does not currently claim that either is final ABS truth.

## Current Evidence

Evidence source:

- [2026-04-08-overturn-calibration.md](../audits/2026-04-08-overturn-calibration.md)

Current readout:

- validation geometry winner: `center_only`
- held-out test Brier:
  - `center_only`: `0.2519`
  - `radius_adjusted`: `0.2504`
- segmented challenge-outcome validation still favors `center_only` across:
  - challenge direction
  - competition phase
  - most edge-bucket groupings

Interpretation:

- `center_only` currently wins the selection split
- `radius_adjusted` slightly outperformed on one small held-out Brier readout
- the broader segmented validation still points to `center_only` as the leading candidate
- geometry choice remains provisional until a larger regular-season sample confirms the direction more cleanly

## Known Limitations

- public pitch coordinates may not perfectly match MLB operational ABS internals
- 2026 sample is still early
- current evidence is challenge-linked, not a direct vendor-grade zone-certification study

## Publication Boundary

Safe claim:

- AiBS reconstructs two explicit ABS-style geometry variants and evaluates them against held-out challenged outcomes.

Unsafe claim:

- AiBS has proven the exact MLB internal ABS geometry implementation.

# Model Card: Count-State Value

## Summary

- Layer type: empirical baseline model
- Source table: `historical_pitch_states`
- Audit source: [2026-04-08-count-state-audit.md](../audits/2026-04-08-count-state-audit.md)
- Current status: active and split-governed

## Purpose

Estimate terminal plate-appearance outcome rates by count state so downstream layers can quantify the baseball value of a called-pitch count swing.

## Target

For terminal plate appearances:

- batting average
- walk rate
- strikeout rate
- positive outcome rate

## Population

- One row per terminal plate appearance outcome
- Training source: `mart_count_state_outcome_baselines_train`
- Serving fit source: `mart_count_state_outcome_baselines_train_validation`
- Split policy: `historical_pitch_states_season_holdout_v1`

## Features

- balls
- strikes

This layer is intentionally simple and empirical.

## Current Evidence

- Train terminal PA rows: `985,403`
- Validation terminal PA rows: `183,362`
- Test terminal PA rows: `12,591`

Held-out weighted error:

- validation positive-outcome MAE: `0.35%`
- test positive-outcome MAE: `1.33%`
- validation strikeout-rate MAE: `0.22%`
- test strikeout-rate MAE: `0.78%`

## Serving Contract

- publish from `mart_count_state_outcome_baselines_train_validation`
- never publish in-sample audit baselines as evidence

## Known Limitations

- this is a count-only baseline, not a contextual plate-appearance outcome model
- sparse tail states can still move materially on small forward samples

## Publication Boundary

Safe claim:

- AiBS uses held-out empirical count-state outcome baselines to value count swings.

Unsafe claim:

- Count state alone fully captures pitch-level challenge value.

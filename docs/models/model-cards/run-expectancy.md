# Model Card: Run Expectancy

## Summary

- Layer type: empirical fallback model
- Source table: `historical_pitch_states`
- Audit source: [2026-04-08-re-benchmark.md](../audits/2026-04-08-re-benchmark.md)
- Current status: active and split-governed

## Purpose

Estimate expected runs to inning end from exact baseball state so call reversals can be translated into run value.

## Target

- runs scored from current state to inning end

## State Definition

- inning bucket
- outs
- exact `bases_state`
- count

## Split / Training Policy

- training audit mart: `mart_run_expectancy_fallbacks_train`
- serving fit mart: `mart_run_expectancy_fallbacks`
- split policy: `historical_pitch_states_season_holdout_v1`

## Current Evidence

- Validation rows: `712,528`
- Test rows: `49,854`
- Test distinct state groups: `1,088`

Held-out error:

- validation MAE: `0.032`
- validation RMSE: `0.061`
- test MAE: `0.105`
- test RMSE: `0.199`

## Serving Contract

- serving continues to publish from the train-plus-validation fit
- audit evidence remains train-only versus held-out rows

## Known Limitations

- tail states with tiny forward counts still show large per-state divergence
- uncertainty communication for sparse states should remain explicit

## Publication Boundary

Safe claim:

- AiBS run expectancy is trained and audited with temporal holdout discipline.

Unsafe claim:

- every rare state estimate is equally stable

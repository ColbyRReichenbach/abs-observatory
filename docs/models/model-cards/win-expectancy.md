# Model Card: Win Expectancy

## Summary

- Layer type: empirical fallback model
- Source table: `historical_pitch_states`
- Audit sources:
  - [2026-04-08-we-benchmark.md](../audits/2026-04-08-we-benchmark.md)
  - [2026-04-08-mlb-we-benchmark.md](../audits/2026-04-08-mlb-we-benchmark.md)
- Current status: active and split-governed

## Purpose

Estimate batting-team win probability from exact game state so call reversals can be translated into game-level value.

## Target

- eventual game win indicator for the batting team

## State Definition

- inning and half inning
- outs
- exact `bases_state`
- score bucket / score differential
- count

## Split / Training Policy

- training audit mart: `mart_win_expectancy_fallbacks_train`
- serving fit mart: `mart_win_expectancy_fallbacks`
- split policy: `historical_pitch_states_season_holdout_v1`

## Current Evidence

- Validation rows: `712,528`
- Test rows: `49,854`

Held-out error:

- validation Brier: `1.1%`
- validation log loss: `0.4736`
- test Brier: `5.4%`
- test log loss: `0.4992`
- test MAE: `15.5%`

Secondary benchmark:

- MLB benchmark mean absolute gap: `2.5%`

## Serving Contract

- public product value layers should prefer WE-backed outputs where available
- MLB public WE remains a secondary shape check, not primary truth

## Known Limitations

- tail states remain noisy
- extreme one-row states can still show large absolute divergence
- external MLB WE is not available at full pitch-count resolution

## Publication Boundary

Safe claim:

- AiBS win expectancy is internally validated on held-out seasons and secondarily checked against MLB public WE.

Unsafe claim:

- MLB public WE is the training truth or exact pitch-level validation standard.

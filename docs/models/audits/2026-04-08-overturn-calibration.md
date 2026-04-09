# Overturn Probability Calibration

Date: April 8, 2026

## Scope

- Source table: `modeling.called_pitch_decisions`
- Population: challenged rows only
- Training split: `train`
- Geometry-selection split: `validation`
- Held-out readout: `test`
- Fallback hierarchy: `direction + edge bucket -> direction only -> global`

## Overview

- Challenged rows available: 2564
- Train / validation / test rows: 2197 / 122 / 245
- Split policy: `called_pitch_decisions_phase_time_v1`
- Validation geometry winner: `center_only`
- Validation winner Brier score: 0.2460
- Held-out test Brier score (center_only): 0.2519
- Held-out test log loss (center_only): 0.6970
- Held-out mean absolute bucket gap (center_only): 8.3%

## Geometry Comparison

| Geometry | Validation Rows | Validation Brier | Validation Log Loss | Test Rows | Test Brier | Test Log Loss |
| --- | --- | --- | --- | --- | --- | --- |
| Center Only | 122 | 0.2460 | 0.6850 | 245 | 0.2519 | 0.6970 |
| Radius Adjusted | 122 | 0.2466 | 0.6863 | 245 | 0.2504 | 0.6940 |

## Held-Out Test Calibration By Predicted Bucket (center_only)

| Predicted Bucket | Challenges | Avg Predicted | Realized | Realized 95% CI | Gap |
| --- | --- | --- | --- | --- | --- |
| 40-49% | 72 | 48.8% | 59.7% | 48.2% to 70.3% | +10.88 pts |
| 50-59% | 173 | 55.5% | 49.7% | 42.3% to 57.1% | -5.81 pts |

## Held-Out Test Calibration By Fallback Tier (center_only)

| Fallback Tier | Confidence | Challenges | Avg Predicted | Realized | Realized 95% CI |
| --- | --- | --- | --- | --- | --- |
| exact | high | 238 | 53.7% | 52.1% | 45.8% to 58.4% |
| exact | medium | 7 | 47.9% | 71.4% | 35.9% to 91.8% |

## Held-Out Test Calibration By Direction (center_only)

| Direction | Challenges | Avg Predicted | Realized | Realized 95% CI | Brier |
| --- | --- | --- | --- | --- | --- |
| strike_to_ball | 144 | 56.2% | 54.9% | 46.7% to 62.8% | 0.2524 |
| ball_to_strike | 101 | 49.8% | 49.5% | 40.0% to 59.1% | 0.2513 |

## Held-Out Test Calibration By Edge Bucket (center_only)

| Edge Bucket | Challenges | Avg Predicted | Realized | Realized 95% CI |
| --- | --- | --- | --- | --- |
| lean_confirm | 107 | 54.5% | 52.3% | 43.0% to 61.6% |
| strong_confirm | 73 | 50.4% | 53.4% | 42.1% to 64.4% |
| borderline | 33 | 53.5% | 48.5% | 32.5% to 64.8% |
| lean_overturn | 32 | 57.7% | 56.3% | 39.3% to 71.8% |

## Held-Out Test Calibration By Competition Phase (center_only)

| Phase | Challenges | Avg Predicted | Realized | Realized 95% CI | Brier |
| --- | --- | --- | --- | --- | --- |
| regular_season | 245 | 53.6% | 52.7% | 46.4% to 58.8% | 0.2519 |

## Largest Held-Out Calibration Gaps (center_only)

| Group | Challenges | Avg Predicted | Realized | Realized 95% CI | Abs Gap |
| --- | --- | --- | --- | --- | --- |
| exact / strike_to_ball / strong_confirm | 22 | 49.2% | 72.7% | 51.8% to 86.8% | 23.5% |
| exact / strike_to_ball / borderline | 26 | 55.0% | 42.3% | 25.5% to 61.1% | 12.7% |
| exact / ball_to_strike / strong_confirm | 51 | 50.9% | 45.1% | 32.3% to 58.6% | 5.8% |
| exact / strike_to_ball / lean_confirm | 64 | 58.3% | 53.1% | 41.1% to 64.8% | 5.2% |
| exact / ball_to_strike / lean_confirm | 43 | 48.8% | 51.2% | 36.8% to 65.4% | 2.4% |
| exact / strike_to_ball / lean_overturn | 32 | 57.7% | 56.3% | 39.3% to 71.8% | 1.5% |

## Notes

- This is a held-out calibration audit. No probabilities in the validation or test sections are fit on those same rows.
- The geometry winner is chosen by validation Brier score only. That choice remains provisional because the 2026 sample is still early.
- The current audit is intentionally empirical and challenge-time-only. It does not use post-result fields or future game information.

# Overturn Probability Calibration

Date: April 24, 2026

## Scope

- Source table: `modeling.called_pitch_decisions`
- Population: challenged rows only
- Training split: `train`
- Geometry-selection split: `validation`
- Held-out readout: `test`
- Fallback hierarchy: `direction + edge bucket -> direction only -> global`

## Overview

- Challenged rows available: 3448
- Train / validation / test rows: 2197 / 122 / 1129
- Split policy: `called_pitch_decisions_phase_time_v1`
- Validation geometry winner: `center_only`
- Validation winner Brier score: 0.2460
- Held-out test Brier score (center_only): 0.2567
- Held-out test log loss (center_only): 0.7067
- Held-out mean absolute bucket gap (center_only): 18.1%

## Geometry Comparison

| Geometry | Validation Rows | Validation Brier | Validation Log Loss | Test Rows | Test Brier | Test Log Loss |
| --- | --- | --- | --- | --- | --- | --- |
| Center Only | 122 | 0.2460 | 0.6850 | 1128 | 0.2567 | 0.7067 |
| Radius Adjusted | 122 | 0.2466 | 0.6863 | 1128 | 0.2556 | 0.7043 |

## Held-Out Test Calibration By Predicted Bucket (center_only)

| Predicted Bucket | Challenges | Avg Predicted | Realized | Realized 95% CI | Gap |
| --- | --- | --- | --- | --- | --- |
| 40-49% | 486 | 49.0% | 70.2% | 66.0% to 74.1% | +21.16 pts |
| 50-59% | 642 | 55.6% | 40.5% | 36.8% to 44.3% | -15.10 pts |

## Held-Out Test Calibration By Fallback Tier (center_only)

| Fallback Tier | Confidence | Challenges | Avg Predicted | Realized | Realized 95% CI |
| --- | --- | --- | --- | --- | --- |
| exact | high | 782 | 53.5% | 35.9% | 32.6% to 39.4% |
| direction_only | high | 255 | 52.3% | 99.6% | 97.8% to 99.9% |
| exact | medium | 91 | 47.9% | 72.5% | 62.6% to 80.6% |

## Held-Out Test Calibration By Direction (center_only)

| Direction | Challenges | Avg Predicted | Realized | Realized 95% CI | Brier |
| --- | --- | --- | --- | --- | --- |
| ball_to_strike | 593 | 49.5% | 58.7% | 54.7% to 62.6% | 0.2539 |
| strike_to_ball | 535 | 56.4% | 47.3% | 43.1% to 51.5% | 0.2598 |

## Held-Out Test Calibration By Edge Bucket (center_only)

| Edge Bucket | Challenges | Avg Predicted | Realized | Realized 95% CI |
| --- | --- | --- | --- | --- |
| lean_confirm | 364 | 53.2% | 39.0% | 34.1% to 44.1% |
| lean_overturn | 256 | 54.2% | 75.4% | 69.8% to 80.3% |
| strong_confirm | 201 | 50.5% | 19.4% | 14.5% to 25.4% |
| borderline | 168 | 51.1% | 53.0% | 45.4% to 60.4% |
| strong_overturn | 139 | 54.3% | 99.3% | 96.0% to 99.9% |

## Held-Out Test Calibration By Competition Phase (center_only)

| Phase | Challenges | Avg Predicted | Realized | Realized 95% CI | Brier |
| --- | --- | --- | --- | --- | --- |
| regular_season | 1128 | 52.8% | 53.3% | 50.4% to 56.2% | 0.2567 |

## Largest Held-Out Calibration Gaps (center_only)

| Group | Challenges | Avg Predicted | Realized | Realized 95% CI | Abs Gap |
| --- | --- | --- | --- | --- | --- |
| direction_only / ball_to_strike / strong_overturn | 35 | 49.9% | 100.0% | 90.1% to 100.0% | 50.1% |
| direction_only / ball_to_strike / lean_overturn | 116 | 49.9% | 100.0% | 96.8% to 100.0% | 50.1% |
| direction_only / strike_to_ball / strong_overturn | 104 | 55.8% | 99.0% | 94.8% to 99.8% | 43.3% |
| exact / strike_to_ball / lean_confirm | 167 | 58.3% | 20.4% | 15.0% to 27.1% | 38.0% |
| exact / ball_to_strike / strong_confirm | 154 | 50.9% | 14.9% | 10.2% to 21.4% | 35.9% |
| exact / strike_to_ball / borderline | 77 | 55.0% | 29.9% | 20.8% to 40.8% | 25.1% |
| exact / ball_to_strike / borderline | 91 | 47.9% | 72.5% | 62.6% to 80.6% | 24.6% |
| exact / strike_to_ball / strong_confirm | 47 | 49.2% | 34.0% | 22.2% to 48.3% | 15.1% |
| exact / ball_to_strike / lean_confirm | 197 | 48.8% | 54.8% | 47.8% to 61.6% | 6.0% |
| exact / strike_to_ball / lean_overturn | 140 | 57.7% | 55.0% | 46.7% to 63.0% | 2.7% |

## Notes

- This is a held-out calibration audit. No probabilities in the validation or test sections are fit on those same rows.
- The geometry winner is chosen by validation Brier score only. That choice remains provisional because the 2026 sample is still early.
- The current audit is intentionally empirical and challenge-time-only. It does not use post-result fields or future game information.

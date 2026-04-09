# Run Expectancy Benchmark

Date: April 8, 2026

## Scope

- Source table: `historical_pitch_states`
- Split view: `mart_historical_pitch_states_split`
- Training fallback view: `mart_run_expectancy_fallbacks_train`
- Serving fit view: `mart_run_expectancy_fallbacks`
- Split policy: `historical_pitch_states_season_holdout_v1`

## Overview

- Validation rows: 712528
- Test rows: 49854
- Distinct test state groups: 1088

## Held-Out Error Summary

| Split | Weighted Rows | MAE | RMSE | Mean Signed |
| --- | --- | --- | --- | --- |
| validation | 712528 | 0.032 | 0.061 | 0.008 |
| test | 49854 | 0.105 | 0.199 | 0.003 |

## Held-Out Error By Fallback Tier

| Split | Fallback | Weighted Rows | MAE | Mean Signed |
| --- | --- | --- | --- | --- |
| validation | exact | 712528 | 0.032 | 0.008 |
| test | exact | 49854 | 0.105 | 0.003 |

## Test State Calibration

| State | Fallback | Rows | Train Sample | Confidence | Pred RE | Obs RE | Abs Diff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1-3, 0 outs, 000, 0-0 | exact | 1027 | 82303 | high | 0.512 | 0.428 | 0.083 |
| 1-3, 0 outs, 001, 0-0 | exact | 4 | 571 | high | 1.342 | 0.750 | 0.592 |
| 1-3, 0 outs, 010, 0-0 | exact | 57 | 4671 | high | 1.150 | 1.123 | 0.027 |
| 1-3, 0 outs, 011, 0-0 | exact | 9 | 995 | high | 1.964 | 1.778 | 0.186 |
| 1-3, 0 outs, 100, 0-0 | exact | 228 | 19319 | high | 0.909 | 0.825 | 0.085 |
| 1-3, 0 outs, 101, 0-0 | exact | 13 | 1600 | high | 1.844 | 1.923 | 0.079 |
| 1-3, 0 outs, 110, 0-0 | exact | 67 | 4700 | high | 1.499 | 1.299 | 0.201 |
| 1-3, 0 outs, 111, 0-0 | exact | 14 | 1190 | high | 2.450 | 3.000 | 0.550 |
| 1-3, 1 outs, 000, 0-0 | exact | 761 | 60028 | high | 0.275 | 0.235 | 0.040 |
| 1-3, 1 outs, 001, 0-0 | exact | 27 | 2268 | high | 0.965 | 1.185 | 0.220 |
| 1-3, 1 outs, 010, 0-0 | exact | 93 | 7661 | high | 0.705 | 0.602 | 0.103 |
| 1-3, 1 outs, 011, 0-0 | exact | 32 | 2167 | high | 1.431 | 1.344 | 0.087 |

## Largest Test Divergence Groups

| State | Fallback | Rows | Pred RE | Obs RE | Abs Diff |
| --- | --- | --- | --- | --- | --- |
| 1-3, 0 outs, 110, 3-0 | exact | 1 | 2.312 | 7.000 | 4.688 |
| 4-6, 0 outs, 111, 3-0 | exact | 1 | 2.851 | 7.000 | 4.149 |
| 4-6, 0 outs, 111, 2-0 | exact | 2 | 2.461 | 6.500 | 4.039 |
| 7-8, 0 outs, 101, 3-1 | exact | 1 | 2.104 | 6.000 | 3.896 |
| 9+, 1 outs, 101, 0-2 | exact | 1 | 0.865 | 4.000 | 3.135 |
| 4-6, 0 outs, 011, 3-1 | exact | 2 | 2.092 | 5.000 | 2.908 |
| 9+, 1 outs, 011, 3-2 | exact | 3 | 1.251 | 4.000 | 2.749 |
| 4-6, 0 outs, 011, 0-2 | exact | 4 | 1.788 | 4.500 | 2.712 |
| 9+, 0 outs, 001, 3-2 | exact | 1 | 1.295 | 4.000 | 2.705 |
| 4-6, 0 outs, 101, 3-0 | exact | 1 | 2.378 | 5.000 | 2.622 |

## Notes

- RE training for this audit uses only the `train` split through `mart_run_expectancy_fallbacks_train`.
- Held-out rows come from `validation` and `test` only.
- Serving should continue publishing from `mart_run_expectancy_fallbacks`, which now fits on `train + validation`.

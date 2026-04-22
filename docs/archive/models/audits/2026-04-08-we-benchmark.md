# Win Expectancy Benchmark

Date: April 8, 2026

## Scope

- Source table: `historical_pitch_states`
- Split view: `mart_historical_pitch_states_split`
- Training fallback view: `mart_win_expectancy_fallbacks_train`
- Serving fit view: `mart_win_expectancy_fallbacks`
- Split policy: `historical_pitch_states_season_holdout_v1`
- External MLB benchmark remains separate and secondary; this report is the primary held-out validation

## Overview

- Validation rows: 712528
- Test rows: 49854
- Distinct test state groups: 15818

## Held-Out Error Summary

| Split | Weighted Rows | MAE | Brier | RMSE | Log Loss | Mean Signed |
| --- | --- | --- | --- | --- | --- | --- |
| validation | 712528 | 6.0% | 1.1% | 10.3% | 0.4736 | +0.10 pts |
| test | 49854 | 15.5% | 5.4% | 23.2% | 0.4992 | -0.24 pts |

## Held-Out Error By Fallback Tier

| Split | Fallback | Weighted Rows | MAE | Brier | Log Loss | Mean Signed |
| --- | --- | --- | --- | --- | --- | --- |
| validation | exact | 711930 | 6.0% | 1.1% | 0.4732 | +0.10 pts |
| validation | drop_inning_to_bucket | 565 | 19.9% | 12.2% | 1.0230 | +3.49 pts |
| validation | drop_count_key_exact_inning | 33 | 24.3% | 11.6% | 0.3449 | +2.09 pts |
| test | exact | 49820 | 15.4% | 5.4% | 0.4990 | -0.24 pts |
| test | drop_inning_to_bucket | 32 | 28.4% | 18.8% | 0.8456 | -5.02 pts |
| test | drop_count_key_exact_inning | 2 | 43.5% | 22.1% | 0.6229 | -17.81 pts |

## Test Calibration By Probability Bucket

| Pred Bucket | Rows | Pred WE | Obs WE | Abs Diff |
| --- | --- | --- | --- | --- |
| 0-0.1 | 6980 | 3.4% | 6.3% | 2.8% |
| 0.1-0.2 | 3166 | 14.7% | 14.9% | 0.1% |
| 0.2-0.3 | 3361 | 24.8% | 25.5% | 0.7% |
| 0.3-0.4 | 3099 | 35.1% | 35.4% | 0.2% |
| 0.4-0.5 | 7505 | 45.4% | 43.7% | 1.6% |
| 0.5-0.6 | 7368 | 55.4% | 57.0% | 1.6% |
| 0.6-0.7 | 3880 | 64.8% | 66.3% | 1.5% |
| 0.7-0.8 | 3563 | 74.8% | 75.5% | 0.7% |
| 0.8-0.9 | 3801 | 84.9% | 85.1% | 0.3% |
| 0.9-1 | 7131 | 96.4% | 93.6% | 2.8% |

## Test State Calibration

| State | Fallback | Rows | Train Sample | Confidence | Pred WE | Obs WE | Abs Diff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 Bottom, 0 outs, 000, lead1, 0-0 | exact | 3 | 420 | low | 71.0% | 100.0% | 29.0% |
| 1 Bottom, 0 outs, 001, lead1, 0-0 | exact | 1 | 19 | low | 79.3% | 100.0% | 20.7% |
| 1 Bottom, 0 outs, 010, lead1, 0-0 | exact | 1 | 107 | low | 66.4% | 100.0% | 33.6% |
| 1 Bottom, 0 outs, 101, lead1, 0-0 | exact | 1 | 47 | low | 83.0% | 100.0% | 17.0% |
| 1 Bottom, 0 outs, 110, lead1, 0-0 | exact | 1 | 92 | low | 76.1% | 100.0% | 23.9% |
| 1 Bottom, 0 outs, 000, lead2, 0-0 | exact | 1 | 129 | low | 76.0% | 100.0% | 24.0% |
| 1 Bottom, 0 outs, 000, tied, 0-0 | exact | 125 | 9622 | high | 58.0% | 61.6% | 3.6% |
| 1 Bottom, 0 outs, 010, tied, 0-0 | exact | 7 | 531 | medium | 63.3% | 57.1% | 6.1% |
| 1 Bottom, 0 outs, 100, tied, 0-0 | exact | 32 | 2344 | high | 61.7% | 78.1% | 16.4% |
| 1 Bottom, 0 outs, 101, tied, 0-0 | exact | 2 | 177 | low | 71.2% | 100.0% | 28.8% |
| 1 Bottom, 0 outs, 110, tied, 0-0 | exact | 7 | 581 | medium | 67.6% | 100.0% | 32.4% |
| 1 Bottom, 0 outs, 111, tied, 0-0 | exact | 2 | 128 | low | 75.8% | 100.0% | 24.2% |

## Largest Test Divergence Groups

| State | Fallback | Rows | Pred WE | Obs WE | Abs Diff |
| --- | --- | --- | --- | --- | --- |
| 1 Bottom, 1 outs, 001, trail4plus, 1-0 | exact | 1 | 0.0% | 100.0% | 100.0% |
| 1 Bottom, 1 outs, 001, trail4plus, 2-0 | exact | 1 | 0.0% | 100.0% | 100.0% |
| 4 Bottom, 2 outs, 000, trail4plus, 3-0 | exact | 1 | 0.0% | 100.0% | 100.0% |
| 4 Top, 1 outs, 011, trail3, 3-0 | drop_inning_to_bucket | 1 | 0.0% | 100.0% | 100.0% |
| 5 Top, 0 outs, 111, lead4plus, 0-0 | exact | 1 | 100.0% | 0.0% | 100.0% |
| 5 Top, 0 outs, 111, lead4plus, 0-1 | exact | 1 | 100.0% | 0.0% | 100.0% |
| 5 Top, 0 outs, 111, lead4plus, 1-1 | exact | 1 | 100.0% | 0.0% | 100.0% |
| 5 Top, 2 outs, 110, trail4plus, 2-1 | exact | 1 | 0.0% | 100.0% | 100.0% |
| 6 Top, 1 outs, 010, trail4plus, 0-2 | exact | 1 | 0.0% | 100.0% | 100.0% |
| 6 Top, 2 outs, 001, trail4plus, 0-0 | exact | 1 | 0.0% | 100.0% | 100.0% |

## Notes

- WE training for this audit uses only the `train` split through `mart_win_expectancy_fallbacks_train`.
- Held-out rows come from `validation` and `test` only.
- Serving should continue publishing from `mart_win_expectancy_fallbacks`, which now fits on `train + validation`.
- MLB public WE should be retained as secondary external shape validation, not primary evidence.

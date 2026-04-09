# Count-State Audit

Date: April 8, 2026

## Scope

- Source table: `historical_pitch_states`
- Split view: `mart_historical_pitch_states_split`
- Training view: `mart_count_state_outcome_baselines_train`
- Serving fit view: `mart_count_state_outcome_baselines_train_validation`
- Split policy: `historical_pitch_states_season_holdout_v1`

## Overview

- Train terminal PA rows: 985403
- Validation terminal PA rows: 183362
- Test terminal PA rows: 12591
- Distinct train count states: 12
- Distinct validation count states: 12
- Distinct test count states: 12

## Held-Out Weighted Error

| Split | Metric | Weighted MAE | Weighted RMSE | Weighted Bias |
| --- | --- | --- | --- | --- |
| validation | batting_average | 0.36% | 0.45% | -0.24% |
| validation | walk_rate | 0.07% | 0.30% | 0.05% |
| validation | strikeout_rate | 0.22% | 0.41% | -0.22% |
| validation | positive_outcome_rate | 0.35% | 0.44% | -0.18% |
| test | batting_average | 1.74% | 3.49% | -1.38% |
| test | walk_rate | 0.36% | 1.32% | 0.36% |
| test | strikeout_rate | 0.78% | 1.20% | 0.64% |
| test | positive_outcome_rate | 1.33% | 1.64% | -0.69% |

## Test Count-Level Calibration

| Count | Sample | Pred Pos | Obs Pos | Obs Pos 95% CI | Pred Walk | Obs Walk | Pred K | Obs K |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0-0 | 1387 | 32.50% | 31.22% | 28.78% to 33.66% | 0.00% | 0.00% | 0.00% | 0.00% |
| 0-1 | 1061 | 31.06% | 30.35% | 27.58% to 33.12% | 0.00% | 0.00% | 0.00% | 0.00% |
| 0-2 | 1185 | 14.80% | 14.35% | 12.35% to 16.34% | 0.00% | 0.00% | 50.59% | 49.87% |
| 1-0 | 731 | 33.08% | 30.92% | 27.57% to 34.27% | 0.00% | 0.00% | 0.00% | 0.00% |
| 1-1 | 918 | 31.97% | 30.07% | 27.10% to 33.03% | 0.00% | 0.00% | 0.00% | 0.00% |
| 1-2 | 1851 | 15.80% | 14.42% | 12.82% to 16.03% | 0.00% | 0.00% | 48.41% | 50.89% |
| 2-0 | 258 | 33.92% | 29.84% | 24.26% to 35.43% | 0.00% | 0.00% | 0.00% | 0.00% |
| 2-1 | 551 | 32.98% | 34.66% | 30.69% to 38.64% | 0.00% | 0.00% | 0.00% | 0.00% |
| 2-2 | 1840 | 17.12% | 15.98% | 14.30% to 17.65% | 0.00% | 0.05% | 45.12% | 46.79% |
| 3-0 | 294 | 93.64% | 95.24% | 92.80% to 97.67% | 89.76% | 94.22% | 0.00% | 0.00% |
| 3-1 | 596 | 70.67% | 75.00% | 71.52% to 78.48% | 55.55% | 60.74% | 0.00% | 0.00% |
| 3-2 | 1919 | 44.92% | 44.61% | 42.38% to 46.83% | 31.78% | 31.79% | 28.12% | 28.76% |

## Held-Out Subgroup Stability

### Batter/Pitcher Handedness

| Split | Matchup | Rows | Weighted Pos MAE | Avg Observed Pos |
| --- | --- | --- | --- | --- |
| test | L/L | 5 | 1.69% | 25.24% |
| test | L/R | 12 | 1.59% | 36.95% |
| test | R/L | 10 | 2.04% | 30.99% |
| test | R/R | 10 | 1.66% | 31.67% |
| validation | L/L | 12 | 1.70% | 36.48% |
| validation | L/R | 12 | 0.48% | 38.07% |
| validation | R/L | 12 | 0.50% | 37.95% |
| validation | R/R | 12 | 0.69% | 37.03% |

### Pitch Family

| Split | Family | Rows | Weighted Pos MAE | Avg Observed Pos |
| --- | --- | --- | --- | --- |
| test | breaking | 8 | 2.75% | 25.69% |
| test | fastball | 12 | 1.27% | 38.00% |
| test | offspeed | 7 | 2.43% | 24.20% |
| test | other | 4 | 2.67% | 20.69% |
| validation | breaking | 12 | 0.71% | 38.06% |
| validation | fastball | 12 | 0.59% | 37.58% |
| validation | offspeed | 11 | 1.08% | 32.23% |
| validation | other | 11 | 1.78% | 38.08% |

## Notes

- Count-state training uses only the `train` split.
- Held-out rows are compared against frozen train baselines; no `validation` or `test` rows are used to fit the audit baseline.
- Serving should publish from `mart_count_state_outcome_baselines_train_validation` only after audits are accepted.

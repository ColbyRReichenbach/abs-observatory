# Current-State Audit

Date: March 23, 2026

## Scope

- Data window: Fri Feb 20 2026 00:00:00 GMT-0500 (Eastern Standard Time) through Sun Mar 22 2026 00:00:00 GMT-0400 (Eastern Daylight Time)
- Games tracked: 431
- Challenges tracked: 1839
- Pitches tracked: 126753
- Historical pitch states available to the model: 4566992

## Key Findings

- RE resolves exact-to-exact on 69.0% of live spring challenges; the remainder is almost entirely base/out fallback rather than unresolved traffic.
- WE resolves exact-to-exact on 69.0% of live spring challenges, with 0.1% still unresolved.
- Decision value is running in full WE mode on 99.9% of audited challenges and heuristic mode on 0.1%.
- Overturn-probability calibration is strongest in the heavy mid-range spring buckets; exact edge-bucket usage should still be monitored because the public join pattern in `mart_team_challenge_decision_value` currently does not use edge-specific exact rows.
- Rubric spread is no longer collapsed into one label family: team styles distribute across 3 buckets and umpire grades across 5 buckets in the current sample.

## Mart Coverage

### Run Expectancy Fallback Mart

| Tier | Confidence | Rows | Total Sample |
| --- | --- | --- | --- |
| drop_count_key | high | 24 | 4566992 |
| drop_inning_bucket | high | 278 | 4564074 |
| drop_inning_bucket | medium | 10 | 2918 |
| exact | high | 826 | 4482561 |
| exact | low | 78 | 6938 |
| exact | medium | 248 | 77493 |

### Win Expectancy Fallback Mart

| Tier | Confidence | Rows | Total Sample |
| --- | --- | --- | --- |
| drop_count_key_bucketed_inning | high | 479 | 3794784 |
| drop_count_key_bucketed_inning | low | 536 | 138733 |
| drop_count_key_bucketed_inning | medium | 617 | 633475 |
| drop_count_key_exact_inning | high | 576 | 3073136 |
| drop_count_key_exact_inning | low | 3113 | 494734 |
| drop_count_key_exact_inning | medium | 999 | 999122 |
| drop_inning_to_bucket | high | 331 | 1294080 |
| drop_inning_to_bucket | low | 17397 | 1582988 |
| drop_inning_to_bucket | medium | 1760 | 1689924 |
| exact | high | 143 | 482706 |
| exact | low | 48836 | 2583314 |
| exact | medium | 1778 | 1500972 |

### Overturn Probability Fallback Mart

| Tier | Confidence | Rows | Total Sample |
| --- | --- | --- | --- |
| direction_only | high | 2 | 1168 |
| exact | high | 3 | 1164 |
| exact | low | 2 | 4 |
| global | high | 1 | 1168 |

## Actual Challenge Resolution Usage

### Run Expectancy Resolution On Spring Challenges

| Held Tier | Corrected Tier | Challenges | Share |
| --- | --- | --- | --- |
| exact | exact | 1269 | 69.0% |
| drop_count_key | drop_count_key | 314 | 17.1% |
| exact | drop_count_key | 153 | 8.3% |
| drop_count_key | exact | 103 | 5.6% |

### Win Expectancy Resolution On Spring Challenges

| Held Tier | Corrected Tier | Challenges | Share |
| --- | --- | --- | --- |
| exact | exact | 1268 | 69.0% |
| drop_count_key_exact_inning | drop_count_key_exact_inning | 314 | 17.1% |
| exact | drop_count_key_exact_inning | 153 | 8.3% |
| drop_count_key_exact_inning | exact | 102 | 5.5% |
| drop_inning_to_bucket | drop_inning_to_bucket | 1 | 0.1% |
| unresolved | unresolved | 1 | 0.1% |

### Overturn Probability Resolution On Spring Challenges

| Tier | Confidence | Challenges | Avg Predicted | Realized |
| --- | --- | --- | --- | --- |
| exact | high | 1760 | 51.3% | 53.1% |
| direction_only | high | 79 | 51.1% | 50.6% |

## Overturn Probability Calibration

| Predicted Bucket | Challenges | Avg Predicted | Realized |
| --- | --- | --- | --- |
| 40-49% | 785 | 49.4% | 49.7% |
| 50-59% | 1054 | 52.6% | 55.5% |

## Decision-Value Audit

### By Mode

| Mode | Challenges | Share | Avg Expected WPA | Avg Realized WPA | Challenge Rate | Positive Realized |
| --- | --- | --- | --- | --- | --- | --- |
| win_expectancy | 1838 | 99.9% | -0.0011 | -0.0013 | 21.8% | 24.4% |
| heuristic | 1 | 0.1% | 0.0069 | 0.0191 | 100.0% | 100.0% |

### Overall

- Overall average expected WPA delta: -0.0011
- Overall average realized WPA delta: -0.0013
- Expected/realized sign agreement: 93.9%

## Rubric Distribution Audit

### Team Styles

| Style | Teams |
| --- | --- |
| Calculated | 6 |
| Hybrid | 19 |
| Trigger-Happy | 5 |

### Umpire Grades

| Grade | Umpires |
| --- | --- |
| A | 2 |
| B | 31 |
| C | 42 |
| D | 31 |
| F | 2 |

### Org Risk Tiers

| Risk Tier | Umpires |
| --- | --- |
| Elevated | 16 |
| Low | 5 |
| Moderate | 87 |

## Notes

- This audit uses the current shared model contracts and the current local spring-training window through March 22, 2026.
- The challenge-level WE audit requires canonicalizing `half_inning` to match the fallback mart’s `Top/Bottom` values; without that normalization, the raw DB join appears unresolved even though the shared server model normalizes it.
- The current SQL view `mart_team_challenge_decision_value` appears to join overturn-probability fallbacks without using edge-specific exact rows. That is a real follow-up item for the next calibration pass because it can underuse the strongest overturn-context signal in the mart.

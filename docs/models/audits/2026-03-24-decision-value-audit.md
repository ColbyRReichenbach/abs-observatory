# Decision Value Audit

Date: March 24, 2026

## Scope

- Comparison layer: realized challenge value on spring ABS reviews
- Internal layer: AiBS decision-value model in `challenge-decision-value.ts`
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-03-24

## Overview

- Challenges benchmarked: 1731
- Mean expected WP delta: 0.17%
- Mean realized WP delta: 0.08%
- Mean signed gap (realized - expected): -0.09 pts
- Mean absolute gap: 1.14%
- Positive-sign agreement: 66.3%
- Recommendation share (`challenge` with 1 challenge remaining): 53.6%

## Key Findings

- Decision value is behaving sensibly if recommended spots realize better average WP value than hold spots.
- This audit is not testing whether historical teams made perfect choices; it is testing whether the current composite model distinguishes stronger from weaker challenge spots.
- The most important readout is whether expected value rank-order aligns with realized value direction across fallback tiers and modes.

## By Recommendation

| Recommendation | Rows | Avg Expected | Avg Realized | Gap | Positive Realized Share |
| --- | --- | --- | --- | --- | --- |
| hold | 803 | -0.95% | -1.09% | -0.14 pts | 19.4% |
| challenge | 928 | 1.15% | 1.09% | -0.06 pts | 49.2% |

## By Decision Mode

| Mode | Rows | Avg Expected | Avg Realized | Gap |
| --- | --- | --- | --- | --- |
| win_expectancy | 1108 | 0.13% | 0.02% | -0.11 pts |
| heuristic | 623 | 0.25% | 0.19% | -0.07 pts |

## By Overturn Fallback Tier

| Tier | Rows | Avg Expected | Avg Realized | Gap |
| --- | --- | --- | --- | --- |
| exact | 1657 | 0.16% | 0.05% | -0.11 pts |
| direction_only | 74 | 0.53% | 0.76% | +0.23 pts |

## Largest Overestimates

| Game | Challenge | Mode | Tier | Expected | Realized | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| 831622 | ebe01a7b | win_expectancy | direction_only | 29.75% | -0.49% | -30.24 pts |
| 831884 | f19519f8 | win_expectancy | exact | 13.27% | -0.38% | -13.65 pts |
| 831492 | 6d4a16f6 | win_expectancy | exact | 9.54% | -0.25% | -9.79 pts |
| 831575 | 33983da3 | win_expectancy | exact | -9.08% | -18.22% | -9.14 pts |
| 831651 | 1aa80209 | win_expectancy | exact | 9.06% | -0.07% | -9.13 pts |
| 831813 | 7739185d | win_expectancy | exact | 8.44% | -0.45% | -8.89 pts |
| 831817 | 89df2d8a | win_expectancy | exact | -8.82% | -17.71% | -8.89 pts |
| 831848 | b044ef75 | win_expectancy | exact | -8.56% | -17.19% | -8.63 pts |
| 831470 | c1de03a1 | win_expectancy | exact | 8.05% | -0.24% | -8.29 pts |
| 831918 | eb7119a4 | win_expectancy | exact | 8.22% | -0.06% | -8.28 pts |

## Largest Underestimates

| Game | Challenge | Mode | Tier | Expected | Realized | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| 831776 | 06a2d823 | win_expectancy | exact | 10.21% | 19.97% | +9.76 pts |
| 831601 | e0423e03 | win_expectancy | direction_only | 10.45% | 19.97% | +9.52 pts |
| 831636 | b06612f6 | win_expectancy | exact | -9.73% | -0.33% | +9.40 pts |
| 831606 | 316ece9f | win_expectancy | exact | -9.70% | -0.40% | +9.30 pts |
| 831495 | 3f412ec1 | win_expectancy | direction_only | -9.22% | -0.10% | +9.12 pts |
| 831773 | 6c56a7cf | win_expectancy | exact | 8.36% | 16.21% | +7.85 pts |
| 831942 | 6c9af9fb | win_expectancy | exact | -7.34% | -0.17% | +7.17 pts |
| 832042 | 62be1b7d | win_expectancy | exact | 7.53% | 14.57% | +7.04 pts |
| 831824 | b2a75922 | win_expectancy | direction_only | 7.57% | 14.53% | +6.96 pts |
| 831766 | 9404120f | win_expectancy | exact | 6.39% | 13.22% | +6.83 pts |

## Root-Cause Readout

- WE-backed decision rows: 1108
- Heuristic-mode decision rows: 623
- Positive expected but negative realized: 571
- Negative expected but positive realized: 12
- Avg realized WP delta for recommended challenges: 1.09%
- Avg realized WP delta for hold-labeled challenges: -1.09%

## Notes

- The recommendation split uses the same one-challenge-remaining threshold as the live product.
- This is an internal composite audit, not an MLB external benchmark.
- The key analyst question is whether the model meaningfully separates stronger from weaker historical challenge spots, not whether it perfectly matches every single realized outcome.

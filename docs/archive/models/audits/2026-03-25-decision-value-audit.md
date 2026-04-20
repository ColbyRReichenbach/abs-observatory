# Decision Value Audit

Date: March 25, 2026

## Scope

- Comparison layer: realized challenge value on spring ABS reviews
- Internal layer: AiBS decision-value model in `challenge-decision-value.ts`
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-03-25

## Overview

- Challenges benchmarked: 1802
- Mean expected WP delta: 0.16%
- Mean realized WP delta: 0.07%
- Mean signed gap (realized - expected): -0.09 pts
- Mean absolute gap: 1.13%
- Positive-sign agreement: 66.1%
- Recommendation share (`challenge` with 1 challenge remaining): 53.6%

## Key Findings

- Decision value is behaving sensibly if recommended spots realize better average WP value than hold spots.
- This audit is not testing whether historical teams made perfect choices; it is testing whether the current composite model distinguishes stronger from weaker challenge spots.
- The most important readout is whether expected value rank-order aligns with realized value direction across fallback tiers and modes.

## By Recommendation

| Recommendation | Rows | Avg Expected | Avg Realized | Gap | Positive Realized Share |
| --- | --- | --- | --- | --- | --- |
| hold | 837 | -0.98% | -1.10% | -0.12 pts | 19.6% |
| challenge | 965 | 1.14% | 1.08% | -0.06 pts | 49.2% |

## By Decision Mode

| Mode | Rows | Avg Expected | Avg Realized | Gap |
| --- | --- | --- | --- | --- |
| win_expectancy | 1148 | 0.10% | 0.00% | -0.10 pts |
| heuristic | 654 | 0.25% | 0.18% | -0.07 pts |

## By Overturn Fallback Tier

| Tier | Rows | Avg Expected | Avg Realized | Gap |
| --- | --- | --- | --- | --- |
| exact | 1767 | 0.13% | 0.04% | -0.09 pts |
| direction_only | 35 | 1.33% | 1.31% | -0.01 pts |

## Largest Overestimates

| Game | Challenge | Mode | Tier | Expected | Realized | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| 831622 | ebe01a7b | win_expectancy | direction_only | 29.75% | -0.49% | -30.24 pts |
| 831884 | f19519f8 | win_expectancy | exact | 11.79% | -0.38% | -12.17 pts |
| 831492 | 90df25aa | win_expectancy | exact | 9.85% | -0.25% | -10.10 pts |
| 831651 | 1aa80209 | win_expectancy | exact | 9.36% | -0.07% | -9.43 pts |
| 831813 | 7739185d | win_expectancy | exact | 8.73% | -0.45% | -9.18 pts |
| 831575 | 33983da3 | win_expectancy | exact | -9.12% | -18.22% | -9.10 pts |
| 831817 | 89df2d8a | win_expectancy | exact | -8.86% | -17.71% | -8.85 pts |
| 831918 | eb7119a4 | win_expectancy | exact | 8.48% | -0.06% | -8.54 pts |
| 831917 | 72d5c2a8 | win_expectancy | exact | 8.37% | -0.08% | -8.45 pts |
| 831470 | c1de03a1 | win_expectancy | exact | 8.09% | -0.24% | -8.33 pts |

## Largest Underestimates

| Game | Challenge | Mode | Tier | Expected | Realized | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| 832037 | 511e0bd4 | win_expectancy | exact | -10.56% | -0.11% | +10.45 pts |
| 831601 | e0423e03 | win_expectancy | direction_only | 10.45% | 19.97% | +9.52 pts |
| 831776 | 06a2d823 | win_expectancy | exact | 10.55% | 19.97% | +9.42 pts |
| 831606 | 316ece9f | win_expectancy | exact | -9.75% | -0.40% | +9.35 pts |
| 831636 | b06612f6 | win_expectancy | exact | -9.53% | -0.33% | +9.20 pts |
| 831495 | 3f412ec1 | win_expectancy | direction_only | -9.22% | -0.10% | +9.12 pts |
| 831773 | 6c56a7cf | win_expectancy | exact | 8.63% | 16.21% | +7.58 pts |
| 831942 | 6c9af9fb | win_expectancy | exact | -7.38% | -0.17% | +7.21 pts |
| 831824 | b2a75922 | win_expectancy | direction_only | 7.57% | 14.53% | +6.96 pts |
| 832042 | 62be1b7d | win_expectancy | exact | 7.77% | 14.57% | +6.80 pts |

## Root-Cause Readout

- WE-backed decision rows: 1148
- Heuristic-mode decision rows: 654
- Positive expected but negative realized: 594
- Negative expected but positive realized: 16
- Avg realized WP delta for recommended challenges: 1.08%
- Avg realized WP delta for hold-labeled challenges: -1.10%

## Notes

- The recommendation split uses the same one-challenge-remaining threshold as the live product.
- This is an internal composite audit, not an MLB external benchmark.
- The key analyst question is whether the model meaningfully separates stronger from weaker historical challenge spots, not whether it perfectly matches every single realized outcome.

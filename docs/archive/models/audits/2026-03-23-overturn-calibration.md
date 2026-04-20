# Overturn Probability Calibration

Date: March 23, 2026

## Scope

- Comparison layer: realized spring overturn outcomes on ABS challenges
- Internal layer: AiBS overturn-probability fallback mart
- Sample: all spring-training ABS challenges in the current local window

## Overview

- Challenges benchmarked: 1839
- Mean predicted overturn probability: 51.3%
- Realized overturn rate: 53.0%
- Mean absolute bucket gap: 1.6%
- Mean signed bucket gap (realized minus predicted): +1.57 pts
- Brier score: 0.2489

## Key Findings

- The overturn model is broadly usable: aggregate predicted and realized overturn rates are close enough to treat the current calibration as credible.
- Most challenge traffic is concentrated in the `40-49%` and `50-59%` bands, so calibration confidence outside those bands remains naturally limited.
- The main analyst question is not “is the model broken,” but “where do fallback tier, direction, or edge bucket push us off calibration.”
- This report should be rerun as regular-season volume grows, because overturn calibration will improve materially with more exact edge-bucket history.

## Calibration By Predicted Bucket

| Predicted Bucket | Challenges | Avg Predicted | Realized | Gap |
| --- | --- | --- | --- | --- |
| 40-49% | 785 | 49.4% | 49.7% | +0.28 pts |
| 50-59% | 1054 | 52.6% | 55.5% | +2.86 pts |

## Calibration By Fallback Tier

| Fallback Tier | Confidence | Challenges | Avg Predicted | Realized | Gap |
| --- | --- | --- | --- | --- | --- |
| exact | high | 1760 | 51.3% | 53.1% | +1.86 pts |
| direction_only | high | 79 | 51.1% | 50.6% | -0.45 pts |

## Calibration By Challenge Direction

| Direction | Challenges | Avg Predicted | Realized | Gap |
| --- | --- | --- | --- | --- |
| strike_to_ball | 1054 | 52.6% | 55.5% | +2.86 pts |
| ball_to_strike | 785 | 49.4% | 49.7% | +0.28 pts |

## Calibration By Edge Bucket

| Edge Bucket | Challenges | Avg Predicted | Realized | Gap |
| --- | --- | --- | --- | --- |
| edge | 1605 | 50.8% | 53.0% | +2.18 pts |
| near_edge | 196 | 54.9% | 53.1% | -1.86 pts |
| clear_miss | 34 | 53.1% | 58.8% | +5.71 pts |
| unknown | 4 | 51.2% | 25.0% | -26.25 pts |

## Largest Calibration Gaps

| Group | Confidence | Challenges | Avg Predicted | Realized | Abs Gap |
| --- | --- | --- | --- | --- | --- |
| direction_only / strike_to_ball / clear_miss | high | 34 | 53.1% | 58.8% | 5.7% |
| exact / strike_to_ball / edge | high | 863 | 52.0% | 55.5% | 3.6% |
| direction_only / ball_to_strike / near_edge | high | 41 | 49.4% | 46.3% | 3.0% |
| exact / strike_to_ball / near_edge | high | 155 | 56.4% | 54.8% | 1.5% |
| exact / ball_to_strike / edge | high | 742 | 49.4% | 50.0% | 0.6% |

## Root-Cause Readout

- Exact-tier challenges: 1760
- Direction-only challenges: 79
- Global-fallback challenges: 0
- Low-confidence challenges: 0
- Mean exact-vs-direction-only predicted gap on exact-capable rows: 0.9%
- Exact-tier Brier score: 0.2490
- Direction-only Brier score: 0.2477
- Global Brier score: 0.0000

## Notes

- This audit is internal calibration against realized outcomes, not an MLB external benchmark.
- The important readout is whether predicted buckets line up with realized overturn frequency and where that alignment breaks by geometry or direction.
- Because spring volume is still limited, direction/edge groups with small counts should drive monitoring and smoothing decisions, not full rewrites.

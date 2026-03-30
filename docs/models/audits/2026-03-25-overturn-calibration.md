# Overturn Probability Calibration

Date: March 25, 2026

## Scope

- Comparison layer: realized spring overturn outcomes on ABS challenges
- Internal layer: AiBS overturn-probability fallback mart
- Sample: all spring-training ABS challenges in the current local window

## Overview

- Challenges benchmarked: 1913
- Mean predicted overturn probability: 51.6%
- Realized overturn rate: 52.9%
- Mean absolute bucket gap: 1.3%
- Mean signed bucket gap (realized minus predicted): +1.15 pts
- Brier score: 0.2486

## Key Findings

- The overturn model is broadly usable: aggregate predicted and realized overturn rates are close enough to treat the current calibration as credible.
- Most challenge traffic is concentrated in the `40-49%` and `50-59%` bands, so calibration confidence outside those bands remains naturally limited.
- The main analyst question is not “is the model broken,” but “where do fallback tier, direction, or edge bucket push us off calibration.”
- This report should be rerun as regular-season volume grows, because overturn calibration will improve materially with more exact edge-bucket history.

## Calibration By Predicted Bucket

| Predicted Bucket | Challenges | Avg Predicted | Realized | Gap |
| --- | --- | --- | --- | --- |
| 40-49% | 820 | 49.5% | 49.4% | -0.14 pts |
| 50-59% | 1093 | 53.1% | 55.5% | +2.44 pts |

## Calibration By Fallback Tier

| Fallback Tier | Confidence | Challenges | Avg Predicted | Realized | Gap |
| --- | --- | --- | --- | --- | --- |
| exact | high | 1663 | 51.8% | 52.8% | +1.01 pts |
| exact | medium | 208 | 49.6% | 53.4% | +3.80 pts |
| direction_only | high | 40 | 52.9% | 55.0% | +2.08 pts |
| global | high | 2 | 51.5% | 50.0% | -1.46 pts |

## Calibration By Challenge Direction

| Direction | Challenges | Avg Predicted | Realized | Gap |
| --- | --- | --- | --- | --- |
| strike_to_ball | 1091 | 53.1% | 55.5% | +2.45 pts |
| ball_to_strike | 820 | 49.5% | 49.4% | -0.14 pts |
| unknown | 2 | 51.5% | 50.0% | -1.46 pts |

## Calibration By Edge Bucket

| Edge Bucket | Challenges | Avg Predicted | Realized | Gap |
| --- | --- | --- | --- | --- |
| edge | 1663 | 51.8% | 52.8% | +1.01 pts |
| near_edge | 208 | 49.6% | 53.4% | +3.80 pts |
| clear_miss | 36 | 53.1% | 58.3% | +5.22 pts |
| unknown | 6 | 51.3% | 33.3% | -17.98 pts |

## Largest Calibration Gaps

| Group | Confidence | Challenges | Avg Predicted | Realized | Abs Gap |
| --- | --- | --- | --- | --- | --- |
| exact / strike_to_ball / near_edge | medium | 164 | 50.2% | 55.5% | 5.3% |
| direction_only / strike_to_ball / clear_miss | high | 36 | 53.1% | 58.3% | 5.2% |
| exact / ball_to_strike / near_edge | medium | 44 | 47.3% | 45.5% | 1.8% |
| exact / strike_to_ball / edge | high | 889 | 53.6% | 55.5% | 1.8% |
| exact / ball_to_strike / edge | high | 774 | 49.7% | 49.7% | 0.1% |

## Root-Cause Readout

- Exact-tier challenges: 1871
- Direction-only challenges: 40
- Global-fallback challenges: 2
- Low-confidence challenges: 0
- Mean exact-vs-direction-only predicted gap on exact-capable rows: 0.7%
- Exact-tier Brier score: 0.2487
- Direction-only Brier score: 0.2459
- Global Brier score: 0.2502

## Notes

- This audit is internal calibration against realized outcomes, not an MLB external benchmark.
- The important readout is whether predicted buckets line up with realized overturn frequency and where that alignment breaks by geometry or direction.
- Because spring volume is still limited, direction/edge groups with small counts should drive monitoring and smoothing decisions, not full rewrites.

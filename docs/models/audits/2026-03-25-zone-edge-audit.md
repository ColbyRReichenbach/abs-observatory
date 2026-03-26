# Zone / Edge Audit

Date: March 25, 2026

## Scope

- Comparison layer: spring ABS challenge geometry and realized overturn outcomes
- Internal layer: AiBS observed miss-distance and edge-bucket logic
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-03-25

## Overview

- Challenges benchmarked: 1803
- Exact pitch-location coverage: 99.7%
- Reviewed-pitch source share: 75.0%
- Inferred-location source share: 25.0%

## Key Findings

- The geometry audit is mainly asking whether miss distance and edge buckets behave consistently enough to support overturn grouping.
- For `strike_to_ball` challenges, farther misses should generally overturn more often than borderline edge spots.
- For `ball_to_strike` challenges, AiBS now uses a conservative two-band geometry split until deeper inside-zone traffic is more stable.

## By Location Source

| Location Source | Rows | Share | Overturn Rate | Mean Miss Distance |
| --- | --- | --- | --- | --- |
| reviewed_pitch_px_pz | 1352 | 75.0% | 55.1% | 0.010 |
| inferred_final_pitch_px_pz | 446 | 24.7% | 47.3% | 0.012 |
| reviewed_pitch_xy_only | 3 | 0.2% | 33.3% | — |
| inferred_final_pitch_xy_only | 1 | 0.1% | 0.0% | — |
| unresolved | 1 | 0.1% | 0.0% | — |

## By Edge Bucket

| Bucket | Rows | Share | Overturn Rate | Mean Miss Distance | Median Miss Distance |
| --- | --- | --- | --- | --- | --- |
| edge | 1567 | 87.2% | 53.0% | 0.000 | 0.000 |
| near_edge | 196 | 10.9% | 53.1% | 0.060 | 0.040 |
| clear_miss | 35 | 1.9% | 60.0% | 0.178 | 0.174 |

## By Direction And Edge Bucket

| Direction / Bucket | Rows | Overturn Rate | Mean Miss Distance |
| --- | --- | --- | --- |
| strike_to_ball / edge | 834 | 55.4% | 0.001 |
| ball_to_strike / edge | 733 | 50.3% | 0.000 |
| strike_to_ball / near_edge | 152 | 55.3% | 0.072 |
| ball_to_strike / near_edge | 44 | 45.5% | 0.020 |
| strike_to_ball / clear_miss | 35 | 60.0% | 0.178 |

## Root-Cause Readout

- Rows missing location after source fallback: 5
- Rows with `reviewed_pitch_px_pz` source: 1352
- Rows with inferred location source: 451
- `strike_to_ball` monotonicity check (`edge < near_edge < clear_miss` overturn): FAIL
- `ball_to_strike` monotonicity check (`edge < near_edge` overturn, conservative two-band mode): FAIL

## Notes

- This is not a deterministic ABS adjudication audit; it is a sanity check on the geometry layer we use to bucket challenge context.
- The important readout is whether the bucket families tell a coherent baseball story by challenge direction and whether source coverage is strong enough to trust the geometry-based grouping.

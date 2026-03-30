# Zone / Edge Audit

Date: March 23, 2026

## Scope

- Comparison layer: spring ABS challenge geometry and realized overturn outcomes
- Internal layer: AiBS observed miss-distance and edge-bucket logic
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-03-23

## Overview

- Challenges benchmarked: 1731
- Exact pitch-location coverage: 99.8%
- Reviewed-pitch source share: 75.2%
- Inferred-location source share: 24.8%

## Key Findings

- The geometry audit is mainly asking whether miss distance and edge buckets behave consistently enough to support overturn grouping.
- For `strike_to_ball` challenges, farther misses should generally overturn more often than borderline edge spots.
- For `ball_to_strike` challenges, AiBS now uses a conservative two-band geometry split until deeper inside-zone traffic is more stable.

## By Location Source

| Location Source | Rows | Share | Overturn Rate | Mean Miss Distance |
| --- | --- | --- | --- | --- |
| reviewed_pitch_px_pz | 1302 | 75.2% | 55.0% | 0.010 |
| inferred_final_pitch_px_pz | 425 | 24.6% | 48.0% | 0.011 |
| reviewed_pitch_xy_only | 3 | 0.2% | 33.3% | — |
| inferred_final_pitch_xy_only | 1 | 0.1% | 0.0% | — |

## By Edge Bucket

| Bucket | Rows | Share | Overturn Rate | Mean Miss Distance | Median Miss Distance |
| --- | --- | --- | --- | --- | --- |
| edge | 1509 | 87.4% | 53.1% | 0.000 | 0.000 |
| near_edge | 185 | 10.7% | 53.0% | 0.061 | 0.044 |
| clear_miss | 33 | 1.9% | 60.6% | 0.179 | 0.174 |

## By Direction And Edge Bucket

| Direction / Bucket | Rows | Overturn Rate | Mean Miss Distance |
| --- | --- | --- | --- |
| strike_to_ball / edge | 808 | 55.3% | 0.001 |
| ball_to_strike / edge | 701 | 50.6% | 0.000 |
| strike_to_ball / near_edge | 144 | 54.9% | 0.073 |
| ball_to_strike / near_edge | 41 | 46.3% | 0.019 |
| strike_to_ball / clear_miss | 33 | 60.6% | 0.179 |

## Root-Cause Readout

- Rows missing location after source fallback: 4
- Rows with `reviewed_pitch_px_pz` source: 1302
- Rows with inferred location source: 429
- `strike_to_ball` monotonicity check (`edge < near_edge < clear_miss` overturn): FAIL
- `ball_to_strike` monotonicity check (`edge < near_edge` overturn, conservative two-band mode): FAIL

## Notes

- This is not a deterministic ABS adjudication audit; it is a sanity check on the geometry layer we use to bucket challenge context.
- The important readout is whether the bucket families tell a coherent baseball story by challenge direction and whether source coverage is strong enough to trust the geometry-based grouping.

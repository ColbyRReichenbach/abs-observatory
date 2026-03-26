# Run Expectancy Benchmark

Date: March 23, 2026

## Scope

- Comparison layer: realized spring runs scored from pitch state to inning end
- Internal layer: AiBS shared RE fallback mart resolved on live pitch state
- Sample: final spring-training games in the ABS window from 2026-02-20 through 2026-03-23

## Overview

- Games benchmarked: 397
- Pitch states compared: 119012
- Mean absolute difference: 0.605
- Median absolute difference: 0.477
- 90th percentile absolute difference: 1.246
- RMSE: 0.907
- Mean signed difference (AiBS RE minus realized runs): 0.314

## Key Findings

- AiBS RE is directionally credible against realized spring inning outcomes and does not show broad structural drift.
- The spring sample is resolving entirely through exact RE rows, so this audit is mostly measuring exact-state quality rather than fallback stress.
- Empty-base and two-out states converge tightly; the largest residual error clusters in no-out, multi-runner pressure states.
- AiBS RE is still somewhat optimistic overall, with a positive signed gap of 0.314 runs.

## By Fallback Tier

| Fallback Tier | Rows | Share | MAE | Mean Signed | RMSE |
| --- | --- | --- | --- | --- | --- |
| exact | 119012 | 100.0% | 0.605 | 0.314 | 0.907 |

## By Model Confidence

| Confidence | Rows | Share | MAE | Mean Signed |
| --- | --- | --- | --- | --- |
| high | 114565 | 96.3% | 0.573 | 0.293 |
| medium | 3953 | 3.3% | 1.399 | 0.823 |
| low | 494 | 0.4% | 1.629 | 1.168 |

## By Inning Bucket

| Inning Bucket | Rows | MAE | Mean Signed |
| --- | --- | --- | --- |
| 4-6 | 40633 | 0.619 | 0.307 |
| 1-3 | 40473 | 0.599 | 0.300 |
| 7-8 | 27721 | 0.614 | 0.325 |
| 9+ | 10185 | 0.545 | 0.367 |

## By Outs

| Outs | Rows | MAE | Mean Signed |
| --- | --- | --- | --- |
| 0 | 41260 | 0.887 | 0.465 |
| 1 | 39338 | 0.664 | 0.343 |
| 2 | 38414 | 0.241 | 0.122 |

## By Runner State

| Runner State | Rows | MAE | Mean Signed |
| --- | --- | --- | --- |
| Empty | 61453 | 0.305 | 0.198 |
| One Runner | 37371 | 0.777 | 0.367 |
| Two Runners | 15908 | 1.106 | 0.557 |
| Bases Loaded | 4280 | 1.548 | 0.611 |

## Largest Divergence State Groups

| State | Fallback | Current Rows | Model Sample | Confidence | AiBS RE | Realized RE | Abs Diff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7-8, 0 outs, 111, 3-1 | exact | 10 | 92 | low | 2.913 | 0.600 | 2.313 |
| 7-8, 0 outs, 111, 2-0 | exact | 13 | 147 | low | 2.762 | 0.846 | 1.916 |
| 4-6, 0 outs, 111, 3-0 | exact | 17 | 58 | low | 2.810 | 1.118 | 1.693 |
| 9+, 0 outs, 111, 2-2 | exact | 12 | 120 | low | 1.942 | 0.250 | 1.692 |
| 7-8, 0 outs, 111, 3-2 | exact | 20 | 195 | medium | 2.790 | 1.100 | 1.690 |
| 7-8, 0 outs, 111, 1-0 | exact | 26 | 450 | medium | 2.660 | 1.000 | 1.660 |
| 9+, 0 outs, 111, 1-1 | exact | 10 | 195 | medium | 1.959 | 0.300 | 1.659 |
| 4-6, 0 outs, 101, 2-0 | exact | 12 | 199 | medium | 2.141 | 0.500 | 1.641 |
| 9+, 0 outs, 111, 1-2 | exact | 12 | 207 | medium | 1.841 | 0.250 | 1.591 |
| 7-8, 0 outs, 110, 3-0 | exact | 26 | 172 | medium | 2.372 | 0.808 | 1.564 |
| 7-8, 0 outs, 011, 1-0 | exact | 20 | 335 | medium | 2.101 | 0.550 | 1.551 |
| 7-8, 0 outs, 011, 2-2 | exact | 14 | 299 | medium | 1.906 | 0.357 | 1.549 |
| 9+, 0 outs, 101, 1-0 | exact | 18 | 292 | medium | 1.753 | 0.222 | 1.531 |
| 7-8, 0 outs, 101, 0-2 | exact | 12 | 284 | medium | 1.553 | 0.083 | 1.469 |
| 7-8, 1 outs, 011, 3-2 | exact | 13 | 430 | medium | 1.463 | 0.000 | 1.463 |

## Strongest Convergence State Groups

| State | Fallback | Current Rows | AiBS RE | Realized RE | Abs Diff |
| --- | --- | --- | --- | --- | --- |
| 1-3, 2 outs, 100, 2-2 | exact | 136 | 0.204 | 0.206 | 0.002 |
| 1-3, 2 outs, 110, 1-2 | exact | 50 | 0.304 | 0.300 | 0.004 |
| 1-3, 2 outs, 100, 1-2 | exact | 114 | 0.172 | 0.167 | 0.006 |
| 4-6, 2 outs, 101, 0-0 | exact | 115 | 0.522 | 0.513 | 0.009 |
| 1-3, 2 outs, 010, 2-1 | exact | 25 | 0.333 | 0.320 | 0.013 |
| 1-3, 2 outs, 100, 3-2 | exact | 135 | 0.269 | 0.252 | 0.017 |
| 4-6, 2 outs, 100, 1-2 | exact | 97 | 0.176 | 0.155 | 0.021 |
| 4-6, 2 outs, 110, 0-1 | exact | 72 | 0.402 | 0.375 | 0.027 |
| 4-6, 2 outs, 010, 2-2 | exact | 46 | 0.275 | 0.304 | 0.029 |
| 1-3, 2 outs, 101, 1-1 | exact | 35 | 0.488 | 0.457 | 0.030 |
| 4-6, 2 outs, 110, 1-2 | exact | 60 | 0.332 | 0.300 | 0.032 |
| 4-6, 2 outs, 101, 1-2 | exact | 34 | 0.377 | 0.412 | 0.035 |
| 1-3, 2 outs, 111, 1-1 | exact | 30 | 0.729 | 0.767 | 0.038 |
| 4-6, 2 outs, 101, 1-1 | exact | 52 | 0.480 | 0.519 | 0.039 |
| 7-8, 1 outs, 111, 2-0 | exact | 25 | 1.839 | 1.800 | 0.039 |

## Root-Cause Readout

- Low-confidence exact rows in benchmark: 494
- Exact rows with model sample size `<= 20`: 0
- Exact rows with model sample size `<= 50`: 50
- Inning-bucket fallback rows with bucket sample size `<= 20`: 0
- Inning-bucket fallback rows with bucket sample size `<= 50`: 0
- Mean RE gap between exact and bucket on low-confidence exact rows: 0.171
- If low-confidence exact rows were forced to bucket fallback, benchmark MAE would move from 0.605 to 0.605.

## Notes

- This is an out-of-sample spring audit against realized inning outcomes, not a comparison to a public MLB RE product.
- Realized runs are noisy at the pitch level, so the state-group sections are the more important analyst readout than any single pitch.
- The benchmark should be rerun after meaningful spring and regular-season data refreshes so high-pressure exact-state behavior is tracked over time.

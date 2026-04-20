# Run Expectancy Benchmark

Date: March 25, 2026

## Scope

- Comparison layer: realized spring runs scored from pitch state to inning end
- Internal layer: AiBS shared RE fallback mart resolved on live pitch state
- Sample: final spring-training games in the ABS window from 2026-02-20 through 2026-03-25

## Overview

- Games benchmarked: 420
- Pitch states compared: 125769
- Mean absolute difference: 0.603
- Median absolute difference: 0.477
- 90th percentile absolute difference: 1.237
- RMSE: 0.903
- Mean signed difference (AiBS RE minus realized runs): 0.316

## Key Findings

- AiBS RE is directionally credible against realized spring inning outcomes and does not show broad structural drift.
- The spring sample is resolving entirely through exact RE rows, so this audit is mostly measuring exact-state quality rather than fallback stress.
- Empty-base and two-out states converge tightly; the largest residual error clusters in no-out, multi-runner pressure states.
- AiBS RE is still somewhat optimistic overall, with a positive signed gap of 0.316 runs.

## By Fallback Tier

| Fallback Tier | Rows | Share | MAE | Mean Signed | RMSE |
| --- | --- | --- | --- | --- | --- |
| exact | 125769 | 100.0% | 0.603 | 0.316 | 0.903 |

## By Model Confidence

| Confidence | Rows | Share | MAE | Mean Signed |
| --- | --- | --- | --- | --- |
| high | 121123 | 96.3% | 0.572 | 0.295 |
| medium | 4136 | 3.3% | 1.399 | 0.816 |
| low | 510 | 0.4% | 1.636 | 1.128 |

## By Inning Bucket

| Inning Bucket | Rows | MAE | Mean Signed |
| --- | --- | --- | --- |
| 4-6 | 43056 | 0.619 | 0.308 |
| 1-3 | 42778 | 0.597 | 0.304 |
| 7-8 | 29226 | 0.613 | 0.324 |
| 9+ | 10709 | 0.539 | 0.369 |

## By Outs

| Outs | Rows | MAE | Mean Signed |
| --- | --- | --- | --- |
| 0 | 43645 | 0.887 | 0.463 |
| 1 | 41611 | 0.660 | 0.348 |
| 2 | 40513 | 0.240 | 0.124 |

## By Runner State

| Runner State | Rows | MAE | Mean Signed |
| --- | --- | --- | --- |
| Empty | 65091 | 0.305 | 0.199 |
| One Runner | 39396 | 0.775 | 0.371 |
| Two Runners | 16743 | 1.107 | 0.559 |
| Bases Loaded | 4539 | 1.540 | 0.606 |

## Largest Divergence State Groups

| State | Fallback | Current Rows | Model Sample | Confidence | AiBS RE | Realized RE | Abs Diff |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 7-8, 0 outs, 111, 3-1 | exact | 11 | 92 | low | 2.913 | 0.545 | 2.368 |
| 7-8, 0 outs, 111, 3-2 | exact | 21 | 195 | medium | 2.790 | 1.048 | 1.742 |
| 9+, 0 outs, 111, 2-2 | exact | 12 | 120 | low | 1.942 | 0.250 | 1.692 |
| 9+, 0 outs, 111, 1-1 | exact | 10 | 195 | medium | 1.959 | 0.300 | 1.659 |
| 4-6, 0 outs, 111, 3-0 | exact | 18 | 58 | low | 2.810 | 1.167 | 1.644 |
| 4-6, 0 outs, 101, 2-0 | exact | 12 | 199 | medium | 2.141 | 0.500 | 1.641 |
| 7-8, 0 outs, 110, 3-0 | exact | 27 | 172 | medium | 2.372 | 0.778 | 1.594 |
| 9+, 0 outs, 111, 1-2 | exact | 12 | 207 | medium | 1.841 | 0.250 | 1.591 |
| 7-8, 0 outs, 011, 2-2 | exact | 14 | 299 | medium | 1.906 | 0.357 | 1.549 |
| 9+, 0 outs, 101, 1-0 | exact | 18 | 292 | medium | 1.753 | 0.222 | 1.531 |
| 7-8, 0 outs, 101, 0-2 | exact | 12 | 284 | medium | 1.553 | 0.083 | 1.469 |
| 7-8, 1 outs, 011, 3-2 | exact | 13 | 430 | medium | 1.463 | 0.000 | 1.463 |
| 7-8, 0 outs, 101, 3-2 | exact | 15 | 178 | medium | 1.921 | 0.467 | 1.455 |
| 7-8, 0 outs, 111, 1-0 | exact | 28 | 450 | medium | 2.660 | 1.214 | 1.446 |
| 4-6, 1 outs, 111, 3-1 | exact | 40 | 234 | medium | 2.209 | 0.775 | 1.434 |

## Strongest Convergence State Groups

| State | Fallback | Current Rows | AiBS RE | Realized RE | Abs Diff |
| --- | --- | --- | --- | --- | --- |
| 1-3, 2 outs, 100, 2-2 | exact | 143 | 0.204 | 0.196 | 0.008 |
| 1-3, 2 outs, 110, 1-2 | exact | 51 | 0.304 | 0.294 | 0.010 |
| 4-6, 2 outs, 010, 2-2 | exact | 49 | 0.275 | 0.286 | 0.011 |
| 1-3, 2 outs, 100, 1-2 | exact | 120 | 0.172 | 0.158 | 0.014 |
| 1-3, 2 outs, 101, 1-1 | exact | 36 | 0.488 | 0.472 | 0.015 |
| 4-6, 0 outs, 111, 1-2 | exact | 32 | 2.265 | 2.281 | 0.016 |
| 4-6, 2 outs, 110, 0-1 | exact | 76 | 0.402 | 0.382 | 0.020 |
| 4-6, 2 outs, 100, 1-2 | exact | 103 | 0.176 | 0.155 | 0.020 |
| 4-6, 2 outs, 101, 1-2 | exact | 35 | 0.377 | 0.400 | 0.023 |
| 1-3, 2 outs, 010, 2-1 | exact | 26 | 0.333 | 0.308 | 0.025 |
| 4-6, 2 outs, 101, 0-0 | exact | 119 | 0.522 | 0.496 | 0.026 |
| 4-6, 2 outs, 101, 1-1 | exact | 53 | 0.480 | 0.509 | 0.029 |
| 1-3, 2 outs, 100, 3-2 | exact | 144 | 0.269 | 0.236 | 0.033 |
| 9+, 2 outs, 100, 0-1 | exact | 41 | 0.169 | 0.122 | 0.047 |
| 4-6, 2 outs, 100, 0-1 | exact | 165 | 0.200 | 0.152 | 0.049 |

## Root-Cause Readout

- Low-confidence exact rows in benchmark: 510
- Exact rows with model sample size `<= 20`: 0
- Exact rows with model sample size `<= 50`: 52
- Inning-bucket fallback rows with bucket sample size `<= 20`: 0
- Inning-bucket fallback rows with bucket sample size `<= 50`: 0
- Mean RE gap between exact and bucket on low-confidence exact rows: 0.169
- If low-confidence exact rows were forced to bucket fallback, benchmark MAE would move from 0.603 to 0.604.

## Notes

- This is an out-of-sample spring audit against realized inning outcomes, not a comparison to a public MLB RE product.
- Realized runs are noisy at the pitch level, so the state-group sections are the more important analyst readout than any single pitch.
- The benchmark should be rerun after meaningful spring and regular-season data refreshes so high-pressure exact-state behavior is tracked over time.

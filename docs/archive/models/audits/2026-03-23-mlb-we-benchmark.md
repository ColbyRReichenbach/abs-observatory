# MLB WE Benchmark

Date: March 23, 2026

## Scope

- Comparison layer: MLB public `/game/{gamePk}/winProbability` endpoint

- Internal layer: AiBS shared WE fallback mart resolved on pre-at-bat state with count `0-0`

- Sample: final spring-training games in the current ABS window that contain at least one challenge and expose public win-probability payloads

## Overview

- Games benchmarked: 394

- Challenge games available in sample: 394

- At-bats compared: 30380

- Mean absolute difference: 2.5%con

- Median absolute difference: 2.2%

- 90th percentile absolute difference: 4.9%

- Mean signed difference (AiBS home WE minus MLB home WE): +1.25 pts

## Key Findings

- AiBS is directionally close enough to MLB’s public WE layer to treat the shared WE model as credible, not structurally broken.

- The broad benchmark gap is moderate rather than alarming: most compared at-bats stay within a single-digit percentage-point band.

- The most meaningful benchmark pressure is in tied and one-run states, where AiBS is somewhat more optimistic for the home side than MLB.

- The largest individual divergences are no longer dominated by tiny exact-state blowups; they now cluster in low-confidence states where the inning bucket is also thin or materially different from MLB’s public layer.

## Interpretation

- This benchmark is intentionally pre-at-bat only, because MLB exposes play-level win probability rather than pitch-level count-state WE.

- AiBS is being compared on the shared state both systems actually represent: inning, half inning, score state, outs, bases, and a fresh `0-0` count.

- Differences here are benchmark signals, not automatic evidence that MLB is “right” and AiBS is “wrong.”

- The benchmark now reconstructs pre-at-bat state from previous at-bat end state plus first-pitch inning/outs, because the raw `*_start` / `*_before` columns proved unreliable on some spring at-bats.

## By Fallback Tier

| Fallback Tier | At-Bats | Share | Mean Abs Diff | Mean Signed Diff |

| --- | --- | --- | --- | --- |

| exact | 20566 | 67.7% | 2.2% | +1.25 pts |
| drop_inning_to_bucket | 9814 | 32.3% | 3.0% | +1.25 pts |

## By Inning Bucket

| Inning Bucket | At-Bats | Mean Abs Diff | Mean Signed Diff |

| --- | --- | --- | --- |

| 1-3 | 10308 | 2.9% | +2.21 pts |
| 4-6 | 10461 | 2.7% | +1.09 pts |
| 7-8 | 7035 | 2.0% | +0.59 pts |
| 9+ | 2576 | 1.4% | -0.09 pts |

## By Score Bucket

| Score Bucket | At-Bats | Mean Abs Diff | Mean Signed Diff |

| --- | --- | --- | --- |

| Four-Plus | 7839 | 2.3% | +0.36 pts |
| Tied | 7309 | 2.7% | +2.37 pts |
| One-Run | 6689 | 2.6% | +1.17 pts |
| Two-Run | 4902 | 2.8% | +1.54 pts |
| Three-Run | 3641 | 2.1% | +0.70 pts |

## Largest Divergences

| Game | At-Bat | State | Fallback Tier | Exact Sample | Confidence | AiBS Home WE | Bucket Home WE | MLB Home WE | Abs Diff |

| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

| 831765 | 28 | 2 Bottom | drop_inning_to_bucket | 4 | low | 28.6% | 28.6% | 1.3% | 27.3% |
| 831953 | 81 | 9 Bottom | drop_inning_to_bucket | 355 | low | 31.6% | 31.6% | 56.1% | 24.5% |
| 831510 | 63 | 9 Top | exact | 12 | low | 16.7% | 16.7% | 39.6% | 22.9% |
| 831523 | 77 | 9 Top | exact | 12 | low | 16.7% | 16.7% | 39.6% | 22.9% |
| 831806 | 65 | 8 Top | drop_inning_to_bucket | 9 | low | 52.6% | 52.6% | 30.2% | 22.4% |
| 831753 | 41 | 4 Bottom | drop_inning_to_bucket | 18 | low | 9.5% | 9.5% | 31.6% | 22.1% |
| 831601 | 47 | 7 Top | exact | 8 | low | 75.0% | 75.0% | 52.9% | 22.1% |
| 831520 | 80 | 8 Bottom | drop_inning_to_bucket | 45 | low | 64.4% | 63.4% | 86.2% | 21.8% |
| 831894 | 27 | 3 Top | drop_inning_to_bucket | 51 | low | 84.6% | 85.7% | 63.1% | 21.5% |
| 831760 | 68 | 8 Bottom | drop_inning_to_bucket | 65 | low | 75.4% | 75.5% | 55.0% | 20.4% |
| 831941 | 34 | 3 Bottom | drop_inning_to_bucket | 51 | low | 24.7% | 25.3% | 4.3% | 20.4% |
| 832063 | 38 | 3 Bottom | drop_inning_to_bucket | 51 | low | 24.7% | 25.3% | 4.3% | 20.4% |
| 831510 | 64 | 9 Top | drop_inning_to_bucket | 28 | low | 29.3% | 30.5% | 9.3% | 20.0% |
| 831638 | 53 | 6 Top | drop_inning_to_bucket | 23 | low | 56.2% | 55.2% | 36.7% | 19.5% |
| 831823 | 37 | 5 Bottom | drop_inning_to_bucket | 9 | low | 20.6% | 20.6% | 40.0% | 19.4% |

## Root-Cause Readout

- Low-confidence exact rows in benchmark: 470

- Exact rows with sample size `<= 5`: 2

- Exact rows with sample size `<= 10`: 4

- Exact rows with sample size `<= 20`: 30

- Inning-bucket fallback rows with bucket sample size `<= 20`: 14

- Inning-bucket fallback rows with bucket sample size `<= 50`: 139

- Mean home-WE gap between exact and bucket on low-confidence exact rows: 0.0%

- If exact rows with sample size `<= 20` were forced to bucket fallback, benchmark mean abs diff would move from 2.5% to 2.5%.

- If all low-confidence exact rows were forced to bucket fallback, benchmark mean abs diff would move from 2.5% to 2.5%.


## Notes

- MLB pre-at-bat home WE is reconstructed as `homeTeamWinProbability - homeTeamWinProbabilityAdded` from the public endpoint.

- AiBS home WE is derived from batting-team WE: top-half states invert to home-team perspective, bottom-half states do not.

- This benchmark is not count-aware on the MLB side, so it should be used to validate overall WE shape rather than pitch-level challenge deltas.

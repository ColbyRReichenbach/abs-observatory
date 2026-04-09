# Leverage Audit

Date: April 8, 2026

## Scope

- Comparison layer: internal WE count-swing pressure on real spring ABS challenges
- Internal layer: AiBS public leverage heuristic in `estimated-leverage.ts`
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-04-08

## Overview

- Challenges benchmarked: 1426
- Mean estimated leverage index: 50.8
- Mean absolute WE swing: 3.3%
- Median absolute WE swing: 2.0%
- 90th percentile absolute WE swing: 7.6%
- Pearson correlation between leverage index and absolute WE swing: 0.190
- Share of top-decile WE swings captured by `high` leverage bucket: 21.0%
- Share of `low` leverage rows that still land in top-decile WE swing: 4.5%

## Key Findings

- The leverage model is directionally credible: `high` leverage rows average 5.5% absolute WE swing versus 3.3% for `medium` and 2.2% for `low`.
- The alignment is only moderate rather than tight: leverage index and absolute WE swing correlate at 0.190, so this heuristic is useful for pressure ordering but not a substitute for WE itself.
- The current heuristic is better at separating empty / one-run / runner-pressure states from true low-pressure spots than it is at ranking the very highest-pressure challenge windows.
- This audit only covers WE-backed count swings; terminal count states that fall out of the WE comparison layer are intentionally excluded from this benchmark.
- Conclusion: retain leverage as an explicitly labeled heuristic pressure proxy rather than presenting it as a calibrated probabilistic model.

## By Leverage Bucket

| Bucket | Rows | Share | Mean Index | Mean Abs WE Swing | Top-Decile Share |
| --- | --- | --- | --- | --- | --- |
| high | 138 | 9.7% | 69.2 | 5.5% | 21.7% |
| medium | 1066 | 74.8% | 51.9 | 3.3% | 9.7% |
| low | 222 | 15.6% | 34.5 | 2.2% | 4.5% |

## By Inning Bucket

| Inning Bucket | Rows | Mean Index | Mean Abs WE Swing |
| --- | --- | --- | --- |
| 1-3 | 489 | 48.9 | 3.7% |
| 4-6 | 539 | 47.7 | 3.3% |
| 7-8 | 264 | 55.2 | 3.2% |
| 9+ | 134 | 61.8 | 2.5% |

## By Score Bucket

| Score Bucket | Rows | Mean Index | Mean Abs WE Swing |
| --- | --- | --- | --- |
| Tied | 299 | 56.7 | 3.2% |
| One-Run | 355 | 56.1 | 4.3% |
| Two-Run | 247 | 51.5 | 3.9% |
| Three-Run | 186 | 47.5 | 3.9% |
| Four-Plus | 339 | 41.5 | 1.8% |

## By Runner State

| Runner State | Rows | Mean Index | Mean Abs WE Swing |
| --- | --- | --- | --- |
| Bases Loaded | 51 | 60.2 | 8.3% |
| Two Runners | 206 | 56.7 | 5.8% |
| One Runner | 434 | 53.7 | 4.0% |
| Empty | 735 | 46.8 | 1.9% |

## Largest Overstatements

| State | Rows | Mean Index | Mean Abs WE Swing | Gap |
| --- | --- | --- | --- | --- |
| 7-8, One-Run, 1 outs, One Runner, Early Count | 10 | 68.0 | 4.8% | +15.73 pts |
| 1-3, Tied, 2 outs, Two Runners, Early Count | 9 | 66.0 | 3.1% | +15.39 pts |
| 7-8, One-Run, 2 outs, Empty, Early Count | 12 | 65.0 | 2.3% | +15.21 pts |
| 4-6, Tied, 1 outs, One Runner, Early Count | 11 | 62.9 | 4.0% | +11.42 pts |
| 4-6, One-Run, 2 outs, One Runner, Early Count | 10 | 62.0 | 3.3% | +11.21 pts |
| 7-8, Two-Run, 1 outs, One Runner, Early Count | 14 | 62.0 | 3.8% | +10.73 pts |
| 9+, Three-Run, 2 outs, Empty, Early Count | 9 | 59.0 | 0.9% | +10.64 pts |
| 7-8, Two-Run, 2 outs, Empty, Early Count | 9 | 59.0 | 1.8% | +9.68 pts |

## Largest Understatements

| State | Rows | Mean Index | Mean Abs WE Swing | Gap |
| --- | --- | --- | --- | --- |
| 1-3, Four-Plus, 1 outs, Empty, Early Count | 9 | 28.0 | 3.1% | -22.56 pts |
| 4-6, Four-Plus, 0 outs, Empty, Early Count | 24 | 29.0 | 1.0% | -19.48 pts |
| 4-6, Four-Plus, 1 outs, Empty, Early Count | 17 | 31.5 | 1.2% | -17.13 pts |
| 1-3, Four-Plus, 2 outs, Empty, Early Count | 13 | 33.0 | 1.9% | -16.40 pts |
| 1-3, Two-Run, 0 outs, One Runner, Early Count | 10 | 44.0 | 11.1% | -14.57 pts |
| 4-6, Three-Run, 0 outs, Empty, Early Count | 11 | 34.9 | 1.6% | -14.14 pts |
| 4-6, Four-Plus, 0 outs, One Runner, Early Count | 12 | 37.0 | 2.1% | -12.58 pts |
| 4-6, Four-Plus, 2 outs, Empty, Early Count | 35 | 36.8 | 0.8% | -11.47 pts |

## Root-Cause Readout

- WE-backed rows available: 1426
- High leverage rows with abs WE swing below overall median: 47
- Low leverage rows with abs WE swing in the top decile: 10
- Full-count share inside top-decile WE swings: 0.0%
- Two-strike share inside top-decile WE swings: 0.0%
- Tied and one-run share inside top-decile WE swings: 56.6%

## Notes

- The WE comparison layer uses internal count-swing WE because public MLB win probability is not exposed at pitch-count resolution.
- This audit should be rerun after meaningful data refreshes because leverage usefulness is mainly about ordering pressure correctly as the challenge sample grows.
- The correct analyst question is whether the heuristic pressure score and bucketing are telling the right story, not whether leverage literally equals WE swing.
- Product and docs should describe this layer as an estimated pressure proxy, not as modeled WE or calibrated leverage truth.

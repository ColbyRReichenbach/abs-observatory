# Leverage Audit

Date: March 25, 2026

## Scope

- Comparison layer: internal WE count-swing pressure on real spring ABS challenges
- Internal layer: AiBS public leverage heuristic in `estimated-leverage.ts`
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-03-25

## Overview

- Challenges benchmarked: 1148
- Mean estimated leverage index: 50.4
- Mean absolute WE swing: 3.3%
- Median absolute WE swing: 2.0%
- 90th percentile absolute WE swing: 7.5%
- Pearson correlation between leverage index and absolute WE swing: 0.206
- Share of top-decile WE swings captured by `high` leverage bucket: 20.0%
- Share of `low` leverage rows that still land in top-decile WE swing: 4.8%

## Key Findings

- The leverage model is directionally credible: `high` leverage rows average 5.6% absolute WE swing versus 3.2% for `medium` and 2.2% for `low`.
- The alignment is only moderate rather than tight: leverage index and absolute WE swing correlate at 0.206, so this heuristic is useful for pressure ordering but not a substitute for WE itself.
- The current heuristic is better at separating empty / one-run / runner-pressure states from true low-pressure spots than it is at ranking the very highest-pressure challenge windows.
- This audit only covers WE-backed count swings; terminal count states that fall out of the WE comparison layer are intentionally excluded from this benchmark.

## By Leverage Bucket

| Bucket | Rows | Share | Mean Index | Mean Abs WE Swing | Top-Decile Share |
| --- | --- | --- | --- | --- | --- |
| high | 97 | 8.4% | 69.1 | 5.6% | 23.7% |
| medium | 863 | 75.2% | 51.7 | 3.2% | 9.6% |
| low | 188 | 16.4% | 34.5 | 2.2% | 4.8% |

## By Inning Bucket

| Inning Bucket | Rows | Mean Index | Mean Abs WE Swing |
| --- | --- | --- | --- |
| 1-3 | 417 | 48.8 | 3.6% |
| 4-6 | 444 | 47.4 | 3.2% |
| 7-8 | 195 | 55.2 | 2.8% |
| 9+ | 92 | 61.7 | 2.6% |

## By Score Bucket

| Score Bucket | Rows | Mean Index | Mean Abs WE Swing |
| --- | --- | --- | --- |
| Tied | 243 | 56.2 | 3.2% |
| One-Run | 282 | 55.7 | 4.0% |
| Two-Run | 206 | 51.2 | 3.9% |
| Three-Run | 144 | 46.3 | 4.1% |
| Four-Plus | 273 | 41.3 | 1.7% |

## By Runner State

| Runner State | Rows | Mean Index | Mean Abs WE Swing |
| --- | --- | --- | --- |
| Bases Loaded | 42 | 60.1 | 7.9% |
| Two Runners | 166 | 56.1 | 5.5% |
| One Runner | 347 | 53.5 | 4.0% |
| Empty | 593 | 46.3 | 1.9% |

## Largest Overstatements

| State | Rows | Mean Index | Mean Abs WE Swing | Gap |
| --- | --- | --- | --- | --- |
| 1-3, Tied, 2 outs, Two Runners, Early Count | 8 | 66.0 | 3.2% | +15.70 pts |
| 7-8, Two-Run, 1 outs, One Runner, Early Count | 11 | 62.0 | 3.4% | +11.48 pts |
| 4-6, Tied, 1 outs, One Runner, Early Count | 8 | 63.3 | 4.8% | +11.32 pts |
| 7-8, Two-Run, 2 outs, Empty, Early Count | 9 | 59.0 | 1.8% | +10.05 pts |
| 1-3, Tied, 1 outs, Two Runners, Early Count | 10 | 61.0 | 3.8% | +10.04 pts |
| 4-6, Tied, 2 outs, Empty, Early Count | 10 | 58.6 | 3.1% | +8.35 pts |
| 1-3, Tied, 1 outs, One Runner, Early Count | 19 | 58.0 | 2.9% | +7.94 pts |
| 4-6, One-Run, 1 outs, One Runner, Early Count | 22 | 57.5 | 4.0% | +6.44 pts |

## Largest Understatements

| State | Rows | Mean Index | Mean Abs WE Swing | Gap |
| --- | --- | --- | --- | --- |
| 1-3, Four-Plus, 1 outs, Empty, Early Count | 8 | 28.0 | 3.1% | -22.20 pts |
| 4-6, Four-Plus, 0 outs, Empty, Early Count | 20 | 29.1 | 1.0% | -19.05 pts |
| 4-6, Four-Plus, 1 outs, Empty, Early Count | 14 | 31.9 | 1.3% | -16.55 pts |
| 1-3, Four-Plus, 2 outs, Empty, Early Count | 12 | 33.0 | 2.1% | -16.18 pts |
| 1-3, Two-Run, 0 outs, One Runner, Early Count | 8 | 44.0 | 12.5% | -15.58 pts |
| 4-6, Three-Run, 0 outs, Empty, Early Count | 11 | 34.9 | 1.6% | -13.76 pts |
| 4-6, Four-Plus, 0 outs, One Runner, Early Count | 8 | 36.5 | 1.8% | -12.46 pts |
| 4-6, Four-Plus, 2 outs, Empty, Early Count | 33 | 36.8 | 0.8% | -11.08 pts |

## Root-Cause Readout

- WE-backed rows available: 1148
- High leverage rows with abs WE swing below overall median: 33
- Low leverage rows with abs WE swing in the top decile: 9
- Full-count share inside top-decile WE swings: 0.0%
- Two-strike share inside top-decile WE swings: 0.0%
- Tied and one-run share inside top-decile WE swings: 53.9%

## Notes

- The WE comparison layer uses internal count-swing WE because public MLB win probability is not exposed at pitch-count resolution.
- This audit should be rerun after meaningful data refreshes because leverage usefulness is mainly about ordering pressure correctly as the challenge sample grows.
- The correct analyst question is whether the heuristic pressure score and bucketing are telling the right story, not whether leverage literally equals WE swing.

# Decision Value Audit

Date: April 24, 2026

## Scope

- Source table: `modeling.called_pitch_decisions`
- Population: all challenge-eligible `test` opportunities
- Geometry variant: `radius_adjusted`
- Overturn lookup source: `mart_modeled_abs_overturn_probability_fallbacks`
- Inventory cost version: `inventory_future_opportunity_failure_weighted_v2`

## Overview

- Held-out opportunities: 43297
- Validation opportunities: 4967
- Held-out challenged rows: 1129
- Held-out non-challenged rows: 42168
- Split policy: `called_pitch_decisions_phase_time_v1`
- Challenge recommendation share: 10.9%
- Actual historical challenge share: 2.6%
- Mean expected challenge value: -0.61%
- Positive-EV non-challenged opportunities: 4261
- Negative-EV challenged opportunities: 688

## Inventory Cost Sensitivity On Validation

| Version | Multiplier | Validation Challenge Share | Avg Expected | Positive-EV Non-Challenge Rows |
| --- | --- | --- | --- | --- |
| v0_5x | 0.5 | 14.0% | -0.30% | 0 |
| v1_0x | 1.0 | 9.4% | -0.63% | 0 |
| v2_0x | 2.0 | 5.6% | -1.30% | 0 |
| v4_0x | 4.0 | 3.6% | -2.63% | 0 |
| v8_0x | 8.0 | 2.1% | -5.30% | 0 |

## Validation Threshold Envelope

| Threshold | Validation Challenge Share | Avg Expected On Recommended | Positive-EV Holds | Negative-EV Challenges |
| --- | --- | --- | --- | --- |
| 0.00% | 9.4% | 1.32% | 0 | 0 |
| 0.25% | 6.4% | 1.90% | 143 | 0 |
| 0.50% | 4.7% | 2.46% | 227 | 0 |
| 1.00% | 3.2% | 3.26% | 300 | 0 |
| 2.00% | 1.9% | 4.62% | 365 | 0 |

## Validation Budget-Constrained Envelope

| Budget / Team-Game | Validation Challenge Share | Avg Expected On Selected | Actual Challenge Rate On Selected | Actual Overturn Rate On Selected Challenges | Actual Challenged Rows Captured | Positive-EV Rows Left Unselected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.3% | 4.58% | 1.6% | 100.0% | 1 | 395 |
| 2 | 2.6% | 3.32% | 3.1% | 75.0% | 4 | 332 |

## Opportunity-Level Policy Summary

| Recommendation | Rows | Actual Challenge Rate | Avg Ovr Prob | Avg Success | Avg Fail | Avg Inventory | Avg Expected |
| --- | --- | --- | --- | --- | --- | --- | --- |
| challenge | 4736 | 9.2% | 48.7% | 5.51% | -0.97% | 0.77% | 1.39% |
| hold | 38561 | 1.8% | 13.8% | 0.54% | -0.98% | 0.82% | -0.86% |

## By Expected Value Bucket

| EV Bucket | Rows | Actual Challenge Rate | Overturn Rate On Challenged | Avg Expected |
| --- | --- | --- | --- | --- |
| < -0.005 | 29668 | 1.6% | 37.1% | -1.03% |
| -0.005 to 0 | 8854 | 2.4% | 43.5% | -0.30% |
| 0 to 0.005 | 1977 | 6.9% | 69.1% | 0.21% |
| >= 0.005 | 2798 | 10.9% | 78.4% | 2.21% |

## Challenged-Subset Diagnostic

This section is descriptive only. Realized value is observed only for pitches that were actually challenged, so it is not a causal evaluation of the full policy.

- Challenged rows in held-out test: 1129
- Mean expected challenge value on challenged rows: 0.19%
- Mean realized challenge value on challenged rows: 0.41%
- Mean signed gap (realized - expected): +0.22 pts
- Recommended-share on challenged rows: 38.8%
- Positive realized share on challenged rows: 41.3%

| Recommendation | Rows | Avg Expected | Avg Realized | Positive Realized Share | Overturn Share |
| --- | --- | --- | --- | --- | --- |
| challenge | 438 | 2.05% | 2.06% | 76.0% | 76.0% |
| hold | 691 | -0.98% | -0.64% | 19.2% | 38.9% |

## Largest Missed Positive-EV Holds

| Game | Phase | State | Ovr Prob | Expected |
| --- | --- | --- | --- | --- |
| 824126 | regular_season | 6 Top, 111, 0-0 | 93.9% | 26.42% |
| 823569 | regular_season | 8 Top, 011, 0-0 | 63.2% | 26.39% |
| 824614 | regular_season | 9 Top, 111, 1-1 | 97.9% | 24.44% |
| 823644 | regular_season | 2 Top, 110, 2-0 | 97.9% | 20.70% |
| 823479 | regular_season | 8 Bottom, 101, 1-0 | 97.9% | 19.00% |
| 822833 | regular_season | 9 Top, 100, 2-0 | 93.9% | 17.64% |
| 825022 | regular_season | 3 Bottom, 111, 0-0 | 89.9% | 16.00% |
| 824776 | regular_season | 4 Top, 110, 1-1 | 97.9% | 15.67% |
| 822752 | regular_season | 2 Top, 110, 1-0 | 89.9% | 14.70% |
| 825101 | regular_season | 7 Top, 010, 2-0 | 93.9% | 14.39% |

## Largest Negative-EV Actual Challenges

| Game | Phase | State | Ovr Prob | Expected | Realized |
| --- | --- | --- | --- | --- | --- |
| 824208 | regular_season | 3 Top, 001, 0-0 | 97.9% | -13.79% | -14.05% |
| 825023 | regular_season | 9 Top, 111, 2-0 | 63.2% | -10.88% | -16.67% |
| 823156 | regular_season | 1 Bottom, 111, 1-0 | 63.2% | -9.29% | -0.99% |
| 824779 | regular_season | 3 Bottom, 111, 2-1 | 63.2% | -8.74% | -1.33% |
| 824781 | regular_season | 4 Top, 011, 1-1 | 43.7% | -8.51% | -18.30% |
| 823718 | regular_season | 10 Bottom, 010, 2-0 | 66.8% | -6.99% | -0.40% |
| 823156 | regular_season | 2 Top, 111, 0-1 | 63.2% | -6.58% | -9.82% |
| 823641 | regular_season | 8 Bottom, 101, 0-0 | 93.9% | -5.93% | -6.23% |
| 824535 | regular_season | 5 Top, 100, 2-0 | 97.9% | -5.93% | -6.03% |
| 823397 | regular_season | 4 Bottom, 111, 0-0 | 63.2% | -5.81% | -1.19% |

## Notes

- This audit now scores the full held-out opportunity set rather than only historical challenges.
- Non-challenged rows do not have observed counterfactual realized value, so opportunity-level metrics are descriptive policy diagnostics, not causal proof.
- Challenged-subset realized-value comparisons are useful for sanity checks, but they remain selection-biased until a stronger counterfactual design is added.
- Threshold-envelope reporting is included so recommendation rate can be compared against historical usage before any stronger deployment claim is made.
- Budget-constrained validation reporting is descriptive only; it shows what a simple team-game budgeted selector would do, not what a fully retained-challenge simulation has proven.

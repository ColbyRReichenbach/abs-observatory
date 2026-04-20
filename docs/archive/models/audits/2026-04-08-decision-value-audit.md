# Decision Value Audit

Date: April 8, 2026

## Scope

- Source table: `modeling.called_pitch_decisions`
- Population: all challenge-eligible `test` opportunities
- Geometry variant: `center_only`
- Overturn lookup source: `mart_modeled_abs_overturn_probability_fallbacks`
- Inventory cost version: `inventory_future_opportunity_v1`

## Overview

- Held-out opportunities: 9768
- Validation opportunities: 4967
- Held-out challenged rows: 245
- Held-out non-challenged rows: 9523
- Split policy: `called_pitch_decisions_phase_time_v1`
- Challenge recommendation share: 0.8%
- Actual historical challenge share: 2.5%
- Mean expected challenge value: -20.03%
- Positive-EV non-challenged opportunities: 78
- Negative-EV challenged opportunities: 242

## Inventory Cost Sensitivity On Validation

| Version | Multiplier | Validation Challenge Share | Avg Expected | Positive-EV Non-Challenge Rows |
| --- | --- | --- | --- | --- |
| v0_5x | 0.5 | 1.0% | -9.58% | 0 |
| v1_0x | 1.0 | 0.3% | -19.59% | 0 |
| v2_0x | 2.0 | 0.1% | -39.59% | 0 |
| v4_0x | 4.0 | 0.1% | -79.61% | 0 |
| v8_0x | 8.0 | 0.0% | -159.64% | 0 |

## Validation Threshold Envelope

| Threshold | Validation Challenge Share | Avg Expected On Recommended | Positive-EV Holds | Negative-EV Challenges |
| --- | --- | --- | --- | --- |
| 0.00% | 0.3% | 3.37% | 0 | 0 |
| 0.25% | 0.3% | 3.82% | 2 | 0 |
| 0.50% | 0.3% | 4.06% | 3 | 0 |
| 1.00% | 0.2% | 5.44% | 7 | 0 |
| 2.00% | 0.1% | 7.95% | 11 | 0 |

## Validation Budget-Constrained Envelope

| Budget / Team-Game | Validation Challenge Share | Avg Expected On Selected | Actual Challenge Rate On Selected | Actual Overturn Rate On Selected Challenges | Actual Challenged Rows Captured | Positive-EV Rows Left Unselected |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 0.2% | 4.91% | 0.0% | — | 0 | 6 |
| 2 | 0.3% | 3.82% | 0.0% | — | 0 | 2 |

## Opportunity-Level Policy Summary

| Recommendation | Rows | Actual Challenge Rate | Avg Ovr Prob | Avg Success | Avg Fail | Avg Inventory | Avg Expected |
| --- | --- | --- | --- | --- | --- | --- | --- |
| challenge | 81 | 3.7% | 51.1% | 13.42% | -0.33% | 3.74% | 2.91% |
| hold | 9687 | 2.5% | 51.3% | 1.08% | -0.18% | 20.69% | -20.22% |

## By Expected Value Bucket

| EV Bucket | Rows | Actual Challenge Rate | Overturn Rate On Challenged | Avg Expected |
| --- | --- | --- | --- | --- |
| < -0.005 | 9670 | 2.5% | 52.5% | -20.26% |
| -0.005 to 0 | 17 | 0.0% | — | -0.31% |
| 0 to 0.005 | 15 | 0.0% | — | 0.23% |
| >= 0.005 | 66 | 4.5% | 66.7% | 3.52% |

## Challenged-Subset Diagnostic

This section is descriptive only. Realized value is observed only for pitches that were actually challenged, so it is not a causal evaluation of the full policy.

- Challenged rows in held-out test: 245
- Mean expected challenge value on challenged rows: -18.68%
- Mean realized challenge value on challenged rows: -18.42%
- Mean signed gap (realized - expected): +0.26 pts
- Recommended-share on challenged rows: 1.2%
- Positive realized share on challenged rows: 2.4%

| Recommendation | Rows | Avg Expected | Avg Realized | Positive Realized Share | Overturn Share |
| --- | --- | --- | --- | --- | --- |
| challenge | 3 | 2.15% | 3.77% | 66.7% | 66.7% |
| hold | 242 | -18.94% | -18.70% | 1.7% | 52.5% |

## Largest Missed Positive-EV Holds

| Game | Phase | State | Ovr Prob | Expected |
| --- | --- | --- | --- | --- |
| 825025 | regular_season | 8 Top, 011, 2-0 | 49.2% | 24.36% |
| 825025 | regular_season | 10 Bottom, 001, 2-1 | 50.9% | 13.33% |
| 825025 | regular_season | 8 Top, 011, 0-0 | 50.9% | 10.70% |
| 824376 | regular_season | 5 Bottom, 011, 2-1 | 50.9% | 9.59% |
| 823569 | regular_season | 8 Top, 011, 0-0 | 47.9% | 9.42% |
| 823569 | regular_season | 9 Top, 010, 2-0 | 49.2% | 7.97% |
| 822754 | regular_season | 10 Bottom, 011, 0-1 | 50.9% | 6.56% |
| 822756 | regular_season | 8 Top, 011, 2-0 | 50.9% | 6.20% |
| 825025 | regular_season | 8 Top, 011, 1-0 | 50.9% | 6.19% |
| 823569 | regular_season | 8 Top, 011, 1-0 | 49.2% | 5.62% |

## Largest Negative-EV Actual Challenges

| Game | Phase | State | Ovr Prob | Expected | Realized |
| --- | --- | --- | --- | --- | --- |
| 823727 | regular_season | 2 Bottom, 101, 0-0 | 58.4% | -33.08% | -29.05% |
| 822917 | regular_season | 3 Bottom, 101, 1-1 | 48.8% | -29.69% | -30.31% |
| 823728 | regular_season | 2 Top, 000, 1-1 | 57.7% | -29.52% | -29.03% |
| 824783 | regular_season | 1 Bottom, 001, 2-0 | 50.9% | -29.22% | -29.00% |
| 823728 | regular_season | 1 Bottom, 000, 2-1 | 57.7% | -29.17% | -29.00% |
| 823727 | regular_season | 2 Bottom, 000, 0-0 | 48.8% | -28.98% | -29.03% |
| 823402 | regular_season | 1 Bottom, 000, 1-2 | 48.8% | -28.86% | -29.00% |
| 823566 | regular_season | 1 Top, 100, 1-2 | 48.8% | -28.85% | -29.00% |
| 823238 | regular_season | 1 Bottom, 000, 2-2 | 57.7% | -28.83% | -28.71% |
| 823567 | regular_season | 1 Bottom, 100, 3-2 | 55.0% | -28.83% | -28.68% |

## Notes

- This audit now scores the full held-out opportunity set rather than only historical challenges.
- Non-challenged rows do not have observed counterfactual realized value, so opportunity-level metrics are descriptive policy diagnostics, not causal proof.
- Challenged-subset realized-value comparisons are useful for sanity checks, but they remain selection-biased until a stronger counterfactual design is added.
- Threshold-envelope reporting is included so recommendation rate can be compared against historical usage before any stronger deployment claim is made.
- Budget-constrained validation reporting is descriptive only; it shows what a simple team-game budgeted selector would do, not what a fully retained-challenge simulation has proven.


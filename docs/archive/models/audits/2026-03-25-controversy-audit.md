# Controversy Audit

Date: March 25, 2026

## Scope

- Comparison layer: spring ABS challenge moments and their modeled / realized value context
- Internal layer: controversy scoring in `rubrics.ts`
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-03-25

## Overview

- Challenges scored: 1803
- Top-decile controversy threshold: 63.31
- Overturned share overall: 53.1%
- Overturned share in top decile: 100.0%
- Direct-impact share in top decile: 16.4%
- Mean controversy score overall: 46.38
- Mean controversy score top decile: 67.60

## Key Findings

- The controversy layer is healthy if top-ranked moments are being driven by overturned, late/close, direct-impact, and meaningful modeled-value spots rather than random noise.
- This audit is not asking whether every top controversy moment is overturned; it is asking whether the score is surfacing the right types of moments for the right reasons.
- The most important pressure point is whether modeled value is actually contributing, instead of leverage and overturn status swamping everything.

## By Overturn Status

| Status | Rows | Share | Mean Score | Mean Leverage Score | Mean Modeled Value Score |
| --- | --- | --- | --- | --- | --- |
| overturned | 957 | 53.1% | 55.95 | 50.36 | 58.10 |
| confirmed | 846 | 46.9% | 35.56 | 55.57 | 23.63 |

## By Impact Type

| Impact Type | Rows | Mean Score | Mean Leverage Score | Mean Modeled Value Score |
| --- | --- | --- | --- | --- |
| direct_ending_impact | 169 | 56.04 | 54.50 | 36.67 |
| direct_count_impact | 788 | 55.93 | 49.47 | 62.70 |
| confirmed | 845 | 35.57 | 55.58 | 23.66 |
| unknown | 1 | 28.62 | 43.00 | 0.00 |

## Top Moments

| Game | Challenge | Score | Overturned | Impact | Realized Value | Expected Value |
| --- | --- | --- | --- | --- | --- | --- |
| 831642 | 1596e4e3 | 78.45 | Yes | direct_ending_impact | 1.19% | 0.46% |
| 831916 | 52fb56a5 | 77.50 | Yes | direct_count_impact | -10.78% | -5.64% |
| 831490 | 14b842eb | 76.75 | Yes | direct_count_impact | 2.17% | 1.01% |
| 831609 | 2379d840 | 76.74 | Yes | direct_ending_impact | 1.48% | 0.59% |
| 831590 | 28c916bf | 76.74 | Yes | direct_ending_impact | 1.48% | 0.59% |
| 831561 | 0dd72c62 | 75.55 | Yes | direct_ending_impact | 1.04% | 0.40% |
| 831519 | e7e8d300 | 75.50 | Yes | direct_count_impact | 5.88% | 3.10% |
| 831963 | 49435fd3 | 75.29 | Yes | direct_ending_impact | 1.19% | 0.46% |
| 832862 | 576bf19b | 74.74 | Yes | direct_ending_impact | 1.29% | 0.51% |
| 831959 | bebcb580 | 74.34 | Yes | direct_count_impact | 4.28% | 2.12% |
| 831849 | 083dc241 | 74.24 | Yes | direct_count_impact | 1.91% | 0.70% |
| 831645 | 066e9241 | 73.95 | Yes | direct_count_impact | 1.19% | 0.40% |

## Root-Cause Readout

- Top-decile late/extra inning share: 67.8%
- Top-decile tied/one-run share: 49.2%
- Top-decile WE-backed share: 68.3%
- Top-decile modeled value `>= 0.5%` share: 96.2%
- Confirmed-call share in top decile: 0.0%

## Notes

- This audit intentionally uses the same controversy formula as the product layer.
- The key analyst question is whether the surfaced controversy board tells a baseball-sensible story, not whether controversy equals pure leverage or pure value.

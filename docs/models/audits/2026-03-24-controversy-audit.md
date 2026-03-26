# Controversy Audit

Date: March 24, 2026

## Scope

- Comparison layer: spring ABS challenge moments and their modeled / realized value context
- Internal layer: controversy scoring in `rubrics.ts`
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-03-24

## Overview

- Challenges scored: 1731
- Top-decile controversy threshold: 63.32
- Overturned share overall: 53.2%
- Overturned share in top decile: 100.0%
- Direct-impact share in top decile: 17.2%
- Mean controversy score overall: 46.40
- Mean controversy score top decile: 67.78

## Key Findings

- The controversy layer is healthy if top-ranked moments are being driven by overturned, late/close, direct-impact, and meaningful modeled-value spots rather than random noise.
- This audit is not asking whether every top controversy moment is overturned; it is asking whether the score is surfacing the right types of moments for the right reasons.
- The most important pressure point is whether modeled value is actually contributing, instead of leverage and overturn status swamping everything.

## By Overturn Status

| Status | Rows | Share | Mean Score | Mean Leverage Score | Mean Modeled Value Score |
| --- | --- | --- | --- | --- | --- |
| overturned | 921 | 53.2% | 55.96 | 50.20 | 58.31 |
| confirmed | 810 | 46.8% | 35.54 | 55.44 | 23.67 |

## By Impact Type

| Impact Type | Rows | Mean Score | Mean Leverage Score | Mean Modeled Value Score |
| --- | --- | --- | --- | --- |
| direct_ending_impact | 164 | 56.14 | 54.49 | 36.76 |
| direct_count_impact | 757 | 55.92 | 49.27 | 62.98 |
| confirmed | 810 | 35.54 | 55.44 | 23.67 |

## Top Moments

| Game | Challenge | Score | Overturned | Impact | Realized Value | Expected Value |
| --- | --- | --- | --- | --- | --- | --- |
| 831642 | 1596e4e3 | 78.45 | Yes | direct_ending_impact | 1.19% | 0.44% |
| 831916 | 52fb56a5 | 77.50 | Yes | direct_count_impact | -10.78% | -5.61% |
| 831490 | 14b842eb | 76.75 | Yes | direct_count_impact | 2.17% | 0.96% |
| 831609 | 2379d840 | 76.74 | Yes | direct_ending_impact | 1.48% | 0.56% |
| 831590 | 28c916bf | 76.74 | Yes | direct_ending_impact | 1.48% | 0.56% |
| 831561 | 0dd72c62 | 75.55 | Yes | direct_ending_impact | 1.04% | 0.38% |
| 831519 | e7e8d300 | 75.50 | Yes | direct_count_impact | 5.88% | 3.00% |
| 831963 | 49435fd3 | 75.29 | Yes | direct_ending_impact | 1.19% | 0.44% |
| 832862 | 576bf19b | 74.74 | Yes | direct_ending_impact | 1.29% | 0.48% |
| 831959 | bebcb580 | 74.34 | Yes | direct_count_impact | 4.28% | 2.04% |
| 831849 | 083dc241 | 74.24 | Yes | direct_count_impact | 1.91% | 0.69% |
| 831645 | 066e9241 | 73.95 | Yes | direct_count_impact | 1.19% | 0.40% |

## Root-Cause Readout

- Top-decile late/extra inning share: 68.4%
- Top-decile tied/one-run share: 50.0%
- Top-decile WE-backed share: 67.8%
- Top-decile modeled value `>= 0.5%` share: 96.6%
- Confirmed-call share in top decile: 0.0%

## Notes

- This audit intentionally uses the same controversy formula as the product layer.
- The key analyst question is whether the surfaced controversy board tells a baseball-sensible story, not whether controversy equals pure leverage or pure value.

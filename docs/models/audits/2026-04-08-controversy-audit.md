# Controversy Audit

Date: April 8, 2026

## Scope

- Comparison layer: spring ABS challenge moments and their modeled / realized value context
- Internal layer: editorial controversy scoring in `rubrics.ts`
- Sample: final spring-training ABS challenges from 2026-02-20 through 2026-04-08
- Score version: `controversy_editorial_v2`

## Overview

- Challenges scored: 2312
- Top-decile controversy threshold: 63.81
- Overturned share overall: 53.6%
- Overturned share in top decile: 100.0%
- Direct-impact share in top decile: 18.1%
- Mean controversy score overall: 46.70
- Mean controversy score top decile: 68.46

## Key Findings

- The controversy layer should be treated as an editorial composite, not a predictive model.
- The controversy layer is healthy if top-ranked moments are being driven by overturned, late/close, direct-impact, and meaningful modeled-value spots rather than random noise.
- This audit is not asking whether every top controversy moment is overturned; it is asking whether the score is surfacing the right types of moments for the right reasons.
- The most important pressure point is whether modeled value is actually contributing, instead of leverage and overturn status swamping everything.

## By Overturn Status

| Status | Rows | Share | Mean Score | Mean Leverage Score | Mean Modeled Value Score |
| --- | --- | --- | --- | --- | --- |
| overturned | 1239 | 53.6% | 56.13 | 51.67 | 57.36 |
| confirmed | 1073 | 46.4% | 35.82 | 56.86 | 23.36 |

## By Impact Type

| Impact Type | Rows | Mean Score | Mean Leverage Score | Mean Modeled Value Score |
| --- | --- | --- | --- | --- |
| direct_count_impact | 997 | 56.43 | 50.91 | 63.20 |
| direct_ending_impact | 216 | 56.52 | 55.22 | 37.34 |
| confirmed | 1049 | 35.88 | 56.80 | 23.90 |
| unknown | 50 | 37.36 | 55.32 | 0.00 |

## Top Moments

| Game | Challenge | Score | Overturned | Impact | Realized Value | Expected Value |
| --- | --- | --- | --- | --- | --- | --- |
| 831519 | 1d8cf26a | 79.50 | Yes | direct_count_impact | 5.88% | 3.27% |
| 824215 | 0c328eb1 | 79.47 | Yes | direct_count_impact | 8.01% | 3.78% |
| 822839 | 08387948 | 78.74 | Yes | direct_ending_impact | 1.55% | 0.69% |
| 823969 | 9834c4a1 | 78.67 | Yes | direct_count_impact | -8.01% | -4.62% |
| 823488 | 7ccfb094 | 77.50 | Yes | direct_count_impact | 23.75% | 13.14% |
| 831916 | 884146dc | 77.50 | Yes | direct_count_impact | -10.78% | -5.63% |
| 823488 | 907664f3 | 77.50 | Yes | direct_count_impact | 3.60% | 1.82% |
| 831959 | 812e0a6a | 76.34 | Yes | direct_count_impact | 4.28% | 2.25% |
| 831583 | 13b27083 | 76.17 | Yes | direct_ending_impact | 0.89% | 0.29% |
| 831827 | 401338ae | 75.62 | Yes | direct_count_impact | 2.77% | 1.15% |
| 823809 | bdddd147 | 75.50 | Yes | direct_count_impact | 3.34% | 1.72% |
| 831783 | 348da604 | 75.44 | Yes | direct_count_impact | 6.53% | 3.07% |

## Root-Cause Readout

- Top-decile late/extra inning share: 71.6%
- Top-decile tied/one-run share: 49.1%
- Top-decile WE-backed share: 63.8%
- Top-decile modeled value `>= 0.5%` share: 97.8%
- Confirmed-call share in top decile: 0.0%

## Notes

- This audit intentionally uses the same controversy formula as the product layer.
- The key analyst question is whether the surfaced controversy board tells a baseball-sensible story, not whether controversy equals pure leverage or pure value.
- Product and publication copy should describe this as an editorial ranking layer backed by modeled inputs.

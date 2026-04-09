# Rubric Distribution Audit

Date: April 8, 2026

## Scope

- Data window: 2026-02-20 through 2026-04-07
- Team style sample: 30 tracked clubs
- Umpire rubric sample: 108 tracked HP umpires
- Controversy sample: 2636 spring challenges

## Analyst Readout

- Team-style spread covers 3 style buckets, with `Balanced` the largest family at 19 clubs (63.3%).
- Umpire report cards cover 3 grade buckets; the median score sits at 49.70 with a low-confidence share of 2.8%.
- Org watch risk is not collapsed into one tier: `Moderate` is largest at 92 umpires (85.2%), with low-confidence damping preventing weak samples from staying at `High` or `Low`.
- Controversy ranking is not just “overturned = top”: overturned moments average 58.17 while confirmed moments average 36.97, and the top bucket still concentrates late / close / modeled-value events.

## Team Style Distribution

| Style | Org Label | Teams | Share |
| --- | --- | --- | --- |
| Balanced | Mixed profile | 19 | 63.3% |
| Selective | Selective | 7 | 23.3% |
| Overactive | High-Usage | 4 | 13.3% |

### Style Confidence

| Confidence | Teams |
| --- | --- |
| high | 30 |

### Most Ambiguous Team Profiles

| Team | Style | Top Gap | Confidence |
| --- | --- | --- | --- |
| San Diego Padres | Balanced | 0.07 | high |
| Tampa Bay Rays | Balanced | 0.16 | high |
| Boston Red Sox | Balanced | 0.27 | high |
| Detroit Tigers | Selective | 0.67 | high |
| Houston Astros | Balanced | 0.71 | high |
| Atlanta Braves | Balanced | 1.31 | high |
| Toronto Blue Jays | Balanced | 1.50 | high |
| Cincinnati Reds | Selective | 1.71 | high |
| Arizona Diamondbacks | Balanced | 2.30 | high |
| Miami Marlins | Balanced | 2.33 | high |

## Umpire Grade + Risk Distribution

### Grades

| Grade | Umpires | Share |
| --- | --- | --- |
| D | 56 | 51.9% |
| C | 51 | 47.2% |
| B | 1 | 0.9% |

### Fan Descriptors

| Descriptor | Umpires |
| --- | --- |
| Volatile | 56 |
| Watchful | 51 |
| Steady | 1 |

### Org Descriptors

| Descriptor | Umpires |
| --- | --- |
| Elevated risk | 56 |
| Monitor | 51 |
| Stable profile | 1 |

### Risk Tiers

| Risk Tier | Umpires | Share |
| --- | --- | --- |
| Moderate | 92 | 85.2% |
| Elevated | 11 | 10.2% |
| Low | 5 | 4.6% |

### Highest-Risk Umpire Profiles

| Umpire | Grade | Risk Tier | Risk Score | Confidence |
| --- | --- | --- | --- | --- |
| Chad Whitson | D | Elevated | 63.14 | medium |
| James Hoye | D | Elevated | 56.61 | medium |
| Chris Segal | D | Elevated | 56.39 | medium |
| Andy Fletcher | D | Elevated | 55.78 | high |
| Chad Fairchild | D | Elevated | 55.08 | medium |
| Ron Kulpa | D | Elevated | 55.04 | high |
| Dan Iassogna | D | Moderate | 54.79 | medium |
| Tripp Gibson | D | Elevated | 54.74 | high |
| Adrian Johnson | D | Elevated | 54.49 | medium |
| Junior Valentine | D | Elevated | 54.42 | medium |

## Controversy Spread

### Score Buckets

| Bucket | Moments | Share |
| --- | --- | --- |
| <55 | 1740 | 66.0% |
| 55-69 | 770 | 29.2% |
| 70-84 | 124 | 4.7% |
| 85+ | 2 | 0.1% |

### Outcome Split

| Outcome | Moments | Avg Score |
| --- | --- | --- |
| Overturned | 1402 | 58.17 |
| Confirmed | 1234 | 36.97 |

### Impact Types

| Impact Type | Moments | Share |
| --- | --- | --- |
| confirmed | 1195 | 45.3% |
| direct_count_impact | 1118 | 42.4% |
| direct_ending_impact | 242 | 9.2% |
| unknown | 79 | 3.0% |
| downstream_inferred_impact | 2 | 0.1% |

### Value Modes

| Mode | Moments | Share |
| --- | --- | --- |
| win_expectancy | 2634 | 99.9% |
| heuristic | 2 | 0.1% |

### Top Spring Controversy Moments

| Game | Date | Inning | Game Score | Controversy | Outcome | Chips |
| --- | --- | --- | --- | --- | --- | --- |
| 824215 | 2026-03-29 | Top 9 | 6-9 | 85.90 | Overturned | Late Inning, Overturned, RISP, Borderline Zone |
| 823569 | 2026-04-04 | Top 9 | 7-9 | 85.90 | Overturned | Late Inning, Overturned, RISP, Borderline Zone |
| 822839 | 2026-03-27 | Top 9 | 1-2 | 84.00 | Overturned | Late Inning, Overturned, One-Run Game, Direct Impact |
| 824215 | 2026-03-29 | Top 9 | 6-9 | 83.87 | Overturned | Late Inning, Overturned, RISP, Borderline Zone |
| 823237 | 2026-04-07 | Top 7 | 2-4 | 83.55 | Overturned | Late Inning, Overturned, Bases Loaded, Borderline Zone |
| 825107 | 2026-04-01 | Bottom 8 | 5-4 | 82.71 | Overturned | Late Inning, Overturned, One-Run Game, RISP |
| 823887 | 2026-04-07 | Top 9 | 1-2 | 81.50 | Overturned | Late Inning, Overturned, One-Run Game, RISP |
| 831849 | 2026-03-11 | Bottom 9 | 8-7 | 80.70 | Overturned | Late Inning, Overturned, One-Run Game, RISP |
| 831916 | 2026-03-22 | Bottom 9 | 7-7 | 80.70 | Overturned | Late Inning, Overturned, Tie Game, RISP |
| 823969 | 2026-04-01 | Top 9 | 1-4 | 80.67 | Overturned | Late Inning, Overturned, RISP, Borderline Zone |

## Recommendation

- Team style and umpire grade/risk spreads are healthy enough for product use; there is no evidence of rubric collapse into a single label family.
- The main monitoring item is not threshold failure but controversy weighting drift once regular-season volume adds more direct-ending impacts and higher-WE late states.
- This rubric audit should be rerun on the daily/weekly cadence, especially after any RE/WE/overturn model change, because those upstream model changes can shift controversy ordering without changing the rubric code itself.

## Notes

- Org risk tiers in this audit mirror actual site behavior by applying low-confidence softening after raw risk-tier computation.
- Controversy scoring uses the same shared rubric weights and challenge-value modes as the current product path, but the recency component is approximated across the full spring window rather than a homepage-only last-48-hours feed.

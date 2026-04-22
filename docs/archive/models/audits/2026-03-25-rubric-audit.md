# Rubric Distribution Audit

Date: March 25, 2026

## Scope

- Data window: 2026-02-20 through 2026-03-24
- Team style sample: 30 tracked clubs
- Umpire rubric sample: 108 tracked HP umpires
- Controversy sample: 1913 spring challenges

## Analyst Readout

- Team-style spread covers 3 style buckets, with `Hybrid` the largest family at 18 clubs (60.0%).
- Umpire report cards cover 5 grade buckets; the median score sits at 48.91 with a low-confidence share of 20.4%.
- Org watch risk is not collapsed into one tier: `Moderate` is largest at 87 umpires (80.6%), with low-confidence damping preventing weak samples from staying at `High` or `Low`.
- Controversy ranking is not just “overturned = top”: overturned moments average 58.15 while confirmed moments average 36.49, and the top bucket still concentrates late / close / modeled-value events.

## Team Style Distribution

| Style | Org Label | Teams | Share |
| --- | --- | --- | --- |
| Hybrid | Mixed profile | 18 | 60.0% |
| Calculated | Disciplined | 6 | 20.0% |
| Trigger-Happy | Aggressive | 6 | 20.0% |

### Style Confidence

| Confidence | Teams |
| --- | --- |
| high | 30 |

### Most Ambiguous Team Profiles

| Team | Style | Top Gap | Confidence |
| --- | --- | --- | --- |
| Baltimore Orioles | Calculated | 0.48 | high |
| Miami Marlins | Hybrid | 0.54 | high |
| San Diego Padres | Hybrid | 0.71 | high |
| Toronto Blue Jays | Hybrid | 0.72 | high |
| Cincinnati Reds | Calculated | 0.74 | high |
| Kansas City Royals | Hybrid | 1.34 | high |
| Houston Astros | Hybrid | 1.41 | high |
| Milwaukee Brewers | Hybrid | 1.51 | high |
| Atlanta Braves | Hybrid | 2.07 | high |
| New York Mets | Hybrid | 2.43 | high |

## Umpire Grade + Risk Distribution

### Grades

| Grade | Umpires | Share |
| --- | --- | --- |
| C | 42 | 38.9% |
| D | 31 | 28.7% |
| B | 30 | 27.8% |
| A | 3 | 2.8% |
| F | 2 | 1.9% |

### Fan Descriptors

| Descriptor | Umpires |
| --- | --- |
| Uneasy | 46 |
| Balanced | 30 |
| Erratic | 27 |
| Reliable | 3 |
| Chaotic | 2 |

### Org Descriptors

| Descriptor | Umpires |
| --- | --- |
| Monitor | 49 |
| Elevated risk | 31 |
| Stable profile | 23 |
| Low-risk profile | 3 |
| High-risk profile | 2 |

### Risk Tiers

| Risk Tier | Umpires | Share |
| --- | --- | --- |
| Moderate | 87 | 80.6% |
| Elevated | 16 | 14.8% |
| Low | 5 | 4.6% |

### Highest-Risk Umpire Profiles

| Umpire | Grade | Risk Tier | Risk Score | Confidence |
| --- | --- | --- | --- | --- |
| Tripp Gibson | D | Elevated | 60.16 | medium |
| Chad Whitson | D | Elevated | 58.40 | medium |
| Dan Merzel | D | Elevated | 58.14 | low |
| Dan Iassogna | C | Elevated | 57.92 | low |
| Adrian Johnson | D | Elevated | 56.39 | low |
| Manny Gonzalez | D | Elevated | 56.13 | medium |
| Chad Fairchild | D | Elevated | 55.96 | medium |
| Todd Tichenor | D | Elevated | 55.61 | low |
| Chris Conroy | D | Elevated | 54.27 | medium |
| James Hoye | D | Elevated | 53.84 | medium |

## Controversy Spread

### Score Buckets

| Bucket | Moments | Share |
| --- | --- | --- |
| <55 | 1255 | 65.6% |
| 55-69 | 577 | 30.2% |
| 70-84 | 81 | 4.2% |

### Outcome Split

| Outcome | Moments | Avg Score |
| --- | --- | --- |
| Overturned | 1012 | 58.15 |
| Confirmed | 901 | 36.49 |

### Impact Types

| Impact Type | Moments | Share |
| --- | --- | --- |
| confirmed | 900 | 47.0% |
| direct_count_impact | 829 | 43.3% |
| direct_ending_impact | 182 | 9.5% |
| downstream_inferred_impact | 1 | 0.1% |
| unknown | 1 | 0.1% |

### Value Modes

| Mode | Moments | Share |
| --- | --- | --- |
| win_expectancy | 1912 | 99.9% |
| heuristic | 1 | 0.1% |

### Top Spring Controversy Moments

| Game | Date | Inning | Game Score | Controversy | Outcome | Chips |
| --- | --- | --- | --- | --- | --- | --- |
| 831916 | 2026-03-21 | Bottom 9 | 7-7 | 84.70 | Overturned | Late Inning, Overturned, Tie Game, RISP |
| 832862 | 2026-03-07 | Bottom 9 | 7-4 | 82.00 | Overturned | Late Inning, Overturned, RISP, Direct Impact |
| 831449 | 2026-03-21 | Bottom 7 | 4-6 | 81.53 | Overturned | Late Inning, Overturned, Far Off Plate |
| 831609 | 2026-03-17 | Bottom 8 | 1-1 | 81.10 | Overturned | Late Inning, Overturned, Tie Game, Direct Impact |
| 831749 | 2026-03-20 | Bottom 8 | 5-0 | 81.10 | Overturned | Late Inning, Overturned, Bases Loaded, Direct Impact |
| 831849 | 2026-03-11 | Bottom 9 | 8-7 | 80.70 | Overturned | Late Inning, Overturned, One-Run Game, RISP |
| 831639 | 2026-03-01 | Top 9 | 4-4 | 80.00 | Overturned | Late Inning, Overturned, Tie Game, RISP |
| 831806 | 2026-03-17 | Top 7 | 3-3 | 79.65 | Overturned | Late Inning, Overturned, Tie Game, Direct Impact |
| 831777 | 2026-03-15 | Top 8 | 3-4 | 78.63 | Overturned | Late Inning, Overturned, One-Run Game, RISP |
| 831910 | 2026-03-20 | Top 8 | 1-4 | 78.62 | Overturned | Late Inning, Overturned, Borderline Zone |

## Recommendation

- Team style and umpire grade/risk spreads are healthy enough for product use; there is no evidence of rubric collapse into a single label family.
- The main monitoring item is not threshold failure but controversy weighting drift once regular-season volume adds more direct-ending impacts and higher-WE late states.
- This rubric audit should be rerun on the daily/weekly cadence, especially after any RE/WE/overturn model change, because those upstream model changes can shift controversy ordering without changing the rubric code itself.

## Notes

- Org risk tiers in this audit mirror actual site behavior by applying low-confidence softening after raw risk-tier computation.
- Controversy scoring uses the same shared rubric weights and challenge-value modes as the current product path, but the recency component is approximated across the full spring window rather than a homepage-only last-48-hours feed.

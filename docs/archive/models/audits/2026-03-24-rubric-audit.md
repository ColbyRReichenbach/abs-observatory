# Rubric Distribution Audit

Date: March 24, 2026

## Scope

- Data window: 2026-02-20 through 2026-03-22
- Team style sample: 30 tracked clubs
- Umpire rubric sample: 108 tracked HP umpires
- Controversy sample: 1839 spring challenges

## Analyst Readout

- Team-style spread covers 3 style buckets, with `Hybrid` the largest family at 19 clubs (63.3%).
- Umpire report cards cover 5 grade buckets; the median score sits at 48.82 with a low-confidence share of 23.1%.
- Org watch risk is not collapsed into one tier: `Moderate` is largest at 87 umpires (80.6%), with low-confidence damping preventing weak samples from staying at `High` or `Low`.
- Controversy ranking is not just “overturned = top”: overturned moments average 58.25 while confirmed moments average 36.45, and the top bucket still concentrates late / close / modeled-value events.

## Team Style Distribution

| Style | Org Label | Teams | Share |
| --- | --- | --- | --- |
| Hybrid | Mixed profile | 19 | 63.3% |
| Calculated | Disciplined | 6 | 20.0% |
| Trigger-Happy | Aggressive | 5 | 16.7% |

### Style Confidence

| Confidence | Teams |
| --- | --- |
| high | 30 |

### Most Ambiguous Team Profiles

| Team | Style | Top Gap | Confidence |
| --- | --- | --- | --- |
| San Diego Padres | Hybrid | 0.49 | high |
| Miami Marlins | Hybrid | 0.55 | high |
| Baltimore Orioles | Calculated | 0.59 | high |
| Kansas City Royals | Hybrid | 0.59 | high |
| Toronto Blue Jays | Hybrid | 0.72 | high |
| Cincinnati Reds | Calculated | 1.32 | high |
| Houston Astros | Hybrid | 1.34 | high |
| Atlanta Braves | Hybrid | 1.44 | high |
| Milwaukee Brewers | Hybrid | 2.13 | high |
| Chicago Cubs | Hybrid | 2.42 | high |

## Umpire Grade + Risk Distribution

### Grades

| Grade | Umpires | Share |
| --- | --- | --- |
| C | 42 | 38.9% |
| B | 31 | 28.7% |
| D | 31 | 28.7% |
| A | 2 | 1.9% |
| F | 2 | 1.9% |

### Fan Descriptors

| Descriptor | Umpires |
| --- | --- |
| Uneasy | 46 |
| Balanced | 31 |
| Erratic | 27 |
| Chaotic | 2 |
| Reliable | 2 |

### Org Descriptors

| Descriptor | Umpires |
| --- | --- |
| Monitor | 50 |
| Elevated risk | 31 |
| Stable profile | 23 |
| High-risk profile | 2 |
| Low-risk profile | 2 |

### Risk Tiers

| Risk Tier | Umpires | Share |
| --- | --- | --- |
| Moderate | 87 | 80.6% |
| Elevated | 16 | 14.8% |
| Low | 5 | 4.6% |

### Highest-Risk Umpire Profiles

| Umpire | Grade | Risk Tier | Risk Score | Confidence |
| --- | --- | --- | --- | --- |
| Tripp Gibson | D | Elevated | 60.18 | medium |
| Chad Whitson | D | Elevated | 58.41 | medium |
| Dan Merzel | D | Elevated | 58.14 | low |
| Dan Iassogna | C | Elevated | 57.97 | low |
| Adrian Johnson | D | Elevated | 56.42 | low |
| Manny Gonzalez | D | Elevated | 56.14 | medium |
| Chad Fairchild | D | Elevated | 55.98 | medium |
| Todd Tichenor | D | Elevated | 55.62 | low |
| Chris Conroy | D | Elevated | 54.28 | medium |
| James Hoye | D | Elevated | 53.86 | medium |

## Controversy Spread

### Score Buckets

| Bucket | Moments | Share |
| --- | --- | --- |
| <55 | 1206 | 65.6% |
| 55-69 | 548 | 29.8% |
| 70-84 | 85 | 4.6% |

### Outcome Split

| Outcome | Moments | Avg Score |
| --- | --- | --- |
| Overturned | 975 | 58.25 |
| Confirmed | 864 | 36.45 |

### Impact Types

| Impact Type | Moments | Share |
| --- | --- | --- |
| confirmed | 864 | 47.0% |
| direct_count_impact | 797 | 43.3% |
| direct_ending_impact | 178 | 9.7% |

### Value Modes

| Mode | Moments | Share |
| --- | --- | --- |
| win_expectancy | 1838 | 99.9% |
| heuristic | 1 | 0.1% |

### Top Spring Controversy Moments

| Game | Date | Inning | Game Score | Controversy | Outcome | Chips |
| --- | --- | --- | --- | --- | --- | --- |
| 831916 | 2026-03-21 | Bottom 9 | 7-7 | 84.70 | Overturned | Late Inning, Overturned, Tie Game, RISP |
| 831749 | 2026-03-20 | Bottom 8 | 5-0 | 83.10 | Overturned | Late Inning, Overturned, Bases Loaded, Direct Impact |
| 832862 | 2026-03-07 | Bottom 9 | 7-4 | 82.00 | Overturned | Late Inning, Overturned, RISP, Direct Impact |
| 831449 | 2026-03-21 | Bottom 7 | 4-6 | 81.53 | Overturned | Late Inning, Overturned, Far Off Plate |
| 831609 | 2026-03-17 | Bottom 8 | 1-1 | 81.10 | Overturned | Late Inning, Overturned, Tie Game, Direct Impact |
| 831849 | 2026-03-11 | Bottom 9 | 8-7 | 80.70 | Overturned | Late Inning, Overturned, One-Run Game, RISP |
| 831482 | 2026-02-27 | Bottom 9 | 14-3 | 80.00 | Overturned | Late Inning, Overturned, Bases Loaded, Direct Impact |
| 831639 | 2026-03-01 | Top 9 | 4-4 | 80.00 | Overturned | Late Inning, Overturned, Tie Game, RISP |
| 831806 | 2026-03-17 | Top 7 | 3-3 | 79.65 | Overturned | Late Inning, Overturned, Tie Game, Direct Impact |
| 831777 | 2026-03-15 | Top 8 | 3-4 | 78.63 | Overturned | Late Inning, Overturned, One-Run Game, RISP |

## Recommendation

- Team style and umpire grade/risk spreads are healthy enough for product use; there is no evidence of rubric collapse into a single label family.
- The main monitoring item is not threshold failure but controversy weighting drift once regular-season volume adds more direct-ending impacts and higher-WE late states.
- This rubric audit should be rerun on the daily/weekly cadence, especially after any RE/WE/overturn model change, because those upstream model changes can shift controversy ordering without changing the rubric code itself.

## Notes

- Org risk tiers in this audit mirror actual site behavior by applying low-confidence softening after raw risk-tier computation.
- Controversy scoring uses the same shared rubric weights and challenge-value modes as the current product path, but the recency component is approximated across the full spring window rather than a homepage-only last-48-hours feed.

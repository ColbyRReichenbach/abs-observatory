# Frontend Hierarchy Spec

Date: April 20, 2026
Branch: `spec/frontend-hierarchy-rebuild`
Scope: `/`, `/teams`, `/teams/[teamId]`, `/umpires`, `/umpires/[umpireId]`
Out of scope: `/articles`, `/about`, `/profile`

> Status note: this is the completed April 20 hierarchy rewrite spec for the branch implementation. Use current product and route docs for the shipped current-state surface.

## Purpose

This spec replaces the current “additive dashboard” approach with a clear audience split:

- `fan` pages should read like baseball coverage
- `org` pages should read like baseball operations prep
- index pages should lead with league patterns, not tables
- detail pages should have a clear first read, not a wall of equal-weight cards

This is not a polish pass. It is a hierarchy rewrite, with explicit deletions and reordering.

## Product Rules

1. Do not lead with tables on league pages.
2. Do not show fan users matrix-heavy or model-first surfaces unless they are translated into plain baseball meaning.
3. Org pages must answer practical strategy questions:
   - where is review value gained or lost
   - when is inventory being used
   - where are the repeatable matchup or zone edges
4. Fan pages must answer baseball questions:
   - what is the biggest story right now
   - what kind of ABS team or umpire is this
   - what changed recently
5. Every page needs a primary read, secondary evidence, and lookup material last.

## Global Cleanup

### Fix before hierarchy work

1. Fix duplicate React keys on `/teams`.
   Files:
   - [src/app/teams/page.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/app/teams/page.tsx)

2. Fix Recharts container sizing warnings.
   Affected routes seen in browser QA:
   - `/teams?view=fan`
   - `/teams?view=org`
   - `/umpires?view=fan`

3. Fix Framer Motion opacity warnings.
   Affected routes seen in browser QA:
   - `/?view=org`
   - `/teams/[teamId]?view=org`
   - `/umpires/[umpireId]?view=fan`
   - `/umpires/[umpireId]?view=org`

### Global layout rules

1. Reduce same-weight cards stacked vertically.
2. Move “historical stream” or lookup-heavy sections to the bottom on all detail pages.
3. Use at most 3 primary sections above the fold.
4. Fan pages should prefer 1 big read plus 2 supporting visuals, not 6 medium cards.
5. Org pages should group related surfaces into larger blocks instead of many isolated panels.

## Route Spec

## `/`

### Current components

- `BroadcastStrip`
- `GameStrip`
- featured top-moment panel built inside [src/app/page.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/app/page.tsx)
- team spotlight links
- umpire spotlight links
- org summary cards built inside [src/app/page.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/app/page.tsx)
- `HomeExpandableGrid`
- `ChallengeMomentCards`

### Fan

#### Keep

- `BroadcastStrip`
- featured top-moment block
- team spotlight links
- umpire spotlight links
- `HomeExpandableGrid`
- `ChallengeMomentCards`

#### Delete

- `GameStrip`

#### Reorder

1. `BroadcastStrip`
2. hero copy
3. featured top-moment block
4. team spotlight links
5. umpire spotlight links
6. `HomeExpandableGrid`
7. `ChallengeMomentCards`

#### Reasoning

`GameStrip` is redundant. The home page already has:

- a broadcast strip
- a featured matchup / moment read
- an active matchup grid

The strip adds noise, not navigation value.

### Org

#### Keep

- `BroadcastStrip`
- org summary cards
- featured top-moment or watch surface
- `HomeExpandableGrid`
- `ChallengeMomentCards`

#### Delete

- `GameStrip`

#### Reorder

1. `BroadcastStrip`
2. hero copy
3. compact org summary row
4. featured watch surface
5. `ChallengeMomentCards`
6. `HomeExpandableGrid`

#### Change

Collapse the current top org cluster into one row with:

- league overturn signal
- watch umpire
- selective use signal

Do not scatter many small intro cards before the main page read.

## `/teams`

### Current components

- `RangeSelector`
- `TeamScatterPlot`
- spotlight panel built in [src/app/teams/page.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/app/teams/page.tsx)
- full leaderboard table with `TrendSparkline`

### Fan

#### Keep

- `RangeSelector`
- `TeamScatterPlot`
- spotlight panel
- leaderboard table

#### Add

Add a compact movers strip above the table using existing `trendlines`.

Required content:

- `Up This Week`
- `Sliding This Week`
- one sentence of fan-facing explanation per club

This should be built from existing trend delta logic already present in the page.

#### Reorder

1. hero copy
2. `RangeSelector`
3. spotlight panel
4. `TeamScatterPlot`
5. movers strip
6. leaderboard table

#### Table changes

Keep the table for navigation, but make it second-order content.

Do not treat the table as the page hero.

#### Reasoning

Fans should first see the league story:

- which teams challenge often
- which teams get calls back
- who is moving

Then they can use the table to browse.

### Org

#### Keep

- `RangeSelector`
- spotlight panel
- leaderboard table

#### Replace primary visual

The page should lead with a league-wide modeled visual, not the table.

Required:

1. keep `TeamScatterPlot`, but switch its prominence to primary
2. add or adapt a second league visual that summarizes:
   - review surplus distribution
   - late/close deployment behavior

This should be built from current available data:

- `decisionSurplus`
- `lateLeverageShare`
- `earlyLowLeverageShare`
- `challengeRatePerGame`

#### Reorder

1. hero copy
2. `RangeSelector`
3. spotlight panel
4. primary modeled scatter
5. deployment summary visual
6. leaderboard table

#### Table changes

Leaderboard remains the navigation device.
It should not be the first thing the user sees.

## `/teams/[teamId]`

### Current components in route

- `TeamMotifBackdrop`
- `TeamMotifHero`
- `RangeSelector`
- `FilterStrip` in org
- KPI row
- `TeamScheduleMorph`
- `TeamTrendChart`
- `ChallengeAggressionRadial`
- `HittersEyeHeatmap`
- `TeamDecisionValueScatter`
- `TeamInventoryDeploymentChart`
- `InningEfficiencyHeatmap`
- `TeamOrgCommandCenter`
- `TeamChallengeValueMatrix`
- `TeamDecisionValueSummaryCard`
- `TeamDecisionBreakdownBoard`
- lower sections from `TeamLowerSections`
- `UmpireMatchupMatrix`

### Fan

#### Keep

- `TeamMotifHero`
- KPI row
- `TeamTrendChart`
- `ChallengeAggressionRadial`
- `TeamScheduleMorph`
- one simplified matchup/context section

#### Delete from fan

- `TeamChallengeValueMatrix`
- `TeamDecisionValueSummaryCard`
- `TeamDecisionBreakdownBoard`
- `TeamOrgCommandCenter`
- `TeamDecisionValueScatter`
- `TeamInventoryDeploymentChart`
- `InningEfficiencyHeatmap`
- `UmpireMatchupMatrix`

#### Demote or simplify

- `HittersEyeHeatmap`

If it stays in fan view, it must be framed as a simple “where challenges tend to show up” read, not a dense baseball-ops graphic.

#### Reorder

1. `TeamMotifHero`
2. KPI row
3. `TeamTrendChart`
4. `ChallengeAggressionRadial`
5. `TeamScheduleMorph`
6. one simplified context section
7. historical stream / lower sections last

#### Add

Add one fan-facing summary block directly under KPIs:

- “What kind of ABS team is this?”
- 2 to 3 sentences only
- use current team style labels and timing tendencies

#### Change

Reduce or remove the visual weight of `TeamMotifBackdrop` in fan view.
Right now it competes with already-dense analytics.

#### Reasoning

Fan team detail should answer:

- are they aggressive or selective
- are they winning review moments
- are they trending up or down
- what’s the current storyline

It should not read like a staff prep report.

### Org

#### Keep

- `TeamMotifHero`
- KPI row
- `FilterStrip`
- `TeamDecisionValueScatter`
- `TeamInventoryDeploymentChart`
- `TeamOrgCommandCenter`
- `TeamDecisionValueSummaryCard`
- `TeamDecisionBreakdownBoard`
- `TeamScheduleMorph`
- one matchup/context section

#### Delete or merge

Do not let these act as separate introductions to the same concept:

- `TeamOrgCommandCenter`
- `TeamDecisionValueSummaryCard`
- `TeamDecisionBreakdownBoard`

They must be grouped into one larger “Review Operations” block.

#### Move out of org primary area

- `InningEfficiencyHeatmap`

If it remains, move it below the main review operations and deployment sections.

#### Reorder

1. `TeamMotifHero`
2. KPI row
3. `FilterStrip`
4. review operations block
   - `TeamDecisionValueSummaryCard`
   - `TeamDecisionBreakdownBoard`
   - selected compact metrics from `TeamOrgCommandCenter`
5. deployment block
   - `TeamInventoryDeploymentChart`
   - relevant timing summary
6. modeled value block
   - `TeamDecisionValueScatter`
7. matchup/context block
8. `TeamScheduleMorph`
9. lower diagnostic/history sections

#### Org-only diagnostic surfaces

These can remain org-only if useful:

- `InningEfficiencyHeatmap`
- `UmpireMatchupMatrix`

But they must sit below the core ops read.

#### Reasoning

Org team detail should answer:

- are we gaining or losing review value
- are we using review inventory at the right times
- where are the repeatable matchup or timing edges

## `/umpires`

### Current components

- `RangeSelector`
- `UmpireDistributionHistogram`
- `UmpireRiskScatter`
- `UmpireLeaderboardTable`
- org watch list built inside [src/app/umpires/page.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/app/umpires/page.tsx)

### Fan

#### Keep

- `RangeSelector`
- `UmpireDistributionHistogram`
- `UmpireLeaderboardTable`

#### Add

Add a compact “volatile lately” band above the table.

Use existing data:

- `recentOverturnRate`
- `overturnRate`
- `overturnRateVariance`

This should highlight:

- most volatile lately
- steadiest lately
- biggest recent riser

#### Reorder

1. hero copy
2. `RangeSelector`
3. `UmpireDistributionHistogram`
4. volatility / recent movers strip
5. `UmpireLeaderboardTable`

#### Reasoning

This page is already one of the strongest.
It just needs more story before the table.

### Org

#### Keep

- `RangeSelector`
- `UmpireRiskScatter`
- watch list
- `UmpireLeaderboardTable`

#### Add

Add a compact league summary row above the scatter:

- highest positive `Avg WE Δ`
- lowest `Avg WE Δ`
- highest variance profile

Use `Avg RE Δ` if `Avg WE Δ` is unavailable.

#### Reorder

1. hero copy
2. `RangeSelector`
3. league summary row
4. `UmpireRiskScatter`
5. watch list
6. `UmpireLeaderboardTable`

#### Reasoning

The org umpire index is already close to correct.
It mostly needs a stronger analytical opener before the scatter.

## `/umpires/[umpireId]`

### Current components in route

- `UmpireHeadshot`
- KPI row
- `RangeSelector`
- `FilterStrip` in org
- `UmpireGamesMorph`
- `UmpireConsequenceMatrix`
- `UmpireHandednessBoard`
- `UmpirePitchTraitScatter`
- `UmpireConsequenceBoard`
- `UmpireRhythmChart`
- `UmpireAccuracyChart`
- `HeatmapDeepDive`
- `PitchTypeBreakdownChart`
- `SeasonOverSeasonChart`
- `ExtremeMissesSection`
- AI chart insight bubbles around some charts

### Fan

#### Keep

- hero
- KPI row
- `UmpireAccuracyChart`
- `UmpireGamesMorph`
- `HeatmapDeepDive`
- one simplified context table or count-state section

#### Delete from fan

- `UmpireConsequenceMatrix`
- `UmpireHandednessBoard`
- `UmpirePitchTraitScatter`
- `UmpireConsequenceBoard`
- most dense ops-style comparison boards

#### Simplify

- `HeatmapDeepDive`
- `PitchTypeBreakdownChart`

Only one of these should sit in the main fan read.
Do not keep both at equal emphasis if they are telling overlapping stories.

#### Reorder

1. hero
2. KPI row
3. `UmpireAccuracyChart`
4. `UmpireGamesMorph`
5. `HeatmapDeepDive`
6. one simplified context section
7. history/reference sections last

#### Add

Add one fan-facing summary block after the KPIs:

- “What kind of ABS umpire is this?”
- volatility, steadiness, and hot zone in plain baseball language

#### Reasoning

Fan umpire detail should answer:

- is this ump steady or volatile
- where do reviewed calls cluster
- what has changed recently

### Org

#### Keep

- hero
- KPI row
- `FilterStrip`
- `UmpireConsequenceMatrix`
- `UmpireHandednessBoard`
- `UmpirePitchTraitScatter`
- `UmpireConsequenceBoard`
- `HeatmapDeepDive`
- `UmpireGamesMorph`
- `ExtremeMissesSection`

#### Demote

- `SeasonOverSeasonChart`

This should live lower on the page, not in the main prep read.

#### Reorder

1. hero
2. KPI row
3. `FilterStrip`
4. review consequence block
   - `UmpireConsequenceMatrix`
   - `UmpireConsequenceBoard`
5. profile and exposure block
   - `UmpireHandednessBoard`
   - `UmpirePitchTraitScatter`
6. zone vulnerability block
   - `HeatmapDeepDive`
7. recent game review block
   - `UmpireGamesMorph`
8. diagnostic appendix
   - `ExtremeMissesSection`
   - `SeasonOverSeasonChart`

#### Reasoning

Org umpire detail should read like prep:

- what kind of review consequences show up here
- what hitter/pitch traits are exposed
- where is the zone most vulnerable
- what does the recent run look like

## Chart Policy

### Elevate

These should become primary or near-primary visuals:

- `TeamScatterPlot`
- `TeamTrendChart`
- `UmpireDistributionHistogram`
- `UmpireRiskScatter`
- `UmpireAccuracyChart`
- `HeatmapDeepDive`

### Keep but org-only

- `TeamDecisionValueScatter`
- `TeamInventoryDeploymentChart`
- `TeamDecisionValueSummaryCard`
- `TeamDecisionBreakdownBoard`
- `TeamOrgCommandCenter`
- `UmpireConsequenceMatrix`
- `UmpireConsequenceBoard`
- `UmpireHandednessBoard`
- `UmpirePitchTraitScatter`

### Remove from fan

- large matrices
- dense modeled-value boards
- review-surplus-first language blocks
- ops-style tactical boards

## Build Order

1. Remove `GameStrip` from `/`
2. Rebuild `/teams` so visuals lead and table follows
3. Rebuild `/umpires` so visual story leads and table follows
4. Strip `fan` team detail down aggressively
5. Strip `fan` umpire detail down aggressively
6. Consolidate `org` team detail into fewer blocks
7. Consolidate `org` umpire detail into fewer blocks
8. Only after that, do visual polish

## Success Criteria

### Fan

- a fan can understand the page story without reading a table
- no matrix-heavy sections above the fold
- no model-first jargon without translation

### Org

- the first screen answers a tactical question
- modeled value is visible, but grouped coherently
- tables and appendices sit below primary analysis

### Shared

- no duplicate key warnings
- no chart size warnings
- no motion warnings
- no redundant top-of-page strips that repeat the same information

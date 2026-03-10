<div align="center">

# Challenge Context Analytics Plan

[![Focus](https://img.shields.io/badge/Focus-Scenario%20Value%20Analytics-0F766E)](#challenge-context-analytics-plan)
[![Audience](https://img.shields.io/badge/Audience-Fan%20And%20Org-2563EB)](#2-product-goals)
[![Data](https://img.shields.io/badge/Data-Count%20Base%20Score%20Context-7C3AED)](#3-current-source-truth)
[![UI](https://img.shields.io/badge/UI-Reuse%20Existing%20Chart%20System-F59E0B)](#7-design-system-rules)
[![Modeling](https://img.shields.io/badge/Modeling-Run%20Expectancy%20Then%20WE-DC2626)](#5-modeling-roadmap)

</div>

This document defines the next analytics implementation wave for AiBS around one core product question:

`When is an ABS challenge actually worth using?`

The plan is intentionally grounded in the current codebase. It does not assume true win probability is already implemented. It does assume the app already stores enough challenge context to begin shipping scenario-aware strategy analytics.

Related documents:

- [product-source-of-truth.md](../../product-source-of-truth.md)
- [gap-list.md](../../gap-list.md)
- [technical.md](../../technical.md)
- [src/lib/estimated-leverage.ts](../../src/lib/estimated-leverage.ts)
- [src/lib/types.ts](../../src/lib/types.ts)
- [db/views.sql](../../db/views.sql)

## Status Update

As of March 10, 2026, the historical RE foundation for this plan is no longer hypothetical.

AiBS now has:

- `15,480` regular-season games across `2019-2025`
- `4,566,992` raw historical pitches
- `4,566,992` canonical historical pitch-state rows
- `1,152` run expectancy state rows

Current RE confidence:

- `826` high
- `248` medium
- `78` low

Current ABS challenge-state fit:

- `532 / 532` exact before-state matches
- `532 / 532` exact after-state matches
- challenge-state confidence:
  - `365` high
  - `38` medium
  - `2` low

Win expectancy is now also in active implementation:

- `mart_win_expectancy_by_count_state`
- `mart_win_expectancy_fallbacks`
- shared lookup and fallback logic in `src/lib/server/win-expectancy.ts`

That means Stage 2 is now viable as a real product layer, and Stage 3 has moved from planning into implementation.

## 1. Why This Matters

ABS is not only about whether a pitch was called correctly. It is also about challenge deployment.

The product opportunity is to make challenge timing legible:

- for fans:
  - was that a smart challenge or a wasted one?
  - does my team use challenges in meaningful moments?

- for org users:
  - which game states are worth spending challenges in?
  - where does a club over-spend or under-spend its challenge inventory?
  - how much scenario value is being captured or missed?

This is one of the strongest differentiated analytics opportunities in the product.

## 2. Product Goals

This implementation wave should produce three outcomes:

1. Every challenge surface shows the game-state context around the reviewed pitch.
2. Team pages show how a club uses challenges by scenario, not just in aggregate.
3. Postgame analysis begins to quantify challenge decision value with a model that is truthful about what it is and is not.

## 3. Current Source Truth

### What the repo already tracks

The app already stores most of the challenge-state inputs needed for scenario analytics:

- inning and half-inning
- balls, strikes, outs
- bases state
- home score and away score
- count before and count after
- impact type and impact summary
- pitch metadata and pitch location

These are present in:

- [src/lib/types.ts](../../src/lib/types.ts)
- [etl/ingest_mlb_abs.py](../../etl/ingest_mlb_abs.py)
- [db/schema.sql](../../db/schema.sql)

The repo also already has useful baseline marts:

- `mart_count_state_baselines`
- `mart_count_state_delta_baselines`
- `mart_zone_outcome_baselines`
- `mart_pitch_type_count_baselines`

Defined in:

- [db/views.sql](../../db/views.sql)

The product also already has a first-pass pressure model:

- `estimatedLeverageIndex`
- `estimatedChallengeSwing`

Defined in:

- [src/lib/estimated-leverage.ts](../../src/lib/estimated-leverage.ts)

### What the repo does not have yet

- fully productized win-expectancy surfaces across the app
- team-level WE leaderboard rollups
- expected challenge decision value
- overturn probability by context

## 4. External Validation Opportunity

MLB Stats API exposes play-level `winProbability` and related context metrics. This should be used as a validation and enrichment layer, not as the sole source of truth for challenge value.

Why:

- useful for postgame validation and play-level framing
- helpful for checking our future win-value model
- not sufficient by itself for exact challenge-pitch decision value

Reason:

- the feed appears strongest at the completed play or at-bat level
- the value question AiBS cares about is more granular:
  - what was the scenario value of overturning this reviewed call at the moment of review?

Implementation rule:

- do not block the scenario analytics roadmap on direct MLB challenge-level WPA
- use MLB `winProbability` as a supporting source once run expectancy and win expectancy layers are in place

## 5. Modeling Roadmap

The analytics rollout should happen in three stages.

### Stage 1: Context + count-state consequence

Ship first because the repo already supports most of it.

Derived outputs:

- count shift:
  - `2-1 -> 3-1`
  - `1-2 -> 2-2`
- count-state batting average delta
- count-state walk-rate delta
- count-state strikeout-rate delta
- scenario labels:
  - `RISP`
  - `Less Than Two Outs`
  - `Late & Close`
  - `Tie Game`
  - `Bases Loaded`

This stage answers:

- did the challenge move the plate appearance into a meaningfully better or worse state?

### Stage 2: Run expectancy

This is the first real strategic value layer.

Build a run expectancy table keyed by:

- inning bucket
- outs
- base occupancy
- count state

Derived outputs:

- pre-review run expectancy
- post-review run expectancy
- run expectancy delta from review outcome
- average realized run expectancy value by team

This stage answers:

- how much scoring context changed because of the challenge result?

### Stage 3: Win expectancy

This is the mature version, and the first implementation pass is now underway in the codebase.

Build or validate a win expectancy model keyed by:

- inning
- score differential
- outs
- base occupancy
- count state
- batting / fielding side context

Derived outputs:

- pre-review win expectancy
- post-review win expectancy
- challenge win expectancy added
- realized vs potential win-value usage by team

Current implementation status:

- historical `2019-2025` state base is complete
- WE marts and fallback hierarchy are implemented
- next step is productization across game and team surfaces

This stage answers:

- was this challenge worth spending from a game-winning standpoint?

## 6. Page-by-Page Product Plan

This wave should focus on `games` and `teams`.

Umpire pages should consume some of the scenario model later, but they are not the primary destination for this first rollout.

### A. Game pages

#### 1. Shared challenge detail upgrade

Applies to:

- [src/components/challenge-explorer.tsx](../../src/components/challenge-explorer.tsx)
- [src/components/game-hub/at-bat-context-card.tsx](../../src/components/game-hub/at-bat-context-card.tsx)

Implement:

- base diamond visualization
- inning + half-inning chip
- score-state chip
- offensive / defensive side chip
- count before and after with clearer count shift emphasis
- scenario tags:
  - `RISP`
  - `Late & Close`
  - `Two Outs`
  - `Full Count`
  - `Bases Loaded`
- count-state consequence line:
  - `Overturn shifted this PA from 2-1 to 3-1`
  - `Historical hitter value increases from X to Y`

How:

- extend the detail card, not a new modal
- add a small reusable `BaseStateDiamond` SVG component
- add a reusable `ChallengeScenarioChips` component
- add a reusable `CountStateDeltaSummary` component backed by mart queries

Chart decision:

- not a new chart
- this is a context card enhancement

Replace or remove:

- nothing removed
- the current context card becomes substantially better

#### 2. Pregame page

Current main modules:

- matchup radar
- umpire heatmap
- challenge timing patterns
- umpire × team history

Applies to:

- [src/components/game-hub/pregame-hub.tsx](../../src/components/game-hub/pregame-hub.tsx)

Implement:

- new `Challenge Opportunity Board`

Purpose:

- show which challenge scenarios are most likely to matter tonight

Fan framing:

- `What kind of challenge moments could swing this game?`

Org framing:

- `Which scenario bands are the highest-value review windows tonight?`

Chart shape:

- new matrix chart
- rows: base-out states
- columns: count buckets
- cell color: expected scenario value band

Data source:

- team challenge timing history
- team/umpire matchup history
- stage-1 or stage-2 scenario value tables

Replace or remove:

- replace the current lower-value `ChallengeDistributionTimeline` on pregame
- reason:
  - timing by inning is interesting
  - challenge opportunity by scenario is more strategically useful

#### 3. Live page

Current main modules:

- dynamic leverage meter
- challenge feed
- org-only burn rate
- challenge explorer

Applies to:

- [src/components/game-hub/live-hub.tsx](../../src/components/game-hub/live-hub.tsx)

Implement:

- upgrade the live at-bat strip to include:
  - base-state icon
  - score differential context
  - side-at-risk context
- add `Current Challenge Window` card under the leverage meter

Fan framing:

- `Is this the kind of moment where a challenge can really matter?`

Org framing:

- `Challenge spend window`

Card contents:

- current count
- current base-out state
- current estimated leverage
- current count-state expected consequence
- recommendation band:
  - `low-value review window`
  - `watch closely`
  - `high-value challenge window`

Chart decision:

- no new full-size chart for live in phase 1
- use one compact scenario card

Replace or remove:

- keep burn-rate card for org
- do not remove feed or explorer
- augment the live decision surface instead of bloating it

#### 4. Final / postgame page

Current main modules:

- narrative debrief
- team summary
- `WPASwapWaterfall`
- challenge explorer

Applies to:

- [src/components/game-hub/postgame-hub.tsx](../../src/components/game-hub/postgame-hub.tsx)
- [src/components/game-hub/wpa-swap-waterfall.tsx](../../src/components/game-hub/wpa-swap-waterfall.tsx)

Implement:

- replace the current `Estimated Challenge Swing` waterfall with a more explicit `Challenge Decision Value Timeline`

Reason:

- current component still looks like a WPA view
- product language has moved to estimated leverage and scenario value
- this is the right place to show realized challenge value

Fan framing:

- `Which challenges really changed the game state?`

Org framing:

- `Where value was captured or wasted`

Chart shape:

- vertical event ledger or stepped timeline
- one card per challenge event
- key metrics per row:
  - scenario band
  - count change
  - estimated leverage
  - count-state consequence delta
  - later: run expectancy delta
  - later: win expectancy delta

Replace or remove:

- remove the existing `WPASwapWaterfall` component entirely
- replace with `ChallengeValueTimeline`

This is the most important replacement in the first wave.

### B. Team pages

#### 1. Team detail page

Current primary modules:

- trend chart
- aggression radial
- hitter's eye heatmap
- inning efficiency heatmap
- home/away split
- umpire matchup matrix
- style summary

Applies to:

- [src/app/teams/[teamId]/page.tsx](../../src/app/teams/[teamId]/page.tsx)

Implement two scenario-value additions.

##### Addition 1: Team Challenge Value Matrix

Purpose:

- show where a team tends to use challenges and where value is highest

Chart shape:

- heatmap matrix
- rows: scenario buckets such as:
  - empty / one on / RISP / bases loaded
  - or more simply base-out pressure buckets in v1
- columns: count buckets:
  - behind
  - neutral
  - two-strike
  - hitter's count
  - full count

Cell options:

- challenge frequency
- overturn rate
- average estimated scenario value

Fan framing:

- `Where this team likes to spend its challenges`

Org framing:

- `Challenge deployment by scenario`

##### Addition 2: Team Timing Efficiency card

Purpose:

- compare how often the team uses challenges in high-value vs low-value states

Metrics:

- `High-value challenge share`
- `Low-value challenge share`
- `Average scenario value per challenge`
- `Late close deployment rate`
- later:
  - `realized run value`
  - `realized win value`

Replace or remove:

- replace the existing `Location Variance / Home-Away Split` lower-panel card

Reason:

- home/away split is less differentiated
- scenario deployment value is much more important for this product

Keep:

- trend chart
- aggression radial
- hitter's eye heatmap
- inning efficiency heatmap
- umpire matchup matrix
- style summary

#### 2. Team list page

Implement a lighter version, not a large new chart.

Add:

- `High-Pressure Share`
- `Avg Challenge Value` once run expectancy or WE is available
- `Challenge Discipline` or `Efficiency` label tied to scenario-aware deployment

Purpose:

- make the league list sortable by strategic quality, not just rate stats

Chart decision:

- no new heavy chart on the list page in v1
- use sortable table metrics and one small ranking strip if needed later

## 7. Design System Rules

All new analytics must match the existing chart and interaction system.

### Chart rules

- use existing panel framing, spacing, and motion conventions
- use the same axis helpers where applicable:
  - [src/components/analytics/chart-axis.ts](../../src/components/analytics/chart-axis.ts)
- use the same tooltip system and animation patterns:
  - [src/components/ui/chart-tooltip.tsx](../../src/components/ui/chart-tooltip.tsx)
- do not introduce new tooltip interaction logic
- do not introduce new chart color semantics unless necessary

### Interaction rules

- hover expansion behavior should follow current chart behavior
- same tooltip enter / exit treatment as the rest of the site
- same font hierarchy:
  - eyebrow
  - display title
  - supporting descriptor
- same panel shell and border/shadow treatment as existing analytics modules

### Component rules

New shared components to build:

- `BaseStateDiamond`
- `ChallengeScenarioChips`
- `CountStateDeltaSummary`
- `ChallengeValueTimeline`
- `TeamChallengeValueMatrix`
- `ChallengeOpportunityBoard`

Shared helper modules:

- `src/lib/challenge-scenario.ts`
- `src/lib/challenge-value.ts`

## 8. Data and Query Work

### Phase 1 query layer

Add read-model functions for:

- `getChallengeScenarioSummary(challengeId)`
- `getTeamChallengeScenarioMatrix(teamId, range, filters)`
- `getTeamChallengeValueSummary(teamId, range, filters)`
- `getGameChallengeValueTimeline(gamePk)`
- `getPregameChallengeOpportunityBoard(gamePk)`

### Phase 1 marts / views

Add or extend views for:

- count-state consequence metrics
- scenario bucket assignment
- team challenge usage by scenario bucket
- challenge event estimated value summary

### Phase 2 marts / views

Add:

- run expectancy baseline table
- challenge event run expectancy delta view

### Phase 3 marts / views

Add:

- win expectancy baseline or imported validation layer
- challenge event WE delta view

## 9. Fan vs Org Framing Rules

### Fan

Emphasize:

- smart vs wasteful challenge timing
- memorable moment context
- pressure situations
- simple labels and clean chips

Avoid:

- dense matrix overload on first glance
- jargon-heavy model language

### Org

Emphasize:

- deployment efficiency
- scenario bands
- resource usage quality
- realized vs potential value

Allow:

- denser grids
- more exact labels
- stronger scenario terminology

## 10. Rollout Order

### Phase 1

- challenge detail context upgrade
- base diamond
- scenario chips
- count-state delta summary
- replace postgame waterfall with `ChallengeValueTimeline`

### Phase 2

- team detail `Challenge Value Matrix`
- team detail `Timing Efficiency` card
- team list strategic metrics

### Phase 3

- pregame `Challenge Opportunity Board`
- live `Current Challenge Window` card

### Phase 4

- run expectancy integration
- later win expectancy integration
- optional MLB `winProbability` validation overlay

## 11. What Not To Do

- do not label anything as true WPA or CLS until it is real
- do not add strategy charts to umpire pages first
- do not create separate tooltip systems or chart themes for these analytics
- do not over-pack live pages with multiple new heavy charts
- do not keep the old `WPASwapWaterfall` naming once the new timeline lands

## 12. Recommendation

This should be treated as a top-tier analytics roadmap item.

Recommended first build:

1. shared scenario context UI
2. postgame `ChallengeValueTimeline`
3. team detail `Challenge Value Matrix`
4. team detail `Timing Efficiency` card

That sequence gives the product immediate visible strategic depth while staying truthful about current modeling limits.

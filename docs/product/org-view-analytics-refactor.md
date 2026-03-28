# Org View Analytics Refactor

## Goal

Org mode should stop feeling like fan mode with more cards.

It should answer:

- Where is the challenge value?
- Where is the leak?
- Which matchup or pitch traits create the edge?
- How much of this is trusted sample versus directional noise?

The product rule is:

- `fan` = descriptive, fast, narrative
- `org` = diagnostic, strategic, consequence-driven

The shell and interaction quality should stay shared.
The lead visuals should not.

## Current Problem

Both org pages still inherit too much of the fan visual stack:

- `/teams/[teamId]`
  - still leads with trend / aggression / hitter's-eye fan-style visual framing
- `/umpires/[umpireId]`
  - still leads with rhythm / zone-personality framing that is better suited for fan mode

That creates the wrong analytical order:

1. descriptive chart
2. analyst panel
3. consequence chart

Org should invert that:

1. consequence
2. exploitable pattern
3. deployment / matchup drilldown
4. descriptive history below that

## Replacement Philosophy

Org mode should replace primary visuals, not demote them.

Use the same product grammar:

- interactive charts
- tooltips
- drilldowns
- compact summaries

But swap the core question each chart answers.

## Team Org View

### Remove As Primary Org Visuals

These can still exist in fan mode or lower-priority contexts, but they should not lead org mode:

- `TeamTrendChart`
- `ChallengeAggressionRadial`
- `HittersEyeHeatmap`
- generic timing/share cards as top-level story

Current org-specific component that should remain as a scaffold:

- `TeamOrgCommandCenter`

### Primary Org Visual Set

#### 1. Expected vs Realized Challenge Value Scatter

This should become the signature org chart for teams.

Question:

- Is the club making good process decisions, or just getting good outcomes?

Chart:

- point = scenario bucket
- `x` = average expected challenge value
- `y` = average realized challenge value
- point size = sample
- point color = confidence tier

Quadrants:

- good process / good outcome
- good process / bad luck
- bad process / got away with it
- bad process / bad outcome

Existing inputs available:

- `getTeamDecisionValueReport()`
  - `breakdownSections`
  - `summary`
  - `topWindows`
  - `bottomWindows`

New helper needed:

- flatten `breakdownSections` and `window` rows into scatter-ready points
- suggested name:
  - `buildTeamDecisionScatterPoints(report)`

Recommended component:

- `TeamDecisionValueScatter`

#### 2. Decision Value Matrix

Question:

- In which count / inning / base-out states is this team gaining or leaking decision value?

Chart:

- matrix heatmap
- `x` = count state
- `y` = inning phase or base/out bucket
- color = decision surplus
- tooltip:
  - sample
  - expected value
  - realized value
  - recommendation rate

Existing inputs available:

- `getTeamDecisionValueReport()`
  - `breakdownSections`

New helper needed:

- generate matrix cells from modeled rows directly, not from simplified buckets only
- suggested name:
  - `getTeamDecisionValueMatrix(teamId, range, filters)`

Recommended component:

- `TeamDecisionHeatmap`

#### 3. Inventory Deployment Curve

Question:

- Is the team spending challenges where modeled value actually lives?

Chart:

- inning bucket `1-3`, `4-6`, `7-9`, `extras`
- series:
  - challenge usage share
  - expected value share
  - realized value share

Existing inputs partly available:

- `getTeamDecisionValueReport()`
  - already tracks high-pressure / late-close expected value shares

New helper needed:

- bucket modeled team decisions by inning phase
- compute:
  - usage share
  - expected value share
  - realized value share
- suggested name:
  - `getTeamInventoryDeployment(teamId, range, filters)`

Recommended component:

- `TeamInventoryDeploymentChart`

#### 4. Missed Opportunity Ledger

Question:

- Where did the team hold when the model wanted a challenge?

Chart:

- ranked hybrid bar/table
- row = scenario bucket
- sort by cumulative missed expected WE
- show:
  - bucket label
  - missed-opportunity count
  - cumulative lost expected value
  - confidence

Existing inputs partly available:

- `getTeamDecisionValueReport()`
  - `challengeRecommendationRate`
  - `holdRecommendationRate`

New helper needed:

- aggregate modeled rows where `recommendation === "challenge"` but the actual result was hold-equivalent
- suggested name:
  - `getTeamMissedOpportunityLedger(teamId, range, filters)`

Recommended component:

- `TeamMissedOpportunityLedger`

### Team Org Page Layout

Replace current org lead stack with:

1. KPI row
   - `Decision Surplus`
   - `Captured Value Share`
   - `Late-Close EV Share`
   - `Largest Leak Window`
2. `TeamDecisionValueScatter`
3. `TeamDecisionHeatmap`
4. two-column lower row:
   - `TeamInventoryDeploymentChart`
   - `TeamMissedOpportunityLedger`

Everything else becomes secondary or fan-only.

## Umpire Org View

### Remove As Primary Org Visuals

These should stop leading org mode:

- `UmpireRhythmChart`
- fan-style `UmpireAccuracyChart`
- `UmpireNineZoneGrid` as the main analytical visual

Keep as secondary context if still useful:

- `ExtremeMissesSection`
- `UmpireGamesMorph`
- `SeasonOverSeasonChart`

Current org scaffolds that should remain:

- `UmpireAnalystCallSheet`
- `UmpireConsequenceBoard`

### Primary Org Visual Set

#### 1. Consequence Matrix

Question:

- In which scenarios do overturns do the most real game-state damage?

Chart:

- matrix heatmap
- `x` = count state
- `y` = pitch family or lane
- color = avg abs `WE` swing
- tooltip:
  - sample
  - overturn rate
  - avg abs `RE`
  - expected review value

Existing inputs partly available:

- `getUmpireChallenges()`
  - `winExpectancyDelta`
  - `runExpectancyDelta`
  - `expectedChallengeValue`
  - `pitchType`
  - count state fields
  - `pitchLaneBaseline`

New helper needed:

- aggregate consequence by:
  - count x pitch family
  - or count x lane
- suggested name:
  - `getUmpireConsequenceMatrix(umpireId, range, filters, mode)`

Recommended component:

- `UmpireConsequenceHeatmap`

#### 2. Handedness Split Board

Question:

- Which RHP/LHP x RHB/LHB buckets are actually vulnerable, and how costly are those misses?

Chart:

- 2x2 board
- per cell:
  - overturn rate
  - avg abs WE
  - sample
  - top pitch family

Existing inputs partly available:

- `getUmpireMatchupVulnerabilities()`
  - current overturn + top pitch + top zone logic

New helper needed:

- add consequence fields by matchup:
  - avg abs WE
  - avg abs RE
  - expected review value
- suggested name:
  - `getUmpireMatchupConsequenceBoard(umpireId, range, filters)`

Recommended component:

- `UmpireHandednessBoard`

#### 3. Pitch Trait Vulnerability Scatter

Question:

- Does this umpire struggle with certain pitch traits, not just pitch names?

Chart:

- `x` = average velocity bucket
- `y` = overturn rate or avg abs WE
- point size = sample
- color = pitch family
- optional toggle:
  - `velo`
  - `spin`

Existing inputs partly available:

- `getUmpirePitchTypeBreakdown()`
  - pitch family counts and overturns
- `getUmpireChallenges()`
  - start speed
  - spin rate
  - WE/RE

New helper needed:

- aggregate challenge rows into pitch-trait buckets:
  - velocity bands
  - spin bands
  - pitch family
- suggested name:
  - `getUmpirePitchTraitBuckets(umpireId, range, filters)`

Recommended component:

- `UmpirePitchTraitScatter`

#### 4. Zone-Lane Damage Map

Question:

- Which parts of the zone are costly, not just active?

Chart:

- strike-zone grid
- color = avg abs WE or expected review value
- tooltip:
  - sample
  - overturn rate
  - top pitch family

Existing inputs available:

- `getUmpireChallenges()`
  - `px`, `pz`, `strikeZoneTop`, `strikeZoneBottom`
  - WE / RE / expected challenge value
- current lane-classification support in:
  - `classifyNormalizedZoneLane()`

New helper needed:

- aggregate by normalized lane with consequence metrics
- suggested name:
  - `getUmpireZoneDamageMap(umpireId, range, filters)`

Recommended component:

- `UmpireZoneDamageMap`

### Umpire Org Page Layout

Replace current org lead stack with:

1. KPI row
   - `Avg Abs WE on Overturn`
   - `High-Leverage Overturn Share`
   - `Top Vulnerable Matchup`
   - `Highest-Cost Pitch Family`
2. `UmpireConsequenceHeatmap`
3. two-column row:
   - `UmpireHandednessBoard`
   - `UmpirePitchTraitScatter`
4. `UmpireZoneDamageMap`
5. secondary context:
   - `ExtremeMissesSection`
   - `UmpireGamesMorph`
   - `SeasonOverSeasonChart`

## Shared Build Rules

Every org chart must show:

- sample size
- modeled consequence (`WE`, `RE`, or expected review value)
- a confidence framing or trusted/directional indicator where possible

Every org chart should answer one of:

- where is the value
- where is the leak
- which matchup is vulnerable
- what should change operationally

If it cannot answer one of those, it should not lead the page.

## Recommended Build Order

### Phase 1: Umpire Org Replacement

1. `getUmpireConsequenceMatrix()`
2. `UmpireConsequenceHeatmap`
3. `getUmpireMatchupConsequenceBoard()`
4. `UmpireHandednessBoard`
5. wire those into `/umpires/[umpireId]`
6. remove fan-first lead visuals from org path

### Phase 2: Team Org Replacement

1. `buildTeamDecisionScatterPoints()`
2. `TeamDecisionValueScatter`
3. `getTeamDecisionValueMatrix()`
4. `TeamDecisionHeatmap`
5. `getTeamInventoryDeployment()`
6. `TeamInventoryDeploymentChart`
7. wire those into `/teams/[teamId]`

### Phase 3: Supporting Ledgers

1. `getTeamMissedOpportunityLedger()`
2. `TeamMissedOpportunityLedger`
3. `getUmpirePitchTraitBuckets()`
4. `UmpirePitchTraitScatter`
5. `getUmpireZoneDamageMap()`
6. `UmpireZoneDamageMap`

## Current File Targets

### Pages

- `src/app/teams/[teamId]/page.tsx`
- `src/app/umpires/[umpireId]/page.tsx`

### Existing Org Components To Replace / Refactor

- `src/components/analytics/team-org-command-center.tsx`
- `src/components/analytics/umpire-analyst-call-sheet.tsx`
- `src/components/analytics/umpire-consequence-board.tsx`

### Existing Data Sources To Reuse

- `getTeamDecisionValueReport()`
- `getTeamChallengeValueSummary()`
- `getTeamPitchingBailouts()`
- `getUmpireChallenges()`
- `getUmpirePitchTypeBreakdown()`
- `getUmpireMatchupVulnerabilities()`
- `getUmpireProfile()`

### New Data Helpers To Add

- `getTeamDecisionValueMatrix()`
- `buildTeamDecisionScatterPoints()`
- `getTeamInventoryDeployment()`
- `getTeamMissedOpportunityLedger()`
- `getUmpireConsequenceMatrix()`
- `getUmpireMatchupConsequenceBoard()`
- `getUmpirePitchTraitBuckets()`
- `getUmpireZoneDamageMap()`

## Decision

Do not keep the same primary charts in fan and org.

Use the same visual system, but make org mode start from consequence, deployment, and matchup leverage rather than personality, rhythm, or descriptive trend.

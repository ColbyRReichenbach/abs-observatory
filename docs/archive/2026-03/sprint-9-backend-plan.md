# Sprint 9 Backend Implementation Plan

> Sprint 9 product decisions are now summarized in [product-source-of-truth.md](../../product/product-source-of-truth.md). Keep this file as the deferred backend implementation appendix.
*Backend companion to [sprint-plan.md](./sprint-plan.md) for deferred/frontend-blocked items.*

## Purpose
Sprint 9 in the frontend audit mixes two different kinds of work:

1. Items we can implement against the current backend/data model with focused query and API work.
2. Items that still depend on a real win-probability model, external services, or explicit product decisions.

This document separates those paths so frontend integration can continue now without pretending the CLS/WPA stack already exists.

## Current Backend State

### Already available
- Full pitch timeline data:
  - [src/app/api/games/[gamePk]/timeline/route.ts](../../../src/app/api/games/[gamePk]/timeline/route.ts)
  - [src/lib/data.ts](../../../src/lib/data.ts)
  - [db/views.sql](../../../db/views.sql)
- Team and umpire summary APIs:
  - [src/app/api/teams/[teamId]/summary/route.ts](../../../src/app/api/teams/[teamId]/summary/route.ts)
  - [src/app/api/umpires/[umpireId]/summary/route.ts](../../../src/app/api/umpires/[umpireId]/summary/route.ts)
- Pregame/team-umpire query foundations:
  - [src/lib/pregame-intel.ts](../../../src/lib/pregame-intel.ts)
  - [src/lib/data.ts](../../../src/lib/data.ts)
- Pitch-type columns and baseline marts:
  - [db/schema.sql](../../../db/schema.sql)
  - [db/views.sql](../../../db/views.sql)

### Not yet real
- CLS / real challenge WPA model
- Real WPA waterfall values
- Live pre-challenge WP swing
- Aggregate CLS by umpire/team
- PDF generation pipeline
- X bot integration

## Scope Decision
Approved scope for the next implementation pass:

### Implement now
- D-5 Pregame — Umpire x Team History
- D-8 Umpire — Pitch Type Breakdown
- D-7 Umpire — Season-over-Season Chart, if current DB already has enough season coverage

### Implement after the above, only if the inferred-model framing still makes product sense
- D-6 Postgame — Missed Opportunities v1

### Defer until real WP / external dependency is resolved
- D-1 Challenge Leverage Score (CLS)
- D-2 WPA Waterfall — real logic
- D-3 Live War Room — CLS real-time
- D-4 Umpire Profile — Aggregate CLS
- D-9 Export-to-PDF Briefing Sheet
- D-10 X Bot

## Stack Constraints
Use only the selected stack from [stack-selection.md](../../architecture/stack-selection.md):

- `Next.js` App Router for backend APIs
- `Postgres` as source of truth
- SQL-first query layer in `src/lib/data.ts`
- `db/views.sql` for reusable marts/read models
- existing caching/rate-limit primitives, not new ad hoc infra

Do not introduce:
- Prisma
- public NL-to-SQL
- new analytics warehouse
- external live WP vendor unless explicitly chosen later

## Item Breakdown

### D-5 Pregame — Umpire x Team History
Status: `partial foundation exists`

What exists now:
- generic pregame intel in [src/lib/pregame-intel.ts](../../../src/lib/pregame-intel.ts)
- team-to-many-umpire matchup history in [src/lib/data.ts](../../../src/lib/data.ts)

What to add:
- [ ] Add a dedicated server query for `gamePk -> tonight's home plate umpire + both teams historical challenge splits`
- [ ] Add a focused API route:
  - `GET /api/games/[gamePk]/pregame-history`
- [ ] Return:
  - home team games with this umpire
  - home team overturn rate with this umpire
  - away team games with this umpire
  - away team overturn rate with this umpire
  - league benchmark for comparison
  - optional confidence/sample-size label
- [ ] Add tests:
  - unit test for query mapping
  - route test for `200/404`
  - e2e coverage once frontend uses it

Implementation note:
- This should use existing `officials`, `games`, `abs_challenges`, and team summary tables only.

### D-6 Postgame — Missed Opportunities v1
Status: `possible with current pitch data, model missing`

What exists now:
- full pitch timeline
- challenge linkage
- impact classification
- pitch coordinates and count state

What to add:
- [ ] Define a conservative `missed_opportunity` rule set
- [ ] Create a read model or SQL view for candidate missed opportunities
- [ ] Add a backend query:
  - `getGameMissedOpportunities(gamePk)`
- [ ] Add a focused API route:
  - `GET /api/games/[gamePk]/missed-opportunities`
- [ ] Return:
  - pitch context
  - count before/after
  - who would have benefited from challenging
  - why it was flagged
  - confidence tier
  - explicit `inferred` label
- [ ] Add tests:
  - rule tests for candidate detection
  - route tests
  - no false-positive tests for non-eligible pitches

v1 rule constraints:
- do not claim certainty
- do not use hidden model magic
- label these as `estimated` or `inferred`
- only flag cases where:
  - pitch had challengeable geometry/context
  - team still had challenges remaining
  - no challenge occurred

### D-7 Umpire — Season-over-Season Chart
Status: `depends on actual season coverage`

What exists now:
- season field exists in game tables
- umpire summary/trend logic exists

What to add:
- [ ] Verify actual multi-season data coverage in local DB
- [ ] If coverage is sufficient, add:
  - `getUmpireSeasonTrend(umpireId)`
  - `GET /api/umpires/[umpireId]/season-trend`
- [ ] Return one point per season:
  - season
  - challenged calls
  - overturned calls
  - overturn rate
  - games worked
- [ ] Add tests:
  - season aggregation correctness
  - sparse-data behavior
  - no-data fallback

Decision gate:
- If local DB only has one season or thin data, keep this endpoint behind a no-data/insufficient-history state and leave the frontend chart hidden or disabled.

### D-8 Umpire — Pitch Type Breakdown
Status: `foundation exists`

What exists now:
- per-pitch `pitch_type_code` and `pitch_type_description`
- challenge-level pitch linkage

What to add:
- [ ] Add a backend query:
  - `getUmpirePitchTypeBreakdown(umpireId, range, filters?)`
- [ ] Add API route:
  - `GET /api/umpires/[umpireId]/pitch-types`
- [ ] Return per pitch type:
  - pitch type code/name
  - challenged count
  - overturned count
  - overturn rate
  - optional league baseline for that pitch type
- [ ] Add tests:
  - query aggregation
  - range handling
  - empty-state behavior

## Deferred Items

### D-1 Challenge Leverage Score (CLS)
Blocked by:
- real pre/post win probability source or internal model
- explicit methodology choice

Needed later:
- `challenge_cls` mart or table
- per-challenge pre/post WP values
- attribution rules for direct vs inferred downstream impact

### D-2 WPA Waterfall — real logic
Blocked by:
- D-1 or equivalent real challenge WPA dataset

Current state:
- frontend chart is still simulated

Needed later:
- API response should include per-challenge real WPA delta
- chart should consume backend values only

### D-3 Live War Room — CLS real-time
Blocked by:
- live WP source/model
- real-time latency expectations

Needed later:
- live state to WP projection
- bounded model/runtime cost

### D-4 Umpire Profile — Aggregate CLS
Blocked by:
- D-1

Needed later:
- season/game aggregate over real CLS facts

### D-9 Export-to-PDF Briefing Sheet
Blocked by:
- product decision on output format and template
- adding a PDF generation library

Needed later:
- server route or background job
- snapshot-safe printable component template

### D-10 X Bot
Blocked by:
- external Twitter/X account and API access
- moderation and abuse policy

Needed later:
- mention webhook/poller
- share-card reply logic
- rate limiting and kill switch

## Recommended Order

### Phase 1: ship with current backend foundations
- [ ] D-5 Pregame umpire x team history
- [ ] D-8 Umpire pitch type breakdown
- [ ] D-7 Season-over-season endpoint if enough data exists

### Phase 2: data-inference features
- [ ] D-6 Missed opportunities v1

### Phase 3: true advanced analytics
- [ ] D-1 CLS
- [ ] D-2 WPA waterfall
- [ ] D-3 live CLS
- [ ] D-4 aggregate CLS

### Phase 4: external/distribution
- [ ] D-9 PDF export
- [ ] D-10 X bot

## Testing Requirements
Reference [sprint-test-plan.md](../../product/sprint-test-plan.md).

For every implemented Sprint 9 item:
- [ ] unit tests for query/mapper logic
- [ ] route tests for success/error cases
- [ ] e2e coverage once UI consumes the route
- [ ] no synthetic/random production values
- [ ] no hidden fallback to fake analytics without explicit labeling

## Recommendation
The right split is:

- You review and decide how much you want to commit to the real CLS/WPA stack.
- I proceed with backend/frontend integration for everything already backed by real data.
- Then we implement D-5, D-8, and likely D-7 as part of the integration pass.
- We treat D-1 to D-4 as a separate analytics-modeling project, not a routine hookup task.

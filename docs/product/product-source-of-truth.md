# AiBS Product Source Of Truth

This document is the canonical product and implementation spec for the current fan/org rollout, rubric system, and editorial integration work.

Use this file for:
- product behavior
- page-by-page module ownership
- rubric definitions
- backend read-model requirements
- buildable-now vs blocked decisions
- editorial/The Absolute Observer integration

Do not use older planning docs as parallel sources of truth. They are retained only for historical context and should defer to this document.

Supporting execution docs:
- [roadmap.md](./roadmap.md)
- [sprint-test-plan.md](./sprint-test-plan.md)
- [stack-selection.md](../architecture/stack-selection.md)
- [gazette-backend-spec.md](../editorial/gazette-backend-spec.md)

## Current Product Truth

What is real today:
- Next.js app and API layer are backed by Postgres.
- Real MLB game, pitch, challenge, team, and umpire data can be ingested locally.
- Fan/org mode plumbing already exists at the routing/state level.
- The Absolute Observer workflow persistence exists with staged generation runs and steps.
- Run expectancy and win expectancy layers now exist with confidence-aware fallbacks.
- Advanced CLS/WPA branding remains intentionally disabled rather than simulated.

What is intentionally not treated as complete:
- Fan/org page differentiation is only partially implemented.
- Sprint 9 advanced leverage features are still deferred unless backed by real models.
- Expected challenge decision value is still in an early model phase and should not yet be treated as a fully matured org product.

## Canonical Mode Rules

### View mode
- Valid values: `fan`, `org`
- Resolution order:
  1. `?view=fan|org`
  2. cookie `aibs_view_mode`
  3. default `fan`
- URL override is page-scoped and does not rewrite the cookie automatically.
- Both modes are public in v1.

### Mode behavior
Mode changes:
- page/module order
- which modules are primary vs secondary
- labels, descriptors, and supporting copy
- which metrics are foregrounded

Mode does not change:
- source facts
- auth model
- route structure
- core visual design system

### Design constraint
All implementation must preserve the current visual language:
- no redesign drift
- no new chart styling systems
- no tooltip one-offs
- no typography, spacing, or motion divergence from the existing app

## Audience Split

### Fan
Primary job:
- drama
- personality
- conversation starters
- memorable screenshots and shareable moments

Ordering:
- drama -> personality -> trend

### Org
Primary job:
- prep
- risk
- strategic context
- decision support

Ordering:
- prep -> operational signal -> matchup context

## Rubric Systems

## 1. Umpire Report Card

### Purpose
Summarize challenged-call quality with a stable, understandable grade.

### Meaning
A worse grade means the umpire's challenged calls are overturned too often.

### Inputs
- challenged calls
- overturned calls
- regressed overturn rate
- game-to-game overturn-rate variance
- recent form as a light modifier
- sample size confidence

Supporting only:
- direct-impact overturned calls
- leverage-weighted overturned calls
- 9-zone trouble areas

### Formula
Definitions:
- `league_ot_rate`
- `league_ot_rate_std`
- `league_var_mean`
- `league_var_std`
- `prior_n = 20`
- `regressed_ot_rate = (overturned_calls + prior_n * league_ot_rate) / (challenged_calls + prior_n)`

Component scores:
- `rate_score = clamp(50 - 12 * z(regressed_ot_rate), 0, 100)`
- `consistency_score = clamp(50 - 8 * z(ump_var), 0, 100)`
- `recent_form_score = clamp(50 - 6 * z(recent_ot_rate - season_ot_rate), 0, 100)`

Final score:
- `umpire_score = 0.78 * rate_score + 0.12 * consistency_score + 0.10 * recent_form_score`

### Grade bands
- `A`: `>= 82`
- `B`: `68 - 81`
- `C`: `45 - 67`
- `D`: `30 - 44`
- `F`: `< 30`

### Confidence bands
- `High`: `sample_n >= 25`
- `Medium`: `10 <= sample_n < 25`
- `Low`: `sample_n < 10`

### Fan descriptors
- `A` -> `Reliable`
- `B` -> `Balanced`
- `C` -> `Uneasy`
- `D` -> `Erratic`
- `F` -> `Chaotic`

### Org descriptors
- `A` -> `Low-risk profile`
- `B` -> `Stable profile`
- `C` -> `Monitor`
- `D` -> `Elevated risk`
- `F` -> `High-risk profile`

## 2. Team Challenge Style

### Purpose
Give every team a stable ABS identity based on how it uses the challenge window.

### Archetypes
- `Clutch`
- `Calculated`
- `Trigger-Happy`
- `Passive`

Default/neutral landing:
- `Calculated`

### Inputs
- challenge rate per game
- high-leverage challenge share
- late-inning challenge share
- early/low-leverage challenge share
- average challenges remaining
- regressed overturn rate

### Derived sub-scores
- `aggression_score`
- `late_leverage_score`
- `discipline_score`
- `conservation_score`
- `efficiency_score`

### Style scoring
`Clutch`
- `0.30 * late_leverage_score`
- `0.25 * efficiency_score`
- `0.20 * aggression_score`
- `0.25 * conservation_score`

`Calculated`
- `0.30 * discipline_score`
- `0.30 * conservation_score`
- `0.25 * efficiency_score`
- `0.15 * late_leverage_score`

`Trigger-Happy`
- `0.35 * aggression_score`
- `0.30 * (100 - discipline_score)`
- `0.20 * (100 - conservation_score)`
- `0.15 * (100 - efficiency_score)`

`Passive`
- `0.35 * (100 - aggression_score)`
- `0.30 * conservation_score`
- `0.20 * (100 - late_leverage_score)`
- `0.15 * discipline_score`

Assignment:
- choose highest score
- if top two are within 4 points, use late-game identity as tiebreaker

### Org translations
- `Clutch` -> `High-leverage opportunistic`
- `Calculated` -> `Disciplined`
- `Trigger-Happy` -> `High-frequency aggressive`
- `Passive` -> `Low-engagement conservative`

## 3. Controversy Hero

### Purpose
Pick the marquee fan-facing ABS moment for a slate.

### Inputs
- inning
- score state
- outs
- bases state
- count pressure
- overturned vs confirmed
- impact type
- miss severity if location exists
- recency

### Final weighting
- `0.45 * leverage_score`
- `0.20 * result_impact_score`
- `0.20 * miss_severity_score`
- `0.10 * recency_score`
- `0.05 * hero_novelty_score`

Confirmed calls:
- multiply final score by `0.85`

Reason chips:
- `Late Inning`
- `Extras`
- `Tie Game`
- `One-Run Game`
- `Full Count`
- `Bases Loaded`
- `RISP`
- `Two Outs`
- `Direct Impact`
- `Overturned`
- `Confirmed`
- `Borderline Zone`
- `Far Off Plate`

## 4. Org Watch / Pregame Risk

### Purpose
Surface upcoming umpire risk and prep context in org mode.

### Inputs
- umpire grade inverse risk
- directional bias severity
- 9-zone concentration severity
- recent trend risk
- count hotspot volatility
- matchup history as secondary context

### Display
- tier: `Low`, `Moderate`, `Elevated`, `High`
- 2-3 reason tags
- visible note if matchup sample is weak

## Page-By-Page Product Spec

## Home

### Fan
Question:
- What was the biggest ABS moment and what should I talk about?

Primary modules:
1. Live strip
2. Marquee controversy hero
3. Lightweight team/umpire discovery
4. Top leverage calls
5. Latest debrief

### Org
Question:
- What is today's league operational signal and which umpires matter?

Primary modules:
1. Live strip
2. Compact league signal strip
3. Umpire watch list
4. Lightweight discovery rail
5. Leverage calls as supporting context

## Team Leaderboard

### Fan
Question:
- What kind of ABS teams are these?

Keep:
- scatter plot
- team style labels
- discovery-focused supporting copy

### Org
Question:
- Which teams challenge well and how disciplined are they?

Keep:
- scatter plot
- normalized strategy framing
- richer table context

## Team Detail

### Fan
Question:
- What kind of ABS team are we and where do the big moments happen?

Keep:
- KPI summary
- team identity summary
- radial for offense/defense posture
- trend chart
- hitter's eye heatmap
- home/away context

### Org
Question:
- How does this team use its challenge window and where are the strategic patterns?

Keep:
- KPI summary
- trend chart
- radial for offense/defense posture
- inning heatmap for situational matrix
- hitter's eye heatmap
- home/away context
- umpire matchup matrix

Explicitly remove for now:
- pitching bailout / ABS reliance concept

## Umpire Leaderboard

### Fan
Question:
- Which umpires are the biggest characters or problems?

### Org
Question:
- Which upcoming umpires are risky and why?

Rule:
- fan keeps a population-style framing
- org shifts to more operational prep value

## Umpire Detail

### Fan
Question:
- What kind of ump is this, where do they miss, and what are the dramatic moments?

### Org
Question:
- How accurate is this ump, where are the problem zones, and how should we prep?

Keep with moderate trim:
- grade/descriptor summary
- rolling trend
- 9-zone map
- directional bias
- count hotspots
- pitch-type breakdown
- rhythm chart
- season-over-season only if sample is real

## Game Hub

### Fan
- pregame: know-your-ump tonight
- live: challenge heat and urgency
- postgame: best call / worst call hero and challenge story

### Org
- pregame: umpire intel is primary
- live: decision context and challenge inventory
- postgame: decision review framing

Blocked for now:
- fully calibrated live overturn probability
- real CLS/WPA

## Query

### Fan
- prompt starters
- lighter framing
- shareable answer cards

### Org
- prep-oriented quick prompts
- structured answer cards

Role:
- important supporting tool, not the main differentiator of this phase

## Articles

- mostly fan-facing in this phase
- org mode may reference articles as supporting context
- daily The Absolute Observer stays fan-first

## The Absolute Observer / Editorial Integration

The Absolute Observer is part of the same product system, not a parallel plan.

Core rules:
- daily The Absolute Observer is mostly fan-facing
- org mode may reference The Absolute Observer, but it is not the main org surface
- slate-window logic is server-resolved
- Scout, Theo, Author, Validator remain staged workflow roles
- model selection is enforced in backend code, never in prompts
- rubric outputs may be used as article evidence and supporting framing

## Backend Work Required

Frontend workstream:
- mode-aware module order and labeling
- page composition changes without visual redesign
- confidence chips/tooltips
- honest unavailable states for blocked features

Backend workstream:
- rubric engines
- page-specific read models
- controversy hero ranking
- 9-zone umpire aggregations
- org watch-list scoring
- The Absolute Observer evidence alignment

## Buildable Now

- team challenge styles
- umpire grades
- controversy hero ranking
- 9-zone umpire map
- pregame umpire intel
- challenge map
- fan/org module reordering and label changes
- confidence-aware RE/WE challenge value surfaces

## Blocked Or Deferred

- real CLS / WPA model
- fully calibrated live overturn probability
- PDF export
- X bot
- deep multi-season analytics unless more history is loaded

## Documentation Lifecycle

Canonical:
- this file
- [roadmap.md](./roadmap.md)
- [sprint-test-plan.md](./sprint-test-plan.md)
- [stack-selection.md](../architecture/stack-selection.md)

Historical/supporting:
- [analytics-audit.md](../archive/2026-03/analytics-audit.md)
- [ANALYST_REPORT.md](../archive/2026-03/analyst-report.md)
- [gazette-backend-spec.md](../editorial/gazette-backend-spec.md)
- [ai-backend-plan.md](../architecture/ai-backend-plan.md)
- [ai-implementation-sequence.md](../architecture/ai-implementation-sequence.md)
- [decision_doc.md](../architecture/challenge-location-inference-decision.md)
- [plan.md](../archive/2026-03/backend-scale-security-plan.md)

Archived exploratory docs:
- [docs/archive/2026-03/README.md](../archive/2026-03/README.md)

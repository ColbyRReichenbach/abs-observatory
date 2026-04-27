# AiBS Product Source Of Truth

This document is the canonical current-state product reference for AiBS.

Use it for:

- current page families
- fan and org mode behavior
- current analytical truth boundaries
- live product terminology
- what is implemented now versus intentionally deferred

Do not use archived sprint plans or older launch notes as parallel sources of truth.

Related docs:

- [page-route-coverage.md](./page-route-coverage.md)
- [frontend-surface-verdict-2026-04-08.md](../archive/product/frontend-surface-verdict-2026-04-08.md)
- [roadmap.md](./roadmap.md)
- [technical.md](../reference/technical.md)
- [security.md](../reference/security.md)
- [models/README.md](../models/README.md)

## Current Product State

AiBS is a live baseball analytics product centered on the ABS challenge system.

Current shipped product families:

- `Home`
  - live feed, league moments, fan/org framing

- `Game pages`
  - pregame, live, and final game hubs
  - strike-zone drilldown
  - challenge timelines
  - game-state framing

- `Team analytics`
  - leaderboard
  - team detail fan view
  - team detail org view

- `Umpire analytics`
  - leaderboard
  - umpire detail fan view
  - umpire detail org view

- `Editorial and community`
  - articles
  - profile editing and onboarding
  - public profile pages
  - saved AI artifact workspace
  - public shared visualization pages for public-share-enabled chart artifacts
  - comments
  - editorial admin tooling
  - moderation-aware identity surfaces

- `Admin and AI operations`
  - admin access, editorial, community, and AI review surfaces

## Audience Split

AiBS supports two public modes:

### `fan`

Primary job:

- tell the story of the matchup or review moment
- highlight what changed in the game
- make team and umpire behavior legible without dense operational framing

Fan mode emphasizes:

- review drama
- matchup context
- team-to-team comparison
- cleaner narrative ordering

### `org`

Primary job:

- support preparation
- support challenge review analysis
- surface higher-signal analytical context
- foreground modeled and operational metrics where confidence is sufficient

Org mode emphasizes:

- review management
- risk and timing
- modeled expected versus realized value
- umpire and team usage patterns

Important current limit:

- org mode may show modeled challenge-value context and postgame review analysis
- org mode should not imply that live challenge-now is a deployment-grade optimization engine

Mode does not change:

- source facts
- route structure
- underlying challenge records
- core design system

## Current Page Truth

### Home

Home is the product entry point, not just a landing page.

It currently combines:

- league-level review moments
- current game context
- team and umpire spotlighting
- mode-aware framing

### Game Pages

Game pages are state-aware:

- `pregame`
  - matchup tendencies
  - likely review windows
  - umpire setup and challenge context

- `live`
  - experimental challenge-now lens
  - review consequence timeline
  - tonight's review pattern

- `final`
  - review battle recap
  - realized game-state swings
  - postgame challenge analysis
  - missed-opportunity and low-value-usage review

The challenge explorer is the shared drilldown surface across game states, not the only storytelling surface.

### Teams

Team pages are built around review usage and review outcome patterns.

Current team style vocabulary:

- fan:
  - `Selective`
  - `High-Impact`
  - `Overactive`
  - `Low-Usage`

- org:
  - `Timely`
  - `Selective`
  - `High-Usage`
  - `Low-Usage`

These labels describe challenge behavior patterns. They should not be treated as moral judgments or full-team identity claims beyond ABS usage.

### Umpires

Umpire pages are built around challenged-call behavior and review risk.

They should distinguish clearly between:

- overturn tendency
- review volatility
- overturned-only consequence
- expected review value
- low-sample directional reads

### Editorial and Community

The Absolute Observer and the community system are part of the current product, not side experiments.

Current shipped capabilities include:

- article listing and article detail pages
- profile editing and onboarding
- public profile pages
- saved AI artifact workspace
- public visualization sharing for public-share-enabled visualizer artifacts
- editorial persistence and generation telemetry
- authenticated comments and moderation flows

Currently deferred or intentionally disabled:

- follow relationships

## Analytical Truth Boundaries

AiBS uses real baseball data and model-derived analytics, but the product should stay honest about what each layer means.

### Safe to state as current

- RE and WE layers exist
- expected review value exists
- realized review value exists
- review surplus / shortfall exists where supported
- estimated leverage exists
- overturn probability exists in modeled/historical contexts

### Must stay qualified

- `estimated leverage` is not true WPA/CLS
- `expected review value` is modeled, not certain
- live `challenge-now` is experimental and discussion-oriented, not operational truth
- `actual review value` is realized game-state change from the tracked event path
- `surplus` / `shortfall` means actual minus modeled expectation
- some live and low-sample surfaces are directional rather than fully mature

### Language rules

Use:

- `challenge`
- `review`
- `successful challenge`
- `overturned`
- `confirmed`
- `high-leverage`
- `late-game`
- `held in reserve`
- `used early`
- `expected`
- `actual`
- `surplus`
- `shortfall`

Avoid:

- stale archetype labels
- personality language that overstates the data
- claiming true WPA/CLS where we only have estimated leverage
- calling a low-usage team `disciplined` when the metric is just lower challenge volume or more retained challenges

## Intentionally Deferred Or Qualified

These should not be overstated in product or docs:

- fully mature optimization-grade challenge strategy modeling
- org-grade live challenge optimization claims
- true public WPA / CLS framing
- full multi-provider live AI runtime
- fully distinct fan and org products with separate route structures
- enterprise-grade org workflows beyond the current public org-mode framing
- broad public social graph or feed-style visualization-sharing loops

## Documentation Rule

When describing AiBS in internal docs:

- describe what is implemented now
- mark modeled surfaces honestly
- separate current truth from roadmap direction
- prefer concise product language over sprint-era planning language

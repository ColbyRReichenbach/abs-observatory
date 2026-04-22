# AiBS Spec Rewrite

This document rewrites the `aibs_standout_specs_bundle` against the current repository reality.

It is intentionally ruthless.

It is also a dated execution record now. For current repo truth, use:

- [product-source-of-truth.md](../../product/product-source-of-truth.md)
- [page-route-coverage.md](../../product/page-route-coverage.md)
- [roadmap.md](../../product/roadmap.md)
- [aibs-spec-rewrite-task-index.json](../../product/aibs-spec-rewrite-task-index.json)

The bundle has good product instincts, but it treats this repo like a half-empty prototype. It is not. This codebase already has real public analytics pages, fan and org framing, article persistence, AI policy and entitlement controls, comments, admin tooling, and a substantial data layer. The rewrite below keeps those assets, finishes the fake surfaces, and avoids rebuilding systems that already exist.

Use this document instead of the original bundle when deciding what to build next in this repository.

Related docs:

- [product-source-of-truth.md](../../product/product-source-of-truth.md)
- [page-route-coverage.md](../../product/page-route-coverage.md)
- [roadmap.md](../../product/roadmap.md)
- [frontend-surface-verdict-2026-04-08.md](./frontend-surface-verdict-2026-04-08.md)

## Core Verdict

The original bundle is:

- strong on product positioning
- correct that postgame should move toward computed audit outputs
- correct that AI should stay gated and attributable
- correct that generic social features would dilute the product
- wrong about how much of the current foundation is missing
- too willing to mix migration, cleanup, and greenfield work into one plan

The repo-specific rewrite is:

- finish what is already scaffolded before inventing new product lines
- migrate postgame carefully without breaking existing report surfaces
- tighten editorial instead of replacing it
- defer broad community and visual-lab ambitions until identity and saved artifacts are real
- clean out placeholder debt and stop documentation from overstating shipped functionality

## What Already Exists

These are not speculative foundations. They are already in the repo and should be reused.

### Public Analytics Product

- home, game, team, and umpire routes with real fan and org framing
- pregame, live, and final game-state handling
- challenge explorer and challenge-value data plumbing
- report pages and postgame components already serving narrative outputs

Primary files:

- `src/app/page.tsx`
- `src/app/game/[gamePk]/page.tsx`
- `src/app/teams/page.tsx`
- `src/app/teams/[teamId]/page.tsx`
- `src/app/umpires/page.tsx`
- `src/app/umpires/[umpireId]/page.tsx`
- `src/lib/view-mode.ts`
- `src/lib/view-mode-contract.ts`
- `src/lib/data.ts`
- `src/lib/challenge-value.ts`
- `src/lib/server/challenge-decision-value.ts`

### Identity, Access, And AI Controls

- user/account resolution
- profile storage backend primitives
- entitlement checks
- AI policy gates
- AI chat and artifact APIs

Primary files:

- `src/lib/server/auth.ts`
- `src/lib/server/profiles.ts`
- `src/lib/server/account.ts`
- `src/lib/server/entitlements.ts`
- `src/lib/server/identity-policy.ts`
- `src/lib/server/ai-policy.ts`
- `src/lib/server/ai-chat.ts`
- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/artifacts/route.ts`

### Editorial

- article persistence
- admin editorial actions
- generation telemetry
- article listing and detail routes

Primary files:

- `src/lib/server/articles.ts`
- `src/lib/server/admin-editorial.ts`
- `src/app/admin/editorial/page.tsx`
- `src/app/admin/editorial/actions.ts`
- `src/app/articles/page.tsx`
- `src/app/articles/[slug]/page.tsx`

### Data Foundation

- material schema for challenges, articles, jobs, comments, identities, and analytics
- serving views and challenge-value data infrastructure

Primary files:

- `db/schema.sql`
- `db/views.sql`

## What Is Fake Or Incomplete

These surfaces currently overclaim capability and should not be treated as shipped product.

### Placeholder Or Disabled User Surfaces

- `src/app/profile/page.tsx`
- `src/app/welcome/page.tsx`
- `src/app/u/[username]/page.tsx`
- `src/app/v/[vizId]/page.tsx`
- `src/app/api/profile/onboarding/route.ts`
- `src/app/api/public-profiles/[username]/route.ts`
- `src/app/api/follows/[userId]/route.ts`
- `src/app/api/cron/editorial-daily/route.ts`

### Empty Files That Distort Repo Reality

- `src/components/nav-auth-controls.tsx`
- `src/components/community/profile-settings-form.tsx`
- `src/lib/server/editorial-automation.ts`
- `etl/player_abs_profiles.py`
- multiple empty tests and low-signal stub components

The rule going forward:

- fill them
- delete them
- or clearly mark them as deferred

Do not leave placeholder files pretending a capability exists.

## Rewrite Principles

### 1. Finish Before Expanding

If a feature already has real backend primitives and placeholder UI, finish it before starting a new parallel product area.

### 2. Migrate, Do Not Replace Blindly

Postgame and editorial already have live surfaces. New computed systems must bridge into those surfaces instead of discarding them.

### 3. Keep Fan And Org As Lenses, Not Separate Apps

The current fan/org model is already embedded in the route structure. Improve hierarchy and wording, but do not fork the product into two separate codebases.

### 4. AI Must Stay Accounted For

AI output should continue to be gated, attributable, reviewable, and attached to user or system context.

### 5. No Broad Community Until Identity Is Real

Public profiles, follows, saved visualizations, social loops, and galleries all depend on a working identity/profile substrate. Ship that first.

## The Repo-Specific Plan

### Phase 0: Reality Cleanup

Goal:

- make docs, route coverage, and repo status match reality

Do:

- correct product docs that overstate profile/community readiness
- inventory placeholder and empty files
- decide file-by-file: implement, delete, or defer
- add branch-safe planning docs instead of mutating `backend`

Do not:

- start new product features in this phase

Why first:

- the current repo makes it too easy to fool ourselves

### Phase 1: Finish Identity And Profile Foundations

Goal:

- turn existing auth/profile scaffolding into a real, minimal user system

Build:

- working `/profile`
- working `/welcome`
- nav auth controls
- onboarding POST flow
- profile settings form
- working `/u/[username]` public profile page

Reuse:

- `src/lib/server/auth.ts`
- `src/lib/server/profiles.ts`
- `src/lib/server/account.ts`
- `src/lib/server/identity-policy.ts`

Defer:

- follows
- rich social graphs
- creator-style profile customizations

Definition of done:

- a signed-in user can land, onboard, edit basic profile data, and load a public profile URL that renders real content

### Phase 2: Add Computed Postgame Audit Without Breaking Reports

Goal:

- move final-game analysis toward computed audit outputs while preserving current report routes

Build:

- `game_abs_impact_metrics` or equivalent computed serving object
- audit contract for expected value, actual value, surplus, shortfall, leverage, timing, and missed-opportunity summaries
- compatibility layer so `/reports/[gamePk]` can render new audit data without requiring a long stored narrative for every game

Reuse:

- `src/lib/server/game-reports.ts`
- `src/lib/game-reports.ts`
- `src/components/game-hub/postgame-hub.tsx`
- `src/app/reports/[gamePk]/page.tsx`
- `src/lib/data.ts`
- `src/lib/server/challenge-decision-value.ts`

Do not:

- rip out `game_reports` first
- force a big-bang migration
- pretend live recommendation quality is stronger than it is

Definition of done:

- final-game surfaces can render a computed audit for games with structured data only
- legacy narrative reports still work during migration

### Phase 3: Tighten Editorial Instead Of Rebuilding It

Goal:

- make editorial coherent, selective, and operationally real

Build:

- clearer article type taxonomy
- stronger article candidate selection logic
- explicit editorial desk workflow for approving or rejecting generation outputs
- optional daily automation only after `editorial-automation.ts` is no longer empty

Reuse:

- `src/lib/server/articles.ts`
- `src/lib/server/admin-editorial.ts`
- `src/app/admin/editorial/page.tsx`
- `src/app/articles/page.tsx`

Do not:

- create a separate editorial persistence layer
- rebuild article generation telemetry

Definition of done:

- editorial output is curated, typed, and explainable

### Phase 4: Make AI Artifacts Durable For Signed-In Users

Goal:

- turn AI use from ephemeral chat into saved user work

Build:

- durable saved artifact records tied to identity
- artifact listing inside profile/workspace
- replayable or inspectable AI outputs where appropriate

Reuse:

- `src/app/api/ai/artifacts/route.ts`
- `src/lib/use-ai-artifact.ts`
- `src/lib/server/ai-generations.ts`
- current entitlements and AI policy checks

Defer:

- public artifact feeds
- likes, forks, community remix flows

Definition of done:

- a signed-in user can return to prior generated outputs in their own workspace

### Phase 5: Consider Visual Lab Only After Identity And Artifacts Are Stable

Goal:

- decide whether saved visualizations are worth productizing

Prerequisites:

- public profile pages work
- saved artifacts work
- persistence contract for visual state exists

Possible first step:

- private saved chart pages before any public gallery

Do not:

- build a generic social visualization network
- launch likes, forks, or public discovery before moderation and ownership are real

Current verdict:

- this is a later bet, not a next bet

### Phase 6: Continuous Hygiene

Goal:

- stop carrying fake implementation mass

Do:

- remove empty tests that provide no signal
- delete dead placeholder files that are not on the active path
- add tests only where the feature is real
- keep docs in lockstep with route and API changes

## What To Keep, What To Kill

Keep:

- fan/org framing architecture
- current game/team/umpire route family
- article persistence and editorial admin core
- AI policy, entitlement, and review posture
- report routes as migration targets

Kill or rewrite:

- docs that claim public profiles and follows are already live
- empty auth/community/editorial files
- any plan that treats this repo as greenfield
- any plan that starts visual-lab community work before identity is real

## Brutal Prioritization

If only one sequence gets funded, it should be:

1. docs truth cleanup and placeholder inventory
2. identity/profile/onboarding completion
3. computed postgame audit with report compatibility
4. editorial tightening
5. saved AI artifacts
6. only then evaluate visual-lab persistence

If work starts anywhere else first, the likely result is more surface area, more fake claims, and less product coherence.

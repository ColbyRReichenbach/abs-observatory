# AI Surface And Terminology Master Plan

Status: `Current Source Of Truth`

Last updated: April 10, 2026

Supersedes:

- `/Users/colbyreichenbach/Downloads/aibs_ai_master_implementation_spec_v2_abs (1).md`
- `/Users/colbyreichenbach/Downloads/aibs_terminology_seed_pack/README.md`
- `/Users/colbyreichenbach/Downloads/aibs_terminology_seed_pack/style-packs.json`
- `/Users/colbyreichenbach/Downloads/aibs_terminology_seed_pack/surface-rules.json`
- `/Users/colbyreichenbach/Downloads/aibs_terminology_seed_pack/terminology-cards.json`

## Purpose

This document replaces the earlier AI implementation memo with a codebase-specific plan for what AiBS should actually implement now.

The target is not to build an abstract “AI platform.”

The target is to:

1. make AiBS responses sound like a baseball and ABS product
2. separate AI surfaces cleanly enough that prompt behavior is understandable and testable
3. improve quality without introducing avoidable database, orchestration, or maintenance complexity
4. add health checks so prompt and terminology regressions are visible before they hit production

If an AiBS engineer picks this document up cold, they should be able to implement the program without follow-up architecture questions.

## Executive Decision

Implement in this order:

1. refactor AI surfaces into dedicated runners with shared orchestration
2. add a lightweight task-family resolver
3. add file-backed baseball and ABS terminology retrieval
4. inject small, deterministic terminology packs into prompts
5. add AI health checks, evals, and regression gates

Explicit non-decisions:

- do not build a wiki
- do not adopt LangGraph
- do not move terminology into the database in this phase
- do not build a free-form classifier service
- do not inject the full terminology corpus into prompts

## Current-State Baseline

This plan is grounded in the current repository, not in a blank-slate architecture.

### 1. Route layer is already thin

`src/app/api/ai/chat/route.ts` is thin and should stay thin.

Implementation implication:

- do not move AI orchestration logic into route handlers

### 2. `ai-chat.ts` is the main refactor target

`src/lib/server/ai-chat.ts` currently mixes:

- request parsing
- persistence
- rate limiting
- queueing
- prompt construction
- chart-specific logic
- generic copilot logic
- provider execution
- telemetry

Implementation implication:

- split orchestration from surface execution and prompt assembly

### 3. Chart insight already has the strongest semantics

`src/lib/chart-insight-payload.ts` already provides high-quality, chart-type-specific structured payloads.

Implementation implication:

- preserve payload builders
- do not replace them with raw database dumps
- use them as the main source of semantic grounding for chart prompts

### 4. Prompt specialization is uneven

Today:

- `chart_insight` has a dedicated path
- `copilot` and `visualizer` mostly share the generic path

Implementation implication:

- `visualizer` must become a real structured surface
- `copilot` must stop carrying all non-chart prompt behavior

### 5. No real terminology layer exists yet

There is no active in-repo terminology retrieval system. `src/lib/ai-prompt-registry.ts` is effectively empty.

Implementation implication:

- terminology should be introduced as a small, deterministic runtime layer, not as a large new product subsystem

## Governing Rules

These rules are mandatory for this phase.

### 1. Surface contracts come before vocabulary tuning

AiBS must know what kind of response it is generating before it optimizes how that response sounds.

### 2. Prompt modules must be small and inspectable

No monolithic “master prompt” blobs. Each surface must be assembled from clearly named parts.

### 3. Terminology retrieval must be deterministic

Given the same surface, audience, task family, and semantic tags, the selected terminology pack should be reproducible.

### 4. Terminology storage must be file-backed in this phase

The seed pack is small. The complexity cost of DB-backed terminology is not justified yet.

### 5. Prompt token budget is a first-class constraint

Terminology is useful only if it sharpens the prompt. If it bloats the prompt, it reduces quality and increases cost.

### 6. Health checks are required

No AI refactor is complete unless it adds measurable checks for:

- prompt assembly correctness
- terminology coverage
- banned phrasing controls
- payload size and latency risk

### 7. Visualizer must remain constrained

The visualizer should return structured chart-planning output, not generic conversational text.

### 8. DB migration is deferred on purpose

This plan must keep a clean seam so terminology can move to DB later, but that move is out of scope for this phase.

## What Should Actually Be Implemented Now

### In scope

1. shared AI orchestration split out of `ai-chat.ts`
2. dedicated surface runners for:
   - `copilot`
   - `chart_insight`
   - `visualizer`
3. shared prompt assembly helpers
4. file-backed terminology seeds loaded from JSON
5. style-pack and surface-rule selection
6. lightweight task-family resolution
7. deterministic card selection with prompt-size limits
8. structured visualizer output contract
9. prompt/eval/health-check coverage

### Out of scope

1. DB tables for terminology
2. editorial UI for editing terminology
3. LangGraph or workflow graph orchestration
4. vector retrieval or article/news RAG
5. automated self-healing prompt loops
6. a new AI admin product surface

## Why Terminology Should Stay File-Backed For Now

The correct cost lens here is model-token cost, not storage-query cost.

Reading terminology from local JSON versus Postgres does not materially change OpenAI cost. The expensive part is what gets injected into the prompt.

File-backed terminology is the right implementation today because it gives:

- minimal operational complexity
- no new schema or migration burden
- easy code review of wording changes
- reproducible seeds checked into the repo
- fast local iteration during tuning

The design must still keep a storage abstraction so terminology can move to DB later without forcing a prompt-layer rewrite.

## Prompt-Bloat Policy

AiBS must not inject all terminology cards into every request.

Why:

- too many cards increase prompt tokens
- higher prompt tokens increase cost
- higher prompt tokens increase latency
- larger prompts bury the highest-signal rules
- lower-signal or conflicting terminology guidance can weaken response quality

Prompt assembly budget for terminology:

- exactly one style pack
- all required cards from the matching surface rule
- up to four preferred cards selected by semantic match and priority
- maximum total injected cards: `7`

If no surface rule matches:

- inject one style pack only
- inject zero to three fallback cards by semantic tags

## Final Target Architecture

```txt
src/app/api/ai/chat/route.ts
  -> src/lib/server/ai/orchestrator.ts
      -> src/lib/server/ai/request-schema.ts
      -> src/lib/server/ai/task-family.ts
      -> src/lib/server/ai/context.ts
      -> src/lib/server/ai/telemetry.ts
      -> src/lib/server/ai/cache.ts
      -> src/lib/server/ai/surfaces/
           copilot.ts
           chart-insight.ts
           visualizer.ts
      -> src/lib/server/ai/prompts/
           base.ts
           copilot.ts
           chart-insight.ts
           visualizer.ts
      -> src/lib/server/ai/terminology/
           index.ts
           loader.ts
           selector.ts
           compiler.ts
           types.ts
           seeds/
             terminology-cards.json
             style-packs.json
             surface-rules.json
```

## Surface Contracts

### Surface 1: `copilot`

Purpose:

- answer scoped baseball and ABS questions against AiBS data

Output contract:

- plain text answer
- no structured chart schema requirement

Behavior:

- must lead with answer
- must remain grounded in tool results
- may use terminology guidance
- may not invent unsupported stats or labels

### Surface 2: `chart_insight`

Purpose:

- explain a specific chart using chart-specific payload semantics

Output contract:

- `StructuredChartInsight`
- headline
- 2 to 4 labeled sections

Behavior:

- must use chart payload only
- must preserve explicit payload labels when present
- must use terminology layer when relevant to chart family

### Surface 3: `visualizer`

Purpose:

- convert a baseball/ABS question into a chart recommendation plan

Output contract:

- structured planner output, not free-form essay

Minimum schema:

- `chartType`
- `whyThisChart`
- `xAxis`
- `yAxis`
- `grouping`
- `filters`
- `signalsToWatch`
- `caveats`

Behavior:

- recommend a chart, not merely describe baseball
- stay bounded to AiBS-supported or clearly implementable chart forms
- use baseball and ABS vocabulary appropriately

## Task-Family Resolver

AiBS should add a lightweight resolver, not a model-based classifier.

Inputs:

- surface
- audience mode
- context scope
- chart type, if present
- user message

Output:

- one `surfaceTaskFamily`

Initial task-family set:

### Copilot families

- `game_summary`
- `general_abs_explanation`
- `anomaly_diagnosis`
- `team_profile_explanation`
- `umpire_profile_explanation`
- `comparison`

### Chart insight families

- `challenge_decision_brief`
- `challenge_value_timeline`
- `umpire_rhythm`
- `zone_map`
- `scenario_matrix`
- `inventory_deployment`

### Visualizer families

- `question_to_visual_plan`
- `compare_entities_visual_plan`
- `timing_and_leverage_visual_plan`

Resolver policy:

1. if `surface === chart_insight`, prefer chart-type mapping first
2. if `surface === visualizer`, prefer planner families first
3. otherwise use message heuristics plus scope
4. always fall back to a safe default family per surface

## Terminology Layer Design

### Seed source

Source the terminology layer from the supplied seed pack and store it in:

- `src/lib/server/ai/terminology/seeds/terminology-cards.json`
- `src/lib/server/ai/terminology/seeds/style-packs.json`
- `src/lib/server/ai/terminology/seeds/surface-rules.json`

### Runtime types

Add runtime types for:

- terminology card
- style pack
- surface rule
- compiled terminology bundle

### Selection algorithm

Given:

- `surfaceKey`
- `audienceMode`
- `surfaceTaskFamily`
- optional semantic tags

Select:

1. exactly one matching style pack
2. all required cards from the matching surface rule
3. highest-priority preferred cards whose semantic tags match the request context
4. stop at `max_cards`, but never exceed the global card cap of `7`

### Semantic tags

Semantic tags should come from:

- chart payload metadata
- task-family mapping
- scoped context
- simple message heuristics

Examples:

- `full_count`
- `risp`
- `walk_off`
- `high_leverage`
- `challenged_call`
- `overturned_call`
- `confirmed_call`
- `challenge_value`
- `decision_surplus`
- `inventory_deployment`
- `zone_vulnerability`

### Prompt compilation

Selected terminology must be compiled into a short prompt appendix with four sections:

1. voice pack
2. preferred baseball and ABS terms
3. banned or discouraged phrasing
4. anti-pattern reminders

Compiled appendices must be short, deterministic, and easy to snapshot-test.

## Proposed File-Level Implementation

### New files to add

- `src/lib/server/ai/orchestrator.ts`
- `src/lib/server/ai/request-schema.ts`
- `src/lib/server/ai/task-family.ts`
- `src/lib/server/ai/context.ts`
- `src/lib/server/ai/telemetry.ts`
- `src/lib/server/ai/cache.ts`
- `src/lib/server/ai/surfaces/copilot.ts`
- `src/lib/server/ai/surfaces/chart-insight.ts`
- `src/lib/server/ai/surfaces/visualizer.ts`
- `src/lib/server/ai/prompts/base.ts`
- `src/lib/server/ai/prompts/copilot.ts`
- `src/lib/server/ai/prompts/chart-insight.ts`
- `src/lib/server/ai/prompts/visualizer.ts`
- `src/lib/server/ai/terminology/types.ts`
- `src/lib/server/ai/terminology/loader.ts`
- `src/lib/server/ai/terminology/selector.ts`
- `src/lib/server/ai/terminology/compiler.ts`
- `src/lib/server/ai/terminology/index.ts`
- `src/lib/server/ai/terminology/seeds/terminology-cards.json`
- `src/lib/server/ai/terminology/seeds/style-packs.json`
- `src/lib/server/ai/terminology/seeds/surface-rules.json`
- `src/lib/server/__tests__/ai-task-family.test.ts`
- `src/lib/server/__tests__/ai-terminology.test.ts`
- `src/lib/server/__tests__/ai-visualizer.test.ts`
- `tests/ai-evals/terminology-voice.eval.ts`
- `tests/ai-evals/visualizer-structure.eval.ts`

### Existing files to modify

- `src/app/api/ai/chat/route.ts`
- `src/lib/server/ai-chat.ts`
- `src/lib/server/ai-policy.ts`
- `src/lib/server/ai-tools.ts`
- `src/lib/chart-insight-payload.ts`
- `src/lib/ai-prompt-registry.ts`
- `src/lib/server/__tests__/ai-chat.test.ts`
- `src/lib/server/__tests__/ai-policy.test.ts`

## Migration Strategy

### Step 1

Keep `runChat()` as the public entrypoint.

### Step 2

Move most logic from `ai-chat.ts` into `orchestrator.ts`, leaving `ai-chat.ts` as a compatibility wrapper.

### Step 3

Route by surface into surface runners.

### Step 4

Add task-family resolution and terminology selection without changing provider or persistence behavior.

### Step 5

Add structured visualizer output and the new health checks.

This sequence minimizes blast radius and preserves existing API behavior while the refactor lands.

## Health Checks And Regression Gates

This phase must ship with explicit AI health checks.

### Required health checks

1. prompt assembly check
   - verifies that the correct style pack and card set are attached for a known fixture

2. terminology selection check
   - verifies that required cards always appear for matching surface rules

3. banned-phrasing check
   - verifies that anti-pattern cards can surface banned or discouraged language guidance

4. chart-output structure check
   - verifies that `chart_insight` still returns valid `StructuredChartInsight`

5. visualizer structure check
   - verifies that `visualizer` returns valid chart-plan schema

6. token-budget check
   - verifies terminology appendix length and total prompt size stay under explicit limits

7. telemetry completeness check
   - verifies generation metadata records:
     - surface
     - task family
     - prompt version
     - terminology bundle metadata

### Operational metrics to log

- task family
- selected style pack slug
- selected card slugs
- terminology appendix character count
- total prompt character estimate
- model latency
- cache hit rate
- invalid-structure rate by surface

## Acceptance Criteria

### Architecture

- `ai-chat.ts` no longer owns all AI logic directly
- each surface has a dedicated runner
- visualizer has a structured contract

### Terminology

- seed pack is fully present in-repo under `src/lib/server/ai/terminology/seeds/`
- terminology selection is deterministic
- no surface injects the full card corpus
- style pack plus card selection is snapshot-tested

### Quality

- chart insight responses remain schema-valid
- visualizer responses are schema-valid
- fan surfaces sound baseball-native without org jargon bleed
- org surfaces preserve precise ABS and decision-language

### Cost And Prompt Budget

- terminology injection stays within the configured card cap
- prompt size budget checks exist and pass
- no request sends the full terminology set

### Operational

- generation telemetry records task-family and terminology metadata
- tests and evals exist for all new modules
- the refactor does not change the external API request contract

## Future DB Migration Criteria

Terminology should move from files to DB only if at least one of these becomes true:

1. non-engineers need in-product editing
2. multiple terminology versions must be activated without code deploy
3. admin review and approval workflow becomes necessary
4. terminology analytics must be queried relationally

Until then, file-backed storage is the correct implementation.

## Implementation Summary

The correct move for AiBS today is:

- split the AI surfaces cleanly
- keep terminology simple and deterministic
- inject only relevant baseball and ABS language
- add health checks so quality regressions are visible

The wrong move today would be:

- building a database-backed terminology CMS before prompt quality is stable
- building a large generic AI framework
- feeding the model a baseball encyclopedia on every request


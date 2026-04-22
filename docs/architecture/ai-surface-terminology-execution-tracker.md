# AI Surface And Terminology Execution Tracker

Status: `Execution Plan`

Last updated: April 10, 2026

Primary methodology source:

- [ai-surface-terminology-master-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/architecture/ai-surface-terminology-master-plan.md)

## Purpose

This document converts the AI master plan into an implementation tracker with:

- workstreams
- file targets
- exact deliverables
- test requirements
- acceptance criteria

If this tracker conflicts with the master plan, the master plan controls product direction and this tracker controls sequence and implementation detail.

## Program Principles

Execution must follow these rules:

1. preserve current API behavior while refactoring internals
2. land modularity before tuning language behavior
3. keep terminology file-backed in this phase
4. keep terminology selection deterministic and small
5. ship tests and health checks with each phase
6. do not expand scope into CMS, wiki, or orchestration systems

## Workstreams

### Workstream A: AI Runtime Refactor

Goal:

- split `ai-chat.ts` into stable orchestration and dedicated surface runners

### Workstream B: Task-Family Routing

Goal:

- classify requests into small, debuggable task families

### Workstream C: Terminology Runtime

Goal:

- load, validate, select, and compile baseball/ABS terminology packs from JSON seeds

### Workstream D: Surface Prompt Modernization

Goal:

- give each surface its own prompt builder and output contract

### Workstream E: AI Health Checks

Goal:

- add prompt, structure, token-budget, and terminology regression coverage

## Phase Order

### Phase 0: Freeze The Scope

Tasks:

- add the master plan and this execution tracker to the repo
- treat these docs as the current source of truth for AI surface work
- explicitly mark DB-backed terminology, wiki, and LangGraph as out of scope

Primary file targets:

- `docs/architecture/ai-surface-terminology-master-plan.md`
- `docs/architecture/ai-surface-terminology-execution-tracker.md`

Exit criteria:

- both docs exist in repo
- implementation sequence is locked

### Phase 1: Establish AI Module Skeleton

Tasks:

- create `src/lib/server/ai/`
- create module shells for:
  - `orchestrator.ts`
  - `request-schema.ts`
  - `task-family.ts`
  - `context.ts`
  - `telemetry.ts`
  - `cache.ts`
- create surface folders and prompt folders
- keep `src/lib/server/ai-chat.ts` as the existing public adapter

Primary file targets:

- `src/lib/server/ai/orchestrator.ts`
- `src/lib/server/ai/request-schema.ts`
- `src/lib/server/ai/task-family.ts`
- `src/lib/server/ai/context.ts`
- `src/lib/server/ai/telemetry.ts`
- `src/lib/server/ai/cache.ts`
- `src/lib/server/ai-chat.ts`

Acceptance criteria:

- new AI module tree exists
- no API route changes required yet
- no behavior regression in request parsing

### Phase 2: Move Request Schema And Shared Orchestration

Tasks:

- move `CHAT_REQUEST_SCHEMA` out of `ai-chat.ts` into `request-schema.ts`
- move shared response typing into the AI module tree
- move conversation transcript helpers into `orchestrator.ts` or a support module
- keep `runChat()` and queued execution paths callable through compatibility wrappers

Primary file targets:

- `src/lib/server/ai-chat.ts`
- `src/lib/server/ai/request-schema.ts`
- `src/lib/server/ai/orchestrator.ts`
- `src/lib/server/__tests__/ai-chat.test.ts`

Acceptance criteria:

- `runChat()` still works through the existing route
- request schema parsing is no longer owned only by `ai-chat.ts`
- tests updated for new module boundaries

### Phase 3: Add Task-Family Resolution

Tasks:

- define a `SurfaceTaskFamily` union type
- implement deterministic resolution rules by:
  - surface
  - chart type
  - scope
  - message heuristics
- add safe default family per surface
- attach resolved task family to generation telemetry metadata

Initial family map to implement:

- `copilot`
  - `game_summary`
  - `general_abs_explanation`
  - `anomaly_diagnosis`
  - `team_profile_explanation`
  - `umpire_profile_explanation`
  - `comparison`
- `chart_insight`
  - `challenge_decision_brief`
  - `challenge_value_timeline`
  - `umpire_rhythm`
  - `zone_map`
  - `scenario_matrix`
  - `inventory_deployment`
- `visualizer`
  - `question_to_visual_plan`
  - `compare_entities_visual_plan`
  - `timing_and_leverage_visual_plan`

Primary file targets:

- `src/lib/server/ai/task-family.ts`
- `src/lib/server/ai/orchestrator.ts`
- `src/lib/server/__tests__/ai-task-family.test.ts`
- `src/lib/server/__tests__/ai-chat.test.ts`

Acceptance criteria:

- every AI request resolves one task family
- chart insight requests prefer chart-type mapping over generic message heuristics
- task family is included in generation metadata

### Phase 4: Add Terminology Seed Runtime

Tasks:

- create `src/lib/server/ai/terminology/`
- copy seed pack into:
  - `seeds/terminology-cards.json`
  - `seeds/style-packs.json`
  - `seeds/surface-rules.json`
- create runtime types and validators
- implement a file loader with in-process memoization
- expose a clean read API that returns validated seed data

Primary file targets:

- `src/lib/server/ai/terminology/types.ts`
- `src/lib/server/ai/terminology/loader.ts`
- `src/lib/server/ai/terminology/index.ts`
- `src/lib/server/ai/terminology/seeds/terminology-cards.json`
- `src/lib/server/ai/terminology/seeds/style-packs.json`
- `src/lib/server/ai/terminology/seeds/surface-rules.json`
- `src/lib/server/__tests__/ai-terminology.test.ts`

Acceptance criteria:

- seed files load successfully
- invalid seed shape fails tests
- seed loading is memoized and deterministic

### Phase 5: Implement Terminology Selection

Tasks:

- implement selection inputs:
  - `surfaceKey`
  - `audienceMode`
  - `surfaceTaskFamily`
  - `semanticTags`
- select one matching style pack
- attach all required cards
- attach highest-priority preferred cards by semantic match
- enforce:
  - global card cap `7`
  - per-rule `max_cards`
- implement deterministic tie-breaking by:
  - priority descending
  - slug ascending

Primary file targets:

- `src/lib/server/ai/terminology/selector.ts`
- `src/lib/server/ai/terminology/types.ts`
- `src/lib/server/__tests__/ai-terminology.test.ts`

Acceptance criteria:

- required cards always appear
- total selected cards never exceeds cap
- same fixture always yields same selection

### Phase 6: Implement Terminology Compiler

Tasks:

- convert selected style pack and cards into a compact prompt appendix
- compile sections:
  - `Voice Pack`
  - `Preferred Terms`
  - `Avoid`
  - `Anti-Patterns`
- dedupe repeated guidance
- clip appendix to explicit length budget
- return compiler metadata:
  - style pack slug
  - selected card slugs
  - appendix character count

Primary file targets:

- `src/lib/server/ai/terminology/compiler.ts`
- `src/lib/server/ai/terminology/index.ts`
- `src/lib/server/__tests__/ai-terminology.test.ts`

Acceptance criteria:

- appendix is deterministic
- appendix includes required guidance
- appendix remains under configured size budget

### Phase 7: Split Surface Runners

Tasks:

- create `copilot.ts`
- create `chart-insight.ts`
- create `visualizer.ts`
- move chart insight behavior out of `ai-chat.ts`
- move generic copilot behavior out of `ai-chat.ts`
- create dedicated visualizer path instead of sharing generic copilot behavior

Primary file targets:

- `src/lib/server/ai/surfaces/copilot.ts`
- `src/lib/server/ai/surfaces/chart-insight.ts`
- `src/lib/server/ai/surfaces/visualizer.ts`
- `src/lib/server/ai/orchestrator.ts`
- `src/lib/server/ai-chat.ts`

Acceptance criteria:

- all three surfaces route through dedicated runners
- `ai-chat.ts` is now primarily compatibility/orchestration glue
- no surface depends on giant inline prompt strings inside `ai-chat.ts`

### Phase 8: Add Surface Prompt Builders

Tasks:

- add `prompts/base.ts`
- add `prompts/copilot.ts`
- add `prompts/chart-insight.ts`
- add `prompts/visualizer.ts`
- define shared prompt parts:
  - system identity
  - grounding rules
  - surface instructions
  - terminology appendix
- preserve chart-insight structured JSON schema behavior
- make visualizer structured by design

Primary file targets:

- `src/lib/server/ai/prompts/base.ts`
- `src/lib/server/ai/prompts/copilot.ts`
- `src/lib/server/ai/prompts/chart-insight.ts`
- `src/lib/server/ai/prompts/visualizer.ts`
- `src/lib/server/ai/surfaces/chart-insight.ts`
- `src/lib/server/ai/surfaces/visualizer.ts`

Acceptance criteria:

- prompt strings are composed from named modules
- terminology appendix is injected by builder, not hardcoded ad hoc
- chart insight still validates to `StructuredChartInsight`

### Phase 9: Modernize Visualizer

Tasks:

- add a structured response schema for visualizer
- restrict visualizer to chart-planning tasks
- return:
  - `chartType`
  - `whyThisChart`
  - `xAxis`
  - `yAxis`
  - `grouping`
  - `filters`
  - `signalsToWatch`
  - `caveats`
- reject unsupported open-ended visualizer flows

Primary file targets:

- `src/lib/server/ai/surfaces/visualizer.ts`
- `src/lib/server/__tests__/ai-visualizer.test.ts`

Acceptance criteria:

- visualizer never falls back to vague essay-style output
- all visualizer responses validate against schema

### Phase 10: Add Telemetry And Health Metadata

Tasks:

- log:
  - task family
  - style pack slug
  - selected terminology card slugs
  - appendix size
  - estimated prompt size
- ensure metadata flows into generation events
- add compatibility-safe defaults when terminology is not selected

Primary file targets:

- `src/lib/server/ai/telemetry.ts`
- `src/lib/server/ai-generations.ts`
- `src/lib/server/ai/orchestrator.ts`
- `src/lib/server/ai-chat.ts`

Acceptance criteria:

- generation events contain AI refactor metadata
- missing terminology metadata does not break old rows or UI readers

### Phase 11: Add Tests And Evals

Tasks:

- add unit tests for task-family routing
- add unit tests for terminology loading and selection
- add snapshot tests for terminology compilation
- add chart insight structure tests
- add visualizer structure tests
- add eval fixtures for:
  - fan copilot baseball voice
  - org copilot ABS precision
  - chart insight terminology correctness
  - visualizer plan structure

Primary file targets:

- `src/lib/server/__tests__/ai-task-family.test.ts`
- `src/lib/server/__tests__/ai-terminology.test.ts`
- `src/lib/server/__tests__/ai-visualizer.test.ts`
- `src/lib/server/__tests__/ai-chat.test.ts`
- `tests/ai-evals/terminology-voice.eval.ts`
- `tests/ai-evals/visualizer-structure.eval.ts`

Acceptance criteria:

- all new modules have direct test coverage
- eval fixtures are reproducible and committed

### Phase 12: Add AI Health Checks

Tasks:

- implement prompt assembly health checks
- implement terminology cap check
- implement banned-phrasing check
- implement telemetry completeness check
- implement chart and visualizer schema validation checks
- add a repo command or script that runs all AI health checks together

Primary file targets:

- `scripts/ai-health-checks.mjs`
- `src/lib/server/__tests__/ai-terminology.test.ts`
- `src/lib/server/__tests__/ai-visualizer.test.ts`
- `src/lib/server/__tests__/ai-chat.test.ts`

Acceptance criteria:

- one command runs the AI health suite
- failures clearly identify the broken surface or terminology layer

## Detailed One-Shot Implementation Checklist

An AiBS engineer executing this plan should perform the following exact sequence.

### 1. Create module skeleton

- add `src/lib/server/ai/`
- add subfolders:
  - `surfaces/`
  - `prompts/`
  - `terminology/`
  - `terminology/seeds/`

### 2. Move schema and shared types

- extract request schema from `ai-chat.ts`
- extract shared AI surface and response types as needed
- leave compatibility exports in place until all imports are updated

### 3. Implement task-family types and resolver

- define surface-family unions
- map chart types to chart families
- add message heuristic tables for copilot and visualizer
- write unit tests for at least:
  - generic ABS explanation
  - game summary ask
  - anomaly diagnosis ask
  - zone map chart
  - inventory deployment chart
  - visualizer planning ask

### 4. Import terminology seed pack

- copy JSON seed files into `src/lib/server/ai/terminology/seeds/`
- do not alter wording yet except to fix JSON compatibility if required
- add seed loaders and validators

### 5. Build terminology selector

- implement exact lookup flow:
  - find style pack by `surfaceKey + audienceMode + status=active`
  - find matching surface rule by `surfaceKey + surfaceTaskFamily + audienceMode`
  - load required card slugs
  - rank preferred cards by semantic-tag match then priority
  - dedupe by slug
  - enforce cap

### 6. Build terminology compiler

- compile selected data into a concise prompt appendix
- normalize whitespace
- clip appendix to max configured length
- return appendix string plus metadata

### 7. Build prompt builders

- `base.ts`
  - shared system identity
  - grounding rules
  - “never invent data” rules
- `copilot.ts`
  - answer-first format
  - evidence and implication pattern
- `chart-insight.ts`
  - strict JSON contract
  - chart-grounding instructions
- `visualizer.ts`
  - strict planner schema
  - chart recommendation framing

### 8. Build surface runners

- `copilot.ts`
  - resolve tool results
  - assemble terminology appendix
  - call model
- `chart-insight.ts`
  - preserve existing chart payload grounding
  - attach chart-family terminology appendix
  - validate structured output
- `visualizer.ts`
  - attach planner-specific terminology appendix
  - validate structured planner output

### 9. Refactor orchestrator

- orchestrator must own:
  - transcript loading
  - viewer and permission checks
  - rate limits
  - cache lookup
  - queueing decision
  - persistence and telemetry
- orchestrator must not own surface-specific prompt strings

### 10. Wire compatibility wrapper

- keep `runChat()` exported from `ai-chat.ts`
- have `runChat()` delegate to orchestrator
- keep the route unchanged except for import cleanup if needed

### 11. Update telemetry

- extend generation metadata with:
  - `taskFamily`
  - `terminologyStylePackSlug`
  - `terminologyCardSlugs`
  - `terminologyAppendixChars`
  - `estimatedPromptChars`

### 12. Add tests and evals

- update existing AI tests for the refactor
- add unit and snapshot coverage for terminology
- add visualizer schema tests
- add health-check script

### 13. Update docs if implementation diverges

- if any seed card, family mapping, or file target changes during implementation, update this tracker and the master plan in the same PR

## Final Acceptance Criteria

This implementation is complete only when all of the following are true:

1. `ai-chat.ts` is no longer the only place where AI behavior lives
2. each AI surface has a dedicated runner
3. terminology seeds are in-repo and loaded through a runtime module
4. terminology selection is deterministic and capped
5. chart insight remains schema-valid
6. visualizer becomes schema-valid
7. telemetry records task-family and terminology metadata
8. unit tests and AI health checks pass
9. no DB schema change is required for terminology in this phase
10. docs reflect the actual implemented architecture


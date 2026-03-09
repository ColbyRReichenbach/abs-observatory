<div align="center">

# Technical Overview

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Postgres-Serving%20and%20Product%20Data-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-ETL%20and%20Ingestion-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Live%20AI%20Runtime-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Clerk](https://img.shields.io/badge/Clerk-Identity%20and%20Auth-6C47FF)](https://clerk.com/)
[![Playwright](https://img.shields.io/badge/Playwright-Product%20Validation-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)

</div>

This document describes the AiBS implementation as it exists in the codebase today. It is intended to be auditable against the repository rather than aspirational.

Related documents:

- [README.md](./README.md)
- [security.md](./security.md)
- [product-source-of-truth.md](./product-source-of-truth.md)
- [stack-selection.md](./stack-selection.md)
- [gazette-backend-spec.md](./gazette-backend-spec.md)
- [gap-list.md](./gap-list.md)

## 1. System Summary

AiBS is a Next.js application backed by Postgres, with a Python ETL layer for MLB ABS ingestion and a server-side AI subsystem for bounded baseball analysis.

At a high level, the platform is composed of:

- `Web product`
  - Next.js app router pages
  - server-side data loading
  - authenticated API routes
  - admin surfaces

- `Primary database`
  - Postgres
  - product schemas, analytics read models, editorial workflow state, AI telemetry, moderation state

- `ETL and enrichment`
  - Python ingestion from MLB data sources
  - postgame debrief generation entrypoints
  - standings and enrichment sync jobs

- `AI subsystem`
  - typed-tool chat
  - chart AI and visualization artifacts
  - game debrief generation
  - Gazette authoring step
  - feedback telemetry and classification

- `Worker layer`
  - queued heavy chat
  - feedback classification
  - daily article generation
  - enrichment jobs

## 2. Stack

### Frontend and application runtime

- `Next.js 16.1.6`
- `React 19.2.3`
- `TypeScript 5.9.3`
- `Tailwind CSS 4`
- `Recharts`
- `framer-motion`
- `Radix UI` primitives where needed

Why this stack fits AiBS:

- server-rendered pages and server-side data access are a strong fit for public analytics pages and authenticated product routes
- App Router allows one codebase to serve public pages, admin pages, and API handlers
- the charting and motion stack is sufficient for product-grade analytics UI without adding a second frontend runtime

### Backend and storage

- `Postgres`
- `pg` driver from the Next.js server layer

Why Postgres:

- the app is SQL-first and analytics-heavy
- the data model spans product state, AI telemetry, editorial workflows, and challenge analytics
- advanced SQL and materialized analytics views are a better fit than abstracting everything behind an ORM

### AI and auth

- `OpenAI` Node SDK for current live generation paths
- `Clerk` for auth and identity

Important nuance:

- provider-aware pricing exists for OpenAI and Anthropic models
- current live runtime generation in this codebase is OpenAI-backed
- Gazette author configuration is provider-aware, but Anthropic is not wired as an active runtime client in the application code today

### ETL and testing

- `Python 3` ETL scripts
- `Vitest`
- `Playwright`
- Python `unittest`

## 3. Repository Shape

Primary areas:

- `src/app`
  - app router pages and API routes

- `src/components`
  - product UI, analytics components, AI surfaces, admin components

- `src/lib`
  - data access, page models, rubrics, challenge-value logic, frontend/server shared logic

- `src/lib/server`
  - auth, AI orchestration, editorial workflows, audit, job queue, policy enforcement

- `db/schema.sql`
  - canonical schema and view definitions

- `etl/`
  - ingestion, polling, enrichment, and report generation scripts

- `tests/` and `src/**/*.test.ts[x]`
  - unit, integration, AI eval, and e2e coverage

## 4. Data Model and Schemas

AiBS uses a single Postgres database with several logical domains:

- `core baseball tables`
  - `teams`
  - `games`
  - `officials`
  - `at_bats`
  - `play_events`
  - `pitches`
  - `abs_challenges`
  - `game_state_snapshots`

- `serving summaries`
  - `team_abs_game_summary`
  - `umpire_abs_game_summary`
  - serving views defined in `db/schema.sql`

- `product`
  - `product.users`
  - `product.user_profiles`
  - `product.user_roles`

- `community`
  - threads
  - comments
  - moderation actions

- `editorial`
  - articles
  - article sections
  - evidence blobs
  - revisions
  - generation runs
  - generation steps
  - contributors

- `ai`
  - conversations
  - messages
  - tool calls
  - safety events
  - cost events
  - usage ledger
  - generation events
  - feedback

- `ops`
  - audit log
  - job runs
  - rate limit events
  - webhook deliveries

This matters technically because AiBS does not treat AI or editorial features as sidecar experiments. They are persisted, queryable first-class subsystems.

## 5. Frontend Product Architecture

The product currently exposes these primary surfaces:

- `/`
  - live home feed
  - fan/org mode

- `/game/[gamePk]`
  - pregame, live, and final game hubs

- `/teams`
  - team leaderboard and scatter/table views

- `/teams/[teamId]`
  - team detail analytics

- `/umpires`
  - umpire leaderboard and distributions

- `/umpires/[umpireId]`
  - umpire detail analytics

- `/articles`
  - Gazette and editorial surfaces

- `/about`
  - product/editorial-style about system

- `/admin/*`
  - owner-only operational surfaces

Fan/org mode is a real application concern, not just a UI toggle. The current implementation centralizes mode framing in `src/lib/view-mode-contract.ts` and uses that contract to change:

- hero copy
- section order
- summary emphasis
- module priority

The two modes still share one design system and one route structure.

## 6. Data Access Pattern

AiBS is intentionally SQL-first.

The `src/lib/data.ts` layer and related server modules are the primary read model for:

- live games
- home page moments
- team summaries
- umpire summaries
- game timelines
- chart datasets

The application uses direct SQL via `pg`, wrapped by small helpers in `src/lib/db.ts`:

- `sql`
- `sqlOne`
- `sqlExec`
- `withTransaction`

This keeps analytical reads and workflow writes explicit. It also makes the system easier to audit than a large ORM abstraction would.

## 7. AI Architecture

### 7.1 Interactive AI

The main AI entrypoint is `POST /api/ai/chat`.

Current properties:

- authenticated
- verified-user gated
- CSRF-checked
- refusal-capable before model execution
- typed-tool only
- heavy requests can be queued

The copilot does not execute public NL-to-SQL. The old `/api/query` path is explicitly disabled and returns `410 Gone`.

### 7.2 Typed tool model

The model receives bounded server-side tool outputs from `src/lib/server/ai-tools.ts`.

Current tool families:

- game summary / live status / game challenges
- team summary / team trend
- umpire summary / umpire profile
- live games / home challenge moments

Tool access is scoped by page context and filtered through `getAllowedToolNames()`.

### 7.3 AI telemetry

AiBS records AI generation activity into `ai.generation_events`.

Tracked fields include:

- surface key
- provider
- model name
- token counts
- estimated cost
- latency
- status
- route scope
- target entity

This is what powers the owner admin analytics and review surfaces.

### 7.4 AI feedback

Every major AI surface can emit feedback into `ai.feedback`.

Current system features:

- thumbs up/down
- optional freeform note
- linked generation id when available
- automatic classification
- review queue in `/admin/ai/review`

### 7.5 Game debriefs

Game debrief generation is not a generic “summarize the game” prompt. It is backed by challenge-level evidence packets assembled from stored game context and challenge data.

The runtime path lives in `src/lib/server/game-reports.ts`, and the ETL-side entrypoint remains in `etl/generate_game_report.py`.

### 7.6 Gazette authoring

The daily Gazette pipeline persists generation runs and step-level telemetry.

Current step model:

- `scout_brief`: deterministic
- `telemetry_research`: deterministic
- `author_draft`: model-backed
- `editor_validation`: deterministic
- `persist_article`: deterministic

The step registry is implemented in `src/lib/server/gazette-step-registry.ts`.

## 8. Auth and Identity Model

AiBS uses Clerk as the identity provider when configured.

The app-level identity flow is:

1. resolve Clerk identity
2. sync identity into `product.users`
3. provision/update `product.user_profiles`
4. assign roles in `product.user_roles`
5. enforce verified identity on protected flows

Development fallback headers exist when Clerk is not active locally:

- `x-dev-user-id`
- `x-dev-user-email`
- `x-dev-user-name`
- related dev auth headers

Admin access is not role-only. It is owner-locked through:

- verified user
- `admin` role
- Clerk provider
- `OWNER_CLERK_USER_ID` allowlist match

## 9. Community and Product Writes

The community system is implemented as product infrastructure, not a placeholder.

Current features:

- comment creation and listing
- per-thread discussion
- moderation endpoints
- authenticated write enforcement
- verified identity checks
- comment body validation and anti-link policy

This is important because the product vision is not only analytics consumption. It is analytics plus on-platform conversation tied to the same entities and events.

## 10. Job and Worker System

AiBS includes a persisted job queue backed by `ops.job_runs`.

Current job types:

- `ai_heavy_chat`
- `ai_feedback_classification`
- `article_daily_auto`
- `enrichment_sync_standings`
- `enrichment_sync_savant_weekly`

Processing is exposed through:

- `/api/internal/jobs/process`

That endpoint is guarded by `INTERNAL_WORKER_TOKEN`.

The worker processor currently handles:

- queued AI chat
- AI feedback classification
- Gazette daily article generation
- standings sync
- Savant weekly sync

## 11. ETL and Baseball Data Pipeline

The ETL layer is Python-based and persists real baseball data into Postgres.

Important jobs and scripts include:

- `etl/ingest_mlb_abs.py`
- `etl/poll_active_games.py`
- `etl/poll_local_window.py`
- `etl/sync_standings_snapshots.py`
- `etl/generate_game_report.py`

The ingestion pipeline stores:

- game state
- at-bats
- play events
- pitch-level records
- ABS challenge rows
- postgame reports

This is why the frontend can operate on persisted challenge data instead of purely on transient client-side API calls.

## 12. Testing and Verification

The repository currently supports:

- `npm run build`
- `npm run test`
- `npm run test:e2e`
- `npm run test:ai-evals`
- `npm run etl:test`
- `npm run lint`
- `npm run smoke:release`

That test matrix matters because AiBS is already beyond prototype stage. The app, AI layer, ETL layer, and browser flows are validated separately.

## 13. Why The Architecture Matters

This codebase demonstrates breadth in several areas at once:

- product analytics UI
- SQL-first backend design
- bounded AI orchestration
- editorial workflow persistence
- identity and moderation infrastructure
- admin analytics and observability
- ETL and baseball-domain data modeling

The interesting signal is not any one framework choice. It is that the platform is built as a real product system where analytics, AI, editorial, and community layers all share one coherent backend model.

## 14. Honest Boundaries

These statements are intentionally true but limited:

- AiBS is Postgres-first, not Redis-first or event-bus-first
- live AI generation is OpenAI-backed today
- Anthropic is represented in pricing/config abstractions, not yet as an active runtime client
- the app has production-oriented docs and checks, but not every planned managed dependency is fully wired
- advanced challenge value is still estimated in parts of the product and is not presented as true WPA/CLS

See [gap-list.md](./gap-list.md) for the missing pieces that should be finished before those claims are expanded.

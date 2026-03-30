# Technical Overview

This document describes AiBS as it exists in the repository today.

Use it for:

- current stack and runtime boundaries
- current route and API surface
- current data domains
- current AI, editorial, and worker architecture

Related docs:

- [README.md](../../README.md)
- [product-source-of-truth.md](../product/product-source-of-truth.md)
- [page-route-coverage.md](../product/page-route-coverage.md)
- [security.md](./security.md)
- [gap-list.md](./gap-list.md)
- [stack-selection.md](../architecture/stack-selection.md)

## 1. System Summary

AiBS is a Next.js application backed by Postgres, with Python ETL for MLB ABS ingestion and a bounded server-side AI layer.

The current system has five primary parts:

- `Web product`
  - App Router pages
  - server-rendered analytics pages
  - authenticated profile, community, and admin surfaces

- `Serving and product database`
  - baseball serving data
  - user, profile, moderation, and editorial state
  - AI usage, telemetry, and job metadata

- `ETL and enrichment`
  - ABS ingest
  - live polling
  - standings sync
  - report generation helpers

- `AI subsystem`
  - baseball-scoped chat
  - artifact generation
  - feedback capture
  - editorial generation telemetry

- `Internal job layer`
  - cron entrypoints
  - worker-protected processing route
  - queued AI and editorial work

## 2. Current Stack

Application runtime:

- `Next.js 16.1.6`
- `React 19.2.3`
- `TypeScript 5.9.3`
- `Tailwind CSS 4`

UI and charting:

- `Recharts`
- `framer-motion`
- `Radix UI` primitives

Backend and storage:

- `Postgres`
- `pg`

AI and identity:

- `OpenAI` Node SDK
- `Clerk`

Testing:

- `Vitest`
- `Playwright`
- Python `unittest`

ETL:

- `Python 3`

## 3. Repository Shape

Primary code areas:

- `src/app`
  - pages and API routes

- `src/components`
  - product UI, analytics components, admin UI, and shared controls

- `src/lib`
  - page models, data access, rubrics, challenge context, shared product logic

- `src/lib/server`
  - auth, AI orchestration, community, editorial, jobs, and policy enforcement

- `db/schema.sql`
  - canonical database schema and indexes

- `etl/`
  - ingest, polling, enrichment, and reporting scripts

## 4. Route Surface

Current page families:

- `/`
- `/about`, `/about/[slug]`
- `/articles`, `/articles/[slug]`
- `/game/[gamePk]`
- `/teams`, `/teams/[teamId]`
- `/umpires`, `/umpires/[umpireId]`
- `/reports/[gamePk]`
- `/v/[vizId]`
- `/u/[username]`
- `/login`
- `/profile`
- `/welcome`
- `/dev-auth`
- `/query`
- `/admin`, `/admin/access`, `/admin/ai`, `/admin/ai/review`, `/admin/community`, `/admin/editorial`

Current API groups:

- product-serving routes under `/api/games`, `/api/live`, `/api/teams`, `/api/umpires`, `/api/reports`, `/api/v2`
- AI routes under `/api/ai`
- profile, follow, comment, and public-profile routes
- internal job and cron routes
- Clerk webhook route

The route inventory is maintained in [page-route-coverage.md](../product/page-route-coverage.md).

## 5. Data Domains

AiBS uses a single Postgres database with several logical domains.

Baseball and serving data:

- `teams`
- `games`
- `officials`
- `at_bats`
- `play_events`
- `pitches`
- `abs_challenges`
- `game_state_snapshots`
- team and umpire serving summaries defined in `db/schema.sql`

Product and identity:

- `product.users`
- `product.user_profiles`
- `product.user_roles`

Community:

- community threads, comments, reactions, moderation state

Editorial:

- `editorial.articles`
- `editorial.article_sections`
- `editorial.article_revisions`
- `editorial.article_evidence_blobs`
- `editorial.generation_runs`
- `editorial.generation_steps`
- `editorial.article_contributors`
- `editorial.standings_snapshots`

AI and operations:

- AI conversations, tool calls, usage, feedback, and safety state
- ops audit and job-run tables

## 6. App and Data Loading Pattern

The current product is SQL-first.

Key implementation rules:

- server components and route handlers load data from shared helpers in `src/lib`
- analytics pages are rendered from page-model helpers, not page-local math
- API handlers are thin wrappers over server-side data functions where possible
- the browser is not treated as a trusted data or authorization layer

## 7. Auth, AI, and Worker Boundaries

Identity:

- `Clerk` is the primary auth provider
- auth state is synced into application tables
- owner-admin enforcement is stricter than a generic admin role

AI:

- live runtime is OpenAI-backed
- tool access is bounded and baseball-scoped
- `/api/query` is deprecated and not a public NL-to-SQL workflow

Workers:

- internal processing is protected by `INTERNAL_WORKER_TOKEN`
- cron and internal job routes exist in the web app
- heavy processing is designed to run behind the internal job boundary, not directly from public routes

## 8. Editorial System

The Absolute Observer is a persisted editorial subsystem, not a loose content experiment.

Current persisted editorial state includes:

- article records
- section records
- evidence blobs
- revision history
- generation runs
- generation steps
- contributor metadata
- standings snapshots used by editorial workflows

The current backend reference is [gazette-backend-spec.md](../editorial/gazette-backend-spec.md).

## 9. Environment Truth

Current required server environment variables are enforced in `src/lib/server/env.ts`.

Always required:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Required in production:

- `CLERK_WEBHOOK_SIGNING_SECRET`
- `OPENAI_API_KEY`
- `INTERNAL_WORKER_TOKEN`
- `OWNER_CLERK_USER_ID`

## 10. Documentation Rule

When technical docs mention infrastructure or runtime behavior, they should match one of these sources:

- `src/app`
- `src/lib/server`
- `db/schema.sql`
- `etl/`
- `package.json`
- `src/lib/server/env.ts`

If a claim cannot be traced to code or enforced configuration, it should be documented as deferred rather than current.

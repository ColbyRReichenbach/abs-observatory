<div align="center">

# AiBS

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Postgres-Serving%20and%20Product%20Data-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-ETL-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Live%20AI-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF)](https://clerk.com/)

by **Colby Reichenbach**

</div>

AiBS is a baseball analytics product built around MLB's ABS challenge era.

The core idea is simple: once challenged ball-strike calls become reviewable, they stop being isolated controversies and start becoming a real layer of game strategy. AiBS is built to make that layer visible for both fans and more operational users.

I built the product as someone who has always loved baseball as a game first. The goal was never to build a generic sports dashboard. The goal was to create something that helps people understand what happened, why it mattered, and how challenge behavior changes the way baseball is discussed.

## What The Product Covers

AiBS currently ships four connected product layers:

1. `Game pages`
   - pregame, live, and final game hubs
   - review timelines, strike-zone drilldowns, game-state context, and postgame recap

2. `League, team, and umpire analytics`
   - team leaderboard and team detail pages
   - umpire leaderboard and umpire detail pages
   - fan and org framing over the same underlying facts

3. `AI-assisted interpretation`
   - bounded baseball-only copilot
   - chart-level summaries
   - AI artifact and debrief workflows

4. `Editorial and community`
   - article publishing and daily automated editorial flow
   - comments, moderation, profiles, and public profile pages

## Audience Model

AiBS supports two public viewing modes:

- `fan`
  - story-first framing
  - cleaner narrative emphasis
  - more matchup and review storytelling

- `org`
  - prep and monitoring emphasis
  - denser analytical framing
  - more explicit challenge-management language

The facts do not change across modes. The ordering, emphasis, and supporting language do.

## AI In AiBS

AI is part of the product, but it is not an unbounded chatbot.

The current AI system is built around:

- authenticated use
- bounded server-side tools
- baseball-scoped policy checks
- stored generation, feedback, and review telemetry

Public AI does not get arbitrary database access.

## Live Polling

AiBS now runs live MLB polling on a fixed `5` minute heartbeat with an ET-aware work gate.

The important implementation detail is that the scheduler is simple, but the ingest path is conditional:

- if no relevant ET-window games are scheduled, the poll exits quickly
- if games are scheduled but none are live, the poll exits quickly
- if the last successful ingest is stale, the poll can automatically backfill a bounded ET date window

The hosted serving database is kept intentionally lean:

- structured live state such as `ops.game_linescores` is written for page serving
- heavy raw archive material is separated from the serving footprint
- recent raw snapshot retention is pruned rather than treated as indefinite hosted storage

## Current Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Postgres`
- `Python ETL`
- `OpenAI`
- `Clerk`
- `Vitest`, `Playwright`, and Python `unittest`

## Documentation

Current docs live in [docs/README.md](./docs/README.md).

The main retained docs are:

- [Product Source Of Truth](./docs/product/product-source-of-truth.md)
- [Page Route Coverage](./docs/product/page-route-coverage.md)
- [Technical Overview](./docs/reference/technical.md)
- [Live Polling Runbook](./docs/launch/live-polling-runbook.md)
- [Security Overview](./docs/reference/security.md)
- [Documentation Gap List](./docs/reference/gap-list.md)
- [Model Audit Framework](./docs/models/README.md)

Historical planning material is intentionally kept out of the retained current-reference set and should not be treated as current implementation truth.

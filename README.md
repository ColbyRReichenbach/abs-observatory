<div align="center">

# AiBS

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Postgres-Primary%20Database-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Python](https://img.shields.io/badge/Python-ETL-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4.1--mini-412991?logo=openai&logoColor=white)](https://openai.com/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF)](https://clerk.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)

by **Colby Reichenbach**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-0077B5?style=flat-square&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/colby-reichenbach/)
[![Portfolio](https://img.shields.io/badge/Portfolio-Check%20Out%20My%20Work-4B9CD3?style=flat-square&logo=githubpages&logoColor=white)](https://colbyrreichenbach.github.io/)
[![GitHub](https://img.shields.io/badge/GitHub-Follow-181717?style=flat-square&logo=github&logoColor=white)](https://github.com/ColbyRReichenbach)

</div>

AiBS is an MLB Automated Ball-Strike analytics product built around one idea: if ABS challenges make umpires auditable, they also create a new layer of baseball strategy that deserves its own product.

My name is Colby Reichenbach. I built AiBS as a baseball fan who grew up playing the game from childhood through high school and later found myself drawn just as much to AI systems and product engineering as to sports itself. Baseball was a major part of my life for 13 years, but MLB as a viewing product never fully clicked for me in the way live baseball did. I loved being at games, and I watched a lot of college baseball in person at UNC, but I often missed the day-to-day MLB conversation and relied on social feeds to understand what mattered. ABS changed that for me. The challenge system adds structure, accountability, and strategic tension to parts of the game that were previously hard to audit in a disciplined way.

AiBS started as a fan product for people who want to understand what happened without living inside Twitter, spreadsheets, or broadcast noise. It has since grown into something closer to a shippable analytics platform: live game views, team and umpire profiles, editorial workflows, authenticated community features, and AI-assisted interpretation layered on top of real ABS data. The same system also points toward an operations use case for teams and analysts, where challenge behavior, umpire tendencies, and game context can support preparation and in-game decision-making.

## What AiBS Does Today

AiBS currently ships four product layers:

1. `Game views`
   - Scheduled, live, and final game hubs
   - Challenge explorer, live status, review timelines, and postgame debriefs

2. `League, team, and umpire analytics`
   - Team leaderboard and team detail pages
   - Umpire leaderboard and umpire detail pages
   - Org/fan mode framing over the same source data

3. `AI-assisted interpretation`
   - Contextual copilot
   - Chart-level AI summaries
   - AI visualizer / “visualize your own way” workflow
   - Postgame game debrief generation
   - Unified AI feedback collection and admin review

4. `Editorial and community`
   - Gazette article system
   - Daily auto-generation workflow with persisted generation runs and steps
   - Comments tied to articles and challenge-related discussion surfaces

## Why The Product Exists

ABS creates a layer of baseball discourse that is measurable but still poorly served by existing fan tools. The interesting questions are no longer limited to whether a pitch missed. They now include:

- why a team challenged in a particular moment
- whether a club should have held a challenge for later
- whether certain players appear better or worse at challenge decisions
- whether an umpire’s challenge profile shifts by inning, game state, pitch type, or context
- how challenge behavior differs team to team

AiBS exists to make that layer visible.

For fans, that means a product where the context, charts, recaps, and conversation all live in one place. For operators or analysts, it means a consolidated view of ABS data that can support prep, monitoring, and future strategy work.

## Audience Model

AiBS already supports two public viewing modes:

- `fan`
  - story-first framing
  - cleaner narrative emphasis
  - fewer dense operational signals

- `org`
  - prep- and monitoring-oriented framing
  - more operational metrics
  - decision-support emphasis where the current data supports it

The source facts do not change across modes. The framing, ordering, and emphasis do.

## AI In The Product

AI in AiBS is not one generic chatbot bolted onto the UI. The current product includes:

- `Contextual copilot`
  - authenticated chat over bounded server-side tools

- `Chart AI`
  - chart-specific summaries tied to the surface the user is viewing

- `Visualizer`
  - a guided AI layer for exploring alternate views of the available data

- `Game debriefs`
  - postgame recap generation backed by challenge-level evidence packets

- `AI feedback analytics`
  - thumbs up/down, optional notes, classification buckets, and owner review tooling

The model layer is deliberately constrained. Public AI does not get arbitrary SQL access.

## Stack

Primary runtime and data stack:

- `Next.js 16` + React 19 + TypeScript
- `Postgres` as the primary application and serving database
- `Python ETL` for MLB data ingestion and enrichment
- `OpenAI` for current live model-backed features
- `Clerk` for auth and verified identity
- `Vitest` + `Playwright` + Python `unittest` for validation

More detail: [technical.md](./technical.md)

## Security Posture

AiBS is built with explicit boundaries between user input, model access, and data access:

- verified identity required for protected writes and AI use
- CSRF enforcement on write routes
- typed-tool AI access instead of arbitrary NL-to-SQL
- webhook verification for Clerk sync
- owner-only admin access via Clerk user allowlist
- worker-token protection for internal job processing
- log redaction for sensitive metadata

More detail: [security.md](./security.md)

## Local Setup

1. Create a Postgres database.
2. Configure env vars in `.env` or `.env.local`.

Minimum local env:

- `DATABASE_URL`
- `DATABASE_SSL=false`

Optional but recommended:

- `OPENAI_API_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `INTERNAL_WORKER_TOKEN`
- `OWNER_CLERK_USER_ID`

Apply schema and verify:

```bash
npm run db:schema
npm run db:smoke
```

Start the app:

```bash
npm run dev
```

## Data Load

Install ETL dependencies:

```bash
pip3 install -r etl/requirements.txt
```

Load a window:

```bash
python3 etl/ingest_mlb_abs.py --start-date 2026-03-01 --end-date 2026-03-08 --game-type S,R
```

Other useful ETL commands:

```bash
python3 etl/poll_active_games.py
npm run etl:poll:local
python3 etl/sync_standings_snapshots.py
python3 etl/generate_game_report.py --game-pk 831638 --force
```

## Validation

Core validation commands:

```bash
npm run build
npm run test
npm run test:e2e
npm run test:ai-evals
npm run etl:test
npm run lint
```

Release smoke:

```bash
npm run smoke:release
```

## Documentation Map

- Product truth: [product-source-of-truth.md](./product-source-of-truth.md)
- Stack decisions: [stack-selection.md](./stack-selection.md)
- Technical implementation: [technical.md](./technical.md)
- Security controls: [security.md](./security.md)
- Documentation and product gaps: [gap-list.md](./gap-list.md)
- Gazette backend: [gazette-backend-spec.md](./gazette-backend-spec.md)
- AI backend: [ai-backend-plan.md](./ai-backend-plan.md)
- Launch and provider setup: [docs/launch/provider-setup-checklist.md](./docs/launch/provider-setup-checklist.md)
- Private alpha checklist: [docs/launch/private-alpha-checklist.md](./docs/launch/private-alpha-checklist.md)
- Alpha success scorecard: [docs/launch/alpha-success-scorecard.md](./docs/launch/alpha-success-scorecard.md)

## Current Boundaries

What AiBS does not claim today:

- true WPA / CLS modeling for ABS challenge value
- unrestricted natural-language SQL access in the public product
- completed production infrastructure for every planned managed dependency
- finished matchup backdrop asset rollout
- fully separate fan and org products beyond the current shared-design, different-framing model

Those gaps are tracked explicitly in [gap-list.md](./gap-list.md).

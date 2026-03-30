# Hosting Decision Matrix

## Goal

Pick a stack for AiBS that is realistic for a solo developer, fast enough to launch, and operationally sane once real traffic and real data jobs exist.

This document is intentionally practical. It is not a survey of every cloud service.

## Product Reality

AiBS is:

- a public web product
- an analytics-heavy Next.js app
- backed by relational baseball data
- lightly AI-enabled in the public product
- dependent on scheduled and background data jobs
- not primarily a realtime collaboration product

That matters because the correct stack is not just "where can I host a website?"

The correct stack has to support:

- fast page delivery
- reliable relational storage
- deploy previews
- auth and secrets management
- background ETL and model-audit jobs
- enough flexibility to evolve without a rewrite

## Selection Criteria

For AiBS, the right stack should optimize for:

1. `Launch velocity`
   - can the site ship quickly without infra becoming the main project?

2. `Low operator burden`
   - can one person run it without spending most of the week on infrastructure?

3. `Relational data fit`
   - does it work well with SQL-first analytics and product data?

4. `Operational safety`
   - backups, env management, deploys, rollback, provider stability

5. `Clear separation of concerns`
   - web traffic should not be harmed by ETL and long-running jobs

6. `Upgrade path`
   - can the stack grow without forcing a near-term rewrite?

## Ranked Recommendation

### 1. Recommended now

- `Vercel` for the web app
- `Neon` for production Postgres
- `Clerk` for auth
- `OpenAI` for AI
- `Separate worker runtime` for ETL, audits, and long-running jobs

This is the best fit for AiBS right now.

Why:

- strongest launch velocity
- lowest ops burden for a solo dev
- clean fit for a Next.js public product
- managed Postgres without overcommitting to a whole backend platform
- keeps heavy jobs out of the request path

### 2. Strong alternative

- `Vercel` for the web app
- `Supabase` for Postgres and optional platform features
- `Clerk` retained or gradually replaced later
- separate worker runtime for heavy jobs

Why someone would choose this instead:

- wants fewer vendors
- wants storage/realtime/edge primitives bundled
- wants a more all-in-one platform

Why it is second, not first, for AiBS:

- AiBS already has Clerk and a fairly custom app/data model
- Supabase adds more platform than this product strictly needs today

### 3. More infra-heavy but solid

- `Vercel` for web
- `RDS` or `Cloud SQL` for Postgres
- separate worker runtime

Why choose it:

- more conventional infrastructure posture
- stronger long-term enterprise familiarity
- good if you expect deeper cloud integration soon

Why it is not the best early-stage choice:

- more setup
- more networking/config complexity
- less solo-dev-friendly at launch

### 4. Not recommended right now

- self-hosted app
- self-managed Postgres
- self-managed workers

Why not:

- too much operational surface for current product stage
- increases launch risk
- burns time on infrastructure instead of product quality

## Breakdown By Layer

### Web Hosting

#### Best current option: `Vercel`

Why:

- first-class Next.js deployment flow
- preview deploys from Git
- simple env management
- easy rollbacks
- low operational friction

Good for:

- public pages
- article pages
- authenticated product routes
- lightweight APIs
- public AI surfaces

Bad for:

- long-running ETL
- large backfills
- worker-style job processing

Decision:

- use Vercel for the app
- do not force all automation into Vercel functions

### Database

#### Best current option: `Neon`

Why:

- managed Postgres
- good developer ergonomics
- clean fit for serverless/web deploys
- strong early-stage product velocity

Why not just run Postgres yourself:

- backups become your problem
- restore drills become your problem
- patching and version upgrades become your problem
- availability and connection posture become your problem

For a solo developer, that trade is usually bad unless the product has very specific infra needs.

#### Why people use Neon or Supabase instead of "their own Postgres"

Mostly because of:

- lower ops burden
- faster setup
- secure defaults
- managed backups
- dashboards and connection management
- easy hosted access for web apps
- preview/staging friendliness

It is usually not just about storage price.

The expensive thing for a solo developer is time and reliability risk.

### Auth

#### Best current option: `Clerk`

Why:

- already integrated
- strong UX
- lower auth risk than rolling your own
- good enough for current product stage

No reason to replace it right now.

### AI Provider

#### Best current option: `OpenAI`

Why:

- already integrated
- product already uses it in bounded ways
- changing providers now creates unnecessary launch risk

### Workers / Background Jobs

#### Best current option: `separate worker runtime`

Good candidates:

- Railway
- Render
- Fly.io
- GitHub Actions for scheduled jobs
- a small VM/container

What belongs there:

- MLB ingest windows
- player profile sync
- full audit suites
- large recomputes
- long-running editorial generation

Reason:

- request-serving infrastructure and batch-processing infrastructure should not be the same thing here

## What Actually Changes When A Local App Becomes A Product

### Local app phase

Questions:

- does it run on one machine?
- does the DB exist?
- can I inspect the data and debug directly?

### Productization phase

Questions become:

- can it deploy repeatedly?
- are secrets managed safely?
- can I restore data?
- does production match staging?
- can I ship without SSH-ing into boxes?
- will a failure page users out or just delay a job?

This is why the stack changes from "whatever works locally" to managed services plus explicit boundaries.

## Why We Separate Web And Jobs

Because they have different failure modes.

The web app needs:

- fast responses
- predictable memory/runtime use
- low-latency DB access
- safe scaling under concurrent traffic

Jobs need:

- long runtimes
- retries
- schedule control
- tolerance for partial failure
- heavy database and compute usage

If you make the same runtime do both, you usually get the worst of both worlds.

## Practical Recommendation For AiBS

### Use now

- `Vercel` for the web app
- `Neon` for production database
- `Clerk` for auth
- `OpenAI` for AI
- keep `local Postgres` for development
- run heavy jobs in a separate worker environment

### Use Vercel for

- the public site
- article routes
- team/umpire/game pages
- auth routes
- lightweight API routes
- lightweight cron triggers

### Do not use Vercel for

- heavy ETL windows
- backfills
- full model-audit runs
- anything that might become a long, stateful batch process

## Decision Table

| Option | Speed To Launch | Ops Burden | Fit For AiBS | Long-Term Flexibility | Recommendation |
|---|---:|---:|---:|---:|---|
| Vercel + Neon + worker | High | Low | High | High | Best now |
| Vercel + Supabase + worker | High | Low-Medium | Medium-High | High | Good alternative |
| Vercel + RDS/Cloud SQL + worker | Medium | Medium | High | High | Good later-stage option |
| Self-host app + own Postgres | Low | High | Medium | High | Not recommended now |

## When To Revisit The Stack

Revisit if:

- database cost or connection behavior becomes a real constraint
- analytics workload starts harming transactional performance
- you need stronger enterprise networking/compliance posture
- background jobs become complex enough to justify a more formal queue/worker system
- one provider becomes the main source of incidents or friction

## Final Recommendation

If I were making the call for AiBS right now, I would ship on:

- `Vercel`
- `Neon`
- `Clerk`
- `OpenAI`
- `separate worker runtime`

That is the best balance of:

- solo-dev realism
- launch speed
- product quality
- operational sanity

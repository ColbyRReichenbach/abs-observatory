# AiBS Stack Selection

This document captures the recommended platform/tool choices for AiBS, why they were chosen, what is deferred, and what should trigger a revisit.

The goal is not to optimize for theoretical scale on day one.

The goal is:
- low enough cost to build now
- strong enough primitives for production launch
- clear upgrade path for multi-user and future multi-org scale
- no major rewrite when adding data sources, AI workloads, moderation, or analytics marts

---

## Adoption Checklist

Canonical sprint tracking lives in [roadmap.md](../product/roadmap.md).
Canonical sprint verification lives in [sprint-test-plan.md](../product/sprint-test-plan.md).

Use this checklist to confirm we are implementing against the chosen stack instead of drifting:
- [x] Web/BFF remains Next.js-based. `[Stack: Next.js, Vercel]`
- [x] Auth and verified identity flows are implemented through Clerk. `[Stack: Clerk]`
- [x] Product and serving data remain Postgres-first. `[Stack: Postgres]`
- [ ] Cache, quota, and rate-limit layer is implemented with Redis when scale work starts. `[Stack: Upstash Redis]`
- [x] Heavy ETL, enrichment, and AI backlog work moves into worker/jobs, not the web tier. `[Stack: Cloud Run Jobs]`
- [ ] Raw snapshots and evidence blobs move into object storage instead of bloating Postgres. `[Stack: Cloudflare R2]`
- [x] Transformations and marts follow dbt-compatible structure. `[Stack: dbt Core, Postgres]`
- [ ] Observability instrumentation follows OpenTelemetry-compatible patterns. `[Stack: OpenTelemetry]`

---

## 1) Recommended Stack

### Web app / BFF
- **Next.js**
- deploy on **Vercel**

Use for:
- frontend
- authenticated server-side API layer
- public read endpoints
- admin/moderation UI later

Why:
- already the current app framework
- good developer velocity
- strong fit for SEO/public pages + authenticated product
- easy to pair with managed services elsewhere

Rules:
- browser does not talk directly to DB for protected data
- AI does not talk directly to DB
- protected access goes through server-side service layer

---

## 2) Auth and Identity

### Chosen
- **Clerk**

Use for:
- auth
- verified user sessions
- future organization support
- admin/mod role-aware identity context

Why:
- strong auth UX
- supports org model later
- better fit than custom auth
- clean path for public users now, org/workspace features later

Decision:
- public users first
- orgs later
- keep auth provider-managed identity as source of truth for login/session
- sync app-specific user/profile/role state into Postgres

Rules:
- verified identity required for writes
- one account per verified identity/provider record
- Google and X/Twitter OAuth are acceptable
- verified email fallback remains useful for accessibility/recovery

Revisit when:
- B2B SSO becomes a requirement
- enterprise org admin needs exceed Clerk’s org model

---

## 3) Primary Database

### Chosen
- **Postgres**

Use for:
- transactional product data
- users, profiles, roles
- comments, moderation state
- articles
- AI conversations and logs
- current analytical marts

Why:
- existing app already uses Postgres
- strong fit for relational product + moderate analytics
- supports structured schemas and clear domain boundaries
- supports future RLS if defense-in-depth is needed

Rules:
- app-layer authorization remains primary
- RLS may be added later for high-risk/private data, but should not replace service-layer checks
- keep the number of primary databases to one for as long as possible

Revisit when:
- analytical workloads materially harm primary app performance
- large event/log datasets dominate the DB

---

## 4) Managed Postgres Choice

### Preferred early-stage option
- **Neon**

Why:
- lower-cost early managed Postgres
- useful branch workflows
- strong developer/staging ergonomics
- good fit while schema is still evolving quickly

Useful capabilities:
- branch creation
- isolated preview environments
- anonymized branches

### Alternative
- **Cloud SQL** or **RDS**

Why:
- more conventional managed DB ops
- stronger fit if infra standardizes deeply on one cloud early

Recommendation:
- start with **Neon**
- revisit Cloud SQL/RDS only if ops/networking/compliance needs make it preferable

Rules:
- use managed Postgres in staging/prod from the first real launch
- local Postgres is for development only

Revisit when:
- workload becomes steady enough that conventional long-lived DB infra is clearly preferable

---

## 5) Pooling / Connection Management

### Chosen direction
- stay SQL-first
- use provider-compatible pooling / PgBouncer-style setup when needed

Why:
- current app is analytics-heavy and SQL-first
- adding an ORM primarily for pooling is not worth it

Not chosen:
- Prisma as the main data layer

Reason:
- adds abstraction without helping much on the analytical side
- can make advanced SQL/marts less ergonomic

Rule:
- avoid app-local-only pooling assumptions for scaled serverless deployments

Revisit when:
- deployment traffic begins stressing connection counts

---

## 6) Cache and Rate Limiting

### Chosen
- **Upstash Redis**

Use for:
- API caching
- hot live-game endpoint caching
- rate limiting
- AI quota enforcement
- request dedupe/circuit-breaker state later

Why:
- strong fit for Next/serverless-ish environments
- simple to operate
- useful for both cache and abuse control
- pay-as-you-go budget controls are attractive early

Rules:
- public data may be cached
- user-specific/moderator/admin/private AI responses must not be cached in shared caches
- cache keys must vary by auth/privacy context when needed

Revisit when:
- cache workload outgrows Upstash economics/performance

---

## 7) Workers / Background Jobs

### Chosen
- **Cloud Run Jobs**
- plus one worker service later if interactive backlogs require it

Use for:
- MLB StatsAPI ingest jobs
- Savant enrichment jobs
- backfills
- article generation
- dbt runs
- moderation rescans
- AI backlog processing later

Why:
- these workloads should not run in the Vercel web tier
- clean separation from request handling
- good scheduled/batch story

Rules:
- web request path remains separate from heavy jobs
- AI, ETL, and article generation should not block public reads

Revisit when:
- true queue consumers or near-real-time job orchestration need a dedicated long-running worker layer

---

## 8) Object Storage

### Chosen
- **Cloudflare R2**

Use for:
- raw source snapshots
- archived JSON
- Parquet exports
- evidence blobs
- backfill artifacts

Why:
- low-cost raw data layer
- avoids stuffing all raw payloads into Postgres
- useful bronze-layer store

Rules:
- raw source payloads should be durable and replayable
- serving DB should store normalized facts, not every raw source blob forever

Revisit when:
- compliance, throughput, or ecosystem reasons favor cloud-native object storage elsewhere

---

## 9) Transformation Layer

### Chosen
- **dbt Core**

Use for:
- marts
- rollups
- historical split tables
- AI-facing analytical models
- challenge value input tables

Why:
- this project needs curated marts and transformation discipline
- transformation logic belongs in versioned code, not scattered SQL files and app code

Rules:
- use dbt Core first
- keep models in repo
- run via jobs/CI

Not chosen now:
- dbt Cloud

Reason:
- not necessary yet

Revisit when:
- team/process scale makes hosted orchestration/documentation worth paying for

---

## 10) Data Orchestration

### Chosen
- **Dagster**

Use for:
- source sync orchestration
- dbt dependencies
- article generation workflows
- enrichment and backfill dependencies
- operational visibility into data assets

Why:
- multiple sources and derived assets make orchestration worth formalizing
- better long-term than cron + scripts everywhere

Rules:
- source ingestion, transformation, and publish workflows should be asset-aware
- maintain dependency visibility between raw sources, marts, and generated content

Revisit when:
- orchestration remains simple enough that this becomes overkill
- or if team already standardizes elsewhere

---

## 11) Local Analytical Utility

### Chosen
- **DuckDB**

Use for:
- local backfills
- file-based QA
- Parquet exploration
- one-off analytics during development

Why:
- excellent local analytical engine
- useful without making serving stack more complex

Rule:
- DuckDB is not the primary production serving database

Revisit when:
- local workflows don’t benefit enough to justify maintaining it

---

## 12) Observability

### Chosen direction
- **OpenTelemetry first**

Use for:
- traces
- metrics
- logs plumbing

Why:
- vendor-neutral instrumentation
- prevents early lock-in

Track:
- request latency
- DB latency
- AI latency and cost
- worker failures
- ingest lag
- cache hit rate
- moderation actions
- queue age

Revisit when:
- a specific vendor stack is chosen for aggregation/alerting

---

## 13) Search

### Chosen now
- **Postgres full-text search**

Use for:
- article discovery
- internal admin/moderation lookup
- simple product search

Why:
- simplest viable first step
- avoids unnecessary extra infrastructure

Not chosen now:
- Elasticsearch / OpenSearch
- dedicated vector DB

Reason:
- premature for current scale and needs

Revisit when:
- search relevance or scale clearly outgrows Postgres FTS

---

## 14) AI Architecture

### Chosen
- typed tools over curated marts

Use for:
- live game answers
- historical analytical answers
- article/evidence retrieval

Why:
- safer than public NL-to-SQL
- easier to bound cost and query scope
- easier to defend against prompt injection and unbounded scans

Rules:
- no direct DB credentials exposed to model
- no public arbitrary NL-to-SQL as final production path
- every tool has bounded input/output
- every tool has default timeframe / row limit
- model gets only approved tools, marts, and time windows

Revisit when:
- retrieval needs become significantly more semantic/document-heavy

---

## 15) What We Are Not Adding Yet

Not chosen for now:
- Prisma as main data layer
- Supabase as all-in-one platform
- Kafka
- Spark
- Airflow
- BigQuery as primary warehouse
- ClickHouse as immediate analytics store
- vector DB
- feature store

Why:
- too much complexity for current stage
- weak immediate ROI
- not required to launch safely and evolve cleanly

---

## 16) Cloud Strategy

### Decision
- **local for development**
- **managed cloud for staging and production**

Why:
- auth, webhooks, workers, caching, backups, and observability all behave more realistically in cloud
- moving from fully-local assumptions to cloud after launch creates avoidable pain

Local dev stack:
- local Postgres
- local Redis if needed
- local DuckDB
- local file storage / temporary snapshots

Staging / prod stack:
- Vercel
- Clerk
- managed Postgres
- Upstash Redis
- Cloud Run jobs/workers
- R2

Rule:
- do not plan for self-hosted/local-only production

---

## 17) When To Add A Warehouse

### Not now
Use:
- Postgres + dbt marts first

### Revisit later if:
- AI/history workloads are hurting app DB performance
- event/log volumes grow dramatically
- retention/query economics become poor in Postgres
- business analytics needs expand substantially

Likely later options:
- **ClickHouse** for event analytics / telemetry / heavy aggregates
- **BigQuery** if broader GCP warehouse workflows become central

Opinion:
- ClickHouse is more likely the better later fit for this product shape than BigQuery
- neither belongs in the initial stack

---

## 18) Reliability and Safety Rules

Must preserve easy future implementation of:
- Redis cache
- queue-based AI
- queue prioritization
- live endpoint request coalescing
- DB partitioning
- idempotent jobs and writes
- incident kill switches
- private cache boundaries
- environment separation

Rules:
- no product path should depend on one provider feature that cannot be swapped later
- add new data sources via:
  - raw snapshot storage
  - normalization into Postgres
  - dbt marts
  - Dagster orchestration
  - typed service/tool exposure
  - Redis caching where appropriate

That is the scaling pattern.

---

## 19) Final Opinionated Choice

If building AiBS now, choose:

- **Frontend / API**: Next.js on Vercel
- **Auth**: Clerk
- **Primary DB**: Neon Postgres
- **Cache / rate limiting**: Upstash Redis
- **Workers / jobs**: Cloud Run Jobs + later worker service
- **Raw data storage**: Cloudflare R2
- **Transforms / marts**: dbt Core
- **Orchestration**: Dagster
- **Local analytical utility**: DuckDB
- **Observability**: OpenTelemetry
- **Search**: Postgres full-text search
- **AI data access**: typed tools over marts

This is the best balance of:
- launch cost
- production readiness
- future multi-user / multi-org growth
- data-engineering flexibility
- AI safety
- low rewrite risk

---

## 20) Revisit Triggers

Revisit auth choice when:
- enterprise SSO requirements exceed current needs

Revisit DB choice when:
- provider-specific constraints outweigh early-stage speed/cost

Revisit analytics store when:
- Postgres no longer handles marts + app traffic comfortably

Revisit search when:
- FTS quality/scale becomes a real bottleneck

Revisit orchestration when:
- Dagster is clearly underused or overcomplicated for actual workflows

Revisit monetization tooling when:
- feature entitlements and measured AI costs justify active billing

---

## Sources

- Clerk Organizations:
  - https://clerk.com/docs/guides/organizations/overview
- PostgreSQL Row Level Security:
  - https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Upstash rate limiting:
  - https://upstash.com/docs/redis/overall/ratelimit
- Upstash pricing:
  - https://upstash.com/docs/redis/overall/pricing
- Cloud Run Jobs:
  - https://docs.cloud.google.com/run/docs/create-jobs
- Cloudflare R2 pricing:
  - https://developers.cloudflare.com/r2/pricing/
- dbt docs:
  - https://docs.getdbt.com/
- Dagster docs:
  - https://docs.dagster.io/
- DuckDB:
  - https://duckdb.org/
- OpenTelemetry:
  - https://opentelemetry.io/docs/
- Neon branch APIs:
  - https://api-docs.neon.tech/reference/createprojectbranch
  - https://api-docs.neon.tech/reference/createprojectbranchanonymized

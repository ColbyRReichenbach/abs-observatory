# AiBS Delivery Roadmap

This file is the canonical execution tracker for backend, data, editorial, AI, and ship-readiness work.

Primary references:
- [product-source-of-truth.md](./product-source-of-truth.md)
- [plan.md](../archive/2026-03/backend-scale-security-plan.md)
- [stack-selection.md](../architecture/stack-selection.md)
- [ai-backend-plan.md](../architecture/ai-backend-plan.md)
- [ai-implementation-sequence.md](../architecture/ai-implementation-sequence.md)
- [sprint-test-plan.md](./sprint-test-plan.md)

Important note:
- there is no `system-stack.md` in this repo
- the enforced stack source of truth is [stack-selection.md](../architecture/stack-selection.md)
- every sprint item below references the selected tools from that document
- sprint verification requirements live in [sprint-test-plan.md](./sprint-test-plan.md)

---

## Operating Rule

For every feature we build:
- [ ] Write tests first or in the same change.
- [ ] Implement the feature.
- [ ] Run the relevant test suite.
- [ ] If tests fail, fix code and rerun until green.
- [ ] Update docs and env keys if behavior or configuration changed.

A feature is not done until all of the following are green:
- [ ] `npm run build`
- [ ] relevant unit tests
- [ ] relevant integration tests
- [ ] relevant ETL/data tests
- [ ] relevant e2e tests
- [ ] relevant AI evals for AI-facing changes

---

## Accounts And Services

### Needed now
- [ ] OpenAI account and API key ready for local AI backend work. `[Stack: OpenAI]`
- [ ] Clerk account and app created for verified auth flows. `[Stack: Clerk, Next.js]`
- [x] Local Postgres configured and schema-applicable. `[Stack: Postgres]`

### Needed before shipping
- [ ] Neon project created for managed staging/prod Postgres. `[Stack: Neon, Postgres]`
- [ ] Upstash Redis provisioned for rate limits, quotas, and cache. `[Stack: Upstash Redis]`
- [ ] Cloudflare R2 bucket created for raw snapshots and evidence blobs. `[Stack: Cloudflare R2]`
- [ ] GCP project and Cloud Run runtime prepared for jobs/workers. `[Stack: Cloud Run Jobs]`
- [ ] Vercel project prepared for production deployment. `[Stack: Vercel, Next.js]`

### Optional later
- [ ] Billing provider selected and integrated behind feature flags. `[Stack: Billing provider, Postgres]`
- [ ] Observability sink selected on top of OpenTelemetry. `[Stack: OpenTelemetry]`

---

## Environment Keys

### Core local development
- [x] `DATABASE_URL` documented and set locally. `[Stack: Postgres]`
- [x] `DATABASE_SSL` documented and set locally. `[Stack: Postgres]`
- [ ] `OPENAI_API_KEY` documented and set locally. `[Stack: OpenAI]`
- [ ] `OPENAI_QUERY_MODEL` documented and set locally. `[Stack: OpenAI]`
- [ ] `OPENAI_SUMMARY_MODEL` documented and set locally. `[Stack: OpenAI]`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` documented and set locally. `[Stack: Clerk]`
- [ ] `CLERK_SECRET_KEY` documented and set locally. `[Stack: Clerk]`
- [ ] `CLERK_WEBHOOK_SIGNING_SECRET` documented and set locally. `[Stack: Clerk]`

### Scale and ship keys
- [ ] `UPSTASH_REDIS_REST_URL` documented before Redis work starts. `[Stack: Upstash Redis]`
- [ ] `UPSTASH_REDIS_REST_TOKEN` documented before Redis work starts. `[Stack: Upstash Redis]`
- [ ] `R2_ACCOUNT_ID` documented before raw snapshot storage work starts. `[Stack: Cloudflare R2]`
- [ ] `R2_ACCESS_KEY_ID` documented before raw snapshot storage work starts. `[Stack: Cloudflare R2]`
- [ ] `R2_SECRET_ACCESS_KEY` documented before raw snapshot storage work starts. `[Stack: Cloudflare R2]`
- [ ] `R2_BUCKET` documented before raw snapshot storage work starts. `[Stack: Cloudflare R2]`
- [ ] `R2_PUBLIC_BASE_URL` documented before public asset/evidence linking starts. `[Stack: Cloudflare R2]`
- [ ] `GOOGLE_CLOUD_PROJECT` documented before worker deployment starts. `[Stack: Cloud Run Jobs]`
- [ ] `GOOGLE_CLOUD_REGION` documented before worker deployment starts. `[Stack: Cloud Run Jobs]`
- [ ] `CLOUD_RUN_WORKER_URL` documented before web-to-worker integrations start. `[Stack: Cloud Run Jobs, Next.js]`
- [ ] `BILLING_PROVIDER_SECRET` documented before entitlements work starts. `[Stack: Billing provider]`
- [ ] `BILLING_WEBHOOK_SECRET` documented before entitlements work starts. `[Stack: Billing provider]`
- [x] `AI_GLOBAL_KILL_SWITCH` documented before ship. `[Stack: OpenAI, Next.js]`
- [x] `COMMENTS_GLOBAL_KILL_SWITCH` documented before ship. `[Stack: Next.js, Postgres]`
- [x] `ARTICLE_AUTOPUBLISH_FREEZE` documented before ship. `[Stack: Next.js, Postgres]`
- [x] `AI_DAILY_BUDGET_USD` documented before ship. `[Stack: OpenAI, Postgres]`
- [x] `AI_MONTHLY_BUDGET_USD` documented before ship. `[Stack: OpenAI, Postgres]`
- [x] `AI_MODEL_MONTHLY_BUDGETS_JSON` documented before ship. `[Stack: OpenAI, Postgres]`

---

## Sprint 0: Baseline, Tooling, And Test Harness

Goal:
- establish a clean development baseline and enforce the testing rule before new feature work continues

Dependencies:
- none

Build checklist:
- [x] Fix the current failing baseline tests and record the known-good starting point. `[Stack: Next.js, Vitest/Playwright, Postgres]`
- [x] Verify local schema apply flow against the expanded schema. `[Stack: Postgres]`
- [x] Standardize `.env`, `.env.example`, and `.env.local` expectations. `[Stack: Next.js, Clerk, OpenAI, Postgres]`
- [x] Keep `.gitignore` complete for secrets, logs, local data, and test artifacts. `[Stack: Git, Next.js, Python]`
- [x] Create testing conventions for unit, integration, ETL, e2e, AI eval, and performance suites. `[Stack: Vitest/Playwright, Python ETL, OpenAI]`
- [x] Add CI/local command checklist to README if anything is missing. `[Stack: Next.js, Python, Postgres]`

Test checklist:
- [x] `npm run build` passes. `[Stack: Next.js]`
- [x] `npm run test` baseline is green or clearly segmented into passing suites. `[Stack: Vitest]`
- [x] ETL parsing smoke tests exist and pass locally. `[Stack: Python ETL]`

Exit criteria:
- [x] No new feature work starts without a reliable local test baseline. `[Stack: Next.js, Postgres]`

Sprint 0 green commands:
- [x] `npm run db:schema`
- [x] `npm run db:smoke`
- [x] `npm run etl:test`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`

Sprint 0 intentionally deferred harnesses:
- [x] AI eval runner deferred to Sprint 2. `[Stack: OpenAI]`
- [x] auth/DB route integration helpers will be added during Sprint 1 as route coverage lands. `[Stack: Vitest, Next.js, Postgres]`
- [x] load/performance harness deferred to pre-ship scale work in Sprint 5. `[Stack: Upstash Redis, Cloud Run Jobs]`

---

## Sprint 1: Identity, Profiles, Comments, And Moderation Baseline

Goal:
- make authenticated user interaction safe and deterministic

Dependencies:
- sprint 0

Build checklist:
- [x] Wire real Clerk auth into the app shell and protected routes. `[Stack: Clerk, Next.js]`
- [x] Require verified identity for every write action. `[Stack: Clerk, Next.js, Postgres]`
- [x] Implement user/profile sync from Clerk into product tables. `[Stack: Clerk, Postgres]`
- [x] Enforce username normalization, reserved-name blocking, and profanity/obfuscation checks. `[Stack: Next.js, Postgres]`
- [x] Restrict avatars to approved presets and team-logo-only options. `[Stack: Next.js, Postgres]`
- [x] Add explicit server-side role enforcement for `user`, `moderator`, and `admin`. `[Stack: Next.js, Postgres, Clerk]`
- [x] Make all comment/reaction/interactions authenticated only. `[Stack: Next.js, Postgres]`
- [x] Enforce plain-text-only comments with URL blocking. `[Stack: Next.js, Postgres]`
- [x] Add moderation states, deleted-comment placeholders, and admin audit logs. `[Stack: Postgres, Next.js]`
- [x] Add per-user and per-thread comment rate limits in app logic now, with Redis seam preserved for later. `[Stack: Next.js, Postgres, Upstash Redis seam]`

Test checklist:
- [x] Unit tests for username normalization and reserved-name validation. `[Stack: Vitest]`
- [x] Unit tests for comment URL blocking and plain-text validation. `[Stack: Vitest]`
- [x] Integration tests for auth-required write routes and profile sync behavior. `[Stack: Vitest, Next.js, Clerk]`
- [x] Integration tests for moderation state transitions and deleted-comment rendering behavior. `[Stack: Vitest, Next.js, Postgres]`
- [x] E2E tests for sign-in, profile creation, and authenticated commenting. `[Stack: Playwright, Clerk]`

Exit criteria:
- [x] No unauthenticated user can write or interact. `[Stack: Clerk, Next.js]`
- [x] Profiles and comments are server-enforced, auditable, and test-covered. `[Stack: Postgres, Next.js]`

Sprint 1 green commands:
- [x] `npm run db:schema`
- [x] `npm run db:smoke`
- [x] `npm run test`
- [x] `npm run test:e2e`
- [x] `npm run lint`
- [x] `npm run build`

Sprint 1 notes:
- [x] Request-level e2e currently uses the documented dev-auth headers until Clerk UI flows are added. `[Stack: Playwright, Clerk seam]`
- [x] Viewer profile writes are limited to `/api/profile`; there is no arbitrary profile-target write endpoint to abuse. `[Stack: Next.js, Postgres]`
- [x] Role enforcement helper exists and is tested; admin/moderator UI surfaces will start consuming it in later sprints. `[Stack: Next.js, Postgres]`

---

## Sprint 2: AI Route Hardening And Typed Tool Platform

Goal:
- replace risky AI paths with a production-safe, typed-tool backend

Dependencies:
- sprint 0
- sprint 1 for authenticated usage

Build checklist:
- [x] Make `/api/ai/chat` the primary AI path and deprecate public NL-to-SQL usage in production flows. `[Stack: Next.js, OpenAI, Postgres]`
- [x] Add strict request validation, prompt length caps, and token-estimate caps before any model call. `[Stack: Next.js, OpenAI]`
- [x] Add baseball-scope classification and misuse/prompt-injection classification before model execution. `[Stack: Next.js, OpenAI]`
- [x] Implement route-specific allowed-tool registries. `[Stack: Next.js, Postgres, OpenAI]`
- [x] Restrict AI to typed tools only and keep raw DB access out of the model path. `[Stack: Next.js, Postgres, OpenAI]`
- [x] Add bounded tool rules: timeframe caps, row caps, payload caps, and schema enforcement. `[Stack: Next.js, Postgres, OpenAI]`
- [x] Add AI strike storage, suspension states, and admin review hooks. `[Stack: Postgres, Next.js]`
- [x] Add output post-processing for citations, response length, and raw-data leakage protection. `[Stack: Next.js, OpenAI]`
- [x] Implement stable machine error codes and branded fallback messages. `[Stack: Next.js]`
- [x] Add request, tool-call, usage, latency, and safety-event logging. `[Stack: Postgres, Next.js, OpenAI]`

Test checklist:
- [x] Unit tests for prompt validators, classifier routing, tool policy, and fallback mapping. `[Stack: Vitest]`
- [x] Integration tests for AI refusal, allowed-tool execution, and suspension enforcement. `[Stack: Vitest, Next.js, OpenAI]`
- [x] AI evals for baseball-only scope, prompt injection, prompt leak attempts, and tool misuse. `[Stack: OpenAI evals]`
- [x] Regression tests ensuring no production route uses open-ended SQL generation. `[Stack: Vitest, Next.js]`

Exit criteria:
- [x] Every production AI request is authenticated, bounded, logged, and enforced through typed tools. `[Stack: Clerk, Next.js, OpenAI, Postgres]`

Sprint 2 green commands:
- [x] `npm run db:schema`
- [x] `npm run db:smoke`
- [x] `npm run test`
- [x] `npm run test:ai-evals`
- [x] `npm run test:e2e`
- [x] `npm run build`

---

## Sprint 3: Full-Game Data Platform And Analytical Marts

Goal:
- move from challenge-only thinking to full game pitch/event storage and derived ABS analytics

Dependencies:
- sprint 0

Build checklist:
- [x] Extend ingestion design to persist full pitch and play-event data for tracked games. `[Stack: Python ETL, Postgres, MLB StatsAPI]`
- [x] Keep challenge tables as derived/high-value views on top of full pitch/event data. `[Stack: Postgres, dbt-compatible modeling]`
- [x] Capture per-pitch count-before, count-after, base state, participants, location, pitch traits, and challenge linkage. `[Stack: Python ETL, Postgres]`
- [x] Model direct-ending, direct-count, and downstream challenge impact states without overstating causality. `[Stack: Postgres, dbt-compatible modeling]`
- [x] Build read models for live game center, strike-zone explorer, and pitch timeline usage. `[Stack: Postgres, Next.js]`
- [ ] Define AI-facing historical marts:
  - [x] count-state baselines `[Stack: Postgres, dbt Core seam]`
  - [x] count-state delta tables `[Stack: Postgres, dbt Core seam]`
  - [x] zone outcome baselines `[Stack: Postgres, dbt Core seam]`
  - [x] pitch-type by count baselines `[Stack: Postgres, dbt Core seam]`
- [x] Introduce dbt-compatible model structure even if full dbt runtime is not active yet. `[Stack: dbt Core, Postgres]`
- [x] Keep source-ingest tables, normalized facts, and serving read models clearly separated. `[Stack: Postgres, dbt Core seam]`

Test checklist:
- [x] ETL tests for full-pitch parsing, challenge linkage, and duplicate protection. `[Stack: Python ETL, pytest]`
- [x] Data tests for count-state transitions, outcome attribution rules, and mart correctness. `[Stack: Postgres, dbt-style tests]`
- [x] Integration tests for game page data loaders using full-game read models. `[Stack: Vitest, Next.js, Postgres]`

Exit criteria:
- [x] The backend can power a full-pitch game center and challenge-specific analytics from one coherent data model. `[Stack: Postgres, MLB StatsAPI, Next.js]`

---

## Sprint 4: Editorial Platform, Daily Auto Recap, And Weekly Editorial Workflow

Goal:
- ship a real editorial backend with distinct daily automated and weekly manual products

Dependencies:
- sprint 3
- sprint 2 for AI/editorial safety controls

Build checklist:
- [x] Add article typing and workflow support for `daily_auto` and `weekly_editorial`. `[Stack: Postgres, Next.js]`
- [x] Build the daily automated recap pipeline from same-day StatsAPI-first marts. `[Stack: Python ETL, Postgres, Next.js]`
- [x] Add standings snapshot support for daily recap generation. `[Stack: MLB StatsAPI, Postgres]`
- [x] Add league-wide daily ABS summary marts for automated recap sections and charts. `[Stack: Postgres, dbt Core seam]`
- [x] Require evidence-backed sections and suppression on validation failure for auto-generated articles. `[Stack: Postgres, Next.js, OpenAI optional]`
- [x] Add weekly editorial draft, revision history, evidence attachments, and scheduled publish support. `[Stack: Postgres, Next.js]`
- [x] Build weekly recap marts designed for deeper, human-written analysis. `[Stack: Postgres, dbt Core seam]`
- [x] Prepare Savant/Statcast enrichment seams for weekly recap data without making daily publish dependent on it. `[Stack: Baseball Savant, Postgres, Cloud Run Jobs seam]`
- [x] Keep facts, derived metrics, and editorial hypotheses distinct in storage and rendering. `[Stack: Postgres, Next.js]`

Test checklist:
- [x] Integration tests for article create/update/publish states. `[Stack: Vitest, Next.js, Postgres]`
- [x] ETL/data tests for daily editorial marts and standings snapshots. `[Stack: Python ETL, Postgres]`
- [x] Tests for article suppression when evidence checks fail. `[Stack: Vitest, Next.js, Postgres]`
- [x] E2E coverage for viewing published daily and weekly article pages. `[Stack: Playwright, Next.js]`

Exit criteria:
- [x] Daily automated recaps and weekly human-written recaps are both supported by the backend with evidence and revision discipline. `[Stack: Postgres, Next.js, MLB StatsAPI]`

---

## Sprint 5: Pre-Ship Scale Layer

Goal:
- add the first real scale primitives before public launch

Dependencies:
- sprint 1
- sprint 2
- sprint 3

Build checklist:
- [x] Add app-level rate limiting for AI and comments with an Upstash-ready seam and local fallback for development. `[Stack: Upstash Redis seam, Next.js]`
- [x] Add public read caching for hot live-game and public summary endpoints with local cache and Upstash-ready seam. `[Stack: Upstash Redis seam, Next.js]`
- [x] Add request coalescing or short-lived dedupe for hot live-game fetch paths. `[Stack: Upstash Redis seam, Next.js]`
- [x] Add AI concurrency caps and queue entry gating. `[Stack: Upstash Redis seam, Next.js, OpenAI]`
- [x] Add worker/job path for heavy AI, article generation, and enrichment tasks. `[Stack: Cloud Run Jobs, Next.js, Postgres]`
- [x] Add raw source snapshot persistence in Postgres now and keep blob/object storage as a later Cloudflare R2 step. `[Stack: Postgres, Cloudflare R2 seam, Cloud Run Jobs seam]`
- [x] Add queue prioritization rules for live reads, comment writes, AI, editorial, and backfills. `[Stack: Cloud Run Jobs seam, Postgres]`
- [x] Add load-shedding/degradation behavior for overload and provider incidents on AI/public hot paths. `[Stack: Next.js, OpenAI, Upstash Redis seam]`
- [x] Add AI/tool answer caching for common historical prompts. `[Stack: Upstash Redis seam, Postgres, OpenAI]`

Test checklist:
- [x] Integration tests for rate-limit and cache behavior. `[Stack: Vitest, Next.js, Upstash Redis seam]`
- [x] Performance/load tests for hot live endpoints, comment bursts, concurrent AI requests, and backlog degradation. `[Stack: Node load harness, Next.js, Postgres]`
- [x] Queue prioritization helper tests exist and worker execution tests cover queued AI/article processing. `[Stack: Cloud Run Jobs seam, Postgres]`

Exit criteria:
- [x] The app has cache, rate-limit, and worker primitives needed to survive real launch traffic without architectural rewrites. `[Stack: Upstash Redis, Cloud Run Jobs, Next.js, Postgres]`

---

## Sprint 6: Pre-Ship Security, Reliability, And Operations

Goal:
- close the obvious launch blockers around security, recoverability, and operational safety

Dependencies:
- sprints 1 through 5

Build checklist:
- [x] Add CSRF protection on authenticated write routes where applicable. `[Stack: Next.js, Clerk]`
- [x] Add security headers and deployment hardening rules. `[Stack: Next.js, Vercel]`
- [x] Add webhook signature verification, replay protection, and idempotent sync handling. `[Stack: Clerk, Next.js, Postgres]`
- [x] Audit object-level authorization across profiles, comments, articles, conversations, and admin routes. `[Stack: Next.js, Postgres]`
- [x] Enforce logging redaction for secrets, tokens, and sensitive prompt content. `[Stack: Next.js, OpenTelemetry seam]`
- [x] Implement retention and deletion workflows for user, comment, and AI data where required. `[Stack: Postgres, Next.js]`
- [x] Add migration/deploy safety rules and rollback-safe schema process. `[Stack: Postgres, Neon]`
- [x] Add backup, restore, and recovery drill documentation. `[Stack: Neon, Postgres, Cloudflare R2 optional]`
- [x] Add monitoring dashboards and alerts for ingest lag, AI failures, backlog growth, and moderation issues. `[Stack: OpenTelemetry, Cloud Run Jobs, Next.js, Postgres]`
- [x] Add global incident controls:
  - [x] disable AI globally `[Stack: Next.js, OpenAI]`
  - [x] disable comments globally `[Stack: Next.js, Postgres]`
  - [x] disable new signups globally `[Stack: Clerk, Next.js]`
  - [x] freeze article auto-publish globally `[Stack: Next.js, Postgres]`
- [x] Complete legal/trademark, privacy, moderation, and acceptable-use disclosures before launch. `[Stack: Product/legal, Next.js]`

Test checklist:
- [x] Security tests for protected write routes and object ownership boundaries. `[Stack: Vitest, Next.js]`
- [x] Webhook replay/idempotency tests. `[Stack: Vitest, Next.js, Clerk]`
- [x] Disaster-recovery drill checklist reviewed and validated. `[Stack: Postgres, Neon]`
- [x] Ship-blocking end-to-end run across auth, comments, AI, articles, and live data paths. `[Stack: Playwright, Next.js, Postgres]`

Exit criteria:
- [x] The platform has the minimum security and operational posture required for public launch. `[Stack: Next.js, Clerk, Postgres, Vercel, OpenTelemetry]`

---

## Sprint 7: Monetization And Entitlements Readiness

Goal:
- prepare usage accounting and entitlement seams without forcing pricing live too early

Dependencies:
- sprint 2
- sprint 5

Build checklist:
- [x] Add per-user AI token/cost ledger. `[Stack: Postgres, OpenAI]`
- [x] Add per-model and global budget enforcement hooks. `[Stack: Postgres, OpenAI, Upstash Redis]`
- [x] Add entitlement model for free and paid usage tiers. `[Stack: Postgres, Next.js]`
- [x] Add feature flags for premium AI limits and editorial tooling. `[Stack: Next.js, Postgres]`
- [x] Document pricing-model assumptions against measured infra and token cost. `[Stack: Product, OpenAI, Postgres]`

Test checklist:
- [x] Integration tests for quota resets, tier checks, and budget cutoffs. `[Stack: Vitest, Next.js, Postgres]`

Exit criteria:
- [x] The backend can support pricing later without redesigning AI access control. `[Stack: Postgres, Next.js, OpenAI]`

---

## Test Matrix

### Unit tests
- [ ] validators and schemas `[Stack: Vitest]`
- [ ] username normalization `[Stack: Vitest]`
- [ ] moderation logic `[Stack: Vitest]`
- [ ] URL blocking `[Stack: Vitest]`
- [ ] AI misuse classifier behavior `[Stack: Vitest]`
- [ ] route/tool authorization policy `[Stack: Vitest]`
- [ ] quota math `[Stack: Vitest]`
- [ ] cost cap logic `[Stack: Vitest]`
- [ ] fallback error-code mapping `[Stack: Vitest]`

### Integration tests
- [ ] auth-required write routes `[Stack: Vitest, Next.js, Clerk]`
- [ ] profile creation/update `[Stack: Vitest, Next.js, Postgres]`
- [ ] comment creation and moderation states `[Stack: Vitest, Next.js, Postgres]`
- [ ] AI refusal path `[Stack: Vitest, Next.js, OpenAI]`
- [ ] AI tool-selection path `[Stack: Vitest, Next.js, OpenAI]`
- [ ] abuse strike escalation `[Stack: Vitest, Next.js, Postgres]`
- [ ] webhook sync and idempotency `[Stack: Vitest, Clerk, Next.js]`
- [ ] article persistence and publishing `[Stack: Vitest, Next.js, Postgres]`

### ETL and data tests
- [ ] StatsAPI ingest parsing `[Stack: Python ETL, MLB StatsAPI]`
- [ ] challenge extraction at play-level and event-level `[Stack: Python ETL, MLB StatsAPI]`
- [ ] duplicate protection `[Stack: Python ETL, Postgres]`
- [ ] schema assumptions `[Stack: Postgres]`
- [ ] transformation and mart correctness `[Stack: Postgres, dbt Core seam]`
- [ ] historical split generation `[Stack: Postgres, dbt Core seam]`

### E2E tests
- [ ] sign in `[Stack: Playwright, Clerk]`
- [ ] create profile `[Stack: Playwright, Next.js]`
- [ ] comment on article/game thread `[Stack: Playwright, Next.js]`
- [ ] blocked comment flow `[Stack: Playwright, Next.js]`
- [ ] AI chat success path `[Stack: Playwright, OpenAI, Next.js]`
- [ ] AI chat refusal path `[Stack: Playwright, OpenAI, Next.js]`
- [ ] AI timeout/suspension path `[Stack: Playwright, OpenAI, Next.js]`
- [ ] admin moderation action `[Stack: Playwright, Next.js, Postgres]`

### AI evals
- [ ] baseball-only scope `[Stack: OpenAI evals]`
- [ ] prompt injection attempts `[Stack: OpenAI evals]`
- [ ] prompt leak attempts `[Stack: OpenAI evals]`
- [ ] SQL-injection-like prompts `[Stack: OpenAI evals]`
- [ ] low-confidence fallback `[Stack: OpenAI evals]`
- [ ] hallucination resistance `[Stack: OpenAI evals]`
- [ ] citation presence `[Stack: OpenAI evals]`
- [ ] tool misuse resistance `[Stack: OpenAI evals]`
- [ ] cost regression `[Stack: OpenAI evals]`

### Performance and load tests
- [x] hot live endpoint load test `[Stack: Next.js, Postgres, Upstash Redis seam]`
- [x] AI concurrent request test `[Stack: Next.js, OpenAI, Upstash Redis seam]`
- [x] comment burst write test `[Stack: Next.js, Postgres]`
- [x] queue backlog simulation `[Stack: Cloud Run Jobs seam, Postgres]`
- [ ] DB-heavy analytics route test `[Stack: Next.js, Postgres]`

---

## Release Gates

### Required on every feature branch
- [ ] `npm run build` passes. `[Stack: Next.js]`
- [ ] relevant unit and integration tests pass. `[Stack: Vitest]`

### Required before merging backend/security work
- [ ] full touched test suites are green. `[Stack: Vitest, Playwright, Python ETL]`
- [ ] touched AI flows show no regression in AI evals. `[Stack: OpenAI evals]`
- [ ] any new env key is documented in `.env`, `.env.local`, and `.env.example`. `[Stack: Next.js, Clerk, OpenAI]`

### Required before shipping
- [ ] build green `[Stack: Next.js]`
- [ ] lint green `[Stack: Next.js]`
- [ ] unit/integration green `[Stack: Vitest]`
- [ ] ETL/data tests green `[Stack: Python ETL, Postgres]`
- [ ] e2e green `[Stack: Playwright]`
- [ ] AI eval suite green `[Stack: OpenAI evals]`
- [ ] performance thresholds met `[Stack: Next.js, Postgres, Upstash Redis, Cloud Run Jobs]`
- [ ] legal/privacy/moderation disclosures published `[Stack: Next.js]`

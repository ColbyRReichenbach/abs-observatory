<div align="center">

# Private Alpha Checklist

[![Stage](https://img.shields.io/badge/Stage-Private%20Alpha-0F766E)](#private-alpha-checklist)
[![Audience](https://img.shields.io/badge/Audience-Invited%20Users-2563EB)](#1-alpha-scope)
[![Infra](https://img.shields.io/badge/Infra-Deployment%20Required-F59E0B)](#2-production-readiness)
[![Product](https://img.shields.io/badge/Product-Stabilize%20Before%20Scale-7C3AED)](#3-product-hardening)
[![AI](https://img.shields.io/badge/AI-Review%20And%20Tune-412991)](#4-ai-operations)

</div>

This checklist is the operational path from the current codebase to a controlled private alpha.

It assumes:

- the product is feature-rich enough for invited use
- production deployment and operating discipline still need to be finalized
- monetization is deferred until post-alpha usage and retention are understood

Related documents:

- [README.md](../../README.md)
- [gap-list.md](../../gap-list.md)
- [product-source-of-truth.md](../../product-source-of-truth.md)
- [docs/launch/provider-setup-checklist.md](./provider-setup-checklist.md)
- [docs/launch/publication-checklist.md](./publication-checklist.md)
- [docs/launch/monitoring-alerts.md](./monitoring-alerts.md)
- [docs/launch/alpha-success-scorecard.md](./alpha-success-scorecard.md)

## 1. Alpha Scope

Private alpha should be limited to a small invited cohort, not a broad public release.

Recommended cohort:

- `10-30` invited users
- a mix of baseball fans, data-curious users, and a few heavier baseball-discourse users
- optionally `1-3` org-adjacent evaluators for qualitative feedback only

Alpha goal:

- validate trust, clarity, repeat usage, and operational reliability
- learn which product loops actually create return visits
- identify whether community, AI, live game views, or editorial are the core retention surface

Alpha non-goals:

- broad acquisition
- aggressive feature expansion
- paid conversion
- polished enterprise positioning

## 2. Production Readiness

These items should be complete before inviting external users.

### Deployment and environment

- [ ] Vercel project configured for the main app
- [ ] managed Postgres selected and configured for staging and production
- [ ] worker runtime deployed and reachable for internal jobs
- [ ] production env vars set for:
  - `DATABASE_URL`
  - `DATABASE_SSL`
  - `OPENAI_API_KEY`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_WEBHOOK_SIGNING_SECRET`
  - `INTERNAL_WORKER_TOKEN`
  - `OWNER_CLERK_USER_ID`
- [ ] health route checked in deployed environment
- [ ] release smoke script run against deployed environment

### Data and jobs

- [ ] game ingestion runs successfully without local intervention
- [ ] queued jobs process successfully in deployed environment
- [ ] Gazette daily flow is verified in deployed environment
- [ ] AI feedback classification jobs are verified in deployed environment
- [ ] Clerk webhook sync is verified in deployed environment

### Monitoring and incident readiness

- [ ] app health monitoring is configured
- [ ] AI failure monitoring is configured
- [ ] ETL lag or job failure monitoring is configured
- [ ] admin access behavior is verified in production
- [ ] kill switches are tested:
  - `AI_GLOBAL_KILL_SWITCH`
  - `COMMENTS_GLOBAL_KILL_SWITCH`
  - `ARTICLE_AUTOPUBLISH_FREEZE`

## 3. Product Hardening

These items focus on user trust and first-run usability.

### Auth, profiles, and comments

- [ ] sign-up and sign-in flows are clear for invited users
- [ ] profile creation is understandable and low-friction
- [ ] verified-user write restrictions behave correctly in production
- [ ] comments can be created, edited if supported, moderated, and deleted safely
- [ ] moderation placeholders and audit behavior are verified in real deployed flows

### Data trust

- [ ] sampled game challenge counts reconcile against source expectations
- [ ] team and umpire pages do not show obvious contradictory stats
- [ ] chart values, axes, tooltips, and labels are manually spot-checked on production data
- [ ] estimated leverage is clearly labeled as estimated and not as true WPA or CLS

### UX and navigation

- [ ] first-time user can understand `fan` vs `org` mode
- [ ] game preview, live, and final pages are navigable without confusion
- [ ] Gazette article pages and `/about` content read cleanly on mobile and desktop
- [ ] critical CTA paths are obvious:
  - open a game
  - switch mode
  - ask AI
  - leave a comment
  - read an article

## 4. AI Operations

The product already includes multiple AI surfaces. Alpha readiness depends on monitoring them as product features, not as one undifferentiated chatbot.

### Before invite

- [ ] `/admin/ai` and `/admin/ai/review` are usable in production
- [ ] generation telemetry is visible by surface, provider, and model
- [ ] thumbs up/down and optional feedback notes save reliably
- [ ] negative feedback classification is working in production
- [ ] admin can regenerate game debriefs where needed

### During alpha

- [ ] review negative feedback daily
- [ ] review fallback and failed generations daily
- [ ] track which AI surfaces drive return usage:
  - `copilot`
  - `chart_insight`
  - `visualizer`
  - `game_debrief`
  - `gazette_daily_author`
- [ ] log repeated failure patterns as:
  - `data issue`
  - `prompt issue`
  - `product expectation`
  - `rendering issue`

## 5. Legal and Public-Facing Basics

These do not need to be overbuilt for alpha, but they do need to exist before outside users join.

- [ ] privacy policy published
- [ ] terms of use published
- [ ] community guidelines or moderation policy published
- [ ] MLB-related content and rights disclaimers reviewed
- [ ] support or contact path published

## 6. Alpha Invite Plan

Recommended operating pattern:

1. deploy staging and production
2. validate all ship-blocking flows
3. invite a very small first cohort
4. monitor usage and AI feedback daily for the first week
5. fix trust-breaking issues immediately
6. expand invites only after the first cohort is stable

Recommended first invite wave:

- `5-10` users for the first 3-7 days
- expand only if:
  - production is stable
  - AI is not failing frequently
  - comments/moderation are manageable
  - users are not getting lost in onboarding

## 7. Exit Criteria For Closed Beta

Private alpha should be considered successful enough to widen access only when:

- deployed infrastructure is stable for multiple consecutive weeks
- ingestion and queued jobs are reliable
- trust-breaking data bugs are rare and quickly fixable
- repeat usage exists beyond novelty traffic
- at least one clear product loop shows early retention
- moderation burden is manageable
- AI quality issues are understood and triaged through admin review tooling

Do not expand to public beta just because the app is feature-rich. Expand when the operating model is stable enough to support external users without constant manual rescue.

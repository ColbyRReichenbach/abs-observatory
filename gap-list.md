<div align="center">

# Documentation Gap List

[![Infrastructure](https://img.shields.io/badge/Infrastructure-Needs%20Completion-F59E0B)](#1-infrastructure-and-deployment)
[![AI Runtime](https://img.shields.io/badge/AI%20Runtime-Truth%20Boundaries-8B5CF6)](#2-ai-runtime-scope)
[![Analytics](https://img.shields.io/badge/Analytics-Modeling%20Gaps-2563EB)](#3-analytics-and-baseball-modeling)
[![Security](https://img.shields.io/badge/Security-Hardening%20Remaining-DC2626)](#4-security-and-platform-hardening)
[![Product](https://img.shields.io/badge/Product-UX%20Gaps-0F766E)](#5-product-and-ux-gaps)

</div>

This file tracks the gaps that prevent AiBS documentation from making broader claims than the codebase can currently support.

Related documents:

- [README.md](./README.md)
- [technical.md](./technical.md)
- [security.md](./security.md)
- [product-source-of-truth.md](./product-source-of-truth.md)
- [stack-selection.md](./stack-selection.md)
- [docs/launch/provider-setup-checklist.md](./docs/launch/provider-setup-checklist.md)
- [docs/launch/private-alpha-checklist.md](./docs/launch/private-alpha-checklist.md)
- [docs/launch/alpha-success-scorecard.md](./docs/launch/alpha-success-scorecard.md)
- [docs/launch/challenge-context-analytics-plan.md](./docs/launch/challenge-context-analytics-plan.md)

## 1. Infrastructure and Deployment

These items are referenced in stack and launch docs but are not fully implemented end-to-end in the current codebase:

- `Upstash Redis`
  - stack docs and launch docs still describe Redis-backed caching/rate limits as the chosen direction
  - the current app still uses database-backed usage and queue state rather than a shipped Redis layer

- `Cloudflare R2`
  - launch docs describe an object-storage path
  - current evidence, workflow, and product persistence are still Postgres-first

- `Cloud Run worker deployment wiring`
  - the internal worker route and token auth exist
  - production deployment wiring is still a launch/process task, not a fully committed infrastructure module in the repo

- `Managed environment completeness`
  - env validation exists
  - provider/deploy setup is still checklist-driven rather than fully automated in the repository

## 2. AI Runtime Scope

These are important truth boundaries for the AI docs:

- `Anthropic runtime support`
  - provider-aware pricing and Gazette step provider types exist
  - live model-backed runtime code is currently OpenAI-based
  - do not describe Anthropic as an active production provider until a real runtime client path exists

- `Redis-backed AI concurrency and quota enforcement`
  - AI entitlements, usage ledger, queueing, and concurrency gates exist
  - the stack plan still calls out Redis-backed controls as future work

- `Saved visualization sharing`
  - AI visualizer and artifact tracking exist
  - durable user-facing saved visualization sharing is not complete enough to document as a product feature

## 3. Analytics and Baseball Modeling

These are the main product-truth limits:

- `True WPA / CLS modeling`
  - estimated leverage logic exists
  - the product should not claim real win probability or CLS until a real model is implemented

- `Live overturn probability`
  - not implemented and should remain undocumented as a live product capability

- `Advanced strategic modeling`
  - the README can describe the strategic direction of the product
  - it should not claim the app already computes player-level challenge delegation, full scenario-based win value, or complete challenge optimization models

## 4. Security and Platform Hardening

The current security posture is credible, but these claims should remain out of scope until implemented:

- full row-level security across product tables
- field-level encryption for stored user/profile data
- centralized security alerting / SIEM integration
- production-grade secret rotation workflows captured in code
- complete object-store isolation for large evidence payloads

## 5. Product and UX Gaps

These are real product gaps that affect how far the documentation should go:

- `Fan/org divergence`
  - materially improved
  - still one product with shared routes and shared design system, not two fully separate experiences

- `Matchup backdrop asset rollout`
  - system scaffold exists
  - curated production asset library is deferred

- `Editorial expansion`
  - daily Gazette authoring is implemented with persisted workflow telemetry
  - broader editorial studio / multi-editor workflow is still out of scope

## 6. Documentation Rule

Until these gaps are closed, documentation should continue to use language like:

- `implemented`
- `currently`
- `planned`
- `deferred`
- `directionally supports`

And avoid language like:

- `fully productionized` for every managed service dependency
- `multi-provider AI runtime` as a shipped fact
- `true WPA/CLS`
- `enterprise-grade security` without qualification

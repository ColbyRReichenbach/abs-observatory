# Documentation Gap List

This file tracks the main truth boundaries that current docs should continue to respect.

It is intentionally short. If an item is no longer a real current gap, it should be removed.

Related docs:

- [technical.md](./technical.md)
- [security.md](./security.md)
- [product-source-of-truth.md](../product/product-source-of-truth.md)
- [stack-selection.md](../architecture/stack-selection.md)

## 1. Infrastructure

These platform seams exist, but they are not fully shipped as current runtime requirements:

- `Redis / Upstash`
  - the codebase remains Postgres-first for most current queue, entitlement, and usage state

- `Object storage / R2`
  - evidence and editorial persistence are still primarily Postgres-backed

- `Separate worker deployment wiring`
  - internal job routes and worker-token protection exist
  - deployment and hosting specifics remain environment-level operations, not fully automated platform code

## 2. AI Runtime

These are the current AI truth boundaries:

- live runtime generation is `OpenAI`-backed
- provider-aware abstractions exist in places, but `Anthropic` is not a current live runtime client
- private owned AI artifact persistence is implemented
- saved public AI visualization sharing is not a fully shipped product surface

## 3. Baseball Modeling

These are the current analytical boundaries:

- estimated leverage is not true public WPA or CLS
- expected review value is modeled, not certain
- live overturn and challenge-support reads should stay qualified when sample is thin
- optimization-grade challenge strategy modeling remains directionally supported, not fully complete

## 4. Security And Platform Hardening

These should remain out of current-reference docs unless implemented:

- full row-level security across product tables
- field-level encryption for stored user/profile data
- centralized security alerting / SIEM integration
- automated secret rotation workflows captured in code

## 5. Product Scope

These product truths should stay qualified:

- fan and org views are materially differentiated, but they still share routes and a common design system
- editorial generation is implemented and persisted, but a broader newsroom/editor workspace is not complete
- admin and operational surfaces exist, but they are still internal system tools rather than a multi-tenant operations platform

## 6. Documentation Rule

Current-reference docs should prefer these words:

- `current`
- `implemented`
- `deferred`
- `qualified`
- `directionally supported`

And avoid these unless the code clearly justifies them:

- `fully productionized`
- `multi-provider runtime`
- `true WPA/CLS`
- `enterprise-grade` without qualification

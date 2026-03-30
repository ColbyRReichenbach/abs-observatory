# Current Stack And Deferred Seams

This document records the stack AiBS is actually built on today and the platform seams that remain intentionally deferred.

It is not an aspirational platform manifesto.

Related docs:

- [technical.md](../reference/technical.md)
- [gap-list.md](../reference/gap-list.md)
- [provider-setup-checklist.md](../launch/provider-setup-checklist.md)

## 1. Current Stack

Application:

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`

Data and persistence:

- `Postgres`
- `pg`

AI and identity:

- `OpenAI`
- `Clerk`

ETL and testing:

- `Python 3`
- `Vitest`
- `Playwright`

This is the stack that should be described as current in product and technical docs.

## 2. Current Design Decisions

### Web and backend-for-frontend

AiBS is a single Next.js application that handles:

- public analytics pages
- authenticated product pages
- admin pages
- product-serving APIs
- internal job and cron routes

### Database

AiBS is Postgres-first.

That means:

- serving analytics are SQL-backed
- product state is SQL-backed
- editorial and AI telemetry are SQL-backed

### AI runtime

Current live generation is OpenAI-backed.

Provider-aware abstractions may exist in parts of the code, but they should not be documented as active multi-provider runtime support.

### Auth

Clerk is the current identity provider and should be treated as current platform truth.

## 3. Deferred Platform Seams

These seams exist in docs or code comments, but they are not current mandatory platform requirements:

- `Redis / Upstash`
  - possible future cache, rate-limit, or queue adjunct
  - not the current backbone of application state

- `Object storage / R2`
  - possible future large-blob or evidence-storage path
  - not required for current product truth

- `Separate worker hosting`
  - the internal worker boundary exists
  - deployment specifics are still environment- and ops-dependent

- `Additional AI providers`
  - may be supported later
  - not current runtime truth

## 4. Documentation Rule

When this document and the code disagree, the code wins.

If a new managed dependency becomes truly required for normal operation, this file should be updated in the same change that introduces it.

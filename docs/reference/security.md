# Security Overview

This document describes the security controls that are implemented in AiBS today.

It is intentionally current-state only. Deferred hardening work belongs in [gap-list.md](./gap-list.md), not here.

Related docs:

- [technical.md](./technical.md)
- [gap-list.md](./gap-list.md)
- [provider-setup-checklist.md](../launch/provider-setup-checklist.md)

## 1. Security Model

AiBS uses a layered security model built around:

- authenticated identity
- verified-user checks for sensitive product actions
- server-side authorization
- CSRF protection on write routes
- worker-token protection for internal processing
- bounded AI tool access
- audit logging for sensitive admin and job activity

## 2. Authentication

Primary auth provider:

- `Clerk`

Server identity resolution lives in `src/lib/server/auth.ts`.

Current behavior:

- authenticated users are resolved on the server
- product identity is synced into Postgres
- profile and role state are stored in the application database
- local development fallback headers exist outside production

## 3. Verified Identity

AiBS distinguishes between:

- signed-in users
- verified users

Verified identity is required for higher-risk product actions, including:

- AI usage
- comment creation
- profile mutations
- admin and owner-admin workflows

This is an abuse-control rule, not just a UI distinction.

## 4. Authorization

Authorization is enforced server-side.

The browser is not trusted to gate:

- admin access
- AI access
- moderation flows
- protected writes

Owner-admin enforcement is stricter than a generic admin role.

Current owner-admin requirements:

- authenticated session
- verified identity
- `admin` role in application state
- Clerk-backed identity
- `externalAuthId === OWNER_CLERK_USER_ID`

Denied admin access is written to the audit log.

## 5. CSRF Protection

Write routes use double-submit CSRF protection.

Current implementation:

- cookie: `aibs_csrf`
- header: `x-csrf-token`
- origin validation when `Origin` is present

The helper lives in `src/lib/server/csrf.ts`.

Bypass is limited to trusted internal/dev-style paths, including:

- development identity headers
- worker-token-authenticated internal calls

## 6. Internal Jobs And Worker Security

Internal processing routes are protected by `INTERNAL_WORKER_TOKEN`.

Current protected boundary:

- `/api/internal/jobs/process`

Behavior:

- requests present `x-worker-token`
- comparison is timing-safe
- production expects the token to be present

This protects queued AI, editorial, and enrichment work from direct public invocation.

## 7. AI Security Boundaries

AiBS does not expose arbitrary model-to-database access.

Current protections:

- `/api/query` is deprecated as a public workflow
- interactive AI uses typed server-side tools
- tool access is scoped by page context
- tool payloads are bounded before model use
- prompt-misuse checks screen for obvious injection and exfiltration attempts
- the product stays baseball-scoped by policy

This means the model can answer through approved baseball tools, not through unrestricted SQL or internal-table access.

## 8. Entitlements And Abuse Controls

AiBS does not treat AI as an unlimited public endpoint.

Current control layers include:

- authenticated use
- verified use
- per-user entitlements
- daily and monthly ceilings
- strike, suspension, and ban state
- queueing for heavier requests
- rate-limit event logging

These controls live in the server policy and entitlement layers, not only in frontend affordances.

## 9. Secrets And Environment Validation

Current server environment requirements are validated in `src/lib/server/env.ts`.

Always required:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Required in production:

- `CLERK_WEBHOOK_SIGNING_SECRET`
- `OPENAI_API_KEY`
- `INTERNAL_WORKER_TOKEN`
- `OWNER_CLERK_USER_ID`

## 10. What This Document Does Not Claim

This document should not claim any of the following as current unless the code changes to support them:

- full table-wide row-level security
- field-level encryption for product/profile data
- centralized SIEM integration
- automated secret rotation workflows in code
- fully productionized Redis-backed abuse controls

Those remain gaps or deferred work and belong in [gap-list.md](./gap-list.md).

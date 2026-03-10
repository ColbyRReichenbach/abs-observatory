<div align="center">

# Security Overview

[![Clerk](https://img.shields.io/badge/Clerk-Verified%20Identity-6C47FF)](https://clerk.com/)
[![PostgreSQL](https://img.shields.io/badge/Postgres-Audit%20and%20Policy%20State-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-Bounded%20Tool%20Access-412991?logo=openai&logoColor=white)](https://openai.com/)
[![CSRF](https://img.shields.io/badge/CSRF-Double%20Submit-111827)](#4-csrf-protection)
[![Worker Auth](https://img.shields.io/badge/Workers-Token%20Protected-0F766E)](#5-worker-and-internal-route-security)
[![Admin Access](https://img.shields.io/badge/Admin-Owner%20Locked-B91C1C)](#3-authorization)

</div>

This document describes the security controls that are implemented in AiBS today. It does not describe aspirational controls unless they are called out explicitly as gaps.

Related documents:

- [README.md](./README.md)
- [technical.md](./technical.md)
- [ai-backend-plan.md](./ai-backend-plan.md)
- [docs/launch/provider-setup-checklist.md](./docs/launch/provider-setup-checklist.md)
- [gap-list.md](./gap-list.md)

## 1. Security Model

AiBS uses a layered security model:

- identity and session enforcement
- verified-user checks for sensitive actions
- CSRF protection on write routes
- strict server-side authorization for admin actions
- worker-token protection for internal job execution
- bounded AI tool access instead of direct model-to-database access
- audit logging and feedback telemetry for sensitive workflows
- log redaction for secrets and user-sensitive metadata

The design assumption is that all user input is untrusted, and all model-facing content must be bounded before use.

## 2. Authentication and Identity

### Current implementation

Primary auth provider:

- `Clerk`

Server identity resolution lives in `src/lib/server/auth.ts`.

Application behavior:

- if Clerk is configured, server routes resolve authenticated identity from Clerk
- identity is synced into `product.users`
- profile and role records are provisioned in Postgres
- verified state is tracked in the application database

Development fallback:

- local dev auth headers are supported when Clerk is not active

### Verified identity requirements

Protected product actions rely on `isVerified`, not only “signed in”.

Examples:

- AI usage
- profile updates
- comment creation
- admin access

This matters because AiBS treats verified identity as part of abuse control, not only as a UI concern.

## 3. Authorization

### Product authorization

Authorization is enforced server-side in route handlers and server modules. The browser is not trusted to gate privileged behavior.

Examples:

- comments require authentication and verified identity
- AI routes require authenticated, verified viewers
- article/admin mutations require owner-admin enforcement

### Owner-only admin model

Admin access is intentionally stricter than a database role check.

Current requirements:

- authenticated viewer
- verified identity
- `admin` role in `product.user_roles`
- Clerk provider
- `externalAuthId === OWNER_CLERK_USER_ID`

This is enforced in `src/lib/server/admin.ts` and `src/lib/server/owner-admin.ts`.

Important behavior:

- if the configured owner signs in, the code auto-syncs the `admin` role
- if a non-owner user has an `admin` role inserted manually, owner-gate checks still deny access

Denied admin access is written to `ops.audit_log`.

## 4. CSRF Protection

Write routes use double-submit CSRF protection.

Current implementation:

- cookie: `aibs_csrf`
- header: `x-csrf-token`
- origin match check when `Origin` is present

The CSRF helper lives in `src/lib/server/csrf.ts`.

CSRF is bypassed only for trusted internal/dev-style headers:

- dev identity headers
- worker token header

That bypass is intentional for local development and internal job processing.

## 5. Worker and Internal Route Security

Internal job execution is protected by `INTERNAL_WORKER_TOKEN`.

Current flow:

- internal processing route: `/api/internal/jobs/process`
- request must present `x-worker-token`
- token is compared with a timing-safe equality check

If `INTERNAL_WORKER_TOKEN` is absent:

- non-production environments allow the request
- production should treat the token as required

This boundary protects queued AI work, editorial generation, and enrichment jobs from casual invocation.

## 6. AI Security Boundaries

### No public NL-to-SQL

The legacy public SQL-style route is not available as a product feature.

`/api/query` currently returns a hard deprecation response and should not be used.

This is one of the most important security decisions in the codebase.

### Typed tools only

Interactive AI uses typed, server-side tools from `src/lib/server/ai-tools.ts`.

Current model-visible tool families are limited to baseball analytics contexts such as:

- live games
- game summaries and challenges
- team summaries and trends
- umpire summaries and profiles

The model does not get arbitrary database access.

### Tool scoping and payload bounding

AI tool access is scoped by page context through `getAllowedToolNames()`.

Tool payloads are sanitized before they are passed to the model:

- strings are truncated
- arrays and objects are trimmed
- payload byte size is bounded

This reduces prompt stuffing, accidental overexposure, and prompt/token waste.

### Prompt misuse detection

The AI policy layer blocks obvious prompt-injection and exfiltration patterns before model execution.

Current checks include phrases such as:

- instruction override attempts
- hidden prompt requests
- schema or SQL exfiltration patterns
- query bypass language

These rules live in `src/lib/server/ai-policy.ts`.

### Scope restriction

The interactive copilot is baseball-scoped by policy.

If a request falls outside that scope, the route returns a stable refusal payload rather than attempting broad general-purpose answering.

## 7. AI Abuse and Entitlement Controls

AiBS does not treat AI as an unlimited public endpoint.

The current AI control system includes:

- authenticated use only
- verified use only
- per-user entitlements in `ai.user_entitlements`
- daily request and monthly token/cost ceilings
- strike/suspension/ban state in `product.user_profiles`
- rate-limit event logging
- heavy-query queueing

The policy and entitlement layers live in:

- `src/lib/server/ai-policy.ts`
- `src/lib/server/entitlements.ts`
- `src/lib/server/ai-chat.ts`

## 8. PII and Model Exposure

### What is true today

The interactive AI subsystem is not given arbitrary access to product user tables, comments tables, moderation tables, or raw auth/session state.

Model-facing context currently comes from:

- typed baseball data tools
- server-built context windows
- the user’s current message

### What can still contain identity data

The system does store user emails and auth-linked profile data in Postgres for product identity. It also stores user-entered comments, feedback, and chat messages as part of the application.

So the accurate claim is:

- AiBS stores user identity and communication data for product features
- the public AI subsystem does not read that data through unrestricted tool access

This is stronger and more accurate than claiming “the system has no PII”.

## 9. Input Validation

AiBS validates and normalizes inputs across several subsystems.

Examples:

- AI chat request schema via `zod`
- AI feedback request schema via `zod`
- article and comment write payload validation
- comment content normalization and anti-link enforcement
- username normalization and validation

Comment policy specifically blocks:

- raw HTML
- markdown links
- obvious URL patterns
- disallowed slur terms, including canonicalized leetspeak variants

## 10. Webhook Security

Clerk webhook ingestion uses signature verification through Clerk’s webhook helper.

Current protections:

- signature verification before processing
- dedupe via `ops.webhook_deliveries`
- payload hash persistence

This prevents the user sync path from becoming a blind unauthenticated write channel.

## 11. Logging and Redaction

Server-side logging uses redaction rules in `src/lib/server/logging.ts`.

Sensitive keys are redacted when logging metadata, including patterns matching:

- authorization
- cookie
- secret
- token
- signature
- api key
- password
- prompt
- email

That does not eliminate all logging risk, but it is an implemented control that materially reduces accidental secret leakage in application logs.

## 12. Caching and Response Privacy

Sensitive routes return private or no-store responses where appropriate.

Examples:

- `/api/ai/chat`
- `/api/ai/feedback`

This reduces the risk of personal or AI-related data being cached by intermediaries.

## 13. Auditability

AiBS writes audit records for important security and operational events, including:

- denied admin access
- AI strike application
- AI feedback writes
- webhook delivery records

This is important because the application already includes moderation, AI usage enforcement, and owner-only administrative controls.

## 14. What Is Not Claimed

The codebase does not currently justify claiming all of the following:

- field-level encryption of user data at the application layer
- row-level security across all product schemas
- full SIEM / centralized security alerting
- completed Redis-backed abuse controls in production
- full object-storage isolation for large evidence artifacts
- zero retention of user-generated content

Those are gaps or future hardening items, not implemented facts.

## 15. Practical Security Summary

The security story of AiBS today is not “enterprise-complete”. It is:

- real identity enforcement
- real verified-user checks
- real CSRF protection
- real owner-only admin gating
- real worker authentication
- real AI scope restriction
- real typed-tool boundaries
- real audit trails and log redaction

That is a credible backend and AI security foundation for an early-stage product, provided the remaining deployment and infrastructure hardening items in [gap-list.md](./gap-list.md) are closed before a broader production rollout.

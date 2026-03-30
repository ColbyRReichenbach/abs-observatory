# Provider And Environment Reference

This document captures the providers and environment variables that matter to the current codebase.

It is not meant to be a full launch playbook.

Related docs:

- [technical.md](../reference/technical.md)
- [security.md](../reference/security.md)
- [vercel-neon-runbook.md](./vercel-neon-runbook.md)

## 1. Current Required Providers

Normal operation currently depends on:

- `Postgres`
- `Clerk`
- `OpenAI`

These are the only providers that should be described as current core runtime requirements.

## 2. Current Required Environment Variables

Enforced in `src/lib/server/env.ts`.

Always required:

- `DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

Required in production:

- `CLERK_WEBHOOK_SIGNING_SECRET`
- `OPENAI_API_KEY`
- `INTERNAL_WORKER_TOKEN`
- `OWNER_CLERK_USER_ID`

## 3. Conditional Or Deferred Integrations

These should only be documented as conditional or deferred:

- Redis / Upstash
- object storage / R2
- separate worker hosting infrastructure
- additional AI providers

They may still appear in older launch or architecture notes, but they are not current required platform truth.

## 4. Operational Notes

Current operational expectations:

- Clerk webhook delivery must be configured in production
- the internal worker token must be shared across web and worker processing environments if that route is used
- production OpenAI usage depends on a real `OPENAI_API_KEY`
- local and test environments may use reduced or fallback configuration paths

## 5. Documentation Rule

If a provider or environment variable is not enforced by code, do not describe it as required in current-reference docs.

# Vercel + Neon Runbook

## Goal

Deploy the AiBS web product on Vercel with Neon as the production serving Postgres database, while keeping heavy ETL and audit jobs on a separate warehouse database and outside normal Vercel request functions.

## Recommended Launch Stack

- `Vercel`
  - Next.js web app
  - preview and production deploys
  - lightweight cron-triggered routes only
- `Neon`
  - serving Postgres for app traffic
  - separate warehouse Postgres for ETL, backfills, and audits
- `Clerk`
  - auth + webhook sync
- `OpenAI`
  - live AI features
- `Separate worker runtime`
  - heavy ETL
  - backfills
  - full audit batches
  - any long-running editorial generation or recompute path

## What Runs Where

### Good fit for Vercel

- public site pages
- article pages
- auth routes
- lightweight API routes
- AI request/response paths
- health checks
- short cron triggers

### Keep off Vercel

- `etl/ingest_mlb_abs.py`
- `npm run qa:abs`
- `npm run model:audit:all`
- backfills and long-running recomputes

## Required Vercel Env Vars

These must be set for `Preview` and `Production` unless otherwise noted.

- `DATABASE_URL`
- `SERVING_DATABASE_URL`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`
- `OPENAI_API_KEY`
- `INTERNAL_WORKER_TOKEN`
- `OWNER_CLERK_USER_ID`

Useful optional env vars:

- `OPENAI_QUERY_MODEL`
- `OPENAI_SUMMARY_MODEL`
- `OPENAI_FEEDBACK_MODEL`
- `CRON_SECRET`
- `DATABASE_SSL=true`

## Neon Setup

1. Create a Neon project.
2. Create a production database.
3. Copy the serving pooled connection string.
4. Use that value as both `DATABASE_URL` and `SERVING_DATABASE_URL` in Vercel.
5. Keep SSL enabled for Neon.

Example shape:

```env
DATABASE_URL=postgresql://<user>:<password>@<serving-pooled-host>/<db>?sslmode=require
SERVING_DATABASE_URL=postgresql://<user>:<password>@<serving-pooled-host>/<db>?sslmode=require
```

## Vercel Setup

1. Import the GitHub repo into Vercel.
2. Set the project root to this app directory if needed.
3. Confirm Vercel detects `Next.js`.
4. Set all required env vars before the first real deploy.
5. Deploy a preview first.
6. After preview is healthy, promote or deploy to production.

## Schema Rollout

Before first production traffic:

1. Point `DATABASE_URL` locally at the serving Neon database.
2. Run:

```bash
npm run verify:repo
npm run db:schema
npm run db:smoke
```

3. Confirm the key schemas and views exist.
4. Only then deploy the app.

## Clerk Setup

1. Create or reuse a Clerk application.
2. Set:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
3. Create webhook endpoints:
   - preview: `https://<preview-domain>/api/webhooks/clerk`
   - production: `https://<prod-domain>/api/webhooks/clerk`
4. Copy the webhook signing secret to:
   - `CLERK_WEBHOOK_SIGNING_SECRET`

## OpenAI Setup

Set:

- `OPENAI_API_KEY`
- optionally model overrides if you do not want the defaults

## Worker Setup

Use a separate worker host for long-running jobs.

Examples:

- Railway
- Render
- Fly.io
- GitHub Actions on a schedule
- a small VM/container

## Neon Separation Setup

Yes, some manual Neon setup is still required.

The codebase now assumes two remote database roles:

- `Warehouse Neon`: canonical ingest, backfill, modeling, and audit authority
- `Serving Neon`: app-facing read/write database for the product

Recommended setup:

1. Keep the current app database as `Serving Neon`.
2. Create one separate Neon project for `Warehouse Neon`.

Why separate projects instead of one shared giant DB:

- cleaner operational separation
- lower risk that heavy backfills affect app traffic
- cleaner credentials and permission boundaries
- easier to reason about warehouse versus serving ownership

If you want a lighter interim setup, one Neon project with separate databases and separate roles can work, but two projects is the cleaner target architecture.

### Manual Neon steps

1. Create a new Neon project for Warehouse.
2. Copy the pooled connection string for Warehouse.
3. Keep the existing pooled connection string for Serving.
4. Create separate credentials where possible:
   - web app uses Serving credentials only
   - pollers/ETL/audits use Warehouse credentials only
5. Set environment variables:
   - local `.env.local` or `.env`
   - Vercel project env
   - GitHub Actions secrets

Required values:

- `WAREHOUSE_DATABASE_URL=<warehouse pooled url>`
- `SERVING_DATABASE_URL=<serving pooled url>`
- `DATABASE_URL=<serving pooled url>`

Current repo status:

- the active operator poller is the macOS `launchd` path in `scripts/local-live-poll.sh`
- launchd ingests into Warehouse, refreshes Savant ABS rows, runs QA, publishes the serving subset, and reconciles Warehouse versus Serving
- ETL scripts default to `WAREHOUSE_DATABASE_URL`
- audit scripts default to `WAREHOUSE_DATABASE_URL`
- the web app should keep using `DATABASE_URL`, which should equal `SERVING_DATABASE_URL`
- GitHub Actions workflow files may exist in the repo, but they are not the assumed active polling path unless explicitly enabled

### Before running the real warehouse backfill

You must set `WAREHOUSE_DATABASE_URL` locally first.

Without that, the backfill commands will still target the local fallback database and will not populate Warehouse Neon.

Shared env between web and worker:

- `WAREHOUSE_DATABASE_URL`
- `SERVING_DATABASE_URL`
- `OPENAI_API_KEY`
- `INTERNAL_WORKER_TOKEN`

If the web app needs to call the worker directly, also set a worker URL in the web env and keep internal token auth enabled.

## Current Repo Notes

- `vercel.json` now includes the daily editorial cron for `/api/cron/editorial-daily`.
- The site is no longer scoped to only the public visualizer; core public analytics, articles, profile, and public profile surfaces are live.
- Public visualization sharing is live for public-share-enabled visualizer artifacts through `/v/[vizId]` and `/api/viz-og/[vizId]`.
- Query Lab and the legacy public NL-to-SQL path remain gated or deprecated.

## First Healthy Deploy Checklist

- `npm run verify:repo`
- `npm run build`
- preview deploy succeeds
- `/api/health` works
- `/`
- `/teams`
- `/umpires`
- `/articles`
- `/about`
- one team detail page
- one umpire detail page
- one game page
- launch article route loads
- Clerk sign-in works
- article feedback works

## Post-Deploy Validation

1. Verify `DATABASE_URL` is hitting Neon, not local Postgres.
2. Verify Clerk webhook deliveries succeed.
3. Verify OpenAI-backed surfaces return live responses.
4. Verify the launch article renders all chart-backed sections.
5. Verify no gated surfaces are unintentionally public.

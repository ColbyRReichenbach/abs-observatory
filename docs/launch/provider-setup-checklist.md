# Provider Setup Checklist

## Goal
- make local, staging, and production credential setup deterministic
- keep the same variable names across `.env`, Vercel, Cloud Run, and GitHub Actions

## Fill These First
- [ ] `DATABASE_URL`
- [ ] `DATABASE_SSL`
- [ ] `OPENAI_API_KEY`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`
- [ ] `CLERK_WEBHOOK_SIGNING_SECRET`

## Fill Before Staging
- [ ] `UPSTASH_REDIS_REST_URL`
- [ ] `UPSTASH_REDIS_REST_TOKEN`
- [ ] `R2_ACCOUNT_ID`
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET`
- [ ] `R2_PUBLIC_BASE_URL`
- [ ] `GOOGLE_CLOUD_PROJECT`
- [ ] `GOOGLE_CLOUD_REGION`
- [ ] `CLOUD_RUN_WORKER_URL`
- [ ] `INTERNAL_WORKER_TOKEN`

## Provider-by-Provider

### OpenAI
- [ ] Create or use an OpenAI organization/project
- [ ] Create a server-side API key
- [ ] Put it in:
  - local `.env` as `OPENAI_API_KEY`
  - Vercel env vars
  - Cloud Run env vars if workers call OpenAI directly

### Clerk
- [ ] Create a Clerk application
- [ ] Copy:
  - publishable key -> `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - secret key -> `CLERK_SECRET_KEY`
- [ ] Create webhook endpoint pointing to:
  - staging: `https://<staging-domain>/api/webhooks/clerk`
  - production: `https://<prod-domain>/api/webhooks/clerk`
- [ ] Copy webhook signing secret -> `CLERK_WEBHOOK_SIGNING_SECRET`

### Managed Postgres
- [ ] Create staging DB
- [ ] Create production DB
- [ ] Use pooled connection strings for app traffic
- [ ] Put staging/prod values into environment-specific secrets as `DATABASE_URL`
- [ ] Set `DATABASE_SSL=true` if your provider requires SSL

### Upstash Redis
- [ ] Create Redis database
- [ ] Copy:
  - HTTPS endpoint -> `UPSTASH_REDIS_REST_URL`
  - standard token -> `UPSTASH_REDIS_REST_TOKEN`

### Cloudflare R2
- [ ] Create bucket
- [ ] Create R2 API token with bucket-scoped read/write access
- [ ] Copy:
  - account ID -> `R2_ACCOUNT_ID`
  - access key id -> `R2_ACCESS_KEY_ID`
  - secret access key -> `R2_SECRET_ACCESS_KEY`
  - bucket name -> `R2_BUCKET`
- [ ] Set public base URL if you expose assets directly -> `R2_PUBLIC_BASE_URL`

### Vercel
- [ ] Create Vercel project pointing at `abs-observatory`
- [ ] Add project env vars for:
  - development
  - preview
  - production
- [ ] Link local repo and verify `vercel env pull` works

### Google Cloud / Cloud Run
- [ ] Create GCP project
- [ ] Enable Cloud Run and Artifact Registry
- [ ] Create worker service/job
- [ ] Set:
  - `GOOGLE_CLOUD_PROJECT`
  - `GOOGLE_CLOUD_REGION`
  - `CLOUD_RUN_WORKER_URL`
  - `INTERNAL_WORKER_TOKEN`

### GitHub Actions
- [ ] Add repository or environment secrets for CI/CD jobs
- [ ] Keep staging/prod separated with environment-level secrets

## Schema Rollout Plan
1. Create staging managed Postgres database.
2. Export staging `DATABASE_URL`.
3. Run:
   - `npm run db:backup -- .runtime/backups/pre-staging-schema.dump`
   - `npm run db:schema`
   - `npm run db:smoke`
   - `npm run db:migration:verify`
4. Deploy staging app and workers.
5. Verify ship-blocking flows.
6. Repeat the same sequence for production with a fresh production backup first.

## Webhook Wiring Plan
1. Deploy staging app.
2. In Clerk Dashboard, create staging webhook endpoint for `/api/webhooks/clerk`.
3. Copy signing secret into staging env as `CLERK_WEBHOOK_SIGNING_SECRET`.
4. Trigger a test user create/update event.
5. Verify:
   - `product.users`
   - `product.user_profiles`
   - `product.user_roles`
   - `ops.webhook_deliveries`
6. Repeat for production after staging is green.

## Worker Wiring Plan
1. Deploy worker service/job to Cloud Run.
2. Set `INTERNAL_WORKER_TOKEN` in both:
   - web app env
   - worker env
3. Set `CLOUD_RUN_WORKER_URL` in the web app env.
4. Trigger a known queued job locally/staging.
5. Verify:
   - `ops.job_runs`
   - worker-authenticated internal routes
   - queued AI/article jobs complete successfully

## Staging Validation Plan
- [ ] sign in / sign out
- [ ] Clerk webhook user sync
- [ ] profile create/update
- [ ] verified user comment create/delete/moderation path
- [ ] AI chat success path
- [ ] AI refusal / quota / kill-switch path
- [ ] article listing and article detail pages
- [ ] live game page and challenge explorer
- [ ] queued job processing
- [ ] Redis-backed rate limits
- [ ] R2 raw/evidence writes if enabled
- [ ] `npm run build`
- [ ] `npm run test`
- [ ] `npm run test:e2e`

## Launch Readiness Ops
- [ ] set AI daily and monthly budget caps
- [ ] configure kill-switch defaults
- [ ] verify monitoring dashboards and alerts
- [ ] run backup/restore drill
- [ ] confirm legal disclosures are published
- [ ] confirm privacy / moderation copy is published
- [ ] verify production webhook endpoint and secret
- [ ] verify worker URL and token in production
- [ ] final smoke test on production deploy

# AiBS Sprint Test Plan

This document defines the exact verification gates that each sprint must pass before work can move forward.

Use this together with:
- [product-source-of-truth.md](./product-source-of-truth.md)
- [roadmap.md](./roadmap.md)
- [plan.md](../archive/2026-03/backend-scale-security-plan.md)
- [stack-selection.md](../architecture/stack-selection.md)
- [ai-backend-plan.md](../architecture/ai-backend-plan.md)
- [ai-implementation-sequence.md](../architecture/ai-implementation-sequence.md)

This is written for implementation agents and reviewers.

---

## Core Rule

When a feature or sprint is implemented:
- [ ] run the required test suites for that scope
- [ ] inspect failures
- [ ] fix code
- [ ] rerun the same suites
- [ ] repeat until green

Do not move to the next sprint until the current sprint gate is green.

This is the self-healing loop:
1. implement
2. run tests
3. analyze failure
4. patch code
5. rerun
6. repeat until all required gates pass

If a failure is caused by the test itself being invalid:
- [ ] fix the test
- [ ] rerun the suite
- [ ] confirm the fix did not weaken the intended requirement

---

## Global Verification Rules

These apply to every sprint:
- [ ] `npm run build` passes
- [ ] touched unit/integration tests pass
- [ ] changed behavior is covered by new or updated tests
- [ ] env keys added by the change are documented in `.env`, `.env.example`, and `.env.local`
- [ ] no secrets or local artifacts are introduced into git

If the sprint affects AI:
- [ ] touched AI evals pass
- [ ] refusal and misuse behavior is verified

If the sprint affects ETL or marts:
- [ ] parsing tests pass
- [ ] duplicate protection passes
- [ ] data-shape assumptions are verified

If the sprint affects public UI:
- [ ] relevant Playwright flow passes

---

## Test Harness Targets

Current runnable stack:
- `npm run db:schema`
- `npm run db:smoke`
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:ai-evals`
- `npm run test:e2e`
- `npm run etl:test`
- `npm run test:visual`

Harnesses introduced starting in Sprint 0:
- [x] Python ETL test runner and fixtures
- [ ] integration test helpers for auth and DB-backed routes
- [ ] AI eval runner
- [ ] performance/load test harness

Recommended target commands by the time the roadmap is complete:
- `npm run build`
- `npm run lint`
- `npm run test`
- `npm run test:visual`
- `pytest etl`
- `npm run test:e2e`
- `npm run test:ai-evals`
- `npm run test:load`

If command names differ later, update this file and [roadmap.md](./roadmap.md) together.

---

## CI/CD Rollout

### Do now
- [x] Run `build`, `lint`, and `test` in CI for every push and pull request.
- [x] Treat failing CI as a sprint gate failure.
- [x] Add feature-specific e2e coverage when a user-facing flow is introduced.
- [x] auth/profile e2e coverage exists.
- [x] comments/moderation e2e coverage exists.
- [x] AI chat e2e coverage exists.
- [x] article publishing/viewing e2e coverage exists.
- [x] Keep CI focused on fast feedback during active development.

### Add later
- [x] Add Python ETL tests to CI once the ETL runner exists.
- [x] Add AI eval job to CI once the eval harness exists.
- [ ] Add load/performance jobs before ship, not on every PR.
- [ ] Add visual regression CI after the UI stabilizes enough to avoid noisy snapshots.
- [ ] Add staging and then production CD only after migrations, rollback, and ship-critical e2e are reliable.

### Deployment policy
- [ ] Preview deployments are acceptable early.
- [ ] Staging deploys can be automated after baseline CI is trustworthy.
- [ ] Production deploys should remain manual-gated until Sprint 6 controls are in place.

---

## Sprint 0 Gate: Baseline, Tooling, And Test Harness

### Purpose
- establish a trustworthy baseline before feature work expands

### Required checks
- [x] `npm run build`
- [x] `npm run lint`
- [x] `npm run test`
- [x] CI workflow runs on push and pull request
- [x] local schema apply command succeeds
- [x] env files are aligned with the documented key set
- [x] `.gitignore` excludes secrets, logs, runtime artifacts, caches, and local data files

### Required test cases
- [x] existing frontend/unit tests pass or are split into clearly named passing suites
- [x] at least one DB schema smoke test exists for schema apply/bootstrap
- [x] at least one ETL smoke test exists for current ingestion entrypoints
- [x] at least one feature-specific e2e target list exists for the first user-facing sprint

### Evidence to record
- [x] list of green commands
- [x] list of intentionally deferred harnesses still to be added in Sprint 0

Green commands recorded for Sprint 0:
- [x] `npm run db:schema`
- [x] `npm run db:smoke`
- [x] `npm run etl:test`
- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`

Intentionally deferred after Sprint 0:
- [x] auth/DB route integration helpers move into Sprint 1 when protected route coverage is added
- [x] AI eval runner moves into Sprint 2 with the typed-tool AI surface
- [x] performance/load harness moves into Sprint 5 with the scale layer

### Pass condition
- [x] the repo has a stable baseline and known command set for future sprints

---

## Sprint 1 Gate: Identity, Profiles, Comments, Moderation

### Unit tests
- [x] username normalization lowercases and trims correctly
- [x] usernames reject spaces, forbidden characters, unicode confusables, and reserved names
- [x] profanity/obfuscation filter rejects obvious bad variants
- [x] comment validator rejects HTML, markdown, URLs, and oversized payloads
- [x] profile avatar validator accepts only approved preset identifiers

### Integration tests
- [x] unauthenticated `POST` to comment/profile routes is rejected
- [x] unverified user cannot perform write actions
- [x] verified user can create/update their own profile
- [x] viewer profile writes are limited to the authenticated viewer route; there is no arbitrary profile-target write endpoint
- [x] comment insert creates correct moderation status
- [x] deleted comment renders placeholder state without destroying reply chain
- [x] admin/mod role checks have a tested server-side helper ready for protected routes
- [x] webhook sync creates/updates local user rows idempotently

### E2E tests
- [x] user can sign in
- [x] user can create profile
- [x] user can submit allowed comment
- [x] blocked comment shows expected refusal state
- [x] non-authenticated user has no write interaction path

Sprint 1 e2e note:
- [x] current end-to-end auth coverage uses the documented dev-auth headers until Clerk-hosted UI flows are introduced

### Pass condition
- [x] all write actions are authenticated, server-enforced, and audited

---

## Sprint 2 Gate: AI Hardening And Typed Tools

### Unit tests
- [x] prompt validator rejects empty, oversized, and malformed requests
- [x] baseball-scope classifier marks clear non-baseball prompts as out of scope
- [x] misuse classifier catches prompt-injection and obvious exfiltration attempts
- [x] route-to-tool policy only exposes allowed tools for the given surface
- [x] tool parameter validators reject unbounded ranges and oversized requests
- [x] fallback mapper returns stable error codes for each refusal condition

### Integration tests
- [x] unauthenticated AI request is rejected
- [x] suspended user AI request is rejected with correct error code
- [x] out-of-scope prompt returns low-cost refusal without model/tool execution
- [x] injection-style prompt returns refusal path and logs safety event
- [x] allowed prompt calls only the allowed tools
- [x] tool result size/timeframe caps are enforced
- [x] output includes citations where required
- [x] output post-processing blocks raw-data leakage
- [x] AI strike count increments correctly across repeated misuse

### AI evals
- [x] baseball-only scope
- [x] prompt injection attempt
- [x] system prompt leak attempt
- [x] SQL-injection-like prompt
- [x] low-confidence fallback
- [x] hallucination resistance on tool-bounded answers
- [x] citation presence
- [x] tool misuse resistance

### Pass condition
- [x] production AI path is authenticated, bounded, typed-tool-only, and refusal-safe

---

## Sprint 3 Gate: Full-Game Data Platform And Marts

### ETL tests
- [x] full game feed parsing persists pitches and play events, not just challenges
- [x] challenge extraction works from both play-level and play-event-level review structures
- [x] ingest is idempotent for duplicate/retry runs
- [x] delayed/final game status updates do not create duplicate facts
- [x] pitch-to-at-bat and pitch-to-game joins remain consistent

### Data tests
- [x] count-before and count-after are consistent for non-terminal pitches
- [x] base-state and outs snapshot fields are present where expected
- [x] direct-ending impact labeling is only applied when the pitch directly ends/prevents ending the PA
- [x] direct-count impact labeling is applied correctly for overturned count changes
- [x] downstream impact is labeled as inferred, not direct
- [x] challenge tables remain derivable from full pitch/event data
- [x] historical count-state marts produce expected aggregates on fixture data

### Integration tests
- [x] game page data loaders can fetch strike-zone explorer inputs from read models
- [x] challenge explorer filters work against the new full-pitch model
- [x] matchup-scoped pitch timelines can be queried safely and efficiently

### Pass condition
- [x] the backend supports full-pitch game center flows and derived ABS analytics from one coherent model

---

## Sprint 4 Gate: Editorial Platform

### Integration tests
- [x] article types support `daily_auto` and `weekly_editorial`
- [x] daily auto article can be created from same-day marts
- [x] weekly editorial supports draft, edit, revision history, and scheduled publish
- [x] evidence blobs/attachments are linked to article sections
- [x] auto article suppresses when evidence checks fail
- [x] standings snapshot is attached correctly to the daily recap context

### Data tests
- [x] daily editorial marts produce expected league summaries
- [x] weekly recap marts produce correct rolled-up comparisons
- [x] facts, derived metrics, and hypotheses remain distinct in stored output shape

### E2E tests
- [x] published daily recap renders correctly
- [x] published weekly editorial renders correctly
- [x] unpublished draft is not public

### Pass condition
- [x] both editorial flows are functional, evidence-backed, and permission-safe

---

## Sprint 5 Gate: Scale Layer

### Integration tests
- [x] app-level rate limit blocks excess AI/comment requests through the scale abstraction
- [x] local scale abstraction blocks excess comment writes and stays Upstash-compatible
- [x] public cache serves hot read paths without leaking private data
- [x] request coalescing prevents duplicate hot-path work
- [x] AI queue gating rejects or defers excess concurrent work cleanly
- [x] heavy jobs move to worker path instead of blocking request handlers
- [x] snapshot/evidence storage writes to Postgres now, with object-storage handoff deferred behind the R2 seam

### Performance tests
- [x] hot live endpoint survives target concurrent load
- [x] concurrent AI request simulation stays within latency/error thresholds
- [x] comment burst test stays within error threshold
- [x] queue backlog simulation degrades gracefully instead of cascading failure

### Security checks
- [x] private responses are not cached in shared cache
- [x] cache keys vary by auth/privacy context where required

### Pass condition
- [x] app has the minimum cache, rate-limit, and workload isolation primitives needed for public launch

---

## Sprint 6 Gate: Security, Reliability, Operations

### Security tests
- [x] CSRF protection blocks forged authenticated writes where applicable
- [x] object-level authorization blocks access to another user’s private objects
- [x] webhook signature verification rejects invalid signatures
- [x] webhook replay protection rejects duplicate/replayed events
- [x] logging redaction excludes secrets, provider tokens, and forbidden sensitive fields

### Reliability tests
- [x] idempotent write paths tolerate retries without duplicate side effects
- [x] migration apply process works on a clean DB and a live-like DB state
- [x] backup/restore drill instructions are executable
- [x] incident kill switches disable AI/comments/signups/auto-publish as intended

### E2E tests
- [x] full auth -> comment -> AI -> article -> moderation flow passes
- [x] admin actions are accessible only to admin/mod roles

### Pass condition
- [x] launch-blocking security and operational controls are in place and verified

---

## Sprint 7 Gate: Monetization And Entitlements Readiness

### Integration tests
- [x] token/cost ledger records usage accurately
- [x] entitlement checks gate higher-cost AI actions correctly
- [x] budget cap logic disables or downgrades usage at the right threshold
- [x] free-tier and paid-tier limits diverge correctly

### Pass condition
- [x] the platform can support pricing and usage control without redesigning core AI access

---

## Failure Triage Protocol

When a sprint gate fails:
1. identify whether the failure is:
   - code defect
   - test defect
   - fixture/data defect
   - environment/config defect
2. fix the smallest correct layer first
3. rerun the failed suite
4. rerun the full sprint gate
5. only then continue

Never mark a sprint complete if:
- [ ] a critical test is skipped without documented reason
- [ ] a failing test is removed instead of fixed without explicit design approval
- [ ] behavior changed but no verification was added

---

## Reviewer Checklist

Before a sprint is marked complete:
- [ ] roadmap sprint checkbox items are updated
- [ ] supporting doc checkboxes are updated where relevant
- [ ] the green command list is recorded in the completion note or PR description
- [ ] known residual risks are documented explicitly

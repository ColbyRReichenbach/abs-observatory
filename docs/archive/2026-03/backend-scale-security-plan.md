# AiBS Backend, Scale, and Security Plan

This document is the working source of truth for backend architecture decisions, scale assumptions, security requirements, and deferred work that must remain visible as implementation continues.

It is intentionally practical:
- what we are building now
- what we are explicitly not building now
- what must be easy to add later
- what can break under load if we ignore it

---

## Execution Tracking

Canonical sprint tracking lives in [roadmap.md](../../product/roadmap.md).
Canonical sprint verification lives in [sprint-test-plan.md](../../product/sprint-test-plan.md).

This checklist keeps the major backend/product decisions visible here:
- [x] Sprint 1 complete: auth, profiles, comments, moderation baseline. `[Stack: Clerk, Next.js, Postgres]`
- [x] Sprint 2 complete: AI route hardened and typed-tool-only. `[Stack: Next.js, OpenAI, Postgres]`
- [x] Sprint 3 complete: full-game pitch/event ingest and derived ABS marts. `[Stack: MLB StatsAPI, Python ETL, Postgres]`
- [x] Sprint 4 complete: editorial platform with daily auto recaps and weekly editorial workflow. `[Stack: Postgres, MLB StatsAPI, Next.js]`
- [x] Sprint 4 complete: editorial platform supports `daily_auto` and `weekly_editorial`. `[Stack: Next.js, Postgres, MLB StatsAPI]`
- [x] Sprint 5 complete: cache, rate-limit, and worker scale primitives. `[Stack: Upstash Redis, Cloud Run Jobs, Postgres]`
- [x] Sprint 6 complete: launch-blocking security, reliability, and operations work. `[Stack: Clerk, Next.js, Postgres, Vercel]`
- [x] Sprint 7 complete: billing and entitlement seams are ready if needed. `[Stack: Postgres, OpenAI, Next.js]`

---

## 1) Product Direction

Primary launch shape:
- public consumer-facing MLB ABS analytics product
- authenticated accounts for all write actions
- verified identity required before commenting or profile creation
- live game analytics + postgame articles + AI baseball assistant

Initial product rules:
- one account per verified identity
- no anonymous posting
- comments are plain text only
- no images or file uploads in comments
- no rich embeds in comments
- no arbitrary HTML or markdown in comments
- AI is baseball-scoped only
- no interactions without auth:
  - no commenting
  - no liking/reacting
  - no posting
- verified identity required before any write action
- profile pictures limited to approved presets:
  - internal SVG avatar set
  - approved team logos
- no custom user-uploaded profile images in v1
- comments may be unlimited for product purposes, but always subject to anti-spam/rate controls

---

## 2) What Exists Now

Already implemented or started:
- Next.js frontend and app-router APIs
- Postgres analytics schema for games, pitches, challenges, reports, ETL runs
- MLB StatsAPI ingest scripts
- production backend foundation schemas:
  - `product`
  - `community`
  - `editorial`
  - `ai`
  - `ops`
- initial APIs for:
  - `/api/me`
  - `/api/profile`
  - `/api/articles`
  - `/api/comments`
  - `/api/ai/chat`
  - `/api/webhooks/clerk`
- optional Clerk integration path

Not yet fully implemented:
- actual email/SMS auth UX
- hard rate limiting
- Redis cache
- queue/worker-backed AI execution
- load shedding
- dedicated moderation dashboard
- article publishing pipeline into new editorial tables
- strong CSRF and security headers layer
- prompt-injection hardened typed AI tools only path replacing old NL-to-SQL public route

---

## 2.1) Editorial Direction

We are explicitly supporting two editorial products with different data and publishing rules.

### Daily automated league recap
- one automated article per day after the full slate is stable
- should summarize:
  - game outcomes
  - major events
  - standings movement
  - league-wide ABS trends for the day
  - biggest favorable/unfavorable challenge outcomes
  - a small set of precomputed charts
- should rely primarily on:
  - StatsAPI
  - our own full-game ingest
  - same-day derived marts
- should not depend on delayed enrichment sources to publish
- should be evidence-backed and suppressible if validation fails

### Weekly human-written recap
- one editorial recap at the start of each week
- written manually
- should summarize:
  - prior-week league-wide ABS behavior
  - team and umpire trends
  - comparison to season-to-date behavior
  - deeper analysis and hypotheses
  - richer visualizations
- can and should use slower enrichment inputs:
  - Savant / Statcast
  - broader weekly marts
  - contextual factors such as day/night splits, venue, weather, roof state, glare proxies if added later
- interpretations and hypotheses must remain clearly separate from hard facts

### Editorial data rules
- facts, derived metrics, and editorial hypotheses must remain distinct in storage and rendering
- direct causal statements should be made only when the overturned call directly changed the PA outcome
- downstream effects should be labeled as changed context or changed count, not guaranteed causality
- `editorial.articles` should support at least:
  - `daily_auto`
  - `weekly_editorial`
- weekly editorials should support:
  - draft state
  - manual revision history
  - evidence attachments
  - scheduled publish

---

## 3) Non-Negotiable Security Rules

### Auth and identity
- all write actions require authenticated, verified identity
- verification must be by email or SMS
- account uniqueness is enforced by auth provider identity, not display name
- no multiple local accounts for the same verified auth identity
- admin/moderator roles must be explicit and server-enforced
- support Google and X/Twitter OAuth if desired, but still prefer verified email presence where available
- keep verified email fallback for accessibility and account recovery
- plan for account linking later across providers
- add revoke-all-sessions capability later
- never trust client-side auth state for any privileged action
- for launch, direct email/phone auth abuse controls can remain lighter, but verified identity for writes is still required

### Input safety
- all request bodies validated with `zod`
- all database access parameterized
- no string-built SQL using user input
- comments stored as plain text only
- no raw HTML rendering from user content
- no user-uploaded images in comments for v1
- profile fields sanitized and length-limited
- usernames normalized before validation
- usernames checked against profanity, impersonation, and obfuscation patterns
- no unicode confusables, emojis, or alternate-script lookalikes in usernames
- no spaces in usernames
- no special characters in usernames beyond `_`
- suggested username rule:
  - `[a-z0-9_]{3,16}` or `[a-z0-9_]{3,20}`
- reserve system and impersonation-sensitive names:
  - `admin`
  - `support`
  - `mlb`
  - team names
  - player names
  - official org names

### AI safety
- no public arbitrary NL-to-SQL in final production path
- AI only calls typed tools over curated marts
- model never gets direct DB credentials
- tool outputs must be bounded, typed, and size-limited
- AI responses logged for abuse review
- prompt content treated as untrusted input
- route/page context supplied by server, not trusted from client alone
- all retrieved text is untrusted:
  - user prompts
  - comments
  - articles
  - future external content
- do not allow model instructions from retrieved content to override system/tool rules
- AI must never:
  - execute arbitrary SQL
  - call arbitrary URLs
  - access secrets
  - access raw PII beyond minimal abuse-review identifiers
- add protections for:
  - prompt flooding
  - repeated retries
  - tool-call loops
  - cost abuse
- inputs remain text-only
- enforce max prompt length
- enforce max conversation turns per window
- enforce max model output size
- enforce max tool calls per response
- enforce max tool result size
- enforce default time windows per tool
- model should know only the allowed tools, tables, marts, and relevant timeframes
- model should never attempt broad unbounded scans across all data
- add account-level AI suspension
- add IP-level AI throttling
- add prompt dedupe/cache for common analytical prompts
- build stable machine error codes for:
  - overload
  - banned/suspended
  - maintenance/provider outage
  - auth required
  - quota exceeded
  - invalid request
- branded fallback messaging is allowed, but must map to stable machine-readable codes

### Abuse prevention
- rate limit by IP
- rate limit by authenticated user
- stricter rate limit on AI and comments than on reads
- moderation pipeline for comment text
- audit logs for admin/mod actions
- reject suspicious oversized payloads early
- do not rely on IP bans alone
- enforcement must be layered:
  - warning
  - user suspension
  - temporary IP block
  - device/session reputation later
- IP bans should be temporary and risk-based
- preserve moderator notes and appeal state later
- links in comments should be blocked in v1
- detect obvious URL patterns:
  - `http://`
  - `https://`
  - `www.`
  - common TLD strings like `.com`, `.net`, `.io`
- add repeated-message and near-duplicate spam detection later

---

## 4) Scaling Principles

Current state is not enough for large spikes.

If a social post sends 5k signups or a few hundred concurrent users, the likely failure points are:
- DB saturation
- too many direct Postgres reads from app routes/server components
- inline AI requests causing latency spikes
- comment bursts creating hot write paths
- lack of cache for live/public data

### Therefore the architecture must preserve these upgrade paths:
- Redis cache in front of hot reads
- dedicated worker/queue for AI, moderation rescans, article generation, and enrichment
- separation of read traffic from write traffic
- DB connection pooling suitable for deployed environment
- background ingest separated from web request path
- precomputed marts for historical AI answers

### Scale priorities by traffic type

#### Live viewers
Primary strategy:
- cache heavily
- short TTLs
- avoid recomputing the same live game payload repeatedly

#### Commenting
Primary strategy:
- simple append-only writes
- small payloads
- moderation status on insert
- async follow-up processing where possible
- per-user and per-thread rate limits
- duplicate or near-duplicate spam detection later
- thread locking for abuse spikes later

#### AI traffic
Primary strategy:
- queue and cap concurrency
- cache repeat analytical questions
- query marts, not raw fact tables
- enforce quotas and request budgets

---

## 5) What Must Be Server Side vs Client Side

### Server side only
- authentication and session resolution
- role checks
- email/SMS verification enforcement
- all database reads/writes that include protected or write data
- AI tool execution
- moderation decisions
- rate limiting
- article generation and publishing
- polling MLB APIs
- historical enrichment and precompute jobs
- audit logging

### Client side acceptable
- UI state
- chart rendering
- local filters/sorting on already-fetched small datasets
- optimistic comment UI after server acknowledgement
- live polling of already-cached public endpoints if needed

### Mixed
- page shell can be server-rendered
- client may revalidate or refresh live panels
- heavy analytics queries should resolve on server, chart interaction stays client-side
- client timezone display conversion happens client-side only
- server and DB remain UTC only

Rule:
- if it changes data, enforces access, touches secrets, or affects billing/cost, it stays server side

Additional rule:
- if a feature can be abused for spam, impersonation, moderation evasion, or cost amplification, enforcement belongs server side

---

## 6) Performance Rules

### Load speed
- keep public pages mostly read-only and cacheable
- avoid N+1 queries from server components
- prefer aggregated reads for home/team/umpire pages
- precompute repeated analytical summaries
- avoid large AI payloads in initial page load

### Query speed
- query marts for AI and dashboards
- index by `game_pk`, team, umpire, published status, conversation id, thread id, created_at
- partition large fact tables by season/date later
- avoid scanning raw pitch tables in live request path
- default analytics pages to the smallest useful filter window on first load
- avoid loading `30d`, `season`, or `all` by default when `7d` is sufficient for initial render
- lazy-load heavier ranges and deeper tables/charts

### AI speed
- cap concurrent requests
- small typed tool responses
- cache common count/zone/history prompts
- precompute historical split tables
- stream only after the backend path is stable

### Page response time
- public APIs should be cache-first where possible
- live game endpoints can use short TTL cache
- comments and profile endpoints should be fast writes with small responses
- AI endpoints should degrade gracefully under load instead of blocking the rest of the app

### Cache privacy rules
- public read endpoints may be cached
- user-specific, moderator-specific, admin-specific, and AI-history endpoints must not be cached in shared caches
- shared cache keys must never rely on URL alone if response differs by auth state or role
- cache keys must vary by auth/privacy context when necessary
- do not cache private profile, moderation, or transcript responses in public/CDN layers
- prevent cache poisoning from suspicious or adversarial prompt classes
- prevent cross-user conversation/tool-result cache reuse

### Logging and secret hygiene
- never log raw auth headers, session tokens, DB URLs, webhook secrets, or provider secrets
- never log full request bodies by default for auth or moderation endpoints
- AI prompts/responses may contain sensitive content and require controlled logging rules
- structured logs should redact sensitive fields before emission

### Authorization and object access
- every protected object fetch/update must enforce ownership or role checks
- do not trust object IDs alone
- conversations, profiles, moderation records, and admin objects require object-level authorization

---

## 7) Data Source Strategy

### StatsAPI
Use for:
- live game discovery
- live game state
- pitch/play feed
- challenge events
- linescore
- context metrics
- win probability when available

### Baseball Savant
Use for:
- batch historical enrichment
- count-state splits
- pitch-location and zone analysis
- expected metrics
- preview and AI analytical context

### Retrosheet
Use later if needed for:
- deeper historical non-Statcast era analysis

### Product rule
- StatsAPI is live backbone
- Savant is analytical enrichment
- Savant should not be required for live game correctness

---

## 8) Historical Precompute Strategy

We should not recompute all historical data every day.

### Stable baseline tables
Examples:
- since-2015 count-state BA / OBP / SLG / wOBA
- handedness splits
- pitch-type by count
- zone buckets by count

Refresh policy:
- initial backfill
- then only when logic changes or new season backfill occurs

### Rolling season tables
Examples:
- 2026 current-season count-state stats
- last-year vs this-year splits
- season-to-date team/umpire/player challenge behavior

Refresh policy:
- nightly minimum
- optionally intra-day for game days

### Live context tables
Examples:
- challenge remaining
- current count
- inning / score / outs
- live win probability

Refresh policy:
- StatsAPI live only

Baseball data edge cases that must be handled:
- game status transitions:
  - `Preview -> Live -> Delayed -> Resumed -> Final`
- postponed, suspended, resumed, and doubleheader cases
- MLB stat corrections after game final
- challenge events appearing at play-level vs event-level
- missing `absChallenges` on some game formats or incomplete feeds
- timezone boundary issues around midnight and local game date
- official game date should be stored separately from UTC timestamps when useful for product display

### Migration and deploy safety
- schema changes should be forward-compatible during deploy windows
- avoid destructive migrations without backfill or transition path
- plan for rollback/roll-forward procedures
- do not let live reads/writes break during schema rollout

---

## 9) AI Product Rules

The AI must answer two classes of questions:

### A. Live factual questions
Examples:
- what happened on this challenge?
- how many challenges remain?
- what is the current count/state?

Answer from:
- live StatsAPI-derived data

### B. Historical analytical questions
Examples:
- how does 3-1 compare to 2-2 historically?
- how often are low-away strikes overturned?
- does this umpire have a count-based pattern?

Answer from:
- precomputed marts built from Savant + internal facts

### AI implementation rules
- do not use raw public NL-to-SQL as final production path
- use typed tools
- every tool must have bounded input/output
- every answer should cite tool sources or marts
- AI logs stored for audit and safety review
- add global daily/monthly AI spend caps
- add per-user daily/monthly token budgets
- add provider/model circuit breaker when budget threshold is hit
- add app-level kill switch for AI traffic
- key rotation is incident response, not the primary quota mechanism
- if budget or abuse threshold is hit, AI should be disabled by policy and return safe fallback errors
- AI should have a global disable switch

---

## 10) Comment System Rules

Initial launch constraints:
- authenticated and verified users only
- plain text only
- no images
- no links if abuse becomes a problem
- max length capped
- per-user and per-thread rate limits
- structured reactions may be added before rich discussions
- no comment interactions at all for signed-out users
- edited comments, if allowed later, must have:
  - short edit window
  - stored original content
  - moderation recheck
- reply depth should be limited later
- old threads may be locked later for abuse or staleness
- deleted comments should preserve thread structure where possible
- default deleted-comment behavior:
  - original text removed from user view
  - placeholder remains, such as `Comment removed`
  - replies may remain attached
- only legal/privacy deletion paths should require hard deletion of full thread content

Moderation rules:
- profanity/toxicity pre-check on submit
- comments can be `published` or `pending_review`
- report, hide, restore, soft-delete supported
- moderator actions must be logged
- policy should be category-based, not just swear-word based:
  - general frustration may be allowed
  - slurs, threats, harassment, doxxing, self-harm encouragement, targeted abuse are disallowed
- username moderation must also catch:
  - misspellings on purpose
  - number-for-letter substitutions
  - impersonation attempts
- strike system is acceptable, but should escalate by enforcement window:
  - warning
  - short suspension
  - longer suspension
  - permanent account ban
- early spam controls should include:
  - comments per minute
  - comments per thread per window
  - stricter limits for very new accounts
  - higher limits later for trusted older accounts

Future upgrade path:
- thread lock
- temporary cooldowns
- trust score
- auto-freeze abusive threads
- moderator appeal flow
- mass-report abuse detection
- anti-brigading heuristics

### Admin and moderator security
- admin and moderator actions must be server-enforced
- admin endpoints must be isolated from normal user surfaces
- all admin/mod actions logged in immutable audit logs
- later add step-up authentication for sensitive admin actions
- role changes and badge changes should generate audit events
- admin and moderator consoles should be easy to disable globally in an incident

### Badge and verification rules
- badges must be separate from auth roles
- planned badge types:
  - `admin`
  - `moderator`
  - `verified_org`
  - possible later:
    - `player`
    - `alumni`
    - `media`
- badge grants and revokes must be manual or tightly controlled
- do not issue org verification from email domain alone without review
- all badge grants/revokes logged in audit trail

### Legal and trademark rules
- MLB logos, marks, headshots, and branding should be treated as MLB-owned assets
- attribution alone is not a substitute for permission
- About/legal page can include rights and ownership acknowledgment, but that does not resolve licensing risk
- do not republish full MLB editorial copy unless rights are clear
- keep a legal-review item for commercial distribution and asset usage

### Editorial integrity rules
- generated articles should not publish if evidence checks fail
- auto-publish must be suppressible globally
- retain source/evidence snapshots for article claims
- clearly track internally whether content was AI-generated, human-edited, or mixed

---

## 11) Immediate Build Priorities

These should guide implementation order from here:

1. Replace the public AI path with typed-tool production flow
2. Wire real auth provider and verified signup flow
3. Apply new DB schema in dev/staging
4. Build editorial article persistence and publishing workflow
5. Add server-side rate limiting primitives
6. Introduce Redis caching for public read APIs
7. Add queue/worker path for AI and article generation
8. Add moderation review states and admin tooling
9. Define username normalization and reserved-name enforcement
10. Define account deletion and retention behavior
11. Define cache privacy rules in implementation docs
12. Add AI budget controls and kill switches
13. Add link blocking in comments
14. Add UTC-only backend / local-only frontend timezone policy in implementation docs
15. Add analytics default-range and lazy-load rules to page implementation
16. Add idempotency keys/strategy for write paths and jobs
17. Define migration safety and deployment rules
18. Define logging redaction rules
19. Add incident kill switches for AI/comments/article publishing

---

## 12) Deferred But Must Stay Visible

These do not all need to be implemented now, but code decisions must not block them:

### Scale backlog
- Redis cache
- CDN/cache strategy for public JSON endpoints
- queue for AI and jobs
- worker service outside web tier
- load shedding and concurrency limits
- background precompute refresh jobs
- DB partitioning for large fact tables
- stronger deployment-specific connection pooling
- queue prioritization by workload class:
  - live reads highest
  - comments/writes high
  - AI interactive medium-high
  - article generation medium
  - enrichment/backfill low
- queue age thresholds and graceful degradation rules
- request coalescing for hot live game endpoints
- polling storm prevention for hot live games

### Reliability backlog
- idempotency for:
  - comment creation
  - article publish
  - webhook sync
  - ETL ingest
  - AI logging
- dead-letter queues for failed jobs
- replay-safe retry handling
- moderation and strike race-condition handling
- webhook ordering tolerance for `created`, `updated`, and `deleted` races

### Security backlog
- CSRF protection for state-changing browser endpoints
- stricter response security headers
- secret rotation workflow
- anomaly detection on AI/comment abuse
- moderator/admin internal console auth hardening
- retention and deletion policies
- account deletion/export flows
- session revocation flow
- reserved-name and impersonation review tooling
- encrypted sensitive auth-linked fields where justified
- credential stuffing and signup abuse protection later
- admin step-up auth later
- webhook replay protection
- webhook delivery-id logging and dedupe
- search/retrieval abuse controls if search is added
- output validation/post-processing on risky AI responses
- route-specific authorization regression tests

### Observability backlog
- structured request tracing
- dashboards for:
  - auth failures
  - AI cost spikes
  - ingest lag
  - DB latency
  - moderation backlog
- SLOs for public API latency

### Privacy backlog
- minimize stored PII:
  - auth provider ID
  - verified email
  - phone only if needed for auth
- do not expose email/phone to AI tools
- define transcript retention windows
- define user-content retention windows
- decide whether deleted users leave comments as `deleted user` or trigger hard deletion

### Search and retrieval backlog
- if search or retrieval is added, hidden/deleted/suppressed content must not be indexed into public or user-visible retrieval surfaces
- AI retrieval must not surface moderator-only or private data

### Environment separation backlog
- dev, staging, and prod must have separate:
  - DBs
  - auth secrets
  - AI budget caps
  - webhook secrets
- do not mix environment data or credentials

### Incident controls backlog
- add global kill switches for:
  - AI
  - comments
  - signups
  - article auto-publish
- these should not require redeploy to activate

### Billing and entitlements backlog
- add per-user cost ledger for AI usage
- add per-feature token accounting
- define entitlements model before paid launch
- likely future tiers:
  - free: comments + very limited AI
  - tier 1: more AI + higher limits
  - tier 2: higher AI limits and premium analytics
  - tier 3: highest limits + editorial/authoring tools
- pricing should be based on measured cost and target margin, not guesswork
- billing logic may be scaffolded before monetization is active

---

## 13) Things We Must Not Do

- do not trust client-provided auth or role context
- do not let AI write SQL against production DB
- do not make raw fact-table scans part of hot public request paths
- do not couple live page correctness to Savant availability
- do not allow HTML/image comments in v1
- do not build auth only in the client
- do not block public reads on AI or moderation workloads
- do not let retrieved user content inject tool/model behavior
- do not use IP-only enforcement as the sole abuse response
- do not auto-verify official org status from weak signals alone
- do not use API key rotation as the main AI quota control path
- do not cache private responses in shared caches
- do not default heavy analytics pages to full-history queries
- do not trust unsigned or replayed webhooks
- do not deploy schema changes without compatibility plan
- do not emit secrets or sensitive payloads into logs
- do not allow object access based only on guessed IDs
- do not assume input screening alone is enough; output controls matter too

---

## 14) Definition of “Safe Enough To Grow”

We are not trying to make the first version infinitely scalable.

We are trying to make sure:
- the architecture does not paint us into a corner
- obvious abuse paths are closed
- traffic spikes degrade gracefully
- live reads stay faster than writes
- AI cannot become a security hole
- historical analytics can expand without rewriting the whole stack
- moderation remains manageable without requiring a rewrite
- identity, badges, and enforcement rules can tighten later without data-model churn
- AI cost can be bounded without emergency architecture changes
- legal/trademark review can be resolved without tearing apart product surfaces
- incidents can be contained quickly with operational kill switches
- schema evolution can happen without destabilizing the product

When future scale work happens, this file should be updated rather than replaced.

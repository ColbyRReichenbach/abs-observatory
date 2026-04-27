# AiBS AI Backend Plan

> Status note: this is a retained April 2026 backend implementation plan. Use [../reference/technical.md](../reference/technical.md), [../reference/security.md](../reference/security.md), and [../product/product-source-of-truth.md](../product/product-source-of-truth.md) for current runtime truth.

This document defines the production AI backend for AiBS:
- endpoint surface
- tool architecture
- security controls
- quota and pricing controls
- cache and queue policy
- fallback behavior
- abuse enforcement

The AI backend is treated as a protected subsystem, not just a single model call.

---

## Execution Tracking

Canonical sprint tracking lives in [roadmap.md](../product/roadmap.md).
Canonical sprint verification lives in [sprint-test-plan.md](../archive/product/sprint-test-plan.md).

This checklist keeps the major AI backend milestones visible here:
- [x] AI route is authenticated, validated, and refusal-capable before model execution. `[Stack: Clerk, Next.js, OpenAI]`
- [x] Typed tool registry replaces production NL-to-SQL. `[Stack: Next.js, Postgres, OpenAI]`
- [x] AI strike, suspension, and audit logic is implemented. `[Stack: Postgres, Next.js]`
- [x] Output validation, citations, and fallback error codes are implemented. `[Stack: Next.js, OpenAI]`
- [ ] Redis-backed quotas, cache, and concurrency controls are implemented before ship. `[Stack: Upstash Redis, OpenAI]`
- [x] Heavy analytical AI work is moved to worker-backed execution before ship. `[Stack: Cloud Run Jobs, Next.js]`

---

## 1) Goals

The AI backend must:
- answer baseball-related questions only
- use bounded server-side tools over curated data
- avoid arbitrary DB access
- control model cost tightly
- degrade safely under load
- log enough for abuse review and cost accounting
- remain evolvable as new data sources and product surfaces are added

It must support:
- public product users
- future org-specific surfaces
- chart-context questions
- game/team/umpire/article context
- historical analytical questions

---

## 2) Core Principles

1. No public arbitrary NL-to-SQL in production.
2. No direct DB access from the model.
3. All model-accessible data comes from typed tools.
4. All prompts, comments, and retrieved text are untrusted.
5. Tool outputs are bounded in size, scope, and timeframe.
6. Costs are budgeted at user, tier, and global levels.
7. All AI answers are observable, auditable, and kill-switchable.

---

## 3) Endpoint Surface

### `POST /api/ai/chat`
Primary interactive AI endpoint.

Request:
- authenticated user only
- JSON body:
  - `conversationId?`
  - `message`
  - `context`
    - `scope`
    - `entityId?`
    - `range?`
    - `gameStatus?`
  - `intentHint?`
    - `chat`
    - `compare`
    - `explain_chart`
    - `generate_chart`

Response:
- `conversationId`
- `answer`
- `citations`
- `toolResultsSummary`
- `confidence`
- `safetyDisposition`
- `usage`
- `errorCode?`

### `GET /api/ai/conversations/:id`
Returns prior conversation for authenticated owner or admin.

### `POST /api/ai/feedback`
Stores user feedback on answer quality, hallucination, or abuse.

### `POST /api/ai/admin/disable`
Internal only.
Global AI kill switch.

### `POST /api/ai/admin/user-suspend`
Internal only.
Suspend AI access for a user.

### `GET /api/ai/admin/usage`
Internal only.
Usage, cost, abuse, backlog, latency.

---

## 4) Request Classes

### A. Fast interactive
Examples:
- explain a chart
- summarize a live game state
- compare two short-range team stats
- explain what a challenge changed

Policy:
- synchronous
- max 1-3 tool calls
- smaller model by default

### B. Heavy analytical
Examples:
- cross-season historical comparison
- wide count-state breakdowns
- batch article assistance
- large chart generation requests

Policy:
- queued/background
- user receives pending status / retry token later
- lower-priority than live product reads

---

## 5) Model Routing

### Cheap contextual model
Use for:
- short contextual answers
- chart explanation
- in-modal assistant copy
- low-cost summaries

### Stronger reasoning model
Use for:
- multi-tool synthesis
- article assistance
- heavier comparison/explanation tasks
- chart narrative generation if needed

Rules:
- default to cheaper model
- escalate only when classification says it is necessary
- model choice is server-side, never client-selected

---

## 6) Tool Catalog

All tools are server-side and deterministic.

### Live / current context tools
- `get_live_games(limit)`
- `get_game_summary(gamePk)`
- `get_game_live_status(gamePk)`
- `get_game_challenges(gamePk, limit)`
- `get_game_report(gamePk)`

### Entity analytics tools
- `get_team_summary(teamId, range)`
- `get_team_trend(teamId, range)`
- `get_umpire_summary(umpireId, range)`
- `get_umpire_profile(umpireId, range)`

### Historical analytical tools
- `get_count_state_baseline(countState, range, handedness?)`
- `get_count_state_delta(fromCount, toCount, range, handedness?)`
- `get_zone_outcome_baseline(zoneBucket, range, handedness?)`
- `get_pitch_type_count_baseline(pitchType, countState, range)`

### Editorial / content tools
- `search_articles(query, limit)`
- `get_article(slug)`

### Visualization tools
- `get_chart_dataset(chartId, filters)`
- `build_chart_spec(chartTemplateId, datasetId)`

---

## 7) Tool Safety Rules

Every tool must define:
- allowed parameters
- default timeframe
- max timeframe
- max rows
- max payload size
- schema of return object

Every tool must reject:
- open-ended scans
- unbounded date ranges
- arbitrary grouping instructions
- user-specified SQL
- user-specified URLs

Rule:
- tool results should usually be summarized/aggregated before being passed to the model

---

## 8) Prompt Architecture

The system prompt should encode:
- baseball-only scope
- refusal policy
- tool usage rules
- citation rules
- uncertainty rules
- no speculation beyond tool outputs

The model should receive:
- user question
- server-resolved route context
- tool outputs
- compact metric dictionary if needed

The model should not receive:
- raw DB schema dump unless necessary for an internal-only tool
- secrets
- unrestricted historical raw tables
- moderation/admin/private user content

---

## 9) Prompt Injection Defense

Untrusted sources:
- user prompts
- article text
- comments
- future imported text

Rules:
- untrusted text is data, never instruction
- retrieved text cannot override system/tool policy
- model never receives capability descriptions beyond allowed tools
- no hidden/system prompt leakage should ever change permissions

Detection policy:
- classify prompt for:
  - baseball relevance
  - system override attempts
  - secrets/data exfiltration attempts
  - tool misuse attempts
  - harassment/abuse

If suspicious:
- respond with refusal or generic baseball-only fallback
- log safety event
- optionally issue strike / timeout

Additional edge cases:
- tool-result poisoning from user-generated content
- cache poisoning via adversarial prompts
- route/tool mismatch if server policy is too loose

Mitigations:
- sanitize and clearly delimit untrusted retrieved text
- do not cache blocked or suspicious prompts
- enforce route-specific allowed-tool sets server-side

---

## 10) Pre-API and Pre-Model Validation

We cannot reliably catch abuse before the request reaches our API, because the server must receive the request to evaluate it.

But we can apply staged defenses:

### Before model call
- auth check
- rate limit
- quota check
- payload schema validation
- prompt length cap
- token estimate cap
- baseball-scope classification
- injection/misuse classification
- account suspension check

If blocked here:
- no model call is made
- low-cost refusal response is returned
- abuse metadata is logged

Classifier quality caveat:
- false positives and false negatives must be expected
- first-strike enforcement should remain reviewable
- logs should support safe tuning of the classifier over time

---

## 11) Misuse Enforcement

### AI strike policy

#### Strike 0
- normal usage

#### Strike 1
- timed AI suspension for fixed window
- user informed:
  - misuse detected
  - account received one strike
  - manual review may occur

#### Strike 2
- AI access suspended pending manual review
- moderator/admin review required
- user informed suspension is pending review

#### Strike 3
- indefinite AI ban by default
- manual appeal path only

Rules:
- all strikes manually reviewable
- strike logic applies to AI misuse only, not necessarily whole-account moderation unless policy escalates
- store:
  - triggering prompt
  - classification reason
  - timestamp
  - enforcement action
  - reviewer decision

Concurrency edge case:
- strike increments and suspensions must be transaction-safe to avoid duplicate or conflicting enforcement under concurrent requests

### Abuse signals to count
- repeated override attempts
- repeated secret extraction attempts
- repeated prompt flooding
- repeated quota evasion behavior
- bot-like repetition across IP/session/account

---

## 12) Rate Limits and Quotas

### Rate limits
- per IP
- per authenticated user
- per conversation
- stricter on heavy routes than lightweight routes

### Quotas
- per day request count
- per day token budget
- per month token budget
- per tier feature entitlements

### Global controls
- daily global AI spend cap
- monthly global AI spend cap
- per-model cap
- global kill switch

When caps are hit:
- AI path returns fallback errors
- app remains otherwise functional

---

## 13) Cost Controls

Required controls:
- max prompt length
- max output length
- max tool calls per response
- max tool result size
- max conversation turns in rolling window
- cached answer reuse for common analytical prompts
- lower-cost model default
- stronger model only when necessary

Important rule:
- API key rotation is not the primary budget control mechanism
- app-level gates and kill switches are primary

---

## 14) Cache Policy

Use Redis for:
- rate limiting
- quota state
- repeated prompt dedupe
- cached answers for high-frequency historical questions
- hot tool-result caching

Good cache targets:
- historical count-state questions
- repeated entity summary questions
- chart explanation prompts for public pages

Do not cache publicly:
- private conversations
- profile-linked AI history
- moderator/admin responses

Additional cache risks:
- prevent cross-conversation contamination
- prevent cross-user cache reuse
- ensure cache keys scope by user/privacy context where required

---

## 15) Queue Policy

Interactive AI should not compete equally with low-priority jobs.

Queue priorities:
1. Live product reads
2. Comment and moderation writes
3. Interactive AI requests
4. Article generation
5. Historical enrichment / backfills

Queue safety:
- queue age thresholds
- dead-letter handling
- graceful degradation
- drop/defer lowest-priority workloads first

---

## 16) Confidence and Refusal Layer

We may add a lightweight classification layer before model invocation.

Use it for:
- baseball relevance
- misuse detection
- likely confidence / answerability

If confidence is below threshold:
- avoid expensive model call where appropriate
- return generic safe response:
  - “I can help with baseball-related questions and AiBS analytics.”

This classifier can be:
- a small model
- deterministic rules plus heuristics
- hybrid

Do not overcomplicate this initially.

---

## 17) Chart Generation Policy

Important rule:
- the model should not directly design arbitrary charts from scratch against unrestricted database queries

Recommended architecture:
1. Server picks approved chart template
2. Server fetches bounded dataset
3. Server builds constrained chart spec
4. Model may explain or lightly annotate chart

Good pattern:
- chart template library is deterministic and branded
- only data bindings vary

Avoid:
- model inventing chart anatomy freely
- model querying DB directly for chart data
- model seeing raw schema and unrestricted instructions

The chart system should be:
- template-first
- design-system-consistent
- data-variable, not structure-variable

---

## 18) Error Codes and Fallback UX

Stable machine codes:
- `AI_AUTH_REQUIRED`
- `AI_INVALID_REQUEST`
- `AI_NOT_BASEBALL_RELATED`
- `AI_LOW_CONFIDENCE`
- `AI_QUOTA_EXCEEDED`
- `AI_OVERLOADED`
- `AI_PROVIDER_DOWN`
- `AI_TEMP_SUSPENDED`
- `AI_MANUAL_REVIEW`
- `AI_BANNED`

Human-facing branded messaging can be baseball-themed, for example:
- overload:
  - “The stadium is packed. Please try again in a few minutes.”
- suspended:
  - “We detected AI misuse. Your access has been temporarily suspended.”
- provider outage:
  - “We struck out. AI maintenance is in progress.”

Output-side safety:
- responses should be checked for:
  - excessive raw tool-data dumping
  - missing citations when citations are required
  - obvious internal identifier leakage
  - policy-violating output in risky contexts

---

## 19) Logging and Observability

Log:
- user id
- conversation id
- route context
- tool names
- tool latency
- model name
- input/output token counts
- estimated cost
- safety disposition
- refusal/fallback reason

Do not log raw secrets.

Track dashboards for:
- request volume
- latency
- model cost
- tool failure rate
- abuse blocks
- strike events
- queue backlog
- classifier false-positive rate
- suspicious repeated blocked prompt patterns
- cache anomaly signals

Use OpenTelemetry-compatible tracing where possible.

---

## 20) Database Tables Needed

These map to the schema already started:
- `ai.conversations`
- `ai.messages`
- `ai.tool_calls`
- `ai.safety_events`
- `ai.cost_events`
- `ops.audit_log`
- `ops.rate_limit_events`

Future additions:
- `ai.user_entitlements`
- `ai.usage_ledger`
- `ai.abuse_strikes`
- `ai.model_circuit_breakers`

---

## 21) Tiering and Billing Readiness

Billing does not need to be active immediately, but instrumentation must support it.

Potential future tiers:
- free:
  - comments
  - minimal AI allowance
- tier 1:
  - more AI
  - higher limits
- tier 2:
  - premium analytics limits
  - higher AI usage
- tier 3:
  - editorial/authoring AI tools
  - highest limits

Need before paid launch:
- measured per-user cost
- token ledger
- feature entitlement model
- target margin model

---

## 22) Immediate Build Priorities

1. Make `/api/ai/chat` the main AI path
2. Deprecate old public NL-to-SQL user flow
3. Add Redis-backed rate limits and quotas
4. Add AI kill switch and global budget controls
5. Add prompt validation and misuse classifier
6. Add abuse strike recording
7. Add cached answers for common historical prompts
8. Add queued path for heavy analytical requests
9. Add evals for:
   - hallucination
   - prompt injection resistance
   - safe refusal
   - cost regression
   - tool misuse

---

## 23) Non-Negotiable Rules

- no arbitrary SQL from public AI
- no direct DB access by model
- no arbitrary web access by model
- no model-selected toolset
- no unbounded historical scans
- no hidden private data exposure to model
- no shared-cache storage of private AI responses
- no AI requests without auth
- no AI cost path without quotas and kill switches
- no cross-user conversation access
- no output sent to user without basic post-processing rules

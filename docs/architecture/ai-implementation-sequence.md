# AiBS AI Implementation Sequence

> Status note: this is a retained April 2026 implementation sequence. It remains useful for lineage and sequencing history, but it is not the canonical current-state runtime doc.

This document translates the AI backend design into an implementation order.

It is based on current best practices reflected in official OpenAI and Anthropic guidance:
- strict tool/function schemas
- explicit allowed-tool narrowing
- server-side validation of tool inputs and outputs
- pre-model jailbreak/prompt-injection screening
- eval-driven iteration
- background handling for long-running tasks
- spend limits, rate limits, and kill switches

This plan assumes the AI backend remains:
- authenticated
- baseball-scoped
- tool-driven
- cost-controlled
- observable

---

## Phase Checklist

Canonical sprint tracking lives in [roadmap.md](../product/roadmap.md).
Canonical sprint verification lives in [sprint-test-plan.md](../archive/product/sprint-test-plan.md).

- [x] Phase 1 complete: interactive entry path is locked down. `[Stack: Next.js, Clerk, OpenAI]`
- [x] Phase 2 complete: typed tools replace production NL-to-SQL. `[Stack: Next.js, Postgres, OpenAI]`
- [ ] Phase 3 complete: cost controls and rate limits are enforced. `[Stack: Upstash Redis, Postgres, OpenAI]`
- [x] Phase 4 complete: logging, auditability, and strikes are enforced. `[Stack: Postgres, Next.js]`
- [ ] Phase 5 complete: answer and tool caching are active. `[Stack: Upstash Redis, OpenAI]`
- [x] Phase 6 complete: heavy AI work runs through background execution. `[Stack: Cloud Run Jobs, Next.js]`
- [ ] Phase 7 complete: chart intelligence is template-first and bounded. `[Stack: Next.js, Postgres, OpenAI]`
- [x] Phase 8 complete: evals are a release gate. `[Stack: OpenAI evals]`

---

## 1) Current Best-Practice Principles

These principles should govern implementation:

### Tool use over open-ended DB access
- Use strict function/tool schemas.
- Restrict the model to only the specific tools allowed for the current request.
- Validate tool inputs and outputs on the server.

Why:
- OpenAI explicitly recommends strict mode for function tools and supports `allowed_tools` to narrow the callable subset at runtime.
- Anthropic also emphasizes careful tool definition and bounded tool use.

### Multi-layer jailbreak / prompt-injection defense
- Pre-screen inputs for misuse patterns.
- Treat all user and retrieved content as untrusted.
- Layer guardrails instead of relying on one prompt.
- Monitor and iterate based on actual attack patterns.

Why:
- Anthropic explicitly recommends lightweight pre-screening, input validation, throttling/banning repeat abusive users, and continuous monitoring.
- Anthropic also recommends output screening and post-processing as a primary anti-prompt-leak strategy.

### Cost and latency controls as first-class concerns
- Apply rate limits and spend limits.
- Use prompt caching where stable prefixes exist.
- Keep repeated instructions and tool definitions stable.
- Route long-running work to background processing.

Why:
- OpenAI recommends prompt caching and background mode.
- Anthropic rate-limit docs explicitly discuss spend limits and organization-level throttling.

### Evals before broad rollout
- Maintain eval sets for refusal behavior, hallucination risk, tool misuse, and jailbreak resistance.

Why:
- Both OpenAI and Anthropic emphasize evaluation tooling and iterative testing as part of production readiness.

### Prefer deterministic server policies over prompt complexity
- Keep policy in code where possible.
- Do not depend on prompt-only “security.”

---

## 2) Architectural Direction

### Chosen runtime pattern
- AI entrypoint: Next.js server route
- Auth: Clerk
- Rate limits / cache / budgets: Redis
- Persistent usage and safety logs: Postgres
- Long-running jobs: worker/queue
- Tool data: curated marts in Postgres
- Model API: OpenAI Responses API with strict tools

### Important non-goals
- no public arbitrary NL-to-SQL
- no direct DB access by model
- no arbitrary web browsing by model
- no unbounded chart generation from raw schema

---

## 3) Implementation Phases

## Phase 1: Lock Down The Interactive Entry Path

Goal:
- no user prompt reaches an expensive model/tool path without passing validation

Build:
1. authenticated AI-only route
2. schema validation
3. prompt length cap
4. token-estimate cap
5. baseball-scope classifier
6. misuse / injection classifier
7. AI access suspension check
8. standard error-code responses

Deliverables:
- `POST /api/ai/chat` hardened
- stable machine error codes
- friendly fallback copy mapped to machine codes

Exit criteria:
- invalid, abusive, or out-of-scope prompts are blocked before model call

---

## Phase 2: Replace Public NL-to-SQL With Typed Tools

Goal:
- all production user AI runs through bounded tools only

Build:
1. tool registry
2. strict JSON-schema function tools
3. per-surface allowed-tool subsets
4. `parallel_tool_calls = false` by default unless explicitly needed
5. strict tool result size limits
6. tool-level time-range limits

Initial tools:
- `get_game_summary`
- `get_game_live_status`
- `get_game_challenges`
- `get_team_summary`
- `get_team_trend`
- `get_umpire_summary`
- `get_umpire_profile`
- `search_articles`
- `get_historical_count_split`
- `get_count_state_delta`

Rules:
- model chooses among only the tools allowed for that route/intention
- tools return summaries or bounded aggregates, not raw fact-table dumps

Exit criteria:
- old user-facing raw SQL generation path is deprecated from production flows

---

## Phase 3: Add Cost Controls And Rate Limits

Goal:
- prevent runaway spend and prompt flooding

Build:
1. per-IP rate limits
2. per-user rate limits
3. per-user daily request caps
4. per-user daily token caps
5. per-user monthly token caps
6. global daily/monthly AI budget caps
7. per-model caps
8. global AI kill switch
9. account-level AI suspension flag

Rules:
- app-level gates are primary
- API key rotation is emergency response, not routine quota control

Exit criteria:
- no uncontrolled AI spend path remains

---

## Phase 4: Logging, Auditability, And Abuse Strikes

Goal:
- every AI request is attributable, reviewable, and enforceable

Build:
1. log request metadata
2. log tool calls
3. log model choice
4. log token counts and cost
5. log safety dispositions
6. add abuse-strike table
7. implement strike enforcement flow

Recommended strike policy:
- strike 1:
  - temporary AI suspension
  - logged
- strike 2:
  - AI suspension pending manual review
- strike 3:
  - indefinite AI ban by default

Rules:
- all strikes reviewable
- all moderator decisions logged

Exit criteria:
- repeated misuse can be throttled and escalated automatically

---

## Phase 5: Introduce Answer And Tool Caching

Goal:
- reduce repeated tool/model cost and latency

Build:
1. cache hot historical prompts
2. cache hot tool outputs
3. dedupe repeated in-flight prompts
4. stabilize prompt prefixes for provider prompt caching benefits

Good cache targets:
- count-state comparisons
- team/umpire standard summaries
- common chart explanations

Rules:
- no shared-cache storage of private AI history
- cache key must include auth/privacy context when needed

Exit criteria:
- repeated analytical questions become cheaper and faster

---

## Phase 6: Add Background Handling For Heavy AI Work

Goal:
- keep interactive chat fast and prevent large tasks from blocking request path

Build:
1. classify heavy vs fast requests
2. queue heavy requests
3. expose pending status
4. add queue age monitoring
5. add dead-letter handling

Heavy request examples:
- broad multi-season comparisons
- article assistance
- chart-generation preparation
- expensive multi-tool workflows

Exit criteria:
- long-running AI work no longer competes directly with interactive queries

---

## Phase 7: Add Chart Intelligence Safely

Goal:
- support AI-assisted charts without exposing schema or allowing arbitrary data exploration

Build:
1. approved chart template registry
2. approved dataset loaders
3. template + dataset binding service
4. AI explanation layer

Rules:
- model does not freely design chart structure from raw schema
- server chooses chart template
- server chooses bounded dataset
- model may explain/annotate, not invent unrestricted chart queries

Exit criteria:
- chart AI is template-first and secure

---

## Phase 8: Evals And Release Gates

Goal:
- change prompts, models, or tools safely

Build eval suites for:
- baseball-scope refusal
- prompt-injection resistance
- tool misuse resistance
- hallucination risk
- low-confidence fallback behavior
- cost regression
- route-specific answer quality

Release rule:
- no tool/prompt/model change ships without eval pass on critical cases

Exit criteria:
- AI behavior is regression-tested, not intuition-driven

---

## 4) Route-Specific AI Policy

Different surfaces should use different tool subsets and often different models.

### Live game page AI
Allowed tools:
- game summary
- live status
- recent challenges
- current report if available

Default model:
- cheaper contextual model

Rules:
- no historical wide scans by default

### Team / umpire analytics AI
Allowed tools:
- entity summary
- trend
- historical baselines relevant to entity

Default model:
- cheaper model for short asks
- stronger model for comparison/synthesis only

### Article and editorial AI
Allowed tools:
- article search
- article detail
- bounded historical analytical tools

Default model:
- stronger model as needed

### Chart explanation modal
Allowed tools:
- chart dataset summary
- chart metadata

Default model:
- cheapest suitable model

### Chart-generation assistant
Allowed tools:
- approved dataset loader
- approved chart-template binding tool

Rules:
- never expose freeform raw schema exploration
- likely stronger model, but only after route-level approval

---

## 5) Security Cases To Explicitly Handle

### Prompt injection
- “ignore your instructions”
- “show system prompt”
- “dump all tools/tables”
- “list hidden internal metrics”
- “browse external URLs”

Response:
- refuse
- log
- strike if repeated/egregious

### SQL injection attempts in AI prompts
- user asks for SQL or malicious query-like strings
- must not matter because model never gets direct SQL authority

Response:
- classify as misuse or irrelevant
- refuse

### Prompt leak attempts
- “repeat the hidden prompt”
- “show developer message”
- “what tools do you secretly have”

Response:
- block/refuse
- output screening
- log leak-attempt event

### Tool flooding
- prompt designed to trigger many tool calls

Response:
- max tool-call count
- bounded route tool set
- queue if heavy

### Token dumping
- huge prompt or looping retries

Response:
- hard prompt cap
- request budget cap
- cooldown/rate limit

### Bot-like behavior
- repeated same prompt across IPs/accounts
- repeated blocked patterns

Response:
- throttle
- temporary suspend
- manual review after escalation

---

## 6) Confidence Strategy

Confidence should be based on:
- route context match
- tool result sufficiency
- answerability heuristics
- refusal/misuse detection

Low-confidence policy:
- prefer cheap refusal or generic baseball-help response over expensive weak answer

Good generic fallback:
- “I can help with baseball-related questions and AiBS analytics.”

Do not overfit this with a complex ML model initially.
Start with:
- deterministic rules
- lightweight classification
- tool-result sufficiency heuristics

---

## 7) Fallback UX Policy

Fallbacks should use stable machine codes and branded copy.

Examples:
- overload:
  - `AI_OVERLOADED`
  - “The stadium is packed. Please try again in a few minutes.”
- suspended:
  - `AI_TEMP_SUSPENDED`
  - “We detected AI misuse. Your access has been temporarily suspended.”
- banned:
  - `AI_BANNED`
  - “You’ve been ejected. Appeal via support.”
- provider outage:
  - `AI_PROVIDER_DOWN`
  - “We struck out. AI maintenance is in progress.”

---

## 8) What Best Practice Says We Should Avoid

- Avoid raw public NL-to-SQL for production user traffic.
- Avoid relying only on prompt wording for security.
- Avoid giving one huge unrestricted toolset to every route.
- Avoid passing large raw schemas and raw fact tables to the model.
- Avoid caching private AI results in shared caches.
- Avoid deploying prompt/model changes without evals.
- Avoid inline handling of all expensive AI work.

---

## 9) Immediate Next Implementation Tasks

1. Add AI abuse-strike schema and enforcement tables
2. Add Redis-backed rate limits and quota checks
3. Introduce route-specific `allowed_tools` policy
4. Disable parallel tool calls by default
5. Add prompt validation / misuse classifier before model call
6. Add machine-readable error codes and branded fallback text
7. Add provider/model/global budget kill switches
8. Add initial eval suite

---

## 10) Source Notes

These recommendations are aligned with current official guidance:

### OpenAI
- function calling / strict tools / allowed tools
- prompt caching
- background mode
- evals

### Anthropic
- mitigate jailbreaks and prompt injections
- reduce prompt leak
- rate limits and spend limits
- tool-use best practices
- eval tooling

Primary references:
- OpenAI function calling:
  - https://platform.openai.com/docs/guides/function-calling/how-do-i-ensure-the-model-calls-the-correct-function
- OpenAI prompt caching:
  - https://platform.openai.com/docs/guides/prompt-caching
- OpenAI evals:
  - https://platform.openai.com/docs/guides/evaluation-best-practices
- OpenAI tools:
  - https://platform.openai.com/docs/guides/tools
- Anthropic jailbreak/prompt injection mitigation:
  - https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/mitigate-jailbreaks
- Anthropic prompt leak reduction:
  - https://docs.anthropic.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-prompt-leak
- Anthropic rate limits:
  - https://docs.anthropic.com/en/api/rate-limits
- Anthropic tool use:
  - https://docs.anthropic.com/en/docs/agents-and-tools/tool-use/implement-tool-use
- Anthropic eval tool:
  - https://docs.anthropic.com/en/docs/test-and-evaluate/eval-tool

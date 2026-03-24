# The Absolute Observer Persona And Model Plan

> Persona selection and model policy defer to [product-source-of-truth.md](../product/product-source-of-truth.md). Keep this file as the The Absolute Observer-specific execution appendix.

This document defines how each The Absolute Observer persona should work, which layers stay deterministic, which layers get LLM access, and the expected token and cost profile.

It is the reference for future technical specs and implementation.

## 1. Core Decision

The Absolute Observer workflow should **not** be "four AI agents talking to the database."

It should be:

1. backend resolves the editorial time window
2. backend builds bounded fact packages from the database
3. deterministic scoring layers rank story and trend candidates
4. only the steps that benefit from language generation get model access
5. final validation and persistence remain server-controlled

## 1.1 Model Selection Enforcement

Model selection must be enforced in backend code, never in prompts.

Rules:
- the backend step registry decides the provider and model
- prompts define persona behavior, task scope, and output format only
- clients cannot request a more expensive model
- prompts must not attempt to self-select or override model choice
- the actual model used must be persisted in `editorial.generation_steps.model_name`

Required implementation shape:
- add a server-side editorial step registry
- each step resolves:
  - `provider`
  - `model`
  - token caps
  - retry policy
  - tool access policy
- deterministic steps explicitly resolve to `no model`

This keeps:
- cost predictable
- prompts smaller
- date windows bounded
- hallucination risk lower
- article behavior auditable

## 2. Editorial Window Rule

Daily The Absolute Observer articles should use a **slate-based** window, not a naive calendar day.

Example:
- The Absolute Observer article published on `2026-03-08`
- summarizes the `2026-03-07` slate
- allows West Coast games to finish after midnight Eastern
- runs only after the slate is stable

Backend rule:
- `source_date` identifies the editorial slate
- all Scout/Theo/Author/Validator inputs are derived only from that slate
- the model must never choose or widen the date range

## 3. Persona Breakdown

### Scout Bot 1

Purpose:
- rank the most storyworthy events from the slate
- identify lead candidates
- identify milestone candidates
- identify audit candidates

What powers it:
- deterministic candidate engine
- no freeform DB exploration

Inputs:
- daily editorial summary mart
- game reports
- challenge counts
- overturn counts
- terminal or direct-ending challenge events
- standings movement
- milestone flags

Output:
- structured `ScoutBriefPayload`

Recommended implementation:
- **deterministic first**
- no model required at launch

Why:
- this is ranking and packaging, not hard creative reasoning
- deterministic scoring is cheaper, safer, and easier to tune
- it keeps the editorial window bounded by code

Optional future model:
- `gpt-4.1-mini`

Use only if later needed for:
- headline seed refinement
- short natural-language rationales for top candidate ranking

Estimated token/cost if model is added:
- input: `6k-10k`
- output: `400-800`
- estimated cost with `gpt-4.1-mini`: about `$0.003 to $0.005`

### Theo Telemetry

Purpose:
- identify the strongest analytical interpretations of the slate
- rank chart candidates
- compare slate values to baselines
- package evidence refs for the article

What powers it:
- deterministic trend engine

Inputs:
- daily league marts
- challenge timing distributions
- overturn rate vs rolling baseline
- team challenge efficiency
- umpire outlier summaries
- count-state / zone / pitch-type summaries
- standings pulse

Output:
- structured `TelemetryResearchPayload`

Recommended implementation:
- **deterministic first**
- no model required at launch

Why:
- Theo is mostly feature ranking and chart selection
- charts should come from an approved chart catalog, not freeform model generation
- deterministic output is easier to verify than “AI analytics intuition”

Optional future model:
- `gpt-4.1-mini`

Use only if later needed for:
- concise analytics desk blurbs
- chart caption language
- section transition copy

Estimated token/cost if model is added:
- input: `10k-16k`
- output: `600-1k`
- estimated cost with `gpt-4.1-mini`: about `$0.005 to $0.008`

### Author Persona

Personas:
- `Abner B. Strike`
- `Bowie Blue`
- `Miles Meridian`

Purpose:
- write title
- write dek
- write section copy from bounded evidence packages
- preserve desk voice without changing facts

What powers it:
- structured inputs from Scout and Theo
- approved section keys
- bounded evidence payloads

Inputs:
- `ScoutBriefPayload`
- `TelemetryResearchPayload`
- article schema rules
- allowed tone/persona rules
- section order / desk rules

Output:
- structured `GazetteDraftPayload`

Recommended implementation:
- **first LLM-enabled step**
- use one shared default model for all author personas
- vary voice through prompt/persona instructions, not different models

Selected default model:
- `gpt-4.1-mini`

Why:
- good instruction following and tool calling
- low latency
- low cost
- much cheaper than premium writing models
- sufficient for bounded sports recap writing

Official source:
- [GPT-4.1 mini model page](https://developers.openai.com/api/docs/models/gpt-4.1-mini)
- [OpenAI pricing](https://openai.com/api/pricing/)

Optional upgrade path:
- if quality is not good enough for article prose, test a stronger writer model only for this step
- likely candidate: `Claude Sonnet 4`

Why not make it default:
- substantially higher output cost
- unnecessary for daily auto recaps until proven needed

Anthropic reference:
- [Claude models overview](https://docs.anthropic.com/en/docs/about-claude/models/all-models)
- [Anthropic pricing](https://docs.anthropic.com/en/docs/about-claude/pricing)

Estimated token/cost with `gpt-4.1-mini`:
- input: `14k-24k`
- output: `1.5k-3k`
- estimated cost: about `$0.008 to $0.015`

Estimated token/cost with `Claude Sonnet 4`:
- input: `14k-24k`
- output: `1.5k-3k`
- estimated cost: about `$0.06 to $0.12`

Recommendation:
- launch with `gpt-4.1-mini`
- only escalate if real article quality proves insufficient

### Observer Validator

Purpose:
- ensure every section is evidence-backed
- ensure section keys are allowed
- ensure the article stayed inside the slate window
- reject unsupported claims
- block missing-evidence publication

What powers it:
- rules engine first
- optional model second

Inputs:
- final draft payload
- allowed section schema
- evidence presence checks
- source-date bounds
- claim guardrails

Output:
- structured `GazetteValidationPayload`

Recommended implementation:
- **deterministic first**
- no model required at launch

Why:
- this step is policy enforcement, not creativity
- rule-based validation is more reliable than asking a model whether a claim is safe

Optional future model:
- `gpt-4.1-mini`

Use only for:
- style linting
- weak-claim detection
- editorial consistency scoring

Estimated token/cost if model is added:
- input: `8k-14k`
- output: `400-900`
- estimated cost with `gpt-4.1-mini`: about `$0.004 to $0.007`

### Observer Publisher

Purpose:
- persist the validated article
- persist sections
- persist evidence blobs
- persist contributor credits
- update workflow run status

Recommended implementation:
- **never an LLM**

Why:
- this is transactional persistence and should remain deterministic

### Atlas Absolute

Purpose:
- source/evidence identity for the newsroom
- not a separate freeform agent at launch

Recommended implementation:
- treat Atlas as a contributor/source role, not a separate model-executing persona

Why:
- avoids paying for a redundant step that only relabels evidence already produced by Scout/Theo

## 4. Final Model Access Policy

### Launch configuration

- Scout Bot 1: `deterministic`
- Theo Telemetry: `deterministic`
- Author Persona: `gpt-4.1-mini`
- Observer Validator: `deterministic`
- Observer Publisher: `none`
- Atlas Absolute: `none`

This is the recommended launch architecture.

### If we later add more model access

Allowed expansion order:

1. Author quality upgrade test
2. Validator style lint
3. Theo caption assistance
4. Scout headline rationale

Do not expand model access before measuring actual output quality problems.

## 5. Why Not Use A Premium Model By Default

We do not need `Claude Opus 4.6` or another premium model for:
- bounded slate retrieval
- ranking candidates
- chart selection
- evidence validation

Those tasks are mostly:
- deterministic
- structured
- rules-based

Using a premium model there would:
- raise cost sharply
- increase failure surface
- add very little product value

Premium models should only be considered if:
- Author step quality is measurably insufficient
- weekly longform editorial assistance needs stronger writing and synthesis

## 6. Estimated Cost Per Daily Article

These are practical planning estimates, not guaranteed billing outcomes.

### Launch architecture cost

Launch architecture uses an LLM only for Author.

Using `gpt-4.1-mini`:
- input: `14k-24k`
- output: `1.5k-3k`
- estimated cost: about `$0.008 to $0.015` per daily article

This is the recommended baseline.

### Full four-step LLM workflow cost

If Scout, Theo, Author, and Validator all use `gpt-4.1-mini`:
- Scout: about `$0.003 to $0.005`
- Theo: about `$0.005 to $0.008`
- Author: about `$0.008 to $0.015`
- Validator: about `$0.004 to $0.007`

Estimated total:
- about `$0.02 to $0.04` per daily article

This is still affordable, but unnecessary at launch.

### Premium Author step cost

If only Author moves to `Claude Sonnet 4`:
- Author step: about `$0.06 to $0.12`

That would make the daily article roughly:
- `$0.06 to $0.13` total depending on other steps

Recommendation:
- do not do this by default

## 7. Weekly Editorial Recommendation

For the weekly article you write yourself:
- no need for a full The Absolute Observer multi-agent daily pipeline
- use deterministic weekly evidence packages first
- optionally add an AI writing assistant later for:
  - outline generation
  - section summarization
  - headline/dek variants

Recommended weekly assistant default:
- `gpt-4.1-mini`

Optional upgrade if you truly need stronger writing help:
- `Claude Sonnet 4`

Still avoid `Opus` unless there is a proven need.

## 8. Technical Rules

- The model never chooses the time window.
- The model never writes SQL.
- The model never chooses arbitrary charts.
- The model never sees unrestricted database schema.
- Scout and Theo consume bounded daily marts and feature packages.
- Author consumes Scout/Theo outputs, not raw broad data.
- Validator enforces rules in code first.
- Publisher is fully deterministic.

## 9. Decision Summary

Chosen launch design:
- **Scout = deterministic**
- **Theo = deterministic**
- **Author = gpt-4.1-mini**
- **Validator = deterministic**
- **Publisher = no model**

This is the best tradeoff across:
- quality
- cost
- safety
- observability
- ease of implementation

## 10. Sources

- OpenAI GPT-4.1 mini model page: https://developers.openai.com/api/docs/models/gpt-4.1-mini
- OpenAI pricing: https://openai.com/api/pricing/
- OpenAI GPT-4.1 launch/pricing overview: https://openai.com/index/gpt-4-1/
- Anthropic models overview: https://docs.anthropic.com/en/docs/about-claude/models/all-models
- Anthropic pricing: https://docs.anthropic.com/en/docs/about-claude/pricing

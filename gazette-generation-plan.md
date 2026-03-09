# The Absolute Observer Gazette Plan

> Gazette product decisions are now anchored in [product-source-of-truth.md](./product-source-of-truth.md). This file remains a focused editorial workflow reference.

This is the aligned editorial plan for the backend we actually have in this repo.

Companion references:
- [Gazette Backend Spec](./gazette-backend-spec.md)
- [Gazette Persona And Model Plan](./gazette-persona-model-plan.md)

It replaces the old Supabase-oriented assumptions with the current stack:
- Next.js app/API layer
- Postgres editorial tables
- `ops.job_runs` worker queue
- article persistence in `editorial.*`
- AI logging in `ai.*`

## 1. Editorial Desks
The Gazette should be assembled from dynamic `sections[]` keyed by `sectionKey`. The renderer maps layouts by key instead of assuming one fixed article template.

Current desk keys:
- `lead_recap`
  - main story of the day
  - division movement
  - marquee results and milestones
- `audit_desk`
  - umpire-focused ABS review
  - high-impact corrected calls
  - challenge success/failure framing
- `data_lab`
  - a trend or league-wide pattern
  - chart-driven section backed by structured evidence
- `scout_notes`
  - milestone bullets
  - standout performances
  - quick league notebook items
- `standings_pulse`
  - sidebar standings movement module
  - top movers and league snapshot

## 2. Editorial Personas
We keep the newsroom framing, but the backend treats personas as structured contributors, not just prompt flavor.

Worker personas:
- `Theo Telemetry`
  - data analyst
  - owns chart/evidence framing
- `Scout Bot 1`
  - slate summarizer
  - finds candidate stories and notable games
- `Atlas Absolute`
  - internal source persona only
  - represents the ground-truth ABS data layer

Author personas:
- `Abner B. Strike`
  - high-level league framing
- `Bowie Blue`
  - sharper umpire-audit tone
- `Miles Meridian`
  - technical/scientific tone

## 3. Model Enforcement
Model selection must be enforced in backend code, not in prompts.

Rules:
- the server chooses the model for each Gazette step
- prompts define behavior, voice, and output format only
- prompts do not decide which model runs
- clients do not decide which model runs
- every model-backed step should persist the actual `model_name` used in `editorial.generation_steps`

Implementation direction:
- create a server-side Gazette step registry
- each step maps to:
  - `provider`
  - `model`
  - input/output caps
  - retry policy
  - whether tools are allowed
- deterministic steps should explicitly map to `no model`

Launch policy:
- `scout_brief` -> deterministic
- `telemetry_research` -> deterministic
- `author_draft` -> `gpt-4.1-mini`
- `editor_validation` -> deterministic
- `persist_article` -> deterministic

## 4. Generation Architecture
The Gazette should run as a staged workflow, not one giant AI call.

### Trigger
Use our actual stack:
- local/dev:
  - manual run or script
- deployed:
  - scheduled internal job hitting the worker path

Do not assume:
- `pg_cron`
- Supabase Edge Functions

### Queue / Orchestrator
Use:
- `ops.job_runs`

Job types:
- `article_daily_auto`
- later:
  - `article_weekly_editorial_package`
  - `article_backfill`

### Workflow
Each article run should move through explicit steps:
1. `scout_brief`
2. `telemetry_research`
3. `author_draft`
4. `editor_validation`
5. `persist_article`

The worker coordinates the sequence and persists each step.

## 5. Database Model We Should Use
We already have:
- `editorial.articles`
- `editorial.article_sections`
- `editorial.article_evidence_blobs`
- `editorial.article_revisions`
- `editorial.standings_snapshots`
- `ops.job_runs`
- `ai.conversations`
- `ai.messages`
- `ai.tool_calls`

We still need workflow-tracking tables for multi-agent handoff:
- `editorial.generation_runs`
- `editorial.generation_steps`
- `editorial.article_contributors`

Those are defined in:
- [gazette-backend-spec.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/gazette-backend-spec.md)

## 6. What Each Agent Actually Does

### Scout Bot 1
Inputs:
- daily standings movement
- daily editorial summary mart
- notable game facts
- article day scope

Output:
- `story_of_day`
- `lead_candidates[]`
- `audit_candidates[]`
- `milestones[]`
- `league_notes[]`

### Theo Telemetry
Inputs:
- Scout output
- structured marts only
- no arbitrary SQL generation

Output:
- `chart_intents[]`
- `trend_summary`
- `data_lab_evidence`
- `standings_pulse`

### Author Persona
Inputs:
- Scout output
- Theo output
- fixed section contract

Output:
- `title`
- `dek`
- `sections[]`
- `summary_line`

### Editor Validation
Checks:
- required sections present
- evidence exists for each generated section
- no unsupported claims
- no empty chart section
- only allowed desk keys used

## 6. Prompt / Tooling Rules
The article agents should not:
- browse the open web for daily recaps by default
- invent chart values
- directly write to final article tables
- run raw SQL from model output

They should:
- read bounded, typed tool outputs
- pass structured payloads between steps
- emit structured JSON only

## 7. Data Sources For Daily Gazette
Primary daily inputs:
- StatsAPI-derived game facts
- ABS challenge timeline
- standings snapshots
- editorial daily summary marts

Optional later enrichments:
- Savant-backed historical context
- weekly editorial packages
- richer trend comparisons

For daily auto articles, the source of truth should stay internal and evidence-backed.

## 8. Chart Strategy
`data_lab` should not be freeform chart generation.

Instead:
- AI selects from an approved chart catalog
- backend binds the approved chart to a real dataset
- renderer displays the chart from structured data

Examples:
- `challenges_by_inning`
- `overturn_rate_by_team`
- `umpire_abs_accuracy`
- `league_daily_challenge_volume`

## 9. Standings Pulse
This is a fixed module, not an arbitrary AI invention.

Fields:
- top 3 AL teams
- top 3 NL teams
- movement indicator
- optional ABS note when evidence exists

Source:
- standings snapshots
- standings movement helper

## 10. Persistence Rules
Only the final validated output should write to:
- `editorial.articles`
- `editorial.article_sections`
- `editorial.article_evidence_blobs`

Intermediate agent steps should write to workflow-tracking tables, not article tables.

## 11. Current Audit Of The Prior Plan
What still stands:
- dynamic desks
- persona split
- standings pulse module
- chart-backed data section
- multi-agent handoff idea

What changed:
- no Supabase Edge Function
- no `pg_cron` dependency assumption
- no single “editor-in-chief” blob prompt as the primary architecture
- no freeform chart generation from AI

## 12. Immediate Next Steps
- [x] Align the Gazette plan to the actual backend stack.
- [x] Define workflow tracking as a DB-backed multi-step process.
- [x] Separate worker steps from final article persistence.
- [ ] Add `editorial.generation_runs`.
- [ ] Add `editorial.generation_steps`.
- [ ] Add `editorial.article_contributors`.
- [ ] Build the daily auto worker around Scout -> Theo -> Author -> Validator.
- [ ] Add the fixed chart intent catalog for `data_lab`.
- [ ] Add the `standings_pulse` persistence/evidence contract.

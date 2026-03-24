# The Absolute Observer Backend Implementation Spec

This document defines the backend model for The Absolute Observer multi-agent article generation in AiBS.

It is intentionally concrete:
- DB tables
- worker flow
- JSON contracts
- persistence rules

## 1. Goals
- Track multi-step article generation in the database
- Support resumable worker execution
- Preserve evidence and agent handoffs
- Keep final article persistence separate from intermediate AI steps
- Make daily auto generation inspectable and debuggable

## 2. Existing Tables We Reuse
- `editorial.articles`
- `editorial.article_sections`
- `editorial.article_evidence_blobs`
- `editorial.article_revisions`
- `editorial.standings_snapshots`
- `ops.job_runs`
- `ai.conversations`
- `ai.messages`
- `ai.tool_calls`

## 3. New Tables To Add

### `editorial.generation_runs`
One row per The Absolute Observer generation attempt.

Suggested columns:
- `generation_run_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `job_run_id UUID NOT NULL REFERENCES ops.job_runs(job_run_id) ON DELETE CASCADE`
- `article_id UUID REFERENCES editorial.articles(article_id) ON DELETE SET NULL`
- `article_type TEXT NOT NULL`
- `source_date DATE`
- `status TEXT NOT NULL`
- `selected_author TEXT`
- `story_theme TEXT`
- `validation_state TEXT NOT NULL DEFAULT 'pending'`
- `started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `finished_at TIMESTAMPTZ`
- `error_message TEXT`
- `context_payload JSONB`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Status values:
- `queued`
- `running`
- `failed`
- `validated`
- `persisted`

### `editorial.generation_steps`
One row per step in the run.

Suggested columns:
- `generation_step_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `generation_run_id UUID NOT NULL REFERENCES editorial.generation_runs(generation_run_id) ON DELETE CASCADE`
- `step_key TEXT NOT NULL`
- `agent_name TEXT NOT NULL`
- `status TEXT NOT NULL`
- `model_name TEXT`
- `conversation_id UUID REFERENCES ai.conversations(conversation_id) ON DELETE SET NULL`
- `input_payload JSONB`
- `output_payload JSONB`
- `error_message TEXT`
- `tool_call_count INTEGER NOT NULL DEFAULT 0`
- `prompt_tokens INTEGER`
- `completion_tokens INTEGER`
- `cost_usd NUMERIC`
- `started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `finished_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Step keys:
- `scout_brief`
- `telemetry_research`
- `author_draft`
- `editor_validation`
- `persist_article`

Status values:
- `queued`
- `running`
- `success`
- `failed`
- `skipped`

### `editorial.article_contributors`
Structured contributor credits for final articles.

Suggested columns:
- `article_contributor_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `article_id UUID NOT NULL REFERENCES editorial.articles(article_id) ON DELETE CASCADE`
- `display_name TEXT NOT NULL`
- `role TEXT NOT NULL`
- `contributor_type TEXT NOT NULL`
- `sort_order INTEGER NOT NULL DEFAULT 1`
- `metadata JSONB`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`

Contributor types:
- `author`
- `analyst`
- `source`

## 4. Worker Flow

### Step 0: queue job
Create `ops.job_runs` row:
- `job_type = 'article_daily_auto'`
- `queue_class = 'editorial'`
- `payload = { sourceDate, articleType }`

### Step 1: create generation run
Insert `editorial.generation_runs`.

Inputs:
- `job_run_id`
- `source_date`
- `article_type`

### Step 2: Scout Bot
Purpose:
- identify the story of the day
- identify key games
- identify audit candidates

Save one `generation_steps` row with:
- `step_key = 'scout_brief'`
- `agent_name = 'Scout Bot 1'`

### Step 3: Theo Telemetry
Purpose:
- convert Scout themes into evidence-backed analytical framing
- choose chart intents
- build standings pulse payload

Save one `generation_steps` row with:
- `step_key = 'telemetry_research'`
- `agent_name = 'Theo Telemetry'`

### Step 4: Author Persona
Purpose:
- write `title`, `dek`, and `sections[]`
- map content into approved desk keys

Save one `generation_steps` row with:
- `step_key = 'author_draft'`
- `agent_name = selected persona`

### Step 5: Editor Validation
Purpose:
- reject unsupported content
- ensure evidence exists for every generated section
- ensure allowed section keys only

Save one `generation_steps` row with:
- `step_key = 'editor_validation'`
- `agent_name = 'Observer Validator'`

### Step 6: Persist Article
Only if validation succeeds:
- upsert `editorial.articles`
- replace `editorial.article_sections`
- store `editorial.article_evidence_blobs`
- insert `editorial.article_contributors`
- update `generation_runs.article_id`

## 5. Step Contracts

### Scout Bot Output
```json
{
  "storyOfDay": {
    "headline": "Dodgers tighten NL West grip",
    "theme": "division_race",
    "summary": "Los Angeles gained ground while several rivals stumbled."
  },
  "leadCandidates": [
    {
      "gamePk": 831638,
      "reason": "division_shift",
      "priority": 1
    }
  ],
  "auditCandidates": [
    {
      "gamePk": 831795,
      "challengeId": "uuid",
      "reason": "late_leverage_abs"
    }
  ],
  "milestones": [
    {
      "kind": "player_milestone",
      "label": "Three-hit night",
      "gamePk": 831638
    }
  ],
  "leagueNotes": [
    "Challenge volume spiked late across the league."
  ]
}
```

### Theo Telemetry Output
```json
{
  "trendSummary": "Managers concentrated challenges in innings 8-9.",
  "chartIntents": [
    {
      "chartKey": "challenges_by_inning",
      "title": "Challenges By Inning",
      "sectionKey": "data_lab",
      "datasetKey": "league_daily_challenge_timing"
    }
  ],
  "standingsPulse": {
    "al": [
      { "teamId": 147, "rank": 1, "movement": "up", "movementValue": 1 }
    ],
    "nl": [
      { "teamId": 119, "rank": 1, "movement": "same" }
    ]
  },
  "evidenceRefs": [
    {
      "kind": "summary_mart",
      "key": "daily_editorial_summary",
      "sourceDate": "2026-03-08"
    }
  ]
}
```

### Author Output
```json
{
  "title": "ABS Daily Recap: March 8",
  "dek": "A league-wide newspaper built from today’s games and ABS telemetry.",
  "sections": [
    {
      "sectionKey": "lead_recap",
      "sectionKind": "fact",
      "heading": "Lead Story",
      "bodyMd": "The Dodgers widened the gap...",
      "sectionOrder": 1,
      "evidencePayload": {
        "source": "scout_brief"
      }
    }
  ]
}
```

### Validator Output
```json
{
  "ok": true,
  "errors": [],
  "warnings": [],
  "resolvedSectionKeys": [
    "lead_recap",
    "audit_desk",
    "data_lab",
    "scout_notes"
  ]
}
```

## 6. Persistence Rules

### Final article write
Write only after validator success.

Persist:
- `editorial.articles`
- `editorial.article_sections`
- `editorial.article_evidence_blobs`
- `editorial.article_contributors`

### Intermediate writes
Persist all step outputs to:
- `editorial.generation_steps`

Do not persist intermediate AI drafts as final article content.

## 7. Chart Contract
Theo does not generate arbitrary chart code.

He selects from a fixed catalog.

Suggested chart catalog:
- `challenges_by_inning`
- `league_overturn_rate_daily`
- `umpire_accuracy_today`
- `team_challenge_distribution`
- `standings_pulse`

Backend responsibilities:
- validate `chartKey`
- load dataset from allowed query
- store chart evidence blob

Frontend responsibilities:
- render known chart types only

## 8. Evidence Strategy
Every generated section should have evidence.

Evidence blob kinds:
- `snapshot`
- `fact`
- `derived_metric`
- `chart_dataset`
- `standings_pulse`

Recommended blob payloads:
- source mart rows
- chart dataset rows
- standings movement rows
- validation decisions

## 9. Failure / Resume Rules

If Scout fails:
- mark step failed
- mark run failed

If Theo fails:
- mark step failed
- run may stop or continue in degraded mode depending on policy

If Author fails:
- mark failed
- no article persistence

If Validator fails:
- persist suppressed/generated article only if policy says so
- otherwise mark run failed

If persist step fails:
- keep step history
- allow rerun from persist stage

## 10. Recommended Implementation Order
1. Add `editorial.generation_runs`
2. Add `editorial.generation_steps`
3. Add `editorial.article_contributors`
4. Add worker helpers:
   - create run
   - create step
   - complete step
   - fail step
5. Build Scout contract
6. Build Theo contract
7. Build Author contract
8. Build Validator contract
9. Persist final article from validated output

## 11. What Should Change In Current Code
The current daily auto article path in:
- [articles.ts](../../src/lib/server/articles.ts)

should evolve from:
- one function that assembles and writes a finished article

to:
- one orchestrated worker-backed pipeline that logs step outputs first
- then persists final article state

## 12. Summary
The key decision is:

We do not treat The Absolute Observer generation as a single AI prompt.

We treat it as:
- a DB-tracked workflow
- with structured handoff payloads
- explicit validation
- evidence-backed final persistence

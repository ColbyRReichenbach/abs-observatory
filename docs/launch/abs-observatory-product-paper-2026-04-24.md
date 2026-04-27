# ABS Observatory Product Paper

Date: 2026-04-24  
Repository: `abs-observatory`  
Branch context: `audit/data-model-ui-launch-hardening-2026-04-24`

## 1. Product Thesis

ABS Observatory is a live baseball analytics product for understanding how MLB clubs, umpires, and game situations interact with the Automated Ball-Strike challenge system. The product is built around one central idea: a challenge is not just a binary "right or wrong" call. It is an inventory decision made inside a game state, with run value, win value, count leverage, team-side context, and future opportunity cost.

The application serves two audiences from the same data foundation:

- Fan view: explains what happened, who challenged, whether the call was overturned, and how teams/umpires are trending in a way casual fans can understand quickly.
- Org view: exposes deeper operational analytics such as run expectancy, win expectancy, challenge value, decision deployment, pitch traits, count states, handedness, and matchup exposure.

The product is intentionally not a black-box model showcase. It is a data product: ingest live baseball data, normalize it into trusted challenge facts, compute baseball-native models, publish a lean serving layer, and render interpretable UI/AI experiences on top.

## 2. System Map

At a high level, the system has seven layers:

1. External data sources: MLB Stats API, MLB Gameday live feed, Baseball Savant gamefeed, Statcast, standings, team/player metadata.
2. Warehouse ingestion: Python ETL writes normalized source tables, raw source snapshots, live game state, challenge rows, pitch rows, and model training rows.
3. SQL marts and modeling: `db/schema.sql` and `db/views.sql` define canonical challenge marts, run/win expectancy fallbacks, ABS classification, pitch-location geometry, team/umpire aggregates, and serving lookup tables.
4. Serving publish: `scripts/publish-serving-db.sh` exports curated warehouse windows and model lookup tables into the hosted serving database used by the Next.js app.
5. Backend data contracts: `src/lib/data.ts` and model helpers convert SQL rows into typed page models and chart payloads.
6. Frontend surfaces: Next.js App Router pages render live games, game hubs, teams, umpires, articles, profiles, admin, and AI visualizations.
7. AI surfaces: Copilot, chart insight, and "visualize your own idea" use bounded typed tools, prompt policies, terminology packs, structured outputs, saved artifacts, and telemetry.

Runtime stack:

- Framework: Next.js App Router with React Server Components.
- Language: TypeScript for app/backend; Python for ETL.
- Database: Postgres/Neon for warehouse and serving.
- AI provider: OpenAI through `openai`.
- Auth: Clerk with dev-header fallback for local/e2e.
- Styling: Tailwind CSS, custom design primitives, Recharts for some charts.
- Tests/QA: Vitest, Playwright, custom launch scripts, model audit scripts, warehouse/serving reconciliation.

## 3. Data Pipeline

### 3.1 Pipeline Purpose

The pipeline exists to answer a product-trust question: "What actually happened on every ABS challenge, and what did that decision mean in baseball terms?"

It has to handle several failure modes:

- MLB live feed and Savant can disagree or arrive at different times.
- ABS challenge data can be sparse or missing fields in one source.
- Live games mutate over time.
- Local developer databases can be stale.
- Serving should not depend on a laptop-local Postgres instance.
- The frontend should never invent values when a trusted model value is unavailable.

### 3.2 Data Sources

Primary sources:

- MLB Stats API schedule and feed live:
  - `etl/ingest_mlb_abs.py`
  - `https://statsapi.mlb.com/api/v1/schedule`
  - `https://statsapi.mlb.com/api/v1.1/game/{gamePk}/feed/live`
- Baseball Savant gamefeed:
  - `etl/ingest_savant_abs_gamefeed.py`
  - `https://baseballsavant.mlb.com/gf?game_pk=...`
- Statcast historical pitch data:
  - `etl/backfill_statcast_pitch_history.py`
- Standings/player/team enrichment:
  - `scripts/sync-live-context-to-warehouse.mjs`
  - `scripts/sync-players-to-warehouse.mjs`
  - `etl/sync_standings_snapshots.py`
  - `etl/sync_savant_weekly_enrichment.py`

The data model prefers official/live fields when they are present, then uses Savant enrichment for ABS-specific location and edge fields, and only uses fallbacks when source coverage is genuinely incomplete.

### 3.3 Warehouse Targeting

`etl/db_target.py` centralizes database target resolution:

- First choice: CLI `--database-url`.
- Second choice: `WAREHOUSE_DATABASE_URL`.
- Compatibility fallback: `DATABASE_URL`.

This matters because the current architecture is warehouse-first. Live polling writes to the hosted warehouse, not a local laptop database. Serving is populated separately from warehouse.

The scripts guard against accidental local usage:

- `scripts/local-live-poll.sh` refuses to poll if `WAREHOUSE_DATABASE_URL` is missing.
- It refuses local warehouse URLs unless explicitly allowed.
- `scripts/publish-serving-db.sh` refuses to publish from local source databases unless explicitly allowed.
- `scripts/reconcile-warehouse-serving.mjs` refuses local warehouse reconciliation unless explicitly allowed.

### 3.4 Live Polling

The current operational path is launchd/local operator polling, not GitHub Actions.

The main entrypoint is:

- `scripts/local-live-poll.sh`

That script:

1. Loads `.env.local`, `.env`, optional `.env.poll`, and explicit `POLL_ENV_FILE`.
2. Validates warehouse and serving URLs.
3. Uses a lock directory under `.runtime/live-poll.lock` to avoid overlapping poll runs.
4. Applies schema/views on an interval through `scripts/run-db-schema.sh`.
5. Runs `etl/poll_live_window.py`.
6. Refreshes Savant ABS rows through `etl/ingest_savant_abs_gamefeed.py`.
7. Rebuilds ABS summary tables through `scripts/rebuild-abs-summary-tables.sh`.
8. Refreshes model tables through:
   - `etl/build_historical_pitch_states.py`
   - `etl/build_called_pitch_decisions.py`
9. Runs warehouse ABS QA through `npm run qa:abs`.
10. Publishes warehouse rows into serving through `scripts/publish-serving-db.sh`.
11. Runs serving ABS QA.
12. Reconciles warehouse and serving through `npm run db:reconcile:warehouse-serving`.
13. Optionally prunes raw source snapshots.

This gives the pipeline a full loop: ingest, enrich, model, QA, publish, QA again, reconcile.

### 3.5 MLB Stats API ETL

`etl/ingest_mlb_abs.py` is the core live ingestion file.

It writes:

- `games`
- `teams`
- `players`
- `officials`
- `at_bats`
- `play_events`
- `pitches`
- `abs_challenges`
- `game_state_snapshots`
- `team_abs_game_summary`
- `umpire_abs_game_summary`
- `ops.game_linescores`
- `etl_runs`
- `ingest_errors`
- `ops.source_snapshots`

Important implementation details:

- Schedule fetch supports spring training and regular season with `--game-type S,R`.
- Final games already stored can be skipped by `filter_existing_final_game_pks`.
- Feed live snapshots are hash-deduped into `ops.source_snapshots`.
- Count states are normalized with `_normalize_count_state`.
- After-count is derived with `_derive_after_count` when the feed does not provide everything.
- Challenge rows are deduped with a stable `dedupe_key`.
- `ON CONFLICT` upserts are used heavily so repeated live polls update current facts rather than duplicating them.
- Game reports can be generated and stored after ingest through `generate_and_store_report`.

### 3.6 Savant ABS ETL

`etl/ingest_savant_abs_gamefeed.py` enriches official data with Savant ABS fields.

It writes:

- `raw.savant_gamefeed_games`
- `raw.savant_abs_events`
- `ops.source_snapshots`

Key fields extracted include:

- `play_id`
- `row_id`
- inning, outs, balls, strikes, pre-count
- batting/fielding team IDs
- batter/pitcher/catcher IDs and handedness
- pitch type/name
- call/result/event description
- ABS challenge status
- edge distance and calculated edge distance
- pitch location fields such as `px`, `pz`, `plate_x`, `plate_z`
- strike zone top/bottom when available
- raw payload

The Savant source is central to the corrected strike-zone problem. The site now treats Savant ABS location and edge-distance fields as canonical when available because ABS outcomes are judged against a player-specific zone and ball-radius-adjusted boundary, not just a generic normalized rectangle.

### 3.7 Historical Statcast and Model Training Rows

The model layer uses historical pitch states and called-pitch decisions to make RE/WE and challenge decision values meaningful.

Files:

- `etl/backfill_statcast_pitch_history.py`
- `etl/build_historical_pitch_states.py`
- `etl/build_called_pitch_decisions.py`

Tables:

- `raw.statcast_games`
- `raw.statcast_pitches`
- `historical_pitch_states`
- `modeling.called_pitch_decisions`

Important model-training concepts:

- Historical pitch states are keyed by game, at-bat, pitch number.
- Called pitch decisions preserve taken-pitch context.
- Modeling rows include state before and after pitch where possible.
- Split policy and snapshot IDs are stored so the model can be audited by data version.

### 3.8 Warehouse to Serving Publish

`scripts/publish-serving-db.sh` is the controlled export path from warehouse to serving.

It exports CSV windows from warehouse, then loads serving tables. It includes:

- Core baseball tables.
- ABS challenge facts.
- Latest linescores.
- Savant gamefeed rows.
- Model fallback tables:
  - `serving_run_expectancy_fallbacks`
  - `serving_win_expectancy_fallbacks`
  - `serving_count_state_outcome_baselines`
  - `serving_abs_overturn_probability_fallbacks`

The publish window defaults to the newest warehouse game date and a configurable `SERVING_SYNC_DAYS`. This is an intentional optimization: serving does not need the entire warehouse history for every live deploy, but it does need enough recent rows and lookup tables to render current pages.

### 3.9 Warehouse/Serving Reconciliation

`scripts/reconcile-warehouse-serving.mjs` compares:

- `games`
- `abs_challenges`
- `mart_abs_pitch_challenges`
- `pitches`
- fallback lookup counts
- raw Savant ABS rows
- min/max dates and latest challenge timestamps
- dedupe-key match counts

It writes JSON artifacts under `.runtime/reconciliation`. It can fail on:

- games drift
- challenge drift
- fallback lookup drift
- Savant drift

This is the safety net that catches "warehouse is right, serving is stale" issues.

## 4. Database Schemas and Marts

### 4.1 Core Schemas

`db/schema.sql` defines schemas:

- `public`: baseball source-normalized tables and marts.
- `raw`: source-specific ingest tables.
- `modeling`: model training/intermediate data.
- `product`: users, orgs, profiles, roles, admin/product state.
- `community`: comments, reactions, follows, moderation.
- `editorial`: articles, revisions, evidence, generation runs.
- `ai`: conversations, messages, saved artifacts, generation events, feedback, safety events.
- `ops`: source snapshots, audit log, job queue, rate-limit events, linescores.

### 4.2 Canonical Challenge Classification

The most important SQL object is `mart_abs_challenge_classification` in `db/views.sql`.

It joins:

- `abs_challenges`
- `games`
- `pitches`
- latest `raw.savant_abs_events`

It resolves:

- batting and fielding team
- challenge team
- challenge side role: offense/defense
- actor role
- original and corrected call
- challenge direction: `strike_to_ball` or `ball_to_strike`
- review domain
- count before/umpire/corrected count
- Savant and StatsAPI pitch location
- strike zone top/bottom
- canonical ABS margin
- confidence/exclusion reasons

Location priority:

1. Savant ABS fields.
2. Challenge location fields.
3. StatsAPI pitchData fields.
4. Inferred/fallback values.

Geometry:

- Plate half width: `0.7083333333` feet.
- Ball-radius adjustment: `0.1208333333` feet.
- Radius-adjusted horizontal half width: `0.8291666667` feet.
- `canonical_abs_margin` prefers Savant `edge_distance_calc` when available.
- Otherwise it uses radius-adjusted geometry.

This is the fix for confusing strike-zone visuals: a point can appear inside a normalized visual zone while the ABS system, using batter-specific zone and ball radius, evaluates it differently. The data layer now keeps both display geometry and canonical ABS margin separate.

### 4.3 Canonical Challenge View

`mart_abs_pitch_challenges` is the app-facing canonical challenge view. It is built on top of classification and is used broadly by the backend data access layer.

Related views:

- `mart_abs_events_enriched`
- `mart_game_pitch_timeline`
- `mart_live_challenge_window`
- `mart_game_challenge_value_timeline`
- `mart_game_team_challenge_comparison`
- `mart_game_umpire_summary`
- `mart_game_postgame_audit`
- `mart_team_challenge_value_summary`
- `mart_team_decision_value_*`
- `mart_pitch_type_zone_baselines`
- `mart_team_daily_abs`
- `mart_umpire_daily_abs`

### 4.4 Model Lookup Marts

The core model lookup marts are:

- `mart_run_expectancy_fallbacks`
- `mart_win_expectancy_fallbacks`
- `mart_count_state_outcome_baselines_train_validation`
- `mart_modeled_abs_overturn_probability_fallbacks`

Serving equivalents are exported into serving tables so the app can load model lookups without recomputing large historical aggregations on user requests.

## 5. Model Layer

### 5.1 Canonical Pitch State

`src/lib/server/model-state.ts` defines the canonical state keys used by RE/WE and challenge decision models.

It normalizes:

- count key: `balls-strikes`, clamped to 0-3 and 0-2.
- bases state: `000` through `111`.
- inning bucket: `1-3`, `4-6`, `7-8`, `9+`.
- half inning: `Top` or `Bottom`.
- batting side: away in top, home in bottom.
- score differential from the batting team's perspective.
- score-diff bucket: trailing/leading/tied buckets.

This file is the shared contract that keeps SQL model rows and TypeScript model lookups aligned.

### 5.2 Run Expectancy

`src/lib/server/run-expectancy.ts` loads `mart_run_expectancy_fallbacks`.

It resolves expected runs with a tiered fallback:

1. Exact: inning bucket, outs, bases state, count key.
2. Drop inning bucket: outs, bases state, count key.
3. Drop count key: outs, bases state.

The output includes:

- expected runs to end inning
- sample size
- confidence band
- fallback tier

`getChallengeRunExpectancyDelta` compares the held count state with the corrected count state for a challenge and returns pre/post/delta RE values.

Baseball logic:

- RE is primarily a run-scoring potential model.
- It matters more for context like runners/base-out/count than for who eventually won.
- It is useful for explaining challenge value even when win expectancy is unavailable or low-confidence.

### 5.3 Win Expectancy

`src/lib/server/win-expectancy.ts` loads `mart_win_expectancy_fallbacks`.

It resolves batting-team win probability with fallback tiers:

1. Exact inning/count.
2. Drop exact inning to inning bucket.
3. Drop count key at exact inning.
4. Drop count key and use inning bucket.

The model indexes rows in memory with a `WeakMap` cache so repeated page calculations do not rebuild lookup maps.

It also contains baseball sanity checks:

- Late tied count swings should exceed early tied count swings.
- Late close swings should exceed early blowout swings.
- Hitter-ahead counts should favor the batting team more than pitcher-ahead counts.

`getChallengeWinExpectancyDelta` calculates pre/post/delta WE for a challenged count correction.

Baseball logic:

- WE is the clearest org-facing value when sample coverage is sufficient.
- The UI avoids overstating WE when the confidence band is low.
- The app now keeps low-confidence buckets visible but labels them honestly.

### 5.4 Overturn Probability

`src/lib/server/challenge-decision-value.ts` defines overturn probability resolution.

It uses:

- challenge direction: `strike_to_ball` or `ball_to_strike`
- edge bucket:
  - `strong_confirm`
  - `lean_confirm`
  - `borderline`
  - `lean_overturn`
  - `strong_overturn`
- geometry variant:
  - `radius_adjusted`
  - `center_only`

Resolution order:

1. Exact direction plus edge bucket.
2. Direction only.
3. Global.
4. Preferred geometry first, alternate geometry second.

This is why keeping Savant radius-adjusted canonical values matters. The model can still retain center-only history for audit comparison, but the product-facing default is radius-adjusted geometry.

### 5.5 Challenge Decision Value

`estimateChallengeDecisionValue` combines:

- approximate leverage index
- empirical overturn probability
- success branch win delta
- failed challenge cost
- challenge inventory cost
- expected challenge value
- recommendation: `challenge`, `hold`, or `cannot_challenge`

Inventory model:

- Version: `inventory_future_opportunity_failure_weighted_v2`.
- Cost is larger when fewer challenges remain.
- Cost is larger earlier in game states where future opportunity value remains.
- Cost is capped by remaining-challenge buckets.
- Cost only applies on the failed-challenge branch.

If WE count swing is unavailable, the model falls back to heuristic leverage. The response explicitly marks `decisionValueMode` as `win_expectancy` or `heuristic`.

### 5.6 Estimated Leverage

`src/lib/estimated-leverage.ts` defines a fan-friendly pressure proxy:

- inning factor
- close-game factor
- count factor
- base-out factor

This is not a full win expectancy model. It is a deterministic pressure score used for labels, sorting, and fan-facing copy where a full model would be too technical or too sparse.

### 5.7 Count-State Baselines

`src/lib/challenge-value.ts` builds count-state baseline maps and count-state deltas. These support context around "what does this count change usually mean?" and avoid treating all count corrections equally.

### 5.8 Strike-Zone and Zone Mapping Models

Files:

- `src/lib/zone-model.ts`
- `src/lib/zone-mapping.ts`
- `src/components/strike-zone-plot.tsx`
- `src/lib/__tests__/zone-mapping.test.ts`

There are two separate concepts:

- Display mapping: how to draw a pitch on a chart.
- ABS truth geometry: how the challenge was judged.

`zone-mapping.ts` supports:

- actual/reference mapping
- adjusted player-zone mapping
- stable plot dimensions
- fixed horizontal half width for the visual plot

`zone-model.ts` classifies observed lanes and buckets using strike-zone top/bottom and horizontal bounds.

The product should continue treating Savant/ABS margin as the authoritative call explanation. The plot is a visualization, not the source of truth.

## 6. Backend Data Access

### 6.1 Database Client

`src/lib/db.ts` wraps `pg.Pool`.

It exports:

- `pool`
- `sql`
- `sqlOne`
- `sqlExec`
- `withTransaction`

Connection pooling is globalized in development so hot reload does not create unbounded pools. Production uses the same pool with `max: 10`. SSL is controlled by `DATABASE_SSL=true`.

Known operational note: the current Vercel logs have shown a pg SSL warning emitted at error level. That is a deployment/config hygiene issue, not a data-contract failure, but it should remain on the launch checklist.

### 6.2 Read Models

`src/lib/data.ts` is the central backend read-model file. It turns SQL rows into page-safe TypeScript objects for every major surface.

Major families:

- Home:
  - `getLiveGames`
  - `getHomeChallengeMoments`
  - `getTeamLeaderboardModel`
  - `getUmpireLeaderboardModel`
- Game:
  - `getGame`
  - `getGameScoreboardData`
  - `getGameAbsCounters`
  - `getGameLiveStatus`
  - `getGamePageChallengeEvents`
  - `getLiveChallengeWindow`
  - `getGamePitchTimeline`
  - `getGameChallengeValueTimeline`
  - `getGamePostgameAudit`
  - `getGameTeamChallengeComparison`
  - `getGameUmpireInGameSummary`
- Team:
  - `getTeamSummary`
  - `getTeamIdentity`
  - `getTeamTrend`
  - `getTeamInningEfficiency`
  - `getTeamSideSplits`
  - `getTeamAggression`
  - `getTeamDecisionValueReport`
  - `getTeamChallengeValueSummary`
  - `getTeamChallengeScenarioMatrix`
  - `getTeamUmpireMatchups`
  - `getTeamHitterEyeHeatmap`
  - `getTeamPitchingBailouts`
  - `getTeamSchedule`
- Umpire:
  - `getUmpireSummary`
  - `getUmpireProfile`
  - `getUmpirePageChallengeEvents`
  - `getUmpirePerformanceDNA`
  - `getUmpirePitchTypeBreakdown`
  - `getUmpireMatchupVulnerabilities`
  - `getUmpireSeasonTrend`
  - `getUmpireSchedule`

This file also contains helper logic for:

- range filters
- situational filters
- count-state labels
- pitch timeline descriptions
- handedness baselines
- pitch-lane baselines
- estimated decision labels
- low-confidence display handling

### 6.3 API Routes

The App Router API layer lives under `src/app/api`.

Key route groups:

- AI:
  - `/api/ai/chat`
  - `/api/ai/artifacts`
  - `/api/ai/feedback`
  - `/api/ai/tasks`
  - `/api/ai/viz`
- Baseball:
  - `/api/games`
  - `/api/live`
  - `/api/teams`
  - `/api/umpires`
  - `/api/reports`
  - `/api/query`
  - `/api/v2/challenge-value`
- Product/auth/community:
  - `/api/me`
  - `/api/profile`
  - `/api/articles`
  - `/api/comments`
  - `/api/follows`
  - `/api/moderation`
- Operations:
  - `/api/cron/*`
  - `/api/internal/jobs`
  - `/api/webhooks/clerk`

The route design keeps page data mostly server-rendered while exposing API routes for AI, community actions, admin/editorial jobs, and embeddable/shared artifacts.

## 7. AI Layer

### 7.1 AI Product Surfaces

There are three user-facing AI surfaces:

1. Copilot:
   - general page-aware assistant
   - route-scoped by game/team/umpire/global context
   - implemented by `runCopilotSurface`
2. Chart insight:
   - explains a specific chart and its baseball meaning
   - returns structured insight plus plain-language answer
   - implemented by `runChartInsightSurface`
3. Visualizer:
   - creates a deterministic chart plan from a user's question
   - can use model/data tools to build bar charts, heatmaps, and breakdowns
   - implemented by `runVisualizerSurface`

### 7.2 AI Request Entry

`src/app/api/ai/chat/route.ts` calls `runChat` in `src/lib/server/ai-chat.ts`.

`runChat` handles:

- request schema validation through `CHAT_REQUEST_SCHEMA`
- CSRF validation
- viewer profile lookup
- entitlement checks
- rate limiting
- global concurrency limiting
- out-of-scope baseball guardrails
- prompt misuse checks
- conversation storage
- typed tool loading
- prompt construction
- OpenAI call
- structured result parsing
- citations
- telemetry and cost estimates
- saved generation events
- fallback responses
- async queueing for heavy requests

### 7.3 AI Policy

`src/lib/server/ai-policy.ts` defines:

- maximum message chars
- estimated input token limits
- maximum response chars
- maximum tool payload bytes
- allowed delivery modes
- misuse patterns
- heavy-query patterns
- allowed tool names by route scope
- answer post-processing
- cost estimates
- queueing rules
- stable error codes

This layer exists to keep AI from becoming an unbounded SQL/data exfiltration surface. The model never gets arbitrary database access. It only receives sanitized tool outputs from known read-model functions.

### 7.4 AI Tools

`src/lib/server/ai-tools.ts` resolves typed tool results.

By context:

- Game scope:
  - `get_game_summary`
  - `get_game_live_status`
  - `get_game_challenges`
- Team scope:
  - `get_team_summary`
  - `get_team_trend`
  - `get_team_inning_efficiency`
  - `get_team_side_splits`
  - `get_team_aggression`
  - `get_team_challenge_scenario_matrix`
  - `get_team_challenge_value_summary`
  - `get_team_decision_value_report`
- Umpire scope:
  - `get_umpire_summary`
  - `get_umpire_profile`
- Global scope:
  - `get_live_games`
  - `get_home_challenge_moments`

Payloads are sanitized with `sanitizeToolPayload`. The visualizer can request a larger `maxArrayItems` budget so inning charts can render all nine innings instead of being truncated to five rows.

### 7.5 Prompt and Terminology System

Prompt files:

- `src/lib/server/ai/prompts/base.ts`
- `src/lib/server/ai/prompts/copilot.ts`
- `src/lib/server/ai/prompts/chart-insight.ts`
- `src/lib/server/ai/prompts/visualizer.ts`

Terminology system:

- `src/lib/server/ai/terminology/*`
- `tests/ai-evals/terminology-voice.eval.test.ts`

The terminology layer selects baseball-native terminology cards based on:

- surface
- task family
- semantic tags
- audience mode
- route context

This was added because generic AI answers sounded detached from baseball. The current design injects domain language such as challenge inventory, count swing, edge, leverage, and deployment context.

### 7.6 AI Visualizer

`src/lib/server/ai/surfaces/visualizer.ts` contains deterministic chart planners for common team questions.

Supported intent families include:

- count-state breakdown
- inning breakdown
- offense/defense split
- timing phase
- home/away split
- scenario matrix
- decision breakdown

For these common questions, the system can build the chart directly from tool data instead of relying fully on LLM composition. This improves repeatability and prevents chart truncation or malformed data points.

Recent hardening:

- `normalizeInningLabel` now labels the ninth inning as `9`, not `9+`.
- Visualizer tool payloads allow up to 30 array items.
- Team inning-efficiency charts can display the full inning set when data exists.

### 7.7 AI Persistence and Sharing

`src/lib/server/ai-generations.ts` manages:

- generation events
- saved artifacts
- public artifact access
- viewer artifact lists
- artifact registration

Routes under `/api/ai/artifacts` and pages under `src/app/v/[vizId]` support sharing AI-generated visualizations. Helpers in `src/lib/ai-share.ts` protect internal route scope normalization.

### 7.8 AI Safety and Abuse Controls

Safety controls include:

- Clerk/dev auth verification.
- AI entitlement checks.
- per-user and global rate limits.
- concurrency gates.
- prompt misuse classification.
- baseball-domain guardrail checks.
- safety event recording in `ai.safety_events`.
- AI strike counts and suspension/ban fields on `product.user_profiles`.
- audit logs through `ops.audit_log`.

## 8. Frontend and UX Layer

### 8.1 App Router Surfaces

Core pages:

- `src/app/page.tsx`: home dashboard, broadcast strip, live games, team/umpire leaderboards.
- `src/app/game/[gamePk]/page.tsx`: game hub router.
- `src/app/teams/page.tsx`: team leaderboard/list.
- `src/app/teams/[teamId]/page.tsx`: team detail.
- `src/app/umpires/page.tsx`: umpire leaderboard/list.
- `src/app/umpires/[umpireId]/page.tsx`: umpire detail.
- `src/app/articles/*`: editorial and article pages.
- `src/app/profile/*`: user profile and saved artifacts.
- `src/app/admin/*`: admin/editorial/job surfaces.
- `src/app/query/page.tsx`: query lab, currently disabled for public launch by config.
- `src/app/v/[vizId]/page.tsx`: public AI visualization share page.

The high-traffic baseball pages are dynamic because live data changes frequently:

- game page
- team page
- umpire page

They use React `Suspense` to split heavier sections and keep the shell responsive.

### 8.2 Fan and Org View Modes

View mode is resolved by:

- `src/lib/view-mode.ts`
- `src/lib/view-mode-href.ts`
- `src/lib/view-mode-contract.ts`

Fan and org views share the same data but differ in:

- labels
- chart order
- model detail
- explanatory copy
- whether decision/value metrics are loaded

Examples:

- Fan view says success rate and tells the story.
- Org view says overturn rate, modeled challenge value, RE/WE, confidence, and deployment.

### 8.3 Game Hub

Game page components:

- `src/components/game-shell.tsx`
- `src/components/game-hub/game-hub-router.tsx`
- `src/components/game-hub/pregame-hub.tsx`
- `src/components/game-hub/live-hub.tsx`
- `src/components/game-hub/postgame-hub.tsx`

The game page routes by status:

- Preview/Warmup: pregame scouting report.
- Live: live war room.
- Final/Game Over: postgame after-action report.

Live mode loads:

- challenges
- live challenge window
- team comparison
- umpire summary
- challenge value timeline
- scoreboard/counters

### 8.4 Team Analytics

Team detail uses:

- `TeamMotifHero`
- `TeamMotifBackdrop`
- `TeamOrgCommandCenter`
- `TeamDecisionValueSummaryCard`
- `TeamDecisionBreakdownBoard`
- `TeamDecisionValueScatter`
- `TeamInventoryDeploymentChart`
- `TeamTrendChart`
- `InningEfficiencyHeatmap`
- `ChallengeAggressionRadial`
- `TeamScheduleMorph`
- `UmpireMatchupMatrix`
- `AIBSVisualizerChat`

Important contract:

- Fan view can load lighter summaries.
- Org view loads decision metrics and value metrics.
- Low-confidence/null model values should show honest labels, not fake fallbacks.

### 8.5 Umpire Analytics

Umpire detail uses:

- `UmpireAccuracyChart`
- `AIInsightBubble`
- `HeatmapDeepDive`
- `ExtremeMissesSection`
- `SeasonOverSeasonChart`
- `UmpireConsequenceBoard`
- `UmpireConsequenceMatrix`
- `UmpireHandednessBoard`
- `UmpirePitchTraitScatter`
- `UmpireGamesMorph`

The org view emphasizes:

- consequences
- RE/WE exposure
- count-state and base-out outcomes
- matchup vulnerabilities
- handedness exposure
- pitch trait scatter

The fan view emphasizes:

- challenge frequency
- overturn rate
- broad umpire story
- simple profile descriptors

### 8.6 Strike-Zone Visualization

Strike-zone views use fixed visual dimensions and mapping helpers. The visual layer should remain clear that:

- the rectangle is a display aid;
- player-specific top/bottom values change vertical mapping;
- ABS truth comes from the canonical ABS margin and Savant edge fields when available;
- radius-adjusted geometry is the product-facing default for explaining outcomes.

This distinction prevents users from interpreting the chart as "inside rectangle means strike" when ABS adjudication used a batter-specific and ball-radius-aware zone.

### 8.7 Design System

The UI uses:

- Tailwind CSS
- CSS variables in `src/app/globals.css`
- reusable `components/ui/*`
- motion wrappers
- cards/panels for repeated items
- team branding/motif helpers
- responsive `Suspense` fallbacks

The visual direction is deliberately closer to a sports analytics command center than a generic SaaS dashboard.

## 9. Authentication, Roles, and Product State

### 9.1 Authentication

Auth files:

- `src/lib/server/auth.ts`
- `src/lib/auth-config.ts`
- `middleware.ts`

Primary auth provider:

- Clerk through `@clerk/nextjs`.

Local/e2e fallback:

- dev headers such as `x-dev-user-id`, `x-dev-user-email`, and `x-dev-user-verified`.

The app only treats Clerk as configured when keys look valid and are not placeholders.

### 9.2 User Provisioning

`src/lib/server/profiles.ts` syncs an authenticated identity into:

- `product.users`
- `product.user_profiles`
- `product.user_roles`

It handles:

- signup kill switch
- verified email/phone status
- email ownership conflicts
- derived usernames
- owner-admin sync
- profile stats
- favorite team
- public/private profile settings
- AI history settings

### 9.3 Roles and Entitlements

Files:

- `src/lib/server/roles.ts`
- `src/lib/server/entitlements.ts`
- `src/lib/server/owner-admin.ts`

Roles are simple string roles stored in `product.user_roles`.

AI access and admin behavior are controlled through:

- viewer profile roles
- entitlement checks
- admin-only moderation/editorial routes

### 9.4 CSRF

`src/lib/server/csrf.ts` is used by write routes and AI chat. This keeps authenticated browser actions from being silently triggered cross-site.

## 10. Community, Editorial, and Admin

### 10.1 Community

Schemas:

- `community.comments`
- `community.reactions`
- `community.follows`
- `community.moderation_actions`

Routes:

- `/api/comments`
- `/api/follows`
- `/api/moderation`

Tests:

- `tests/e2e/auth-community.spec.ts`

Controls include:

- authenticated writes
- comment validation
- link blocking
- moderation status
- admin-only moderation actions

### 10.2 Editorial

Schema:

- `editorial.articles`
- `editorial.article_sections`
- `editorial.article_revisions`
- `editorial.article_evidence`
- `editorial.generation_runs`
- `editorial.article_feedback`

Files:

- `src/lib/server/articles.ts`
- `src/lib/server/editorial-automation.ts`
- `src/lib/editorial-workflow.ts`
- article/admin routes under `src/app/articles` and `src/app/admin/articles`

The editorial system can generate daily/weekly baseball content from stored facts, but launch config currently keeps daily AI editorial disabled and weekly editorial enabled.

### 10.3 Admin and Jobs

Admin files/routes:

- `src/app/admin/*`
- `src/lib/server/admin.ts`
- `src/lib/server/job-queue.ts`
- `src/lib/server/jobs.ts`
- `src/lib/server/worker-jobs.ts`
- `src/app/api/internal/jobs/*`

Job infrastructure writes to `ops.job_queue` and is used for heavier/async processing paths, including queued AI tasks.

## 11. Launch Configuration and Deployment

`src/lib/launch-config.ts` currently sets:

- public visualizer enabled
- public copilot enabled
- query lab disabled
- daily AI editorial disabled
- weekly editorial enabled

Deployment target is Vercel. The app uses a hosted serving database through `DATABASE_URL`. The warehouse is not the live app dependency during normal page loads.

Operational docs:

- `docs/launch/live-polling-runbook.md`
- `docs/launch/local-poller-commands.md`
- `docs/launch/serving-db-policy.md`
- `docs/launch/serving-publish-contract.md`
- `docs/launch/vercel-neon-runbook.md`
- `docs/launch/warehouse-backfill-runbook.md`
- `docs/launch/monitoring-alerts.md`

Important current operational stance:

- launchd/local polling is the active live ingestion path.
- warehouse receives source data and models.
- serving receives curated/published data.
- Vercel reads serving.

## 12. Performance and Optimization Choices

### 12.1 Warehouse/Serving Split

The product does not query every raw/historical table from Vercel page loads. The warehouse contains the heavier source history and model-building state. Serving contains the lean product-facing subset.

Benefits:

- faster page loads
- fewer large scans from public traffic
- safer local development
- clearer source-of-truth boundary
- easier reconciliation

### 12.2 SQL Marts

The app relies on SQL marts to pre-shape expensive joins:

- canonical ABS classification
- challenge timelines
- game summaries
- team/umpire summaries
- decision value summaries
- RE/WE fallback lookups
- overturn probability lookups

This reduces repeated TypeScript-side aggregation and keeps baseball logic auditable in SQL.

### 12.3 Runtime Caching

Model lookup files cache fallback rows for 60 seconds:

- `run-expectancy.ts`
- `win-expectancy.ts`
- `challenge-decision-value.ts`

The caches avoid repeated lookup-table queries and repeated index construction during high-traffic windows.

### 12.4 Bounded AI Payloads

AI tool payloads are capped by:

- max characters
- max bytes
- max array rows
- scoped tool allowlists

The recent visualizer fix made row caps configurable so deterministic chart generation can show complete inning data without allowing unbounded context growth.

### 12.5 React Suspense

Heavy route sections are split with `Suspense`, especially:

- game hub content
- team org command center
- team analytics sections
- umpire analytics sections
- home page body

This lets shells render while deeper SQL/model-backed sections resolve.

### 12.6 QA Gates

Current checks include:

- `npm test`
- `npm run build`
- `npm run qa:abs`
- `npm run qa:launch`
- `npm run qa:launch:browser`
- `npm run qa:ai-sweep`
- `npm run db:reconcile:warehouse-serving`
- e2e tests for auth/community/articles/AI
- visual route screenshots
- model audit scripts under `scripts/model-audits`

## 13. Validation and Trust Posture

The product has been hardened across:

- data dedupe
- Savant/MLB source reconciliation
- canonical ABS geometry
- count-state contracts
- RE/WE fallback resolution
- org-view null/low-confidence display
- visualizer chart truncation
- frontend/backend contract alignment
- serving publish/reconciliation

The current trust posture is strong enough for a public portfolio launch, assuming:

- the latest deployed preview is smoke-tested after every push;
- Vercel runtime logs are checked for 5xx errors and database connection issues;
- launchd polling is running against hosted warehouse;
- serving reconciliation is clean;
- any visible `N/A` values correspond to genuinely unavailable/low-confidence model data, not broken contracts.

This should not be described as a league-grade decision product. It is better framed as a fan-facing and portfolio-grade applied analytics product that borrows from org-style workflows and makes the strategy legible.

## 14. Known Rough Edges and Next Improvements

1. Vercel pg SSL warning:
   - observed in logs as error-level noise.
   - likely environment/config related.
   - should be cleaned up before heavy sharing if it affects monitoring.

2. README stale wording:
   - older docs mention GitHub Actions polling.
   - current active setup is launchd/local poller.
   - update public docs to avoid confusion.

3. Fluid Compute limits:
   - if Vercel reports exhausted fluid compute, monitor server function latency and cold-start behavior.
   - upgrade only if smoke/load checks show degraded user experience or function failures.

4. Org-view model sparsity:
   - Some RE/WE values should remain `N/A` when confidence is low or model coverage is insufficient.
   - The UI should continue distinguishing "no model value" from "zero value."

5. More browser coverage:
   - Add targeted Playwright checks for each org-view chart family.
   - Assert that data-rich teams/umpires show non-empty RE/WE/scatter/family charts.

6. Public copy polish:
   - Keep technical claims specific.
   - Avoid implying official MLB affiliation or production use by clubs.

## 15. File Map Appendix

### Data and SQL

- `db/schema.sql`: all schemas, tables, indexes, product/community/editorial/AI/ops state.
- `db/views.sql`: challenge classification, marts, model fallbacks, summary views.
- `etl/ingest_mlb_abs.py`: live MLB Stats API ingest.
- `etl/ingest_savant_abs_gamefeed.py`: Savant ABS enrichment.
- `etl/backfill_statcast_pitch_history.py`: historical Statcast backfill.
- `etl/build_historical_pitch_states.py`: model state construction.
- `etl/build_called_pitch_decisions.py`: called-pitch training rows.
- `etl/db_target.py`: safe database target resolution.
- `scripts/local-live-poll.sh`: launchd poll entrypoint.
- `scripts/publish-serving-db.sh`: warehouse-to-serving publish.
- `scripts/reconcile-warehouse-serving.mjs`: drift detection.
- `scripts/run-db-schema.sh`: schema/view application.
- `scripts/rebuild-abs-summary-tables.sh`: summary refresh.

### Backend and Models

- `src/lib/db.ts`: Postgres pool and query helpers.
- `src/lib/data.ts`: primary app read models.
- `src/lib/server/model-state.ts`: canonical pitch state.
- `src/lib/server/run-expectancy.ts`: RE lookup and deltas.
- `src/lib/server/win-expectancy.ts`: WE lookup and deltas.
- `src/lib/server/challenge-decision-value.ts`: challenge EV model.
- `src/lib/server/run-environment.ts`: confidence and rounding helpers.
- `src/lib/challenge-value.ts`: count-state value helpers.
- `src/lib/estimated-leverage.ts`: fan-facing leverage proxy.
- `src/lib/zone-model.ts`: zone lane/bucket classification.
- `src/lib/zone-mapping.ts`: strike-zone plot mapping.

### AI

- `src/lib/server/ai-chat.ts`: AI request orchestration.
- `src/lib/server/ai-policy.ts`: limits, guardrails, allowed tools, post-processing.
- `src/lib/server/ai-tools.ts`: typed data tools.
- `src/lib/server/ai/surfaces/copilot.ts`: copilot runner.
- `src/lib/server/ai/surfaces/chart-insight.ts`: chart explanation runner.
- `src/lib/server/ai/surfaces/visualizer.ts`: deterministic visualizer/chart runner.
- `src/lib/server/ai/prompts/*`: prompt templates.
- `src/lib/server/ai/terminology/*`: baseball terminology selection and compilation.
- `src/lib/server/ai-generations.ts`: generation/artifact persistence.
- `src/components/analytics/ai-bs-visualizer-chat.tsx`: visualizer UI.
- `src/components/analytics/ai-insight-bubble.tsx`: chart insight UI.
- `src/components/contextual-copilot-fab.tsx`: page copilot UI.

### Frontend

- `src/app/page.tsx`: home page.
- `src/app/game/[gamePk]/page.tsx`: game hub.
- `src/app/teams/page.tsx`: team index.
- `src/app/teams/[teamId]/page.tsx`: team detail.
- `src/app/umpires/page.tsx`: umpire index.
- `src/app/umpires/[umpireId]/page.tsx`: umpire detail.
- `src/app/articles/*`: editorial pages.
- `src/app/profile/*`: profile and saved artifacts.
- `src/app/admin/*`: admin/editorial/jobs.
- `src/app/v/[vizId]/page.tsx`: public AI visualization share page.
- `src/components/analytics/*`: chart and analytics components.
- `src/components/game-hub/*`: pregame/live/postgame game experiences.
- `src/components/ui/*`: design primitives.

### Auth, Product, Community, Editorial

- `src/lib/server/auth.ts`: Clerk/dev identity resolver.
- `src/lib/auth-config.ts`: Clerk key validation.
- `src/lib/server/profiles.ts`: user/profile provisioning.
- `src/lib/server/roles.ts`: role checks.
- `src/lib/server/entitlements.ts`: feature access.
- `src/lib/server/csrf.ts`: write protection.
- `src/lib/server/articles.ts`: editorial article logic.
- `src/lib/server/editorial-automation.ts`: scheduled editorial generation.
- `src/lib/server/job-queue.ts`: job persistence.
- `src/lib/server/jobs.ts`: job operations.
- `src/lib/server/worker-jobs.ts`: worker execution.

### QA and Launch

- `tests/e2e/*`: Playwright end-to-end tests.
- `tests/visual/routes.spec.ts`: visual route baselines.
- `tests/ai-evals/*`: AI behavior and terminology evals.
- `src/lib/__tests__/*`: frontend/model utility tests.
- `src/lib/server/*.test.ts`: server/model tests.
- `etl/tests/*`: Python ETL tests.
- `scripts/launch-readiness.mjs`: release readiness checks.
- `scripts/launch-browser-check.mjs`: browser smoke tests.
- `scripts/ai-prompt-sweep.mjs`: AI launch prompt sweep.
- `scripts/model-audits/*`: model audit checks.


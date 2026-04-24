# ABS Data Pipeline Audit Todo

Date: 2026-04-24

Status: core data correctness and launchd-path fixes implemented in this checkout and verified against hosted warehouse/serving DBs; not a blind green light for public launch until the residual caveats below are closed or accepted.

## Post-Implementation Verification Snapshot

Run after the canonical ABS challenge, Savant geometry, serving mart, summary rebuild, shell/audit target, launchd poller, and serving publish fixes were applied and verified against hosted warehouse + hosted serving.

- Hosted canonical ABS pitch challenge rows: 3,448.
- Hosted `raw.savant_abs_events` rows: 3,448.
- Hosted warehouse and serving now reconcile on `games` (828), `abs_challenges` (3,635), canonical ABS pitch challenges (3,448), `pitches` (246,203), fallback lookup row counts, and Savant ABS rows.
- Serving fallback lookup counts now match warehouse source marts: RE 1,464; WE 76,565; count-state baselines 12; overturn probability fallbacks 26.
- Savant reconciliation: 0 raw-unmatched rows, 0 canonical-unmatched rows for scanned games, 0 outcome mismatches.
- Game `823639`: MLB feed has 3 review rows; canonical ABS pitch view has 2 NYM challenges; the non-ABS replay review is excluded as `non_abs_review_type`.
- Team summary mismatches vs canonical ABS facts: 0.
- Umpire summary mismatches vs canonical ABS facts: 0.
- Serving fallback duplicate lookup groups: 0.
- Product QA status: pass on warehouse and serving, with warnings for 4 player profiles missing official ABS zone data and 4 canonical challenges missing pitch location.
- Launchd wrapper now refuses accidental local warehouse polling, writes a poll result file, refreshes official Savant ABS rows after real ingest, rebuilds warehouse summaries, runs warehouse QA, publishes warehouse to serving, runs serving QA, and reconciles warehouse/serving.
- Serving publish now refreshes the Savant gamefeed parent rows and `raw.savant_abs_events` rows needed by serving canonical challenge views.
- Serving publish no longer applies full serving DDL by default; serving schema changes are now an explicit maintenance action to avoid live `ALTER TABLE` lock queues.
- `npm test`: pass, 100 files / 319 tests.
- `npm run lint`: pass with warnings only.
- `npx tsc --noEmit`: pass.
- Shell/Node/Python syntax checks and `git diff --check`: pass.
- `db-smoke`: pass after narrowing it to relation existence plus a canonical challenge timeline fixture.

Residual caveats:

- The active macOS LaunchAgent now points to `/Users/colbyreichenbach/Code/abs-observatory-launchd`, a non-TCC-protected runtime copy synced from this checkout. The direct `Downloads` checkout could not be used by launchd because macOS returned `Operation not permitted`.
- The launchd runtime `.env.poll` now points to hosted warehouse and hosted serving, and the first run completed successfully with warehouse/serving drift flags all false. Keep the runtime copy synced when changing poller code in this working checkout.
- Four canonical challenges still lack `px/pz`; they should remain visibly lower-confidence or be backfilled from an official source before being highlighted.
- Four player profiles still lack official ABS top/bottom zone data; current fallback is acceptable for continuity but not ideal for launch-grade precision.
- Full scans of `mart_game_abs_challenge_values` are too slow for a routine release gate; the fast gate now checks unique serving fallback keys and targeted reconciliation instead.
- `.env.local` in this checkout still points `WAREHOUSE_DATABASE_URL` at a local database. Operational scripts now guard against accidental local warehouse usage, but the hosted warehouse URL still needs to be explicit in the poll env or command environment.
- Slow remote chart hydration remains a product-performance concern: the chart audit passed, but the home leaderboard hydration emitted timing warnings up to about 14.5s against serving.

This is a ranked fix backlog from the April 24 read-only data audit. It covers ingest, serving, marts, SQL views, data models, and app-facing data consumers.

## Baseball / ABS Baseline Used

Current official/public constraints checked against:

- MLB says the ABS Challenge System reviews ball/strike calls, starts each club with two challenges, and successful challenges are retained.
- MLB says only the batter, pitcher, or catcher may initiate the challenge, immediately after the pitch.
- Baseball Savant says the ABS zone uses the 17-inch plate width, top at 53.5% of measured player height without cleats, bottom at 27%, and pitch location over the middle of the plate.
- Baseball Savant defines challenge opportunities as non-swings that go against the challenging side: called strikes against batters/batting team and called balls against fielders/fielding team.

References:

- https://www.mlb.com/news/abs-challenge-system-mlb-2026
- https://baseballsavant.mlb.com/abs?gameType=regular&level=mlb&year=2026
- https://baseballsavant.mlb.com/leaderboard/abs-challenges

## Evidence Snapshot

Serving DB findings:

- `abs_challenges`: 3,635 rows, 0 duplicate `dedupe_key`s, 0 duplicate natural challenge keys.
- `abs_challenges` includes 161 no-pitch replay reviews.
- `abs_challenges` has 3,474 rows with an effective pitch number; 914 of those do not look like clean called-ball/called-strike challenge rows by current text/code checks.
- `raw.savant_abs_events`: 2,564 rows, max game date 2026-04-07.
- `abs_challenges`: max game date 2026-04-24, so 910 effective-pitch challenge rows are not represented in official Savant raw staging.
- `mart_game_abs_challenge_values`: 14,182 rows for 3,635 distinct challenges, 10,547 extra rows.
- `team_abs_game_summary` vs ABS-like pitch challenges: 207 team-game total mismatches, absolute total delta 330.
- `umpire_abs_game_summary` vs ABS-like pitch challenges: 166 game mismatches, absolute total delta 351.
- Direction mapping from text vs count transition: 1,846 mismatches out of 1,850 count-resolved overturned challenge rows.
- `modeling.called_pitch_decisions`: 28,557 rows in serving, 0 rows in warehouse. The table is populated in the wrong environment.
- Model direction mismatch: 781 mismatches out of 781 joined overturned model rows.
- Warehouse/serving reconciliation with explicit URLs: serving has 282 games and 1,338 challenge keys not in warehouse; warehouse has 10 challenge keys not in serving.
- Stale ETL run rows: 3 `etl_runs` are still marked `running`, aged from about 6 hours to about 2 days.

Warehouse DB findings:

- Base table keys are clean: no duplicate `games`, `at_bats`, `pitches`, `abs_challenges`, `raw.savant_abs_events`, `raw.statcast_pitches`, or `historical_pitch_states`.
- Warehouse is stale for live operational data: max game date 2026-04-03, while serving is 2026-04-24.
- Warehouse has 4,566,992 `raw.statcast_pitches` and 4,566,992 `historical_pitch_states`, but 0 `modeling.called_pitch_decisions`.

## P0 Release Blockers

### 1. Add a canonical ABS pitch challenge definition

- [ ] Add canonical fields or a canonical view for `is_abs_pitch_challenge`, `effective_pitch_number`, `review_domain`, `original_call`, `corrected_call`, `challenge_side_role`, and `challenge_source_system`.
- [ ] Gate all ABS charts, summaries, marts, articles, and AI payloads on the canonical ABS pitch challenge definition.
- [ ] Backfill existing data using a conservative classifier:
  - include reviewed pitch rows with ball/strike call semantics;
  - include terminal `MJ` at-bat pitch-result rows only when they resolve to a final called take;
  - exclude ordinary replay reviews: play at first, force play, tag play, home run, hit by pitch, catcher interference, shift violation, rules check, etc.
- [ ] Add DB audit assertions:
  - no no-pitch replay rows in ABS charts;
  - all ABS pitch challenge rows join to exactly one pitch or carry a documented terminal-pitch inference;
  - all ABS pitch challenge rows have `challenge_team_id` equal to batting or fielding team.

Evidence:

- Game `823639` NYM has 2 ABS-like pitch challenges plus 1 non-ABS play-at-first replay stored in `abs_challenges`.
- Serving has 161 no-pitch replay rows inside `abs_challenges`.

Affected code:

- `etl/ingest_mlb_abs.py:696` stores at-bat `reviewDetails` as `abs_challenges`.
- `etl/ingest_mlb_abs.py:817` stores event-level `reviewDetails` as pitch challenges.
- `src/lib/data.ts:1925` reads all `abs_challenges` in `getGameChallenges`.
- `src/lib/data.ts:2439` and `src/lib/data.ts:2451` count all returned challenge rows by team.
- `scripts/rebuild-abs-summary-tables.sh:39` rebuilds summaries from all `abs_challenges`.
- `etl/ingest_mlb_abs.py:1015` rebuilds umpire summaries from all `abs_challenges`.

Acceptance criteria:

- Game `823639` fan/team challenge count returns NYM = 2, not 3 or 10.
- No ABS strike-zone or challenge-split surface counts non-pitch replay reviews.
- A query against canonical ABS pitch challenges returns 0 rows where `effective_pitch_number IS NULL` unless explicitly classified as a terminal called-take inference.

### 2. Stop serving mart row multiplication

- [ ] Deploy the local `overturn_probability_lookup` dedupe CTE in `mart_game_abs_challenge_values`.
- [ ] Add a unique/validation rule for serving overturn fallback lookup keys used by the app.
- [ ] Align exact fallback lookup taxonomy before trusting exact probability rows.
- [ ] Add a publish-blocking assertion:
  - `SELECT COUNT(*) = COUNT(DISTINCT challenge_id) FROM mart_game_abs_challenge_values`.

Evidence:

- Serving `mart_game_abs_challenge_values` has 14,182 rows for 3,635 distinct challenges.
- The deployed serving view does not contain `ROW_NUMBER()` or the local `overturn_probability_lookup` CTE.
- `serving_abs_overturn_probability_fallbacks` has both `center_only` and `radius_adjusted` rows; direct joins multiply challenge rows.

Affected code:

- `db/views.sql:1850` has the local dedupe CTE.
- `scripts/publish-serving-db.sh:149` exports both geometry variants from `mart_modeled_abs_overturn_probability_fallbacks`.
- `scripts/publish-serving-db.sh:312` loads both variants into serving.

Acceptance criteria:

- `mart_game_abs_challenge_values` is exactly one row per `challenge_id`.
- Game/team comparison never changes if a lookup table gains another geometry variant.

### 3. Correct original-call vs corrected-call semantics

- [ ] Stop deriving challenge direction from ambiguous `called_description`.
- [ ] Store or derive `original_call` and `corrected_call` explicitly.
- [ ] For overturned rows, derive direction from count transition first:
  - strike count increases -> original ball became strike (`ball_to_strike`);
  - ball count increases -> original strike became ball (`strike_to_ball`).
- [ ] For confirmed rows, direction should represent the challenge target, not a reversal that did not happen.
- [ ] Rebuild overturn probability, decision value, team decision value, and audit scripts after direction is corrected.

Evidence:

- Serving text-vs-count direction mismatches: 1,846 out of 1,850 count-resolved overturned rows.
- Model direction mismatches: 781 out of 781 joined overturned model rows.

Affected code:

- `db/views.sql:1582` maps corrected called strike text to `strike_to_ball`.
- `db/views.sql:2406` repeats the same pattern in team decision value.
- `src/lib/server/challenge-decision-value.ts:138` maps `called_strike -> strike_to_ball`.
- `src/lib/server/challenge-decision-value.ts:165` derives held/corrected count keys from that ambiguous call.
- `scripts/model-audits/shared-audit-utils.mjs:143` repeats the bad mapping.
- `etl/build_called_pitch_decisions.py:176` treats coalesced corrected/live text as `observed_call`.
- `etl/build_called_pitch_decisions.py:224` assigns opportunity team from that ambiguous observed call.

Acceptance criteria:

- Count-resolved overturned direction mismatch rate is 0.
- Model `challenge_direction` agrees with count-derived direction for all joined overturned rows with complete counts.
- Challenge value examples match baseball logic: batter challenges called strike; fielder challenges called ball.

### 4. Rebuild team and umpire summary tables from canonical ABS facts

- [ ] Rebuild `team_abs_game_summary` and `umpire_abs_game_summary` from canonical ABS pitch challenges only.
- [ ] Preserve official feed inventory counters separately from derived challenge counts.
- [ ] Stop treating `team_abs_game_summary` as canonical challenge count unless it passes a reconciliation query.
- [ ] Add a release gate for team and umpire summary mismatch counts.

Evidence:

- Team summary mismatch: 207 team-game total mismatches, absolute total delta 330.
- Umpire summary mismatch: 166 game mismatches, absolute total delta 351.
- Some final games have summary 0 while facts have 5 to 8 ABS-like pitch challenges.

Affected code:

- `etl/ingest_mlb_abs.py:446` writes feed-provided team counters.
- `scripts/rebuild-abs-summary-tables.sh:39` currently counts all `abs_challenges`.
- `scripts/rebuild-abs-summary-tables.sh:108` currently counts all `abs_challenges` for umpire summaries.
- `src/lib/data.ts:1287`, `src/lib/data.ts:1731`, `src/lib/data.ts:1788`, `src/lib/data.ts:3985`, `src/lib/data.ts:4164`, and `src/lib/data.ts:4324` consume summary rows.

Acceptance criteria:

- Team summary total, successful, and failed counts match canonical ABS pitch facts for every completed game.
- Umpire summary challenged, overturned, and confirmed counts match canonical ABS pitch facts for every completed game.

### 5. Fix warehouse/serving authority inversion

- [ ] Decide and enforce a single canonical write path. Current docs say warehouse should be canonical, but live serving is ahead.
- [ ] Move live poll target to warehouse, then publish to serving.
- [ ] Update `sync-live-context-to-warehouse` to be a temporary repair tool only, or make it bidirectional-delete aware if it remains.
- [ ] Sync or rebuild `modeling.called_pitch_decisions` in the warehouse, not serving.
- [ ] Add daily reconciliation as a hard release gate.

Evidence:

- Serving has 828 games; warehouse has 546.
- Serving has 3,635 `abs_challenges`; warehouse has 2,307.
- Serving has 1,338 challenge keys not in warehouse; warehouse has 10 challenge keys not in serving.
- Serving has 28,557 `modeling.called_pitch_decisions`; warehouse has 0.

Affected code/docs:

- `docs/models/data-platform-master-plan.md` says warehouse is the canonical ingest authority.
- `scripts/sync-live-context-to-warehouse.mjs:6` defaults end date to 2026-04-07.
- `scripts/sync-live-context-to-warehouse.mjs:379` upserts `abs_challenges` by `dedupe_key` but never deletes stale target rows.
- `scripts/reconcile-warehouse-serving.mjs:81` reads env vars, but the custom env loader does not expand `${DATABASE_URL}`.
- `etl/poll_live_window.py` requires `DATABASE_URL` and can target serving.

Acceptance criteria:

- `db:reconcile:warehouse-serving` passes without explicit URL overrides.
- Warehouse max game date and max challenge timestamp are at least as fresh as serving after each live ingest.
- Serving never contains model-training rows that warehouse lacks.

### 6. Bring official Savant raw ABS staging back into the pipeline

- [ ] Run and schedule `etl/ingest_savant_abs_gamefeed.py` beyond 2026-04-07.
- [ ] Decide whether official Savant raw events or Stats API review details are canonical for ABS event identity.
- [ ] If Stats API remains the live source, use Savant as validation and record source confidence per row.
- [ ] Publish/sync `raw.savant_abs_events` only if serving app or audits genuinely need it; otherwise keep it warehouse-only.

Evidence:

- `raw.savant_abs_events` max game date is 2026-04-07.
- `abs_challenges` max game date is 2026-04-24.
- 910 effective-pitch `abs_challenges` rows have no matching raw Savant event in serving.
- All 2,564 raw Savant ABS events currently match an `abs_challenges` row by game/at-bat/pitch.

Affected code/docs:

- `docs/launch/official-savant-abs-pipeline.md` says Savant gamefeed is the official event pipeline.
- `scripts/publish-serving-db.sh` does not export or load `raw.savant_abs_events`.
- `scripts/sync-live-context-to-warehouse.mjs` does not sync `raw.savant_abs_events`.

Acceptance criteria:

- Raw official Savant staging has a documented cutoff equal to or newer than the public app challenge cutoff.
- Every official raw ABS event maps to one canonical ABS challenge row.
- Every canonical ABS challenge row has a declared source path and validation state.

## P1 High Priority Correctness Fixes

### 7. Replace mutable challenge dedupe keys

- [ ] Remove `isOverturned` from the stable identity key.
- [ ] Introduce immutable event identity: `game_pk`, `at_bat_index`, `effective_pitch_number`, `challenge_team_id`, source event id/play id, and review domain.
- [ ] Keep outcome as mutable state on the row.
- [ ] Add a migration that merges old dedupe rows safely.

Evidence:

- `etl/ingest_mlb_abs.py:512` includes `review.get('isOverturned')` in `dedupe_key`.
- A live in-progress false outcome can become true, creating a different key if a cascade/delete does not run first.
- `sync-live-context-to-warehouse` upserts by `dedupe_key` and does not delete stale keys.

Acceptance criteria:

- Outcome changes update one challenge row, never create a new identity.
- Cross-DB sync can delete or mark rows absent from source.

### 8. Fix challenge inventory logic and regulation limits

- [ ] After canonical filtering, assert no team has more than two failed ABS challenges in regulation.
- [ ] Model extra-inning challenge refresh explicitly.
- [ ] Use successful challenges as retained, not consumed.
- [ ] Separate official feed remaining counters from derived inventory state.

Evidence:

- Serving has 3 team-games with more than two failed regulation ABS-like pitch challenges.
- Current max failed regulation count is 3.

Acceptance criteria:

- No regulation team-game has `failed_regulation > 2`.
- Extra-inning challenge refresh is represented and tested.

### 9. Fix opportunity side and challenge actor semantics

- [ ] Store `challenge_actor_role`: batter, catcher, pitcher, unknown.
- [ ] Store `challenge_side_role`: batting or fielding.
- [ ] Validate challenge side against call:
  - batting side challenges called strikes;
  - fielding side challenges called balls.
- [ ] Stop relying on `challenge_team_side` alone; home/away is not enough for opportunity logic.

Evidence:

- Serving has 6 pitch challenge rows with impossible side/direction combinations under ABS rules.
- Existing model code derives `opportunity_team_id` from ambiguous observed call in `etl/build_called_pitch_decisions.py:224`.

Acceptance criteria:

- 0 impossible side/direction rows after canonical filtering.
- Every challenged row has either actor role from source or explicit `unknown` with reason.

### 10. Rebuild `modeling.called_pitch_decisions`

- [ ] Move model table population to warehouse.
- [ ] Use canonical ABS challenge rows and official raw Savant rows only after source reconciliation.
- [ ] Recompute `observed_call`, `challenge_direction`, `opportunity_team_id`, `edge_bucket`, and split labels.
- [ ] Drop/rebuild stale serving model rows or explicitly mark serving model tables as unsupported.

Evidence:

- Warehouse has 0 model rows.
- Serving has 28,557 rows, max 2026-04-07.
- Model direction mismatch is 781/781 on joined overturned rows.

Acceptance criteria:

- Warehouse `modeling.called_pitch_decisions` is populated and current.
- Serving has no full training/modeling table unless explicitly approved by serving contract.
- Model audit scripts run against warehouse and pass direction sanity checks.

### 11. Align edge bucket taxonomies

- [ ] Pick one edge-bucket taxonomy for overturn probability serving lookups.
- [ ] If using modeled taxonomy, convert live challenge context to `strong_confirm`, `lean_confirm`, `borderline`, `lean_overturn`, `strong_overturn`.
- [ ] If using simple taxonomy, rebuild fallback tables with `edge`, `near_edge`, `clear_miss`.
- [ ] Add a lookup coverage metric: exact, direction-only, global fallback share.

Evidence:

- `mart_game_abs_challenge_values` live context uses `edge`, `near_edge`, `clear_miss`.
- `mart_modeled_abs_overturn_probability_fallbacks` uses `strong_confirm`, `lean_confirm`, `borderline`, `lean_overturn`, `strong_overturn`.
- Exact fallback lookups therefore miss or degrade, even after row multiplication is fixed.

Affected code:

- `db/views.sql:1593` through `db/views.sql:1632`
- `db/views.sql:407` through `db/views.sql:414`

Acceptance criteria:

- Exact fallback lookup coverage is nonzero and explainable.
- Fallback tier distribution is stable before and after publish.

### 12. Fix terminal at-bat `MJ` pitch-result interpretation

- [ ] Parse terminal `MJ` at-bat descriptions into explicit final called take, actor, and challenge side.
- [ ] Do not use full PA result text as `called_description`.
- [ ] When terminal row joins to final pitch, use the pitch row's called code/description for geometry and count logic.

Evidence:

- 893 serving rows are `review_type = MJ`, `challenge_level = at_bat`, with effective inferred pitch.
- Many descriptions are full PA result text, such as "called out on strikes" or "walks", not a clean pitch call.

Acceptance criteria:

- Terminal pitch-result challenges expose a clean `original_call`/`corrected_call` and readable user copy separately.
- Count transition and challenge direction do not depend on natural-language PA result strings.

### 13. Add ABS-enabled game metadata

- [ ] Add `has_abs` or `abs_system_available` to `public.games`.
- [ ] Mark official 2026 no-infrastructure exceptions and any games where source says `hasAbs = false`.
- [ ] Prevent ABS-specific app claims on non-ABS games.

Evidence:

- Main `games` table does not store `has_abs`.
- Raw Savant gamefeed has `has_abs`, but app surfaces mostly operate from `public.games`.

Acceptance criteria:

- Non-ABS games cannot show ABS challenge dashboards as if missing data means zero challenges.

### 14. Repair zone profile governance

- [ ] Re-sync player ABS profiles and validate top/bottom against measured-height formulas.
- [ ] Keep feed top/bottom, inferred top/bottom, and certified ABS profile top/bottom as distinct fields.
- [ ] Document which source each chart/model uses.
- [ ] Use center-over-middle plate geometry for ABS claims; keep radius-adjusted as experimental until validated.

Evidence:

- Serving has no missing resolved zones, but 6 top-profile and 5 bottom-profile challenge rows deviate from the 53.5%/27% measured-height formula by more than 0.03 ft.
- 4 pitch challenges are missing location.

Acceptance criteria:

- Player profile formula mismatches are explained or eliminated.
- Strike-zone visuals label whether they are certified ABS profile, feed zone, or normalized chart projection.

### 15. Fix publish script summary and retention behavior

- [ ] Stop exporting all `team_abs_game_summary` and `umpire_abs_game_summary` rows while only deleting/reloading a game window.
- [ ] Either publish summaries by the same game window or perform a deliberate full refresh from rebuilt canonical facts.
- [ ] Add post-publish assertions for summary/fact equality.

Evidence:

- `scripts/publish-serving-db.sh:124` through `scripts/publish-serving-db.sh:130` exports game-window detail rows.
- `scripts/publish-serving-db.sh:131` and `scripts/publish-serving-db.sh:132` export all summary rows.
- `scripts/publish-serving-db.sh:260` and `scripts/publish-serving-db.sh:281` truncate summary tables and reload whatever the source summary currently says.

Acceptance criteria:

- Publish cannot ship stale or source-inconsistent summaries.

### 16. Fix Node env loading and default windows

- [ ] Replace hand-rolled Node env loaders with a shared parser that expands shell-style variables or require explicit URLs.
- [ ] Update `sync-live-context-to-warehouse` default end date from 2026-04-07 to a dynamic date or remove defaults.
- [ ] Make `db:reconcile:warehouse-serving` work with `.env.local` as written.

Evidence:

- `node scripts/reconcile-warehouse-serving.mjs --fail-on-drift false --write-artifact false` failed with `getaddrinfo ENOTFOUND base` unless explicit URLs were passed.
- `scripts/sync-live-context-to-warehouse.mjs:6` and `scripts/sync-live-context-to-warehouse.mjs:7` hard-code a stale default window.

Acceptance criteria:

- Reconciliation and sync scripts resolve `WAREHOUSE_DATABASE_URL`, `SERVING_DATABASE_URL`, and `DATABASE_URL` consistently.
- No script silently syncs only through 2026-04-07 after that date.

## P2 Product/Data Consumer Cleanup

### 17. Update app surfaces to use canonical ABS facts

- [ ] Update all `src/lib/data.ts` challenge queries to filter or join the canonical ABS challenge view.
- [ ] Update pregame intelligence, team pages, umpire pages, home moments, articles, and game reports.
- [ ] Review every use of `team_abs_game_summary` and replace with canonical facts where the copy says challenge count/outcome.

Affected areas:

- `src/lib/data.ts`
- `src/lib/pregame-intel.ts`
- `src/lib/server/articles.ts`
- `src/lib/server/game-reports.ts`
- `etl/generate_game_report.py`
- `src/components/game-hub/game-team-comparison-chart.tsx`
- `src/components/challenge-explorer.tsx`

Acceptance criteria:

- No user-facing count labeled ABS/review/challenge is sourced from unfiltered `abs_challenges`.

### 18. Repair audit scripts before trusting audit results

- [ ] Update model audit utilities to use canonical direction and challenge filters.
- [ ] Add explicit audit checks for:
  - row multiplication;
  - non-ABS replay contamination;
  - summary/fact mismatches;
  - direction inversion;
  - warehouse/serving drift;
  - stale raw official Savant coverage.

Affected scripts:

- `scripts/model-audits/shared-audit-utils.mjs`
- `scripts/model-audits/run-current-state-audit.mjs`
- `scripts/model-audits/run-zone-edge-audit.mjs`
- `scripts/model-audits/run-decision-value-audit.mjs`
- `scripts/model-audits/run-overturn-calibration.mjs`
- `scripts/model-audits/run-abs-product-qa.mjs`

Acceptance criteria:

- The audit suite fails when the current known bad states are recreated in a fixture DB.

### 19. Clean stale ETL run states

- [ ] Mark old `etl_runs.status = 'running'` rows as failed/stale after a timeout.
- [ ] Add process heartbeat or run lock identity.
- [ ] Add a startup repair step that does not leave dashboards believing an old ingest is active.

Evidence:

- Serving currently has 3 stale `manual_window` runs marked running, aged about 6 hours, 31 hours, and 49 hours.

Acceptance criteria:

- No run can remain `running` beyond a configured timeout without being marked stale.

### 20. Rename ambiguous product language

- [ ] Use "ABS pitch challenges" when the surface means ball/strike ABS only.
- [ ] Use "replay reviews" for ordinary replay review rows.
- [ ] Avoid "Reviews Used" unless both ABS and replay are intentionally included and labeled.

Evidence:

- Current chart copy says "Reviews Used" while users expect ABS pitch challenges.
- The mixed data table currently contains both ABS pitch challenges and replay reviews.

Acceptance criteria:

- User-facing labels match the exact data population.

## P3 Follow-Up Hardening

### 21. Add source cutoff and data-version banners

- [ ] Show or log the source cutoff for each major data product.
- [ ] Include warehouse cutoff, serving cutoff, raw Savant cutoff, and model cutoff in admin/QA.
- [ ] Block social/public share routes when source cutoffs diverge beyond tolerance.

### 22. Add fixture games for regression tests

- [ ] Fixture: normal confirmed called strike.
- [ ] Fixture: batter wins strike-to-ball challenge.
- [ ] Fixture: catcher wins ball-to-strike challenge.
- [ ] Fixture: terminal strikeout challenge.
- [ ] Fixture: terminal walk challenge.
- [ ] Fixture: non-ABS play-at-first replay that must be excluded.
- [ ] Fixture: extra-inning challenge refresh.

### 23. Add DB-level data contracts

- [ ] Create QA SQL views/functions for `canonical_abs_pitch_challenges`.
- [ ] Add CI checks that run against a fixture Postgres or snapshot.
- [ ] Add migration-time checks for row uniqueness in serving marts.

## Suggested Attack Order

1. Create canonical ABS challenge view/fields and filter non-ABS reviews.
2. Patch and deploy `mart_game_abs_challenge_values` row dedupe.
3. Fix direction semantics from count/original-vs-corrected call.
4. Rebuild team/umpire summaries from canonical facts.
5. Decide warehouse authority and repair serving/warehouse drift.
6. Refresh official Savant raw staging and reconcile sources.
7. Rebuild `modeling.called_pitch_decisions` in warehouse.
8. Repair model/audit scripts and add release gates.
9. Update app surfaces and copy.
10. Re-run release QA and manually verify the known bad games.

## Publicity Decision

Do not post the app publicly until P0 is done and P1 has at least the data-model fixes completed. The current app can show impossible baseball states, mixed ABS/replay counts, duplicated mart rows, stale summaries, and inverted challenge direction/value logic.

# Data Model Logic Audit

Date: April 24, 2026

Scope: data models only. This pass covered SQL marts/views, model source tables, ETL builders, model audit scripts, TypeScript scoring helpers, and chart/zone mapping that depends on model geometry. It did not attempt UI styling or general app QA except where UI output exposes model assumptions.

Status note: this audit records the pre-fix findings that drove the org-trust hardening pass. The implementation checklist and post-fix state live in [2026-04-24-org-trust-model-hardening-todo.md](./2026-04-24-org-trust-model-hardening-todo.md), with fresh post-fix audit outputs in the April 24 RE/WE/overturn/decision-value reports.

## External Baseline

- MLB/Savant define the 2026 ABS zone as a 17-inch wide, two-dimensional rectangle at the middle of home plate, with top/bottom based on measured batter height. Source: https://baseballsavant.mlb.com/abs
- MLB states a pitch is a strike if any part of the ball touches any part of the strike zone, and only pitcher/catcher/batter may challenge. Source: https://www.mlb.com/press-release/press-release-mlb-announces-abs-challenge-system-coming-to-the-major-leagues-beginning-in-the-2026-season
- Savant defines a challenge opportunity as a called ball/strike with a challenge remaining where the call went against the player, with exclusions for position-player pitching and ABS technical issues. Source: https://baseballsavant.mlb.com/abs-metrics-documentation
- Savant/Tango frame challenge strategy around RE288 run value and breakeven confidence, not a free-floating win-probability tax. Sources: https://baseballsavant.mlb.com/abs-metrics-documentation and https://tangotiger.com/index.php/site/article/the-math-behind-a-challenge
- MLB defines WPA as win expectancy after minus win expectancy before; MLB defines LI as how much win probability can change, with 1.0 neutral. Sources: https://www.mlb.com/glossary/advanced-stats/win-probability-added and https://www.mlb.com/glossary/advanced-stats/leverage-index

## Verdict

Not ready to publicize model-driven claims yet.

The descriptive ABS fact layer is much healthier than it was: canonical pitch challenges dedupe correctly, non-ABS reviews are excluded, and the live Savant challenge feed is current. The model layer is not at the same trust level. RE and WE are directionally defensible but need model freshness, confidence-aware serving, and terminal-count handling. Decision value and challenge-now policy are not publishable in their current form because units, sign conventions, inventory cost, and terminal outcomes are inconsistent across code paths.

## Evidence Run

- Rebuilt/generated supporting audit docs against the warehouse with `MODEL_AUDIT_DATABASE_URL`:
  - `docs/models/audits/2026-04-24-re-benchmark.md`
  - `docs/models/audits/2026-04-24-we-benchmark.md`
  - `docs/models/audits/2026-04-24-overturn-calibration.md`
  - `docs/models/audits/2026-04-24-decision-value-audit.md`
- Warehouse recency check:
  - `raw.savant_abs_events`: 3,448 rows, current through 2026-04-23.
  - `mart_abs_pitch_challenges`: 3,448 rows, current through 2026-04-24.
  - `modeling.called_pitch_decisions`: 28,557 rows, only current through 2026-04-07.
  - `historical_pitch_states`: 4,616,846 rows, only current through 2026-04-07.
- Lookup bounds:
  - RE rows: 1,464, no negative/null expectancy.
  - WE rows: 76,565, no probabilities outside 0..1.
  - Overturn fallback rows: 26, no probabilities outside 0..1.
- Canonical challenge uniqueness:
  - `mart_game_abs_challenge_values`: 3,448 rows / 3,448 distinct challenge IDs in the prior query pass.

## Severity Findings

### S0 - Decision value inventory cost is in the wrong unit/scale

`src/lib/server/challenge-decision-value.ts:80-95` hardcodes inventory costs from `0.0073` to `0.2895` expected WP, then subtracts them directly at `src/lib/server/challenge-decision-value.ts:409-413`.

That means early-game close challenges can be charged roughly 29 win-probability points for using one challenge. The decision-value audit shows the result: mean expected challenge value is `-20.56%`, only `0.2%` of held-out opportunities become "challenge" recommendations, while actual historical challenge share is `2.5%`.

This is not a small calibration choice. It dominates every other model component and makes the model behavior unlike baseball strategy. Savant's public challenge strategy framing uses run value / RE288 breakeven confidence. If we want an inventory cost, it needs to be rederived in the same units as the expected value being scored, with clear evidence and a much tighter sanity envelope.

Required fix:
- Remove or disable inventory cost from public decision value until rederived.
- Rebuild inventory cost from observed retained challenge value, simulated future opportunity value, or a clearly documented RE/WP conversion.
- Add a regression check that median/mean inventory cost cannot exceed the modeled success swing for normal high-value challenge windows.

### S0 - Team decision value sign conventions are inconsistent

The TypeScript scorer flips batting-team WE deltas for fielding challenges with `getChallengeTeamValueMultiplier` at `src/lib/server/challenge-decision-value.ts:142-144` and applies it at `src/lib/server/challenge-decision-value.ts:403-407`.

The SQL marts do not consistently do that:
- `mart_game_abs_challenge_values` computes `expected_challenge_value` directly from `win_expectancy_delta` at `db/views.sql:2210-2215`. That delta is batting-team WE, not necessarily challenge-team WE.
- `mart_team_challenge_decision_value` computes `success_we_delta` as corrected batting WE minus held batting WE at `db/views.sql:2815-2816`, then uses it unflipped at `db/views.sql:2831-2843`.

For a fielding-side `ball_to_strike` challenge, success lowers batting-team WE, which is good for the challenger. A team leaderboard or "team decision value" using batting-team sign will mark good fielding challenges as negative unless explicitly labeled as batting-team value.

Required fix:
- Introduce explicit fields:
  - `batting_team_we_delta`
  - `challenge_team_we_delta`
  - `expected_challenge_team_wp`
  - `expected_batting_team_wp`
- Make every UI/AI/report consumer choose one explicitly.
- Add tests for one batter challenge and one pitcher/catcher challenge where successful outcomes must both be positive from the challenger perspective.

### S0 - Terminal ball-four / strike-three challenges are not modeled as terminal game-state transitions

Challenge value currently works mostly as a count-state swap. In `mart_game_abs_challenge_values`, `corrected_count_key` is built from `p.balls_after` / `p.strikes_after` at `db/views.sql:1887-1890`. The `pitches` table contains terminal after-counts (`balls_after > 3` or `strikes_after > 2`), while RE/WE fallback tables only use legal pre-pitch count keys.

Warehouse check:
- All pitches: 6,291 rows have `balls_after > 3`; 14,334 rows have `strikes_after > 2`.
- ABS challenged joined rows: 227 have `balls_after > 3`; 667 have `strikes_after > 2`.
- Overturned terminal rows: 413.

Those are exactly the high-leverage ABS calls where the model should be strongest. Tango's challenge math calls out full-count ball/strike swings as especially large. Our current count-key approach can null out the lookup or fall back to a heuristic instead of modeling the actual walk/strikeout/base-out-score transition.

Required fix:
- Model challenge success/failure as full state transitions:
  - non-terminal: count state to count state;
  - ball four: update bases/runs/outs as a walk/HBP-like terminal state;
  - strike three: update outs and inning/PA state;
  - inning-ending cases: use post-half-inning state.
- Use actual `pitches` post-state when available; otherwise use historical terminal outcome baselines.
- Add regression fixtures for 3-2 called strike overturned to ball and 3-2 ball overturned to strike.

### S1 - Model source tables are stale relative to live ABS facts

Live Savant/canonical ABS challenge data is current through April 23/24, but the model source tables stop on April 7:
- `modeling.called_pitch_decisions`: max `game_date = 2026-04-07`.
- `historical_pitch_states`: max `game_date = 2026-04-07`.
- `raw.savant_abs_events`: max `game_date = 2026-04-23`.
- `mart_abs_pitch_challenges`: max game date 2026-04-24.

That means overturn probabilities, RE/WE fits, inventory-cost audit, and challenge-now policy are not learning from the most recent two-plus weeks of ABS data.

Required fix:
- Add a launchd model refresh step after Savant/statcast ingestion:
  - refresh `modeling.called_pitch_decisions` for the recent window;
  - refresh `historical_pitch_states` for recent regular-season Statcast rows;
  - rebuild/publish fallback lookup tables.
- Store `model_fit_through_date` and display/surface it in model audit artifacts.
- Fail model QA when source max date lags raw ABS facts by more than an explicit threshold.

### S1 - Audit scripts default to serving and can produce false zero-row validation

`scripts/model-audits/audit-runtime.mjs:42-48` prefers `DATABASE_URL` / `SERVING_DATABASE_URL` before `WAREHOUSE_DATABASE_URL`. The first run of RE/WE audits hit serving and produced zero validation/test rows, because serving is not the model-training database.

Required fix:
- For model-training audits, prefer `MODEL_AUDIT_DATABASE_URL`, then `WAREHOUSE_DATABASE_URL`; do not silently fall through to serving.
- Print a hard warning or fail if `historical_pitch_states` or `modeling.called_pitch_decisions` is absent/empty.
- Include the DB role in every generated report and artifact.

### S1 - Strike-zone geometry labels mix official geometry, empirical variants, and UI visuals

Official ABS uses the ball touching the zone, not just the center of the ball. ETL correctly creates both variants:
- center-only: `etl/build_called_pitch_decisions.py:294-298`
- radius-adjusted: `etl/build_called_pitch_decisions.py:299-304`

But the canonical live mart field named `min_edge_distance_center_only` can use `savant.edge_distance_calc` or radius-expanded fallback math at `db/views.sql:88-96`. The name says center-only, while the math includes the ball radius (`0.8291666667` horizontal half width and `0.1208333333` vertical expansion).

The visual strike-zone plot defaults to player-height-adjusted top/bottom but maps pitch centers against a fixed 17-inch box: `src/components/strike-zone-plot.tsx:71-83` and `src/lib/zone-mapping.ts:28-46`. It does not render the ball radius as part of the official ABS decision boundary. That can recreate the user-facing confusion: a pitch center can appear barely inside/outside the rectangle while the official ABS outcome is based on whether any part of the baseball touched the player-specific zone at the middle of the plate.

The overturn audit also shows this is not settled empirically:
- Validation winner: `center_only` by a tiny margin.
- Test Brier: `radius_adjusted` was slightly better (`0.2504` vs `0.2519`).

Required fix:
- Rename live fields so the geometry is explicit: `savant_edge_distance`, `radius_adjusted_margin`, `center_only_margin`.
- For public strike-zone visuals, render the official ABS boundary or render the baseball radius around each pitch center.
- Label empirical model geometry separately from official strike/ball adjudication geometry.

### S1 - WE fallback uses noisy exact cells too eagerly

The WE model is well calibrated by broad probability bucket, but many exact cells are low confidence and can produce non-baseball local shape. The monotonic sanity query comparing `3-0` vs `0-2` in the same game/base/out state found 2,185 violations out of 5,132 pairs, mostly in low-confidence exact or bucketed cells.

The generated WE audit still looks usable at aggregate level:
- validation MAE: `6.0%`
- test MAE: `15.5%`
- probability-bucket calibration is mostly within a few points.

But challenge decisions use local count swings. A locally noisy exact WE cell can flip a challenge recommendation even when the broader calibration is acceptable.

Required fix:
- Resolve WE with confidence-aware fallback: skip exact rows below a sample threshold unless shrinkage confidence is high enough.
- Add monotonic or partial-pooling smoothing for count effects.
- Add a model QA check for count-state directionality on high/medium confidence states.

### S2 - Overturn probability is calibrated only on challenged rows

`mart_modeled_abs_overturn_probability_fallbacks` is a reasonable `P(overturn | challenged, observed challenge-like context)` model, but it is not an unbiased `P(ABS would overturn any opportunity)` model. The source population is challenged rows only.

Generated audit:
- challenged rows available: 2,564
- train / validation / test: 2,197 / 122 / 245
- held-out test Brier: `0.2519`
- held-out realized rate by direction is close to predicted, but most predictions fall into only two coarse buckets (`40-49%`, `50-59%`).

Required fix:
- Keep the public label precise: "empirical overturn rate on challenged pitches" or "challenge-success probability".
- Do not describe it as a general missed-call probability across all called pitches until a full opportunity model is trained.
- If used on non-challenged opportunities, call out selection bias in model cards and AI responses.

### S2 - RE model is directionally sound but still stale and terminal-blind

RE is the healthiest core value model:
- validation MAE: `0.032`
- test MAE: `0.105`
- no negative/null RE lookup values.
- `3-0` vs `0-2` monotonic check had only 3 violations out of 120 pairs, all low-confidence exact cells.

The underlying definition is also correct: `runs_to_inning_end` is computed as inning-end batting score minus current batting score in `etl/build_historical_pitch_states.py:21-29` and `etl/build_historical_pitch_states.py:91-95`.

Remaining risk:
- It still stops at April 7.
- It still does not solve terminal ball-four/strike-three challenge transitions on its own.
- Low-sample extreme test groups can show huge divergence, which should not be surfaced as precise truth.

Required fix:
- Refresh source data.
- Add terminal transition handling.
- Suppress or broaden fallback for low-confidence exact rows in public copy.

## What Is Working

- Canonical ABS challenge extraction is materially improved. Direction, original/corrected call reconstruction, and non-ABS review exclusions are now logical in `mart_abs_challenge_classification` (`db/views.sql:118-245`).
- The serving lookup tables are populated after publish: RE 1,464 rows, WE 76,565 rows, overturn 26 rows.
- RE/WE/overturn lookup bounds are sane.
- Overturn probability calibration is not strong, but it is honest enough for a low-resolution "historical challenge-success" read if labeled correctly.

## Recommended Attack Order

1. Disable or hide public challenge-now / decision-value claims that depend on inventory cost until S0 is fixed.
2. Create one canonical challenge-team value contract and update SQL + TypeScript to match.
3. Implement terminal state transitions for ball four / strike three.
4. Add model refresh to launchd and publish `model_fit_through_date`.
5. Fix audit target selection so model audits run against warehouse by default.
6. Rename geometry fields and update strike-zone visuals to show official ABS ball-radius interpretation.
7. Add confidence-aware WE fallback and monotonic sanity checks.
8. Relabel overturn probability as challenged-row empirical success probability unless/until a full opportunity model is trained.

## Public Launch Call

Descriptive product surfaces can be publicized only if they are limited to verified ABS facts: challenge counts, teams, original/corrected calls, challenge outcomes, pitch locations, and clearly labeled historical rates.

Do not publicize decision-value, challenge-now recommendations, team value leaderboards, or model-backed "should have challenged" claims yet. Those are the highest trust-risk surfaces because they currently blend stale data, inconsistent signs, terminal-count gaps, and an inventory cost that overwhelms the baseball value signal.

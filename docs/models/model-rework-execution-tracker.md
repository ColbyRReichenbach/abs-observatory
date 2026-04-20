# Model Rework Execution Tracker

Status: `Execution Plan`

Last updated: April 8, 2026

Primary methodology source:

- [model-rework-master-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/model-rework-master-plan.md)

Required upstream platform sources:

- [data-platform-master-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-platform-master-plan.md)
- [data-platform-execution-tracker.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-platform-execution-tracker.md)
- [data-foundation-spec.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-foundation-spec.md)

## Purpose

This document converts the master rework plan into an execution tracker with:

- workstreams
- implementation order
- per-model tasks
- likely file targets
- statistical acceptance criteria
- publication gates

This is the operational companion to the master plan. If these two docs conflict, the master plan controls methodology and this tracker controls sequencing.

## Program Principles

Execution must follow these rules:

1. fix statistical blockers before shipping more model-derived product surfaces
2. lock data lineage and split governance before recalibration work
3. rebuild foundational models before downstream rubrics or org analytics
4. keep archived plans archived; all current work must point back to the master plan
5. no task is complete until tests, docs, and audit logic are updated together
6. model work cannot outrun platform work; warehouse authority and canonical datasets come first

## Upstream Platform Gates

This tracker assumes the following platform phases from [data-platform-execution-tracker.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-platform-execution-tracker.md):

- Platform Phase 1: environment and database role cutover
- Platform Phase 2: ETL writer cutover
- Platform Phase 3: poller cutover
- Platform Phase 4: reconciliation layer
- Platform Phase 5: publish flow hardening
- Platform Phase 6: `2026` Statcast backfill
- Platform Phase 7: `historical_pitch_states` rebuild
- Platform Phase 8: `called_pitch_decisions`
- Platform Phase 9: audit runtime cutover

Model phases below are blocked until their listed upstream platform gates are complete.

## Workstreams

### Workstream A: Data Governance And Provenance

Goal:
- make every model input reproducible, split-aware, and audit-safe

### Workstream B: Foundational State Models

Goal:
- rebuild count-state, RE, and WE under proper statistical controls

### Workstream C: Called-Pitch And Geometry Foundation

Goal:
- build the canonical taken-pitch dataset needed for overturn and challenge-now

### Workstream D: Probability And Policy Models

Goal:
- rebuild overturn probability and challenge-now with proper out-of-sample validation

### Workstream E: Translation And Ranking Layers

Goal:
- refit leverage, rubrics, and controversy as downstream layers with honest confidence behavior

### Workstream F: Derived Org Analytics

Goal:
- restore team and umpire org analytics only after upstream layers are statistically green

### Workstream G: Publication Controls

Goal:
- ensure no external publication or product claim gets ahead of the evidence

## Phase Order

### Phase 0: Freeze And Audit The Current State

Tasks:

- mark the master plan as the current methodology source
- archive superseded planning docs
- inventory all places where model outputs are shown in UI and API responses
- inventory all current audit scripts and identify in-sample or leakage-prone logic

Primary file targets:

- [docs/models/model-rework-master-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/model-rework-master-plan.md)
- [docs/models/README.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/README.md)
- [scripts/model-audits](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits)
- [src/lib/server](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/server)

Exit criteria:

- one current source of truth exists
- archive replacements are in place
- all active model surfaces are inventoried

### Phase 1: Split Governance And Leakage Controls

Platform dependencies:

- Platform Phase 1
- Platform Phase 6
- Platform Phase 7

Tasks:

- make historical mart builds split-aware by date range
- define canonical train, validation, and test windows
- add CI tests that fail on leakage
- add provenance fields to artifacts and model outputs
- ensure evaluation scripts cannot silently read future rows

Primary file targets:

- [etl/build_historical_pitch_states.py](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl/build_historical_pitch_states.py)
- [db/schema.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/schema.sql)
- [db/views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)
- [scripts/model-audits/audit-runtime.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/audit-runtime.mjs)
- [scripts/model-audits/shared-audit-utils.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/shared-audit-utils.mjs)

New assets to add:

- split configuration doc or config file
- leakage tests
- artifact provenance schema

Statistical acceptance criteria:

- every audit run records train cutoff and evaluation window
- no evaluated row can appear in the training mart for that run
- leakage tests exist and pass

### Phase 2: Count-State Rebuild

Platform dependencies:

- Platform Phase 1
- Platform Phase 7

Tasks:

- [x] rebuild count-state baselines from split-aware historical pitch states
- [x] define an explicit split-governed baseline family using:
  - `mart_historical_pitch_states_split`
  - `mart_count_state_outcome_baselines_train`
  - `mart_count_state_outcome_baselines_train_validation`
- [x] validate by handedness and pitch-family subgroups
- [x] add held-out calibration readouts
- [ ] decide whether any additional smoothing is needed beyond the empirical train baseline
- [ ] write count-state model card

Primary file targets:

- [db/views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)
- [src/lib/challenge-value.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/challenge-value.ts)
- [src/lib/server](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/server)

Potential new assets:

- [x] count-state audit script
- [ ] count-state model card

Statistical acceptance criteria:

- held-out rate calibration reported
- sample and interval reporting added
- challenged-only bias eliminated from baseline estimation

Current progress:

- split-aware Warehouse views are now live in [views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)
- app fallback reads now prefer the split-aware train-validation fit when serving tables are unavailable:
  - [data.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/data.ts)
- held-out count-state audit now exists:
  - [2026-04-08-count-state-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-count-state-audit.md)
  - [2026-04-08-count-state-audit.json](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/artifacts/2026-04-08-count-state-audit.json)
- current held-out results are directionally strong:
  - validation weighted MAE:
    - batting average `0.36%`
    - walk rate `0.07%`
    - strikeout rate `0.22%`
    - positive outcome rate `0.35%`
  - test weighted MAE:
    - batting average `1.74%`
    - walk rate `0.36%`
    - strikeout rate `0.78%`
    - positive outcome rate `1.33%`
- subgroup stability is reasonable on held-out data, with larger miss on test for breaking / offspeed families than fastballs

### Phase 3: Run Expectancy Rebuild

Platform dependencies:

- Platform Phase 1
- Platform Phase 7

Tasks:

- rebuild RE marts with explicit split windows
- refit fallback and smoothing logic on training only
- create held-out RE benchmark
- publish state-family error breakdowns and uncertainty

Primary file targets:

- [db/views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)
- [src/lib/server/run-expectancy.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/server/run-expectancy.ts)
- [src/lib/server/run-environment.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/server/run-environment.ts)
- [scripts/model-audits/run-re-benchmark.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-re-benchmark.mjs)

Statistical acceptance criteria:

- held-out MAE, RMSE, and signed bias reported
- sparse-state fallback rates reported on held-out data
- confidence is not expressed only as sample-size band

Current progress:

- split-aware RE marts are now rebuilt on Warehouse:
  - `mart_run_expectancy_fallbacks_train` fits on `train`
  - `mart_run_expectancy_fallbacks` now fits on `train + validation`
- held-out benchmark now runs on:
  - validation rows: `712,528`
  - test rows: `49,854`
- current held-out readout from [2026-04-08-re-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-re-benchmark.md):
  - validation MAE: `0.032`
  - validation RMSE: `0.061`
  - test MAE: `0.105`
  - test RMSE: `0.199`
- current test sample resolves entirely through `exact` fallback on the early-2026 window, so the next remaining RE rigor task is uncertainty and sparse-tail communication rather than core leakage control

### Phase 4: Win Expectancy Rebuild

Platform dependencies:

- Platform Phase 1
- Platform Phase 7

Tasks:

- rebuild WE marts on locked train windows
- refit fallback and shrinkage on training only
- create held-out WE calibration and discrimination reporting
- keep MLB benchmark as secondary validation only

Primary file targets:

- [db/views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)
- [src/lib/server/win-expectancy.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/server/win-expectancy.ts)
- [src/lib/server/run-environment.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/server/run-environment.ts)
- [scripts/model-audits/run-mlb-we-benchmark.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-mlb-we-benchmark.mjs)

Statistical acceptance criteria:

- held-out Brier and log loss reported
- calibration curves produced
- external benchmark language downgraded to benchmark, not truth

Current progress:

- split-aware WE marts are now rebuilt on Warehouse:
  - `mart_win_expectancy_fallbacks_train` fits on `train`
  - `mart_win_expectancy_fallbacks` now fits on `train + validation`
- a new primary held-out internal audit is now in place:
  - [2026-04-08-we-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-we-benchmark.md)
- MLB public WE is now explicitly retained as secondary external evidence:
  - [2026-04-08-mlb-we-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-mlb-we-benchmark.md)
- current held-out WE readout:
  - validation: Brier `0.0107`, log loss `0.4736`, MAE `6.0%`
  - test: Brier `0.0538`, log loss `0.4992`, MAE `15.5%`
- current external MLB benchmark readout:
  - `40,963` at-bats compared
  - mean absolute gap `2.5%`
  - mean signed gap `+1.19 pts`
- the WE layer is now on the correct statistical framework, but test-tail instability is still visible and should be addressed before downstream leverage/rubric layers rely on it as fully mature

### Phase 5: Called-Pitch Canonical Dataset

Platform dependencies:

- Platform Phase 6
- Platform Phase 8

Tasks:

- create `called_pitch_decisions`
- define one row per taken pitch
- encode exact pre-pitch state
- encode geometry features and challenge eligibility
- add source provenance and missingness tracking

Primary file targets:

- [db/schema.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/schema.sql)
- [db/views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)
- [etl](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/etl)

Likely new assets:

- new ETL builder for canonical called pitches
- validation tests for geometry and state encoding

Statistical acceptance criteria:

- exact `bases_state` is preserved
- challenge-time available features are clearly separated from post-hoc fields
- missingness and source fallback rates are measurable

### Phase 6: Geometry Layer Rebuild

Platform dependencies:

- Platform Phase 8

Tasks:

- define one geometry spec
- rebuild miss-distance and edge-bucket derivations
- validate monotonicity by direction and subgroup
- document what is measured vs inferred

Primary file targets:

- [scripts/model-audits/run-zone-edge-audit.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-zone-edge-audit.mjs)
- [scripts/model-audits/shared-audit-utils.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/shared-audit-utils.mjs)
- challenge geometry logic in ETL and serving layers

Statistical acceptance criteria:

- geometry monotonicity passes on held-out data
- source coverage is reported
- docs explicitly state this is a reconstructed geometry layer unless stronger validation exists

### Phase 7: Overturn Probability Rebuild

Platform dependencies:

- Platform Phase 4
- Platform Phase 8
- Platform Phase 9

Tasks:

- train overturn probability on historical challenge data only
- use held-out periods for calibration
- fix exact-edge joins in serving marts
- add reliability reporting with confidence intervals
- freeze the overturn training population to challenged rows only from `modeling.called_pitch_decisions`
- build the grouped fallback hierarchy explicitly:
  - direction + geometry version + edge bucket
  - direction + geometry version
  - direction only
  - global
- emit fallback tier with every scored probability
- compare `center_only` vs `radius_adjusted` on held-out challenge outcomes and choose a leading candidate
- publish a geometry-comparison artifact alongside calibration outputs

Implementation order:

1. create an overturn training view or query from `modeling.called_pitch_decisions`
2. derive challenge direction from `observed_call`
3. define edge buckets separately for each geometry version
4. fit empirical overturn rates on `train` only
5. choose any smoothing constants on `validation` only
6. score `test` rows with frozen parameters
7. report held-out calibration and geometry comparison
8. only then update serving marts or live scoring logic

Primary file targets:

- [db/views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)
- [src/lib/server/challenge-decision-value.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/server/challenge-decision-value.ts)
- [scripts/model-audits/run-overturn-calibration.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-overturn-calibration.mjs)

Known blocker to resolve:

- exact-edge probability join issue in the team decision mart

Current progress:

- exact-edge join bug fixed in [db/views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)
- held-out calibration audit rebuilt in [run-overturn-calibration.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-overturn-calibration.mjs)
- current audit now trains on `train`, selects geometry on `validation`, and reports held-out `test`
- current validation winner is `center_only`

Statistical acceptance criteria:

- no in-sample calibration claims remain
- reliability tables are held-out
- exact, direction-only, and global fallback usage are reported correctly
- geometry winner is chosen from held-out evidence, not intuition
- every scored overturn probability records fallback tier and geometry version

### Phase 8: Challenge-Now / Policy Rebuild

Platform dependencies:

- Platform Phase 5
- Platform Phase 8
- Platform Phase 9

Tasks:

- redesign the challenge decision target as a policy problem
- define decision opportunities
- replace `runnersOnBase` simplification with full `basesState`
- re-evaluate thresholds on validation only
- test policy value on held-out windows
- decompose the policy stack explicitly into:
  - overturn probability
  - success value
  - failure value
  - inventory cost
  - final expected challenge value
- expose all intermediate values in the model output contract
- define the initial inventory-cost function as heuristic but versioned and sensitivity-tested
- evaluate recommendation quality on all eligible opportunities, not just historical challenges

Implementation order:

1. update API and serving paths to require exact `basesState`
2. define challenge-eligible opportunity rows from `modeling.called_pitch_decisions`
3. attach overturn probability outputs to those rows
4. compute success and failure baseball values from count / RE / WE deltas
5. compute inventory cost from current inventory state and game horizon
6. calculate expected challenge value
7. tune recommendation thresholds on `validation` only
8. evaluate policy metrics on `test` only
9. only then expose the rebuilt recommendation to serving surfaces

Current progress:

- exact `basesState` now flows through the request and server decision path
- challenge-now response now exposes:
  - success value
  - failure value
  - inventory cost
  - inventory cost version
  - expected challenge value
  - overturn geometry variant
  - overturn split policy version
- server overturn lookups now read from `mart_modeled_abs_overturn_probability_fallbacks`
- [run-decision-value-audit.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-decision-value-audit.mjs) now scores the full held-out opportunity set instead of only historical challenges
- empirical inventory-cost audit added in [run-inventory-cost-audit.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-inventory-cost-audit.mjs)
- current leading inventory-cost version is `inventory_future_opportunity_v1`
  - selected from held-out comparison as the best current bucketed option-value model
  - grouped by remaining challenges, inning bucket, and close-game flag
- after the RE and WE rebuilds, the policy audit was rerun on the updated value stack:
  - recommendation share is now `0.8%`
  - actual held-out historical challenge share is `2.5%`
  - mean expected challenge value is `-20.03%`
- the policy is now fully downstream of split-aware overturn, RE, and WE layers
- the policy is still not publication-ready because recommendation aggressiveness and inventory/value tradeoffs remain underfit even after the value-stack rebuild
- current repo direction is to treat challenge-now as:
  - experimental fan-facing live support
  - stronger postgame challenge evaluation
  - not an org-grade live optimization product unless the evidence materially improves

Primary file targets:

- [src/lib/server/challenge-decision-value.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/server/challenge-decision-value.ts)
- [src/lib/v2.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/v2.ts)
- [src/app/api/v2/challenge-value/route.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/app/api/v2/challenge-value/route.ts)
- [scripts/model-audits/run-decision-value-audit.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-decision-value-audit.mjs)
- team decision marts in [db/views.sql](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/db/views.sql)

Statistical acceptance criteria:

- decision policy is evaluated on held-out opportunities
- exact game state is preserved through the live API
- policy metrics replace simple expected-vs-realized on already-challenged rows
- outputs include intermediate value decomposition, not just a binary recommendation
- inventory-cost assumptions are sensitivity-tested and documented

Current recommendation:

- pause additional threshold-chasing for org-grade live optimization
- keep improving the layer where it compounds:
  - postgame challenge evaluation
  - missed-opportunity review
  - honest experimental live fan framing

### Phase 9: Leverage Reclassification Or Rebuild

Platform dependencies:

- Platform Phase 5
- Platform Phase 7
- Platform Phase 9

Tasks:

- decide whether leverage remains heuristic or becomes empirical
- if rebuilt, fit against held-out absolute WE swing
- if retained as heuristic, relabel everywhere

Current progress:

- leverage has now been re-audited against the rebuilt WE layer:
  - [2026-04-08-leverage-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-leverage-audit.md)
- current evidence supports retaining leverage as a heuristic pressure proxy, not rebuilding it as a calibrated model:
  - Pearson correlation to absolute WE swing: `0.190`
  - `high` bucket mean abs WE swing: `5.5%`
  - `low` bucket mean abs WE swing: `2.2%`
- product surfaces already mostly say `Estimated Leverage`; code now carries explicit heuristic metadata in [estimated-leverage.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/estimated-leverage.ts)
- recommendation: close leverage as an honesty/relabeling phase, not an empirical model-build phase

Primary file targets:

- [src/lib/estimated-leverage.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/estimated-leverage.ts)
- [scripts/model-audits/run-leverage-audit.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-leverage-audit.mjs)
- product surfaces consuming leverage

Statistical acceptance criteria:

- no heuristic path is described as calibrated model output

### Phase 10: Rubric And Descriptor Rebuild

Platform dependencies:

- Platform Phase 5
- upstream model phases 2 through 9 as applicable

Tasks:

- redefine rubrics as translation layers
- add confidence-aware damping
- test stability across windows
- reduce false precision in grades and risk tiers

Primary file targets:

- [scripts/model-audits/run-rubric-audit.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-rubric-audit.mjs)
- rubric helpers in [src/lib](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib)

Statistical acceptance criteria:

- label stability is measured
- low-confidence extreme labels are damped
- docs state descriptive vs predictive scope clearly

Current progress:

- shared rubric helpers in [rubrics.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/rubrics.ts) now behave as explicit translation layers instead of hard-edged labelers:
  - low-confidence umpire grade extremes are softened
  - org watch risk tiers are softened for low-confidence umpire profiles
  - team style now includes a neutral `Balanced` bucket with org label `Mixed profile`
- the rubric audit was rebuilt to run directly on canonical Warehouse data instead of depending on stale summary tables:
  - [2026-04-08-rubric-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-rubric-audit.md)
  - [2026-04-08-rubric-audit.json](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/artifacts/2026-04-08-rubric-audit.json)
- current audit readout is directionally healthy for a translation layer:
  - team styles now separate into `3` buckets, with `Balanced` the largest at `63.3%`
  - umpire report cards now cover `108` tracked HP umpires across `3` grade buckets
  - low-confidence umpire share is down at `2.8%`
- warehouse rubric coverage for umpires is now unblocked because the serving-to-warehouse live-context sync includes `officials`

### Phase 11: Controversy Rebuild

Tasks:

- make controversy explicitly editorial/composite
- document component weights
- sensitivity test the ranking
- ensure modeled value inputs inherit upstream confidence

Current progress:

- controversy scoring in [rubrics.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/rubrics.ts) is now versioned as `controversy_editorial_v2`
- the production scorer now includes modeled value instead of relying only on leverage, impact, miss distance, and recency
- recent home moments now attach expected / realized challenge value before ranking in [data.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/data.ts)
- the controversy audit now matches the editorial framing and the current product formula:
  - [2026-04-08-controversy-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-controversy-audit.md)
- current audit readout is strong for an editorial layer:
  - top-decile overturned share `100%`
  - top-decile modeled value `>= 0.5%` share `97.8%`
  - top-decile confirmed share `0.0%`

Primary file targets:

- [scripts/model-audits/run-controversy-audit.mjs](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/scripts/model-audits/run-controversy-audit.mjs)
- controversy helpers in [src/lib](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib)

Statistical acceptance criteria:

- no predictive overclaim
- ranking sensitivity documented
- upstream low-confidence states do not dominate top-moment rankings without disclosure

### Phase 12: Org Analytics Re-Enablement

Tasks:

- reintroduce team and umpire org surfaces only after upstream green lights
- attach sample sizes and confidence framing to all org charts
- suppress or downgrade low-confidence aggregates

Current progress:

- first downstream confidence-hardening pass is now in place on umpire analytics surfaces:
  - [umpire-consequence-board.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/components/analytics/umpire-consequence-board.tsx)
  - [umpire-consequence-matrix.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/components/analytics/umpire-consequence-matrix.tsx)
  - [umpire-pitch-trait-scatter.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/components/analytics/umpire-pitch-trait-scatter.tsx)
  - [umpire-handedness-board.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/components/analytics/umpire-handedness-board.tsx)
- those boards now only aggregate `expectedChallengeValue` when it comes from the trusted `win_expectancy` path, instead of blending heuristic fallback values into org-facing averages
- the shared team decision-value aggregators in [data.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/data.ts) now follow the same rule:
  - expected / realized review value
  - surplus
  - captured / wasted shares
  - high-pressure and late-close value shares
  - best-window selection
  are all computed from `win_expectancy` rows only
- team/org decision boards may still show total challenge counts, but value-bearing summaries now degrade honestly when trusted WE-backed samples are thin instead of averaging heuristic-mode rows into org-facing outputs
- additional org-surface hardening is still needed, but the main confidence overclaim path in team and umpire value summaries has now been reduced

Primary file targets:

- [src/app/teams/[teamId]/page.tsx](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/app/teams/[teamId]/page.tsx)
- `src/app/umpires/[umpireId]/page.tsx` if present in current branch
- related analytics components and read-model helpers
- org analytics data builders described in the archived refactor memo

Statistical acceptance criteria:

- every org chart displays sample and confidence framing
- no downstream aggregate hides upstream model weakness

### Phase 13: Model Cards And Publication Gate

Tasks:

- create model cards for all active model layers
- reconcile all docs and arithmetic
- rerun locked audits
- produce publication checklist

Current progress:

- model cards now exist for the active stack:
  - called-pitch geometry
  - count-state value
  - run expectancy
  - win expectancy
  - overturn probability
  - challenge-now policy
  - leverage
  - rubrics and descriptors
  - controversy
- the publication checklist has been rewritten from a product-launch list into a statistical publication gate
- the remaining work is now mostly editorial and governance:
  - close remaining blocker claims
  - refresh cards and checklist as the 2026 sample grows
  - make the final publication package cite dated audit artifacts directly
- a consolidated readiness memo now exists:
  - [publication-readiness.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/publication-readiness.md)

Primary file targets:

- [docs/models](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models)
- [docs/archive/launch/publication-checklist.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/launch/publication-checklist.md)

Exit criteria:

- model cards written
- all blocker issues closed
- all publication claims approved against evidence

## Per-Model Tracker

### Count-State Value

Status:
- complete for now: split-aware Warehouse baselines, held-out audit, and model card are in place

Tasks:

- finalize any smoothing decision
- publish train-validation serving baseline

Depends on:
- split governance

### Run Expectancy

Status:
- complete for now: split-aware marts, held-out benchmark, and model card are in place

Tasks:

- review uncertainty / interval layer for sparse states
- uncertainty upgrade

Depends on:
- split governance

### Win Expectancy

Status:
- complete for now: split-aware marts, held-out internal benchmark, secondary MLB benchmark, and model card are in place

Tasks:

- tighten tail-state handling and uncertainty communication
- keep MLB benchmark secondary in all publication-facing docs

Depends on:
- split governance

### Overturn Probability

Status:
- in progress: held-out calibration path and model card are in place, but geometry and serving posture remain provisional

Tasks:

- confidence intervals
- choose current leading geometry variant from held-out evidence
- emit fallback tier and geometry version in scored outputs

Depends on:
- called-pitch and geometry foundation

### Challenge-Now

Status:
- in progress: exact-state contract, decomposition output, held-out policy audit, empirical inventory-cost v1, and model card are all in place

Immediate blocker:

- the current policy is directionally sane now, but it still needs stronger validation and threshold/resource tuning before deployment or publication claims
- latest budget-constrained validation still shows no overlap with historical challenged rows, so the policy remains below publication standard for optimization claims

Tasks:

- exact state preservation
- opportunity dataset
- held-out policy evaluation
- intermediate value decomposition output
- inventory-cost versioning and sensitivity testing
- migrate success/failure value components onto rebuilt count-state / RE / WE layers once those phases are green

Depends on:
- overturn probability
- RE/WE green

Current progress:

- canonical `called_pitch_decisions` now carries batting-team, fielding-team, opportunity-team, and actual-challenge-team context directly
- the decision-value audit no longer needs ad hoc team-context recovery joins to simulate budgeted team-game selection

### Leverage

Status:
- complete for now: retained as heuristic pressure proxy with explicit audit backing and model card coverage

Tasks:

- keep labeled as estimated / heuristic pressure proxy
- rerun the leverage audit after meaningful challenge-sample refreshes

### Geometry

Status:
- baseline implemented, validation incomplete

Tasks:

- canonical spec
- source audit
- subgroup monotonicity checks

### Rubrics

Status:
- complete for now: translation layer is confidence-damped, warehouse-audited, and no longer overstates weak separation

Tasks:

- rerun the rubric audit after large current-season sample refreshes
- keep label scope explicitly descriptive in product and docs

### Controversy

Status:
- complete for now: editorial composite is versioned, value-aware, audit-backed, and documented by a model card

Tasks:

- rerun editorial audit after upstream value-layer refreshes
- keep product/publication framing clearly non-predictive

## Release Checklist

No model or chart may be considered done unless all of the following are true:

- code path updated
- tests updated
- audit updated
- docs updated
- provenance recorded
- claim boundary written

## Immediate Next Sprint Recommendation

Sprint 1:

- Phase 1 split governance
- Phase 7 exact-edge join blocker fix
- Phase 8 exact `basesState` live API fix

Sprint 2:

- Phase 3 RE rebuild
- Phase 4 WE rebuild

Sprint 3:

- Phase 5 called-pitch dataset
- Phase 6 geometry rebuild

Sprint 4:

- Phase 7 overturn rebuild
- Phase 8 challenge-now rebuild

Sprint 5:

- Phase 9 leverage decision
- Phase 10 rubric rebuild
- Phase 11 controversy rebuild

Sprint 6:

- Phase 12 org analytics re-enablement
- Phase 13 model cards and publication gate

## Final Closeout Sprint

Use this sprint after the main rework phases are complete.

Priority order:

1. geometry closeout
2. overturn uncertainty closeout
3. challenge-now policy-evaluation closeout
4. final publication copy review

Primary reference:

- [final-sprint-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/final-sprint-plan.md)

# Model Rework Execution Tracker

Status: `Execution Plan`

Last updated: April 8, 2026

Primary methodology source:

- [model-rework-master-plan.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/model-rework-master-plan.md)

Required upstream platform sources:

- [data-platform-master-plan.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-platform-master-plan.md)
- [data-platform-execution-tracker.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-platform-execution-tracker.md)
- [data-foundation-spec.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-foundation-spec.md)

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

This tracker assumes the following platform phases from [data-platform-execution-tracker.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/data-platform-execution-tracker.md):

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

- [docs/models/model-rework-master-plan.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/model-rework-master-plan.md)
- [docs/models/README.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/README.md)
- [scripts/model-audits](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits)
- [src/lib/server](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/server)

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

- [etl/build_historical_pitch_states.py](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl/build_historical_pitch_states.py)
- [db/schema.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/schema.sql)
- [db/views.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/views.sql)
- [scripts/model-audits/audit-runtime.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/audit-runtime.mjs)
- [scripts/model-audits/shared-audit-utils.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/shared-audit-utils.mjs)

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

- rebuild count-state baselines from split-aware historical pitch states
- define exact target families and smoothing policy
- validate by handedness and pitch-family subgroups
- add held-out calibration readouts

Primary file targets:

- [db/views.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/views.sql)
- [src/lib/challenge-value.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/challenge-value.ts)
- [src/lib/server](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/server)

Potential new assets:

- count-state audit script
- count-state model card

Statistical acceptance criteria:

- held-out rate calibration reported
- sample and interval reporting added
- challenged-only bias eliminated from baseline estimation

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

- [db/views.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/views.sql)
- [src/lib/server/run-expectancy.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/server/run-expectancy.ts)
- [src/lib/server/run-environment.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/server/run-environment.ts)
- [scripts/model-audits/run-re-benchmark.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-re-benchmark.mjs)

Statistical acceptance criteria:

- held-out MAE, RMSE, and signed bias reported
- sparse-state fallback rates reported on held-out data
- confidence is not expressed only as sample-size band

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

- [db/views.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/views.sql)
- [src/lib/server/win-expectancy.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/server/win-expectancy.ts)
- [src/lib/server/run-environment.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/server/run-environment.ts)
- [scripts/model-audits/run-mlb-we-benchmark.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-mlb-we-benchmark.mjs)

Statistical acceptance criteria:

- held-out Brier and log loss reported
- calibration curves produced
- external benchmark language downgraded to benchmark, not truth

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

- [db/schema.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/schema.sql)
- [db/views.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/views.sql)
- [etl](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/etl)

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

- [scripts/model-audits/run-zone-edge-audit.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-zone-edge-audit.mjs)
- [scripts/model-audits/shared-audit-utils.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/shared-audit-utils.mjs)
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

Primary file targets:

- [db/views.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/views.sql)
- [src/lib/server/challenge-decision-value.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/server/challenge-decision-value.ts)
- [scripts/model-audits/run-overturn-calibration.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-overturn-calibration.mjs)

Known blocker to resolve:

- exact-edge probability join issue in the team decision mart

Statistical acceptance criteria:

- no in-sample calibration claims remain
- reliability tables are held-out
- exact, direction-only, and global fallback usage are reported correctly

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

Primary file targets:

- [src/lib/server/challenge-decision-value.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/server/challenge-decision-value.ts)
- [src/lib/v2.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/v2.ts)
- [src/app/api/v2/challenge-value/route.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/app/api/v2/challenge-value/route.ts)
- [scripts/model-audits/run-decision-value-audit.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-decision-value-audit.mjs)
- team decision marts in [db/views.sql](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/db/views.sql)

Statistical acceptance criteria:

- decision policy is evaluated on held-out opportunities
- exact game state is preserved through the live API
- policy metrics replace simple expected-vs-realized on already-challenged rows

### Phase 9: Leverage Reclassification Or Rebuild

Platform dependencies:

- Platform Phase 5
- Platform Phase 7
- Platform Phase 9

Tasks:

- decide whether leverage remains heuristic or becomes empirical
- if rebuilt, fit against held-out absolute WE swing
- if retained as heuristic, relabel everywhere

Primary file targets:

- [src/lib/estimated-leverage.ts](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib/estimated-leverage.ts)
- [scripts/model-audits/run-leverage-audit.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-leverage-audit.mjs)
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

- [scripts/model-audits/run-rubric-audit.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-rubric-audit.mjs)
- rubric helpers in [src/lib](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib)

Statistical acceptance criteria:

- label stability is measured
- low-confidence extreme labels are damped
- docs state descriptive vs predictive scope clearly

### Phase 11: Controversy Rebuild

Tasks:

- make controversy explicitly editorial/composite
- document component weights
- sensitivity test the ranking
- ensure modeled value inputs inherit upstream confidence

Primary file targets:

- [scripts/model-audits/run-controversy-audit.mjs](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/scripts/model-audits/run-controversy-audit.mjs)
- controversy helpers in [src/lib](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/lib)

Statistical acceptance criteria:

- no predictive overclaim
- ranking sensitivity documented
- upstream low-confidence states do not dominate top-moment rankings without disclosure

### Phase 12: Org Analytics Re-Enablement

Tasks:

- reintroduce team and umpire org surfaces only after upstream green lights
- attach sample sizes and confidence framing to all org charts
- suppress or downgrade low-confidence aggregates

Primary file targets:

- [src/app/teams/[teamId]/page.tsx](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/src/app/teams/[teamId]/page.tsx)
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

Primary file targets:

- [docs/models](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models)
- [docs/launch/publication-checklist.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/launch/publication-checklist.md)

Exit criteria:

- model cards written
- all blocker issues closed
- all publication claims approved against evidence

## Per-Model Tracker

### Count-State Value

Status:
- rebuild required

Tasks:

- define targets formally
- add held-out audit
- add model card

Depends on:
- split governance

### Run Expectancy

Status:
- structurally implemented, statistically rebuild required

Tasks:

- split-aware mart rebuild
- held-out benchmark
- uncertainty upgrade

Depends on:
- split governance

### Win Expectancy

Status:
- structurally implemented, statistically rebuild required

Tasks:

- split-aware mart rebuild
- held-out calibration
- benchmark downgrade to secondary evidence

Depends on:
- split governance

### Overturn Probability

Status:
- baseline implemented, publication-grade rebuild required

Tasks:

- fix joins
- holdout calibration
- confidence intervals
- model card

Depends on:
- called-pitch and geometry foundation

### Challenge-Now

Status:
- concept live, policy-grade rebuild required

Tasks:

- exact state preservation
- opportunity dataset
- held-out policy evaluation

Depends on:
- overturn probability
- RE/WE green

### Leverage

Status:
- heuristic

Tasks:

- relabel or rebuild empirically

### Geometry

Status:
- baseline implemented, validation incomplete

Tasks:

- canonical spec
- source audit
- subgroup monotonicity checks

### Rubrics

Status:
- downstream translation layer requiring stabilization

Tasks:

- confidence damping
- stability audit

### Controversy

Status:
- editorial composite requiring explicit governance

Tasks:

- weight documentation
- sensitivity analysis

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

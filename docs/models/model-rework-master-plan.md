# Model Rework Master Plan

Status: `Dated Program Reference`

Last updated: April 8, 2026

> Status note: this plan captures the April 2026 model-rework program. Use the current verdict, publication-readiness memo, and model cards for current model-truth boundaries.

## Purpose

This document replaces the older model-rework planning memos with one statistically rigorous program plan for every planned AiBS model and every derived org-facing analytic surface.

The standard for this document is simple:

- no hidden leakage
- no vague train/test language
- no heuristic output presented as empirical fact
- no publication claim broader than the evidence
- no model shipped without a reproducible audit trail

If an org analyst, quant lead, or front-office decision-maker reads this plan, the intended reaction should be:

- the modeling goals are baseball-sensible
- the statistical controls are mature
- the data lineage is explicit
- the evaluation design is disciplined
- the product claims are honest

## Scope

This plan governs:

1. count-state value
2. run expectancy
3. win expectancy
4. overturn probability
5. challenge-now / expected challenge decision value
6. leverage
7. zone / edge geometry
8. rubric and descriptor layers
9. controversy / top-moment ranking
10. derived org analytics built on top of the above

Superseded planning docs are archived under:

- [docs/launch/challenge-value-model-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/launch/challenge-value-model-plan.md)
- [docs/launch/challenge-model-data-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/launch/challenge-model-data-plan.md)
- [docs/launch/challenge-context-analytics-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/launch/challenge-context-analytics-plan.md)
- [docs/archive/product/org-view-analytics-refactor.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/product/org-view-analytics-refactor.md)

This plan is downstream of the current data-platform program:

- [data-platform-master-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-platform-master-plan.md)
- [data-platform-execution-tracker.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-platform-execution-tracker.md)
- [data-foundation-spec.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/data-foundation-spec.md)

## Governing Rules

Every model in scope must define:

- prediction unit
- target variable
- feature set
- feature availability at prediction time
- training population
- exclusion rules
- train, validation, and test windows
- leakage checks
- smoothing or shrinkage method
- uncertainty method
- evaluation metrics
- calibration method
- deployment guardrails
- publication claim boundary

No model is publication-ready unless all of those are written down and implemented.

## Data Platform Dependencies

The model program assumes the data-platform program is the authority for:

- warehouse vs serving database roles
- ingest authority
- backfill ownership
- reconciliation policy
- environment contracts
- canonical table contracts

Operationally, this means:

- model builds and audits must run on `Warehouse Neon`
- product-serving surfaces must read from `Serving Neon`
- no model plan should assume an ambiguous `DATABASE_URL`
- no model phase should proceed if its required warehouse tables, backfills, or split-governed inputs do not yet exist

Minimum platform gates by model family:

- `count-state`, `RE`, `WE`
  - require warehouse authority cutover
  - require split-governed `historical_pitch_states`
- `overturn probability`
  - requires warehouse authority cutover
  - requires reconciled challenge-event coverage
  - requires warehouse-first audit runtime
- `challenge-now / decision policy`
  - requires warehouse authority cutover
  - requires `2026` Statcast backfill in warehouse
  - requires canonical `modeling.called_pitch_decisions`
- `derived org analytics`
  - require upstream foundational models to be green
  - require stable warehouse-to-serving publish paths

## Publication Fix List

These 20 controls are mandatory across the full model program.

### 1. Freeze methodology before iteration

Create and maintain one source-of-truth methods spec for each model. No metric or chart may outgrow its written target, split, and validation definition.

### 2. Enforce hard train, validation, and test separation

All marts must be buildable by explicit date windows. Evaluation scripts must fail if they read future-period rows relative to the audited window.

### 3. Replace same-sample evaluation everywhere

No calibration, benchmark, or product-approval audit may score a model on the same rows used to fit or smooth it.

### 4. Use time-aware validation

For baseball state models, the default evaluation design is rolling-origin or season-based holdout, not random split.

### 5. Evaluate policies as policies

Decision models must be tested on decision opportunities, not only on actions that teams actually took.

### 6. Preserve exact game state

Exact bases, count, outs, inning, half-inning, and score differential must be preserved end-to-end. No state collapsing is allowed without an explicit loss analysis.

### 7. Separate empirical models from heuristics

If a path is heuristic, it must be labeled heuristic in code, docs, outputs, and product language.

### 8. Replace sample-size bands as the only confidence signal

Every probability-bearing model needs interval estimates and calibration evidence in addition to sample-size labels.

### 9. Justify all shrinkage constants

Every prior weight, threshold, and smoothing constant must have a tuning note, sensitivity analysis, and evaluation evidence.

### 10. Add leakage tests to CI

Automated tests must fail if evaluation windows leak into training marts or if date filtering is bypassed.

### 11. Make the audit suite fail on known defects

No suite can report `PASS` when documented blocker defects remain unresolved.

### 12. Benchmark externally only as secondary evidence

External references such as MLB `winProbability` are benchmark layers, not training truth.

### 13. Require proper calibration reporting

Probability models must report reliability diagrams, bucket counts, and proper scoring rules on held-out data.

### 14. Rewrite product claims to match evidence

Docs and UI copy must not imply org-grade decision support before out-of-sample policy validation exists.

### 15. Audit every arithmetic claim

All counts, confidence splits, and sample summaries in docs must reconcile exactly.

### 16. Ship model cards

Each model needs a model card covering data, target, features, split design, metrics, limitations, and change history.

### 17. Version every artifact

All audit outputs must record code version, data snapshot, train cutoff, test window, and model version.

### 18. Verify product surfaces against audited logic

The model path used in the UI must match the path used in the audit. No simplified front-end re-encoding of state is allowed.

### 19. Add a publication gate

Publication requires all blockers closed, docs reconciled, audits rerun, and claim boundaries approved.

### 20. Archive superseded evidence clearly

Old plans and pre-fix audit outputs must be retained but clearly marked as historical or superseded.

## Canonical Data Architecture

### Core historical tables

- `historical_pitch_states`
- challenge-event tables from ABS ingestion
- future canonical called-pitch decision table

### Required new canonical table

Add `called_pitch_decisions` with one row per taken pitch.

Minimum fields:

- game identifiers and date
- game type and competition phase
- batter, pitcher, catcher, team IDs
- inning, half, outs
- exact `bases_state`
- exact score state
- balls, strikes
- batter and pitcher handedness
- pitch type and pitch traits
- `plate_x`, `plate_z`, `sz_top`, `sz_bot`
- actual observed call
- derived ABS geometry outcomes
- dual geometry fields for center-only and radius-adjusted ABS interpretations
- challenge eligibility
- challenge result if challenged

This table is required for publication-grade overturn and challenge-now work.

Hard truth-modeling rule:

- `observed_call`, `abs_zone_outcome`, and `challenge_outcome` are three different layers and must remain separate
- pitch traits such as velocity, spin, and handedness may help predict mismatch, overturn, or challenge value, but they do not define ABS truth

## Split Governance

Default split design:

- training: older seasons
- validation: recent historical season or rolling validation blocks
- test: final held-out season or final held-out date block

Rules:

- no training rows may come from the audited test window
- all smoothing priors must be fit on training only
- threshold tuning must be done on validation only
- the final reported metrics must come from the locked test window only

## Model Inventory

### 1. Count-State Value

Purpose:
- estimate change in expected plate-appearance outcome quality from count movement

Target:
- walk rate, strikeout rate, hit rate, positive outcome rate by count

Data needed:
- all pitch states and final PA outcomes

Platform prerequisites:
- `Warehouse Neon` as canonical modeling target
- split-governed `historical_pitch_states`

Main risks:
- using challenged-only traffic
- evaluating on same sample used to estimate baselines

Required rigor:
- out-of-sample rate calibration by count
- handedness and pitch-type stability checks
- monotonic baseball sanity checks

Publication boundary:
- may be described as empirical count-state baselines
- may not be described as direct challenge strategy by itself

### 2. Run Expectancy

Purpose:
- estimate expected runs from current pitch state to inning end

Target:
- runs scored by batting team from pitch state to inning end

Data needed:
- full pitch-state history

Platform prerequisites:
- `Warehouse Neon` as canonical modeling target
- split-governed `historical_pitch_states`
- warehouse-held historical backfill through the locked train/test windows

Main risks:
- same-sample benchmarking
- era drift
- sparse-state overconfidence

Required rigor:
- held-out season MAE, RMSE, signed bias
- calibration by base/out/count bucket
- fallback usage by split
- interval estimates for sparse states

Implementation note:
- the first split-aware held-out RE rebuild is now live on Warehouse, with `train`-only audit fitting and `train + validation` serving fitting; current evidence is in [2026-04-08-re-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-re-benchmark.md)

Publication boundary:
- may be described as empirical pitch-state RE
- may not be described as exact club internal value model

### 3. Win Expectancy

Purpose:
- estimate batting-team win probability from game state

Target:
- eventual game win indicator

Data needed:
- full pitch-state history with game outcome

Platform prerequisites:
- `Warehouse Neon` as canonical modeling target
- split-governed `historical_pitch_states`
- warehouse-held historical backfill through the locked train/test windows

Main risks:
- sparse late-game tails
- external benchmark overreliance
- same-sample evaluation

Required rigor:
- held-out calibration curves
- Brier and log loss on held-out data
- tail-state diagnostics
- external MLB benchmark only as secondary validation

Implementation note:
- the first split-aware WE rebuild is now live on Warehouse, with primary held-out evidence in [2026-04-08-we-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-we-benchmark.md) and secondary MLB comparison in [2026-04-08-mlb-we-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-mlb-we-benchmark.md)

Publication boundary:
- may be described as empirical count-aware WE if out-of-sample validated
- may not be described as equivalent to MLB or club proprietary models

### 4. Overturn Probability

Purpose:
- estimate `P(overturn | call, geometry, context, optional pitch traits)`

Target:
- overturned vs confirmed ABS result

Data needed:
- challenge events plus canonical geometry features

Platform prerequisites:
- `Warehouse Neon` as canonical modeling target
- reconciled challenge-event coverage between warehouse and serving
- warehouse-first audit runtime

Main risks:
- same-sample calibration
- exact-edge join bugs
- treating reconstructed geometry as literal adjudication truth

Required rigor:
- held-out reliability analysis
- confidence intervals by bucket
- exact-edge regression tests
- geometry missingness reporting

Publication boundary:
- may be described as a modeled overturn likelihood
- must not be described as official ABS truth probability

Concrete implementation spec:

- modeling population:
  - rows from `modeling.called_pitch_decisions` where:
    - `was_challenged = TRUE`
    - `challenge_outcome IN ('overturned', 'confirmed')`
    - `split_set IN ('train', 'validation', 'test')`
- binary target:
  - `y = 1` when `challenge_outcome = 'overturned'`
  - `y = 0` when `challenge_outcome = 'confirmed'`
- features allowed at challenge time:
  - `observed_call`
  - challenge direction derived from `observed_call`
  - `balls`, `strikes`, `outs`
  - exact `bases_state`
  - `inning`, `half_inning`
  - `home_score`, `away_score`, `score_diff_batting`
  - `stand`, `p_throws`
  - `pitch_type`, `pitch_name`, `start_speed`, `end_speed`, `spin_rate`
  - `plate_x`, `plate_z`, `strike_zone_top`, `strike_zone_bottom`
  - geometry-derived fields:
    - `abs_zone_outcome_center_only`
    - `abs_zone_outcome_radius_adjusted`
    - `min_edge_distance_center_only`
    - `min_edge_distance_radius_adjusted`
    - direction-specific edge buckets
- features explicitly disallowed:
  - `challenge_outcome`
  - any post-review score or inventory result
  - any field populated only after the challenge result is known
- baseline model design:
  - start with interpretable grouped empirical rates with shrinkage
  - grouping hierarchy:
    - challenge direction + geometry variant + edge bucket
    - challenge direction + geometry variant
    - challenge direction only
    - global
  - every fallback must record its usage tier
- geometry comparison rule:
  - evaluate `center_only` and `radius_adjusted` in parallel
  - whichever geometry variant wins on held-out calibration and classification evidence becomes the default production geometry
  - losing geometry remains stored for audit comparison until formally retired
- split rule for current window:
  - `train`: through `2026-03-31`
  - `validation`: `2026-04-01` through `2026-04-03`
  - `test`: `2026-04-04` through `2026-04-07`
- validation outputs required:
  - held-out reliability table
  - Brier score
  - bucket counts
  - calibration by challenge direction
  - fallback-tier usage by split
  - center-only vs radius-adjusted comparison artifact
- serving output contract:
  - serving layers may consume only compact, versioned overturn lookup tables or a versioned scoring function
  - every output must expose:
    - probability
    - fallback tier
    - geometry version
    - model version

Baseball logic:

- this model answers only:
  - "if we challenge this pitch, how often should we expect to win?"
- it does not answer:
  - "is it worth spending the challenge here?"
- that second question belongs to the challenge-now policy layer below

### 5. Challenge-Now / Expected Decision Value

Purpose:
- estimate challenge value at decision time and support honest live discussion plus retrospective review

Target:
- expected value under policy, not observed single-pitch realized outcome alone

Data needed:
- overturn model
- RE/WE swing
- inventory state
- decision-opportunity dataset

Platform prerequisites:
- `Warehouse Neon` as canonical modeling target
- `2026` Statcast backfill in warehouse
- canonical `modeling.called_pitch_decisions`
- exact `bases_state` preserved from warehouse through serving/API paths

Main risks:
- evaluating only already-challenged pitches
- collapsing base occupancy
- mixing heuristic inventory cost with learned claims

Required rigor:
- exact decision-time feature availability
- policy evaluation on held-out opportunities
- threshold tuning on validation only
- simulation or off-policy evaluation under inventory constraints

Publication boundary:
- no org-grade claim until out-of-sample policy value is demonstrated
- until that threshold is met, the approved use is:
  - experimental fan-facing/live discussion support
  - postgame challenge evaluation
  - missed-opportunity and low-value-usage review

Concrete implementation spec:

- modeling objective:
  - produce expected challenge decision value at challenge time
  - final recommendation is `challenge` or `hold`
- decision unit:
  - one challenge-eligible taken pitch from `modeling.called_pitch_decisions`
- minimum required inputs:
  - overturn probability output from the overturn model
  - count-state / RE / WE deltas for flipping the call
  - exact current game state
  - challenge inventory state
- decomposition rule:
  - challenge-now must remain a decomposed policy stack, not a single opaque classifier
  - required layers:
    - geometry layer
    - overturn probability layer
    - baseball value layer
    - inventory-cost layer
    - final policy layer
- baseball value equation:
  - define:
    - `p = P(overturn)`
    - `success_value = baseball value if the call flips`
    - `failure_value = baseball value if the call stands`
    - `inventory_cost = strategic cost of spending one challenge now`
  - expected value:
    - `EV = p * success_value + (1 - p) * failure_value - inventory_cost`
- success and failure value rules:
  - `success_value` must come from exact-state count / RE / WE deltas implied by flipping the observed call
  - those deltas must be expressed from the challenging team's perspective, not blindly from the batting team's perspective
  - for `ball_to_strike` opportunities, batting-team value deltas must be sign-adjusted before policy scoring
  - `failure_value` must not be silently assumed zero unless explicitly documented and sensitivity-tested
  - if challenge retention rules create asymmetric inventory outcomes, that asymmetry must be included explicitly
- challenge-time features allowed:
  - exact `bases_state`
  - exact count
  - inning / half inning / outs
  - score state
  - observed call
  - overturn probability and fallback tier
  - pitch geometry and pitch traits available immediately after the pitch
  - current team challenge inventory state
- challenge-time features disallowed:
  - realized challenge outcome
  - any downstream play result after the challenged pitch
  - any inventory state observed after the decision point
- inventory-cost design:
  - the first production-facing implementation should use a versioned, empirical option-value table estimated from later positive-value opportunities in the same game
  - current leading version is `inventory_future_opportunity_v1`
    - grouped by remaining challenges, inning bucket, and close-game flag
    - estimated on `train`
    - selected on `validation`
    - reported on held-out `test`
  - if a heuristic fallback is ever used, it must be labeled heuristic everywhere
  - the penalty must vary by:
    - inning / game horizon
    - leverage or expected future opportunity density
    - remaining challenge inventory
  - future versions may replace this with simulation-based opportunity cost
- policy output contract:
  - required output fields:
    - `overturnProbability`
    - `successValue`
    - `failureValue`
    - `inventoryCost`
    - `inventoryCostVersion`
    - `expectedChallengeValue`
    - `recommendation`
    - `recommendationBand`
    - `modelVersion`
    - `geometryVersion`
    - `fallbackTier`
- validation design:
  - do not evaluate only on already-challenged rows as if those were the full opportunity universe
  - define the opportunity set as all challenge-eligible taken pitches in the evaluation window
  - evaluate:
    - recommendation rate
    - value captured on held-out opportunities
    - challenge budget usage
    - recommendation quality by band
    - sensitivity to inventory penalty
  - if the policy remains descriptively interesting but not causally convincing, route it to:
    - experimental fan-facing live surfaces
    - retrospective postgame and team-review surfaces
    - not org-grade live operational recommendation
  - current leading audit for `inventory_future_opportunity_v1` should be published alongside the decision-value audit so the policy can be traced back to its option-cost evidence
- live serving rule:
  - the live API must accept exact `basesState`, not `runnersOnBase`
  - any product surface that collapses state invalidates the policy claim

Baseball logic:

- this model answers:
  - "even if we might win the challenge, is this the right moment to spend it?"
- it must respect that:
  - a moderately strong overturn spot in a huge leverage state can be worth more than an easy overturn in a low-impact state
  - using a challenge is a resource-allocation decision, not just a geometry decision

### 6. Leverage

Purpose:
- quantify pressure / swing sensitivity

Target:
- ideally expected absolute WE swing from the state

Current status:
- heuristic

Platform prerequisites:
- warehouse-governed WE backbone if leverage is empirical
- stable publish path for any compact leverage outputs

Required rigor:
- either keep explicitly heuristic
- or rebuild against held-out WE swing

Publication boundary:
- if heuristic, call it heuristic everywhere

Implementation note:
- current audit evidence supports retaining leverage as a heuristic pressure proxy rather than rebuilding it as a calibrated model; see [2026-04-08-leverage-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-leverage-audit.md)

### 7. Zone / Edge Geometry

Purpose:
- reconstruct pitch relationship to operational strike zone

Target:
- geometry features, not direct ABS truth

Data needed:
- `plate_x`, `plate_z`, `sz_top`, `sz_bot`, handedness, player identifiers

Platform prerequisites:
- canonical `modeling.called_pitch_decisions`
- versioned geometry derivation in warehouse

Main risks:
- operator-set zone noise
- source fallback inconsistency

Required rigor:
- monotonicity by direction
- source coverage audit
- sensitivity to geometry thresholds

Publication boundary:
- geometry sanity layer only unless deeper validation proves more

### 8. Rubrics / Descriptors / Grades / Risk Tiers / Team Styles

Purpose:
- translate model outputs into product language

Target:
- descriptive labels, not fundamental baseball truth

Main risks:
- noisy overstatement
- unstable small-sample grades

Platform prerequisites:
- upstream foundational models green
- stable warehouse-to-serving publish path for compact outputs

Required rigor:
- stability checks across windows
- confidence-aware dampening
- label transition audit

Implementation note:
- the shared rubric layer is now explicitly confidence-damped and warehouse-audited:
  - low-confidence umpire grade and risk extremes are softened
  - team style now has a neutral `Balanced` / `Mixed profile` outcome when no strong identity separates
  - current evidence is in [2026-04-08-rubric-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-rubric-audit.md)

Publication boundary:
- descriptive translation layer only

### 9. Controversy / Top-Moment Ranking

Purpose:
- rank the most notable review moments for editorial and product surfaces

Target:
- composite editorial rank

Main risks:
- subjective weighting presented as science

Platform prerequisites:
- reconciled serving surfaces
- upstream leverage and geometry layers stabilized

Required rigor:
- explicit component weights
- sensitivity testing
- alignment review against editorial use cases

Publication boundary:
- editorial ranking, not predictive model truth

Implementation note:
- controversy is now versioned as `controversy_editorial_v2`, uses modeled value where available, and is audited as an editorial composite in [2026-04-08-controversy-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-controversy-audit.md)

### 10. Derived Org Analytics

Examples:

- team decision scatter
- team decision matrix
- inventory deployment curve
- missed opportunity ledger
- umpire consequence matrix
- handedness consequence board
- pitch-trait vulnerability
- zone damage map

Main risks:
- compounding uncertainty from upstream layers
- hiding sample sparsity in aggregates

Platform prerequisites:
- upstream foundational models green
- stable warehouse-to-serving publish path for compact org outputs
- no unresolved reconciliation drift for the affected current-season windows

Required rigor:
- confidence inheritance from upstream models
- sample size on every view
- suppression or directional labeling when uncertainty is high

Implementation note:
- the first org-surface hardening pass is now live in the app layer:
  - umpire-facing value boards only aggregate trusted `win_expectancy` outputs
  - shared team decision-value summaries in [data.ts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/src/lib/data.ts) now restrict expected / realized value, surplus, and value-share calculations to `win_expectancy` rows instead of blending heuristic fallback rows into org-facing value totals

Publication boundary:
- only publish if upstream models meet their own standards

## Required Audit Design By Model Family

### Probability models

Use:

- reliability diagrams
- bucket counts
- Brier score
- log loss where appropriate

### Value models

Use:

- MAE
- RMSE
- signed bias
- bucketed bias by state family
- tail-state diagnostics

### Policy models

Use:

- expected value capture
- recommendation precision
- recommendation recall where ground truth is defensible
- simulated inventory efficiency
- regret relative to benchmark policies

### Translation layers

Use:

- label stability
- confidence-aware downgrade rates
- drift review by window

## Implementation Order

1. fix blocker bugs in current SQL and state encoding
2. enforce split-aware marts
3. ship leakage tests and provenance recording
4. rebuild count-state, RE, and WE under locked splits
5. build canonical called-pitch decision table
6. rebuild overturn probability out-of-sample
7. rebuild challenge-now as a real decision policy model
8. rebuild leverage against WE swing or keep heuristic with explicit labeling
9. retune rubrics and controversy as downstream translation layers
10. enable org analytics only after upstream layers are green

## Documentation Rules

All new or updated docs must:

- link to this plan for methodology
- distinguish current behavior from archived planning
- distinguish empirical output from heuristic output
- show exact audit window and data provenance

## Model Integrity And Security Controls

These controls are required so model rigor is not undermined by weak operational practice.

- raw source pulls must preserve source name, fetch time, and entity identifiers
- historical training tables must be rebuildable from raw inputs
- serving marts must be derived only from versioned upstream tables
- audit artifacts must be immutable once published for a given audit date
- production-serving logic must not silently fall back to undocumented paths
- benchmark fetches from external services must be cached or snapshotted for reproducibility
- model build jobs must run with least-privilege database access
- publication metrics must come from locked artifacts, not ad hoc notebook output
- any manual correction to source data must be logged with reason and timestamp
- any known statistical blocker must be treated as a release blocker, not only an engineering TODO

## Publication Rules

AiBS may claim only what the evidence supports.

Permitted claim examples:

- empirical run expectancy and win expectancy are estimated from historical pitch states
- challenge context and value are evaluated using reproducible baseball-state models
- overturn probability is modeled from historical review data and geometry features

Forbidden claim examples until stronger evidence exists:

- exact parity with MLB or club internal systems
- org-grade decision optimization without held-out policy validation
- exact ABS adjudication truth from reconstructed public geometry alone

## Deliverables Required Before Any External Publication

1. refreshed split-aware marts
2. rerun full audit suite on locked windows
3. model cards for all active models
4. updated docs with reconciled numbers
5. archived superseded plans and pre-fix artifacts
6. publication checklist signed off

Current implementation note:

- active model cards now live under [model-cards/README.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/model-cards/README.md)
- the publication gate now lives in [publication-checklist.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/launch/publication-checklist.md)
- the current overall status memo now lives in [publication-readiness.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/publication-readiness.md)
- the remaining publication work is no longer missing documentation; it is closing the remaining claim and evidence gaps honestly

## Current Source References

- [docs/models/README.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/README.md)
- [docs/models/operating-procedure.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/operating-procedure.md)
- [docs/models/audit-cadence.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/audit-cadence.md)
- [docs/models/benchmarking-plan.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/models/benchmarking-plan.md)

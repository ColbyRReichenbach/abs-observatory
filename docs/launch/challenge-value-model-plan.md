<div align="center">

# Challenge Value Model Plan

[![Scope](https://img.shields.io/badge/Scope-ABS%20Challenge%20Value-0F766E)](#challenge-value-model-plan)
[![Perspective](https://img.shields.io/badge/Perspective-Baseball%20Analytics%20Memo-2563EB)](#1-mandate)
[![Method](https://img.shields.io/badge/Method-RE%20%E2%86%92%20WE%20%E2%86%92%20Decision%20Value-7C3AED)](#4-model-stack)
[![Data](https://img.shields.io/badge/Data-Play--By--Play%20State%20Tables-F59E0B)](#5-data-and-state-definition)
[![Standard](https://img.shields.io/badge/Standard-Public%20Industry%20Workflow-DC2626)](#3-public-industry-baseline)

</div>

This document is written as an internal baseball analytics planning memo for AiBS.

The goal is to define a credible, industry-aligned model roadmap for answering one central ABS question:

`When is a challenge actually worth using?`

This plan is grounded in two things:

- current AiBS source truth in the codebase
- public baseball analytics methodology used to build run expectancy, win expectancy, leverage, and context-dependent value systems

Related documents:

- [challenge-context-analytics-plan.md](./challenge-context-analytics-plan.md)
- [technical.md](../reference/technical.md)
- [gap-list.md](../reference/gap-list.md)
- [src/lib/challenge-value.ts](../../src/lib/challenge-value.ts)
- [src/lib/estimated-leverage.ts](../../src/lib/estimated-leverage.ts)
- [src/lib/data.ts](../../src/lib/data.ts)
- [db/views.sql](../../db/views.sql)

## Implementation Status

As of March 10, 2026, AiBS has completed the historical regular-season backfill and canonical state build for `2019-2025`.

Current historical foundation:

- `15,480` regular-season games
- `4,566,992` raw pitches
- `4,566,992` canonical `historical_pitch_states` rows

Current run expectancy status:

- `1,152` RE state rows
- confidence bands:
  - `826` high
  - `248` medium
  - `78` low
- median RE sample size: `1149.50`

Current ABS challenge-state coverage:

- `532 / 532` exact pre-review state matches
- `532 / 532` exact post-review state matches
- challenge-state confidence:
  - `365` high
  - `38` medium
  - `2` low

Operationally, that means Layer 2 is now supported by a credible state base. The next modeling milestone is Layer 3, not more historical ingestion.

Current Layer 3 status:

- `mart_win_expectancy_by_count_state` is implemented
- `mart_win_expectancy_fallbacks` is implemented
- shared WE resolution logic exists in `src/lib/server/win-expectancy.ts`
- first product wiring is live for game and team challenge surfaces

Current Layer 4 status:

- official Savant ABS historical ingestion is implemented
- smoothed overturn-probability inputs exist
- the first empirical challenge decision model is implemented on game surfaces
- broader team/org rollout is still pending

## 1. Mandate

If this were being reviewed inside a league or club analytics group, the model standard should be:

1. context-aware
2. empirically defensible
3. calibrated on real game states
4. honest about what is measured versus inferred

AiBS should not jump directly to a flashy `challenge WPA` number without first building the state tables underneath it.

The correct sequence is:

1. count-state value
2. run expectancy
3. win expectancy
4. expected challenge decision value

That is the cleanest path to a model that is both usable for fans and credible for org-facing strategy.

## 2. Current AiBS Source Truth

The app already stores the core challenge inputs required to begin this work:

- inning and half-inning
- balls, strikes, outs
- bases state
- score state
- count before and count after
- overturn / confirm result
- pitch-level metadata
- impact summary fields

These are already represented in:

- [src/lib/types.ts](../../src/lib/types.ts)
- [src/lib/data.ts](../../src/lib/data.ts)
- [etl/ingest_mlb_abs.py](../../etl/ingest_mlb_abs.py)
- [db/schema.sql](../../db/schema.sql)

The app also already has stage-one context layers:

- `estimatedLeverageIndex`
- `estimatedChallengeSwing`
- count-state baseline marts
- count-state consequence logic

Those live in:

- [src/lib/estimated-leverage.ts](../../src/lib/estimated-leverage.ts)
- [src/lib/challenge-value.ts](../../src/lib/challenge-value.ts)
- [db/views.sql](../../db/views.sql)

What AiBS does **not** have yet:

- expected challenge decision value
- overturn probability by scenario
- final team-level WE leaderboard rollups

## 3. Public Industry Baseline

There is no single published “official MLB club challenge model” for ABS today. That is expected. Club processes are proprietary.

What *is* public and broadly standard across baseball analytics is the modeling chain behind context-dependent value:

- **Run Expectancy**
  - expected runs from a given state to the end of the inning
- **Win Expectancy**
  - probability of winning from a given game state
- **Leverage Index**
  - how much win probability can move in that state
- **WPA / RE24 style deltas**
  - value measured as the change in state before and after an event

This is the public framework used by major baseball analytics references and is the right foundation for AiBS.

The important modeling takeaway:

- count-state delta is useful but incomplete
- run expectancy is the first real strategic layer
- win expectancy is the correct game-winning layer
- expected decision value is the true org-grade challenge strategy layer

## 4. Model Stack

AiBS should implement the challenge value system as four distinct model layers.

### Layer 1: Count-State Value

Question:

`What changed in the plate appearance when the call changed?`

Inputs:

- held count
- corrected count

Outputs:

- batting average delta
- walk rate delta
- strikeout rate delta
- positive outcome delta

Math:

For each count state `c`, estimate a baseline outcome vector:

- `AVG(c)`
- `BB(c)`
- `K(c)`
- `POS(c)`

Then compute:

- `Delta_POS = POS(corrected) - POS(held)`
- `Delta_AVG = AVG(corrected) - AVG(held)`
- `Delta_BB = BB(corrected) - BB(held)`
- `Delta_K = K(corrected) - K(held)`

Status in AiBS:

- partially implemented today

Use:

- shared challenge detail
- postgame value timeline
- live challenge window

### Layer 2: Run Expectancy

Question:

`How much inning-level scoring value changed because of the review outcome?`

Inputs:

- outs
- bases state
- count state
- optional inning bucket
- optional run environment season bucket

Target:

- expected runs scored from current state to end of inning

Core formula:

- `RE(state) = average runs scored from this state until end of inning`

Challenge value:

- `RE_delta = RE(corrected_state) - RE(held_state)`

This is the first truly strategic metric and should be treated as the first major model milestone.

### Layer 3: Win Expectancy

Question:

`How much game-winning value changed because of the review outcome?`

Inputs:

- inning
- half-inning
- score differential
- outs
- bases state
- count state

Target:

- probability batting team or fielding team wins the game from that state

Core formula:

- `WE(state) = P(team wins | inning, half, score_diff, outs, bases, count)`

Challenge value:

- `WE_delta = WE(corrected_state) - WE(held_state)`

This is the correct foundation for a true challenge win-value metric.

Status in AiBS:

- marts implemented
- fallback hierarchy implemented
- initial product integration in progress

### Layer 4: Expected Challenge Decision Value

Question:

`Was it smart to challenge here before knowing the outcome?`

Inputs:

- held state
- corrected state
- estimated overturn probability for this review context
- remaining challenge inventory
- innings remaining

Base formula:

- `Expected_Challenge_Value = P(overturn) * Value(corrected_state) + (1 - P(overturn)) * Value(held_state) - Inventory_Cost`

Where `Value()` can be:

- `RE`
- `WE`

and `Inventory_Cost` is the opportunity cost of spending one of a limited number of challenges now instead of later.

This is the real org-grade decision model, but it should not be attempted until Layers 2 and 3 are stable.

## 5. Data and State Definition

### A. State keys

AiBS should define states explicitly and reuse them everywhere.

#### Count state

- `0-0` through `3-2`

#### Base state

- `000`
- `100`
- `010`
- `001`
- `110`
- `101`
- `011`
- `111`

#### Out state

- `0`
- `1`
- `2`

#### Score differential

For WE:

- batting team score minus fielding team score

Use bounded buckets in sparse tails:

- `<= -4`
- `-3`
- `-2`
- `-1`
- `0`
- `+1`
- `+2`
- `+3`
- `>= +4`

#### Inning

For RE:

- optional inning buckets if needed for stability:
  - `1-3`
  - `4-6`
  - `7-8`
  - `9+`

For WE:

- keep inning exact if sample size supports it
- otherwise smooth into late-game buckets in sparse states

### B. Training target definitions

#### Run expectancy target

For each observed pitch state:

- target = runs scored by batting team from that pitch until the end of the inning

#### Win expectancy target

For each observed pitch state:

- target = `1` if batting team eventually wins the game
- target = `0` otherwise

This creates empirical state tables without inventing theoretical values first.

## 6. Modeling Approach

### Step 1: Empirical state tables

Build raw empirical tables first.

This is the public industry default and should be the AiBS baseline.

#### Run expectancy table

Group historical pitch states by:

- outs
- bases state
- count state
- optional inning bucket

For each group:

- sample size
- mean runs to end of inning

Store:

- `mart_run_expectancy_by_count_state`

#### Win expectancy table

Group historical pitch states by:

- inning
- half-inning
- score differential
- outs
- bases state
- count state

For each group:

- sample size
- batting-team win rate

Store:

- `mart_win_expectancy_by_count_state`

### Step 2: Smoothing and fallbacks

Sparse states will exist. That is normal.

AiBS should use deterministic smoothing, not opaque black-box modeling at first.

Recommended fallback hierarchy:

#### Run expectancy fallback

1. exact `outs + bases + count + inning bucket`
2. exact `outs + bases + count`
3. exact `outs + bases`

#### Win expectancy fallback

1. exact `inning + half + score_diff + outs + bases + count`
2. `inning bucket + half + score_diff + outs + bases + count`
3. `inning bucket + half + score_diff + outs + bases`
4. `inning + half + score_diff + outs + bases`

Use minimum sample thresholds per level.

### Step 3: Calibration checks

Every table should carry:

- sample size
- fallback tier used
- model confidence band

AiBS should surface lower confidence where state coverage is weak.

## 7. Proposed Tables and Views

AiBS should add the following database objects.

### `mart_run_expectancy_by_count_state`

Columns:

- `season`
- `inning_bucket`
- `outs`
- `bases_state`
- `count_key`
- `sample_size`
- `expected_runs_to_end_inning`

### `mart_win_expectancy_by_count_state`

Columns:

- `season`
- `inning`
- `inning_bucket`
- `half_inning`
- `score_diff_bucket`
- `outs`
- `bases_state`
- `count_key`
- `sample_size`
- `batting_team_win_probability`

### `mart_challenge_decision_value`

Derived challenge-level mart.

Columns:

- `challenge_id`
- `game_pk`
- `held_count`
- `corrected_count`
- `pre_re`
- `post_re`
- `re_delta`
- `pre_we`
- `post_we`
- `we_delta`
- `estimated_overturn_probability` nullable
- `expected_decision_value` nullable
- `confidence_band`

## 8. Product Surfaces by Model Layer

### Stage 1 surfaces

Use:

- count-state delta
- scenario tags
- estimated leverage

Surfaces:

- challenge explorer
- postgame timeline
- team strategy matrix
- live challenge window

### Stage 2 surfaces

Add:

- `RE Delta`
- `Average RE Gained Per Challenge`
- `High-RE Challenge Share`

Best destinations:

- team detail
- postgame timeline
- org summaries

### Stage 3 surfaces

Add:

- `WE Delta`
- `Average Win Value Per Challenge`
- `Late-Game Challenge Win Value`

Best destinations:

- org dashboards
- matchup prep
- team strategy rankings

### Stage 4 surfaces

Add:

- `Expected Challenge Decision Value`
- `Realized vs Expected Challenge Value`
- `Challenge Conservation Efficiency`

This is the true decision-support layer.

## 9. Validation Framework

AiBS should validate the model in four ways.

### A. Internal consistency

- overturned ball-to-strike and strike-to-ball paths should move value in sensible directions
- late close states should exceed early blowout states in WE importance
- bases-loaded full-count states should dominate empty, no-pressure states

### B. Historical sanity checks

Sample known baseball truths:

- `3-1` is better for hitters than `2-2`
- RISP with fewer than two outs is more valuable than bases empty with two outs
- tied ninth-inning states carry more WE than tied second-inning states

### C. External comparison

Use MLB and public references for validation, not direct substitution.

Use:

- MLB glossary definitions for LI/WPA framing
- Baseball-Reference WE/WPA framing
- FanGraphs RE24 and WPA methodology
- MLB Stats API `winProbability` as a comparison layer where available

Rule:

- external sources should validate directionality and scale
- AiBS should still own the challenge-specific state model

### D. Product calibration

Run manual challenge reviews:

- compare model output to real baseball intuition
- check whether “high-value” flags actually correspond to meaningful baseball spots

## 10. Rollout Order

This should be implemented in six phases.

### Phase 1

- finalize count-state delta everywhere
- unify shared challenge payloads
- ship scenario-aware team list metrics

### Phase 2

- build `mart_run_expectancy_by_count_state`
- expose `RE Delta` in postgame timeline
- add team-level average `RE Delta`

### Phase 3

- add `RE Delta` strategy views to org mode
- add fan-readable “smart challenge” framing based on RE

### Phase 4

- build `mart_win_expectancy_by_count_state`
- validate against known public WE/WPA references
- expose challenge `WE Delta`

### Phase 5

- add matchup and team strategy views driven by WE
- rank clubs by challenge win-value efficiency

### Phase 6

- build overturn-probability model
- add expected decision value
- add realized vs expected challenge performance

## 11. What Is Industry-Standard Enough To Claim

AiBS can credibly claim the following once Layers 2 and 3 are in place:

- challenge context is evaluated using empirical run expectancy and win expectancy methods
- challenge value is derived from state transitions, not arbitrary heuristics
- leverage is framed using established baseball analytics concepts

AiBS should **not** claim:

- that this is the exact internal challenge model used by MLB clubs
- that expected decision value is fully org-grade until overturn probability and inventory cost are modeled
- that any stage-one estimated metric is true WPA

## 12. Implementation Recommendation

The next correct implementation move is:

1. build `mart_run_expectancy_by_count_state`
2. wire `RE Delta` into challenge-level outputs
3. validate on known baseball situations
4. only then begin the WE table

That is the most defensible path and the one most consistent with established baseball analytics workflows.

## References

- [MLB Glossary: Leverage Index](https://www.mlb.com/glossary/advanced-stats/leverage-index/)
- [MLB Glossary: Win Probability Added](https://www.mlb.com/glossary/advanced-stats/win-probability-added)
- [FanGraphs Library: RE24](https://library.fangraphs.com/misc/re24/)
- [FanGraphs Glossary](https://blogs.fangraphs.com/glossary/)
- [Baseball-Reference: Win Expectancy, Run Expectancy, and Leverage Index](https://www.baseball-reference.com/about/wpa.shtml)
- [SABR Analytics Presentations](https://sabr.org/analytics/presentations/2023)

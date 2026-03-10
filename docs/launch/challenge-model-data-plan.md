<div align="center">

# Challenge Model Data Plan

[![Goal](https://img.shields.io/badge/Goal-Industry%20Standard%20Challenge%20Models-0F766E)](#challenge-model-data-plan)
[![Primary%20Sources](https://img.shields.io/badge/Primary%20Sources-MLB%20Stats%20API%20%2B%20Baseball%20Savant-2563EB)](#4-source-strategy)
[![Recommended%20Window](https://img.shields.io/badge/Recommended%20Window-2015%E2%80%932025%20Regular%20Season-7C3AED)](#5-historical-window-recommendation)
[![Models](https://img.shields.io/badge/Models-Count%20Value%20%E2%86%92%20RE%20%E2%86%92%20WE-DC2626)](#3-what-the-models-need)
[![Status](https://img.shields.io/badge/Status-Historical%20Backfill%20Completed-16A34A)](#2-can-aibs-implement-this-now)

</div>

This document answers a practical modeling question for AiBS:

`Can we implement the challenge value model stack right now, or do we need to backfill more baseball data first?`

The answer is now:

- **yes**, AiBS can implement the model architecture
- **yes**, AiBS now has enough historical baseball state coverage to treat run expectancy as a real model layer
- **yes**, AiBS now has enough historical baseball state coverage to treat win expectancy as a production-usable model layer when confidence gating is respected

This memo is written as an internal baseball analytics planning brief. The goal is to make the data acquisition path as disciplined as the model plan itself.

Related documents:

- [challenge-value-model-plan.md](./challenge-value-model-plan.md)
- [challenge-context-analytics-plan.md](./challenge-context-analytics-plan.md)
- [technical.md](../reference/technical.md)
- [src/lib/data.ts](../../src/lib/data.ts)
- [etl/ingest_mlb_abs.py](../../etl/ingest_mlb_abs.py)

## 1. Executive Summary

### Current status

AiBS now has a completed regular-season historical backfill for `2019-2025`.

Current historical state:

- `15,480` regular-season games
- `4,566,992` raw Statcast pitches
- `4,566,992` canonical `historical_pitch_states` rows

Current run expectancy quality:

- `1,152` RE state rows
- confidence bands:
  - `826` high
  - `248` medium
  - `78` low
- median RE sample size: `1149.50`

Current ABS challenge-state fit:

- `532 / 532` exact before-state matches
- `532 / 532` exact after-state matches
- challenge-state confidence:
  - `365` high
  - `38` medium
  - `2` low
- median exact challenge-state sample size: `3599`

That means the historical backfill requirement described in the original version of this memo has been satisfied for the RE phase.

AiBS already has enough data to support:

- challenge context cards
- count-state consequence deltas
- estimated leverage heuristics
- early strategy surfaces for ABS review timing

AiBS does **not** yet have enough validated model work to support:

- a fully matured expected challenge decision value layer across all product surfaces

Why:

- those models are not built from ABS challenges alone
- they are built from the full universe of baseball game states
- that means AiBS needs historical pitch-by-pitch or play-by-play state data across many MLB seasons

## 2. Can AiBS Implement This Now?

### What is already possible

AiBS can implement the system architecture now:

- marts
- model tables
- derivation code
- fallback logic
- UI surfaces

AiBS can also begin with the current stage-one analytics because the app already stores:

- inning
- half-inning
- balls
- strikes
- outs
- bases state
- score state
- pitch review result
- count before and after

### What is not possible yet without historical backfill

AiBS could not build a defensible empirical `RE` or `WE` model from current app data alone because:

- ABS challenge events are too sparse
- ABS only covers reviewed pitch moments, not the entire state space
- state models require the full distribution of pitch states, not only disputed ones

Updated conclusion:

- the model framework is implementable
- the historical backfill prerequisite has now been met for both RE and WE
- expected challenge decision value is now in an early empirical stage, but still requires more calibration and rollout work

## 3. What the Models Need

### A. Count-State Value

Needs:

- count before pitch
- eventual plate appearance outcome
- optionally pitch type / zone / handedness

This is already mostly in reach with current baseline marts and can be improved with broader pitch-level history.

### B. Run Expectancy

Needs:

- outs
- bases state
- count state
- runs scored from that pitch state to end of inning

This requires **all pitch states**, not just challenges.

### C. Win Expectancy

Needs:

- inning
- half-inning
- score differential
- outs
- bases state
- count state
- eventual game winner

This also requires **all pitch states**, again not just challenges.

### D. Expected Challenge Decision Value

Needs:

- all of the above
- overturn probability by review context
- challenge inventory cost
- late-game scarcity logic

This is a second-order model and should be deferred until RE and WE are stable.

## 4. Source Strategy

AiBS should use a **multi-source acquisition plan**, with one primary source for pitch-level context and one secondary source for validation or backfill support.

### Source 1: MLB Stats API live feed / play-by-play

Use for:

- official game structure
- inning / half-inning
- score progression
- plate appearance sequencing
- play result progression
- game winner
- game identifiers

Why:

- this matches the current AiBS game ingestion model
- it is the right backbone for game-state reconstruction

Best use in the model stack:

- win expectancy table input
- game-level validation
- challenge-state reconstruction

### Source 2: Baseball Savant / Statcast pitch-level history

Use for:

- pre-pitch count
- pitch ordering
- runner occupancy
- pitch result
- pitch location
- pitch type
- release / movement metadata
- plate appearance linkage

Why:

- public pitch-level detail is much richer
- count-state and pitch-context models need this granularity
- this is the cleanest public route to building pitch-state tables

Best use in the model stack:

- count-state value
- run expectancy by pitch state
- count-aware win expectancy
- optional future overturn probability features

Public documentation confirms:

- Statcast CSV includes count, base occupancy, score, pitch order, and pitch location
- the public Statcast era is available from **2008 onward**

Sources:

- [Baseball Savant CSV docs](https://baseballsavant.mlb.com/csv-docs)
- [PyBaseball Statcast availability summary](https://deepwiki.com/jldbc/pybaseball/3.1-statcast-data)

### Source 3: Retrosheet

Use for:

- older event-history backfill
- cross-checking run expectancy logic
- historical event modeling where pitch-level Statcast is not required

Why:

- Retrosheet is one of the standard public research backbones for RE / WE work
- useful if AiBS wants deeper historical event-level robustness

Best use in the model stack:

- optional support source
- not the primary source for pitch-aware models

### Source 4: MLB Stats API `winProbability` / `contextMetrics`

Use for:

- validation
- comparison
- postgame sanity checks

Why:

- useful to compare the shape of AiBS WE results
- not sufficient as the sole source of truth for challenge-level models

Rule:

- use for validation, not substitution

## 5. Historical Window Recommendation

### Recommended production window

AiBS should backfill:

- **2015 through 2025**
- **Regular season only**

Why 2015-2025:

- good sample size
- modern baseball environment
- Statcast-era stability
- enough coverage for sparse state combinations
- avoids mixing too much pre-Statcast measurement inconsistency into pitch-aware models

Why regular season only:

- most stable environment
- cleanest baseline for club and fan comparisons
- avoids overweighting playoff contexts with different strategic behavior and tiny samples

### Optional extension window

If sparse states remain a problem:

- extend to **2008 through 2014** for additional count-state and event-level coverage

But:

- keep this as a secondary backfill
- use it more carefully for pitch-level or location-sensitive models because tracking consistency changes over time

### What to exclude from baseline modeling

Exclude initially:

- spring training
- exhibitions
- postseason
- minor leagues

Reason:

- different incentives
- different talent environments
- different run environments
- different challenge usage incentives

AiBS can always build separate postseason models later if needed.

## 6. Minimum Data Pull Required

To get the first serious model version built, AiBS should pull:

### Pitch-level history for every regular season game, 2015-2025

Fields required at minimum:

- `game_pk`
- `game_date`
- `inning`
- `inning_topbot` or half-inning
- `balls`
- `strikes`
- `outs_when_up` or equivalent outs-before state
- `on_1b`
- `on_2b`
- `on_3b`
- `home_score`
- `away_score`
- `at_bat_number`
- `pitch_number`
- `events`
- `description`
- `type`
- `batter`
- `pitcher`

Fields strongly recommended:

- `pitch_type`
- `pitch_name`
- `plate_x`
- `plate_z`
- `stand`
- `p_throws`
- `home_team`
- `away_team`

These let AiBS build:

- count-state value
- run expectancy by pitch state
- win expectancy by pitch state
- future overturn-probability features

## 7. Suggested Acquisition Phases

### Phase A: Run Expectancy Backfill

Pull:

- 2019-2025 regular season pitch-level data

Why:

- fastest path to a modern RE model
- enough sample to start
- smaller storage load than the full 2015-2025 pull

Output:

- `mart_run_expectancy_by_count_state`

### Phase B: Full Win Expectancy Backfill

Pull:

- 2015-2025 regular season pitch-level and game-state history

Why:

- more coverage for sparse WE states
- especially important late in games with specific count/base/score combinations

Output:

- `mart_win_expectancy_by_count_state`

### Phase C: Validation Layer

Pull or compare:

- MLB Stats API `winProbability`
- known public run expectancy / win expectancy benchmarks

Why:

- sanity check directionality
- compare scale
- identify miscalibrated tails

### Phase D: ABS-Specific Decision Modeling

Pull:

- all AiBS challenge events from the ABS era

Use for:

- overturn likelihood by context
- team-specific challenge behavior
- inventory-cost heuristics

This phase starts **after** RE and WE are stable.

## 8. Storage and Table Strategy

AiBS should separate raw acquisition tables from final marts.

### Raw tables

Suggested:

- `raw_pitch_states`
- `raw_game_outcomes`

These should store:

- one row per pitch
- enough state to reconstruct RE and WE

### Derived marts

Suggested:

- `mart_count_state_baselines`
- `mart_run_expectancy_by_count_state`
- `mart_win_expectancy_by_count_state`
- `mart_challenge_decision_value`

This keeps:

- ingestion simple
- recomputation possible
- model evolution manageable

## 9. Risks and Constraints

### A. Volume

Pitch-level history across 2015-2025 is large.

Plan for:

- chunked pulls
- resumable ETL
- season-by-season backfill
- materialized marts after raw load

### B. State sparsity

Exact inning + score differential + outs + bases + count states can get thin.

This is expected.

Mitigation:

- sample thresholds
- deterministic fallback tiers
- confidence bands

### C. Environment drift

Run environment changes over time.

Mitigation:

- use recent seasons first
- carry season or era keys
- test whether pooled multi-year tables outperform single-season tables

### D. Public source mismatch

Stats API, Baseball Savant, and Retrosheet do not always align perfectly field-for-field.

Mitigation:

- use one primary model source
- use others for validation or supplemental backfill

## 10. Recommended AiBS Implementation Plan

### Recommendation

AiBS should implement this in the following order:

1. **Backfill 2019-2025 regular season pitch-level history**
2. **Build run expectancy mart**
3. **Ship RE delta into challenge-level outputs**
4. **Backfill/expand to 2015-2025 for win expectancy coverage**
5. **Build win expectancy mart**
6. **Validate against public references and MLB winProbability**
7. **Build ABS-specific decision value on top**

### Why this is the correct order

- RE is the first real strategic layer
- RE is easier to estimate robustly
- WE is more sensitive to sparse states and should come after RE
- decision value depends on overturn likelihood and scarcity cost, so it belongs last

## 11. Bottom Line

AiBS can absolutely implement the model stack described in the planning docs.

But to do it credibly, the app needs a broader baseball-state backfill first.

The cleanest and most industry-standard plan is:

- use **Baseball Savant / Statcast** as the primary pitch-state source
- use **MLB Stats API** as the game-structure and validation source
- use **Retrosheet** only as an optional older historical support layer
- start with **2019-2025 regular season**
- expand to **2015-2025 regular season** for final production-grade RE/WE coverage

That gives AiBS enough data to build:

- count-state value
- run expectancy
- win expectancy
- later, expected challenge decision value

without overclaiming or cutting corners.

## References

- [Baseball Savant CSV Documentation](https://baseballsavant.mlb.com/csv-docs)
- [PyBaseball Statcast Availability Summary](https://deepwiki.com/jldbc/pybaseball/3.1-statcast-data)
- [MLB Glossary: Leverage Index](https://www.mlb.com/glossary/advanced-stats/leverage-index/)
- [MLB Glossary: Win Probability Added](https://www.mlb.com/glossary/advanced-stats/win-probability-added)
- [FanGraphs Library: RE24](https://library.fangraphs.com/misc/re24/)
- [Baseball-Reference: Win Expectancy and WPA](https://www.baseball-reference.com/about/wpa.shtml)
- [Retrosheet research references](https://retrosheet.org/Research/Pavitt/retrosheet-a-c.pdf)

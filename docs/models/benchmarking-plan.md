# External Benchmarking Plan

Last updated: March 23, 2026

## Purpose

Define how AiBS should compare its internal model layer against external references such as MLB public win-probability context.

## Principle

External sources are benchmarks, not unquestioned truth.

The goal is not:

- make AiBS identical to MLB

The goal is:

- understand whether AiBS behaves directionally like a serious baseball model
- identify states where AiBS is systematically different
- decide whether those differences are justified or problematic

## Best Benchmark Candidates

### Win expectancy / WPA

Best candidate for external comparison.

Reason:

- MLB/Stats ecosystem exposes public or community-documented win-probability context
- WE/WPA is state-driven and comparable across sources

### Run expectancy

Use more cautiously.

Reason:

- RE depends heavily on exact state definition and run-environment construction
- direct one-to-one comparison is weaker unless the external source uses comparable state construction

### Rubrics and descriptors

Do not benchmark directly.

Reason:

- those are product-layer translations, not raw model outputs
- they should be audited internally against stat spread and confidence, not against an external label system

## Comparison Questions

For WE/WPA benchmarking, compare:

- tied vs one-run vs blowout sensitivity
- inning progression sensitivity
- base/out pressure sensitivity
- count-state swing sensitivity
- late-close hinge states

## Interpretation Rules

If AiBS differs from MLB:

- first check state definition mismatch
- then check sample-size/fallback pressure
- only then decide whether the AiBS model is truly underperforming

## Outputs To Track

When external benchmarking is implemented, each report should include:

- route or game sample used
- AiBS value
- benchmark value
- absolute difference
- bucketed difference summary
- interpretation note

## Current Recommendation

Build the internal empirical audit first.

Then add MLB WE/WPA comparison as a second layer. That sequence avoids treating an external benchmark as a substitute for understanding our own coverage and fallback behavior.

## Current Execution Status

Completed on March 23, 2026:

- `docs/models/audits/2026-03-23-mlb-we-benchmark.md`
- `docs/models/audits/artifacts/2026-03-23-mlb-we-benchmark.json`

Current readout:

- benchmark sample: `394` final spring challenge games
- at-bats compared: `23,499`
- mean absolute difference: `4.6%`
- median absolute difference: `3.4%`
- mean signed difference: `+1.29` home-win-probability points for AiBS versus MLB

Interpretation:

- AiBS is directionally close enough to MLB’s public WE layer to treat the shared model as credible.
- The main benchmark pressure is in tied and one-run states, where AiBS is somewhat more optimistic for the home side than MLB.
- The largest individual divergences should be interpreted carefully because spring-training rules and public endpoint semantics can distort a small set of late-game states.

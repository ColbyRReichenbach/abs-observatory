# Model History

This document records the retained lineage of the AiBS model stack.

It is partly reconstructed from code, tests, and earlier audit notes. Where that is true, the history should be treated as reconstruction rather than perfect contemporaneous recordkeeping.

## 1. Shared Model Layers

The current analytical stack is layered:

1. state normalization
2. run expectancy support
3. win expectancy support
4. overturn calibration
5. expected review value
6. rubric and descriptor layers

## 2. Early Direction

The earliest durable direction visible in the repository was:

- shared server-side model helpers rather than page-local math
- separation between model outputs and presentation language
- explicit fallback behavior when sample or coverage was thin
- willingness to qualify low-confidence outputs

## 3. Known Early Limitations

Before the larger 2026 spring-training data window, the main limitations were:

- thinner exact-state RE and WE coverage
- heavier fallback dependence
- more heuristic pressure on expected review value
- descriptor thresholds tuned against a narrower sample

## 4. Confirmed Later Audit Work

The retained audit trail shows follow-through in:

- shared model inventory and audit work
- baseball-sensible benchmark and rubric review
- leverage and decision-value calibration
- zone-consistency follow-through

The important historical point is not that one sprint “solved” the model. It is that the model layer moved from loosely calibrated surfaces toward repeatable audit-backed review.

## 5. Current History Rule

Future history updates should record:

- the audit window used
- the code changed
- the reason the change was kept

If a change cannot be tied back to an audit, benchmark, or clear regression fix, it should not be presented as model-history fact.

# Publication Readiness

Date: April 8, 2026

Current recommendation: do not publish external statistical claims yet.

## Executive Readout

The rework is materially stronger than the original stack.

Green:

- warehouse/serving data governance
- split-aware count-state, RE, and WE
- held-out overturn calibration framework
- exact-state challenge-now contract
- explicit claim boundaries for leverage, rubrics, and controversy
- model cards for the active stack

Yellow:

- overturn geometry choice is still provisional
- uncertainty communication for sparse RE/WE/overturn states can still improve
- early 2026 sample should still be treated carefully in external copy

Red:

- challenge-now is not yet publication-ready for autonomous or org-grade deployment claims
- opportunity-level policy evaluation remains descriptive rather than causal

## Layer Status

| Layer | Status | Evidence |
| --- | --- | --- |
| Called-pitch geometry | yellow | [overturn calibration](./audits/2026-04-08-overturn-calibration.md) |
| Count-state value | green | [count-state audit](./audits/2026-04-08-count-state-audit.md) |
| Run expectancy | green | [RE benchmark](./audits/2026-04-08-re-benchmark.md) |
| Win expectancy | green | [WE benchmark](./audits/2026-04-08-we-benchmark.md) |
| Overturn probability | yellow | [overturn calibration](./audits/2026-04-08-overturn-calibration.md) |
| Challenge-now policy | red | [decision-value audit](./audits/2026-04-08-decision-value-audit.md) |
| Leverage | green as heuristic | [leverage audit](./audits/2026-04-08-leverage-audit.md) |
| Rubrics | green as descriptive layer | [rubric audit](./audits/2026-04-08-rubric-audit.md) |
| Controversy | green as editorial layer | [controversy audit](./audits/2026-04-08-controversy-audit.md) |

## Remaining Publication Blockers

1. Settle the current leading overturn geometry version with more held-out evidence.
2. Improve uncertainty framing for sparse states and fallback tiers.
3. Keep challenge-now framed as decision support until stronger policy validation exists.
4. Perform a final editorial pass on external claims so they do not outrun the evidence.

Current nuance:

- segmented geometry validation now points more strongly toward `center_only`
- the rating remains `yellow` because one small held-out global Brier readout still leaned `radius_adjusted`, so the choice is not fully closed yet
- challenge-now now includes threshold-envelope reporting, which improves transparency around recommendation-rate behavior without yet solving the deeper policy-evaluation problem
- challenge-now now also includes a team-game budget-constrained envelope, and the current validation slice still shows no overlap between budget-selected and historically challenged rows
- because of that evidence gap, current approved use for challenge-now is experimental fan-facing/live discussion plus postgame retrospective analysis, not org-grade live optimization

## Final Sprint

The concrete closeout plan for these blockers now lives in:

- [final-sprint-plan.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/docs/models/final-sprint-plan.md)

High-level split:

- geometry and overturn are mostly `yellow` because they need more evidence and sharper uncertainty framing
- challenge-now is still `red` because it needs stronger policy-evaluation methodology, not because the raw dataset is missing

## Safe Current Claims

- AiBS now runs on a warehouse-first, split-governed modeling pipeline.
- Count-state, run expectancy, and win expectancy are audited on held-out data.
- Overturn probability is no longer evaluated in-sample.
- Challenge-now is explainable and decomposed into overturn, value, and inventory components.
- Challenge-now can be used honestly today as an experimental live fan lens and as a postgame challenge-evaluation layer.
- Leverage, rubrics, and controversy are explicitly framed as heuristic or descriptive layers where appropriate.

## Unsafe Current Claims

- exact parity with MLB or club-internal ABS systems
- final org-grade challenge optimization
- exact MLB ABS adjudication truth from public geometry alone
- autonomous deployment-ready challenge recommendation quality

# Current Model Verdict

Date: April 8, 2026

Purpose:

- summarize the actual current state of the AiBS model stack
- record what has been fully rebuilt versus what remains provisional
- capture the real measured audit readouts in one document
- provide a clean source for later rewriting of product-facing model-layer docs

## Executive Summary

The AiBS model stack is materially stronger, more disciplined, and more publication-safe than the original version.

The strongest current result is not a single flashy metric. It is the combination of:

- warehouse-first data governance
- split-aware train, validation, and test control
- held-out audits across the core stack
- explicit claim boundaries
- model cards and audit artifacts that match the current implementation

Current bottom line:

- the core public-data baseball stack is now respectable
- count-state, run expectancy, and win expectancy are the strongest quantitative layers
- overturn probability is promising and usable, but still early and geometry-sensitive
- challenge-now is structurally improved, but it is not yet credible as an org-grade live optimization engine

## Overall Status By Layer

| Layer | Status | Current verdict |
| --- | --- | --- |
| Data platform and canonical datasets | green | strong foundation, no longer the blocker |
| Count-state value | green | respectable and held-out audited |
| Run expectancy | green | respectable and held-out audited |
| Win expectancy | green | respectable and externally benchmarked |
| Called-pitch geometry | yellow | useful, but geometry choice still provisional |
| Overturn probability | yellow | credible early model, but still sample- and geometry-limited |
| Challenge-now policy | red | useful as experimental live/fan lens and postgame review, not org-grade live optimization |
| Leverage | green as heuristic | useful pressure proxy, not a calibrated model |
| Rubrics | green as descriptive layer | healthy translation layer, not predictive truth |
| Controversy | green as editorial layer | healthy editorial ranking layer |

## What Is Actually Done

These layers are now rebuilt on the current split-aware, warehouse-first stack:

- count-state value
- run expectancy
- win expectancy
- overturn probability framework
- challenge-now decomposition and held-out opportunity audit
- leverage relabeling and audit
- rubric audit pass
- controversy audit pass

Supporting foundation now exists for all of that work:

- Warehouse and Serving database separation
- canonical `modeling.called_pitch_decisions`
- split materialization
- live MLB feed context synced into warehouse
- full `bases_state`, score, and team context in the current called-pitch dataset

## Measured Readouts

### Count-State Value

Source:

- [2026-04-08-count-state-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-count-state-audit.md)

Held-out test weighted MAE:

- batting average: `1.74%`
- walk rate: `0.36%`
- strikeout rate: `0.78%`
- positive outcome rate: `1.33%`

Verdict:

- strong enough to treat as a credible public empirical baseline
- small-state subgroup noise still exists, but the layer is not structurally broken

### Run Expectancy

Source:

- [2026-04-08-re-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-re-benchmark.md)

Held-out test:

- MAE: `0.105`
- RMSE: `0.199`
- mean signed error: `0.003`

Verdict:

- strong for a public empirical RE model
- current remaining issue is not leakage or structure
- remaining issue is communicating sparse-tail uncertainty honestly

### Win Expectancy

Sources:

- [2026-04-08-we-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-we-benchmark.md)
- [2026-04-08-mlb-we-benchmark.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-mlb-we-benchmark.md)

Held-out internal test:

- MAE: `15.5%`
- Brier: `5.4%`
- RMSE: `23.2%`
- log loss: `0.4992`

External MLB public benchmark:

- at-bats compared: `40,963`
- mean absolute gap: `2.5%`
- median absolute gap: `2.2%`
- 90th percentile gap: `4.9%`

Verdict:

- this is one of the strongest current proof points in the stack
- the MLB comparison is not training truth, but it is strong external shape validation
- the model is respectable as a public baseball WE layer

### Called-Pitch Geometry

Sources:

- [2026-04-08-overturn-calibration.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-overturn-calibration.md)
- geometry validation artifacts under [audits/artifacts](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/artifacts)

Current state:

- `center_only` won on validation
- `radius_adjusted` slightly edged it on one small held-out test Brier comparison
- segmented follow-up evidence points more strongly toward `center_only`

Verdict:

- geometry framework is useful and now much more explicit
- geometry choice is still provisional
- this is a data-maturity and validation-closure issue, not a structural failure

### Overturn Probability

Source:

- [2026-04-08-overturn-calibration.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-overturn-calibration.md)

Held-out test:

- challenged rows: `245`
- Brier: `0.2519` using current leading `center_only`
- log loss: `0.6970`
- mean absolute bucket gap: `8.3%`

Current audit shape:

- challenge direction is close to calibrated
- sparse subgroups have wide intervals
- geometry choice still matters

Verdict:

- respectable as an early held-out overturn model
- not yet strong enough to oversell as club-grade or final
- worth continuing because the target is real and the validation path is now correct

### Challenge-Now Policy

Source:

- [2026-04-08-decision-value-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-decision-value-audit.md)

Held-out opportunity set:

- opportunities: `9,768`
- historical challenge share: `2.5%`
- current recommendation share: `0.8%`
- positive-EV non-challenged rows: `78`
- negative-EV challenged rows: `242`

Most important current red flag:

- budget-constrained validation still shows `0` overlap between budget-selected rows and historically challenged rows

Verdict:

- the policy is much better engineered than before
- the decomposition is correct
- the audit is now asking the right question
- but the evidence is still not strong enough for org-grade live optimization claims

Current approved use:

- experimental live fan-facing lens
- postgame challenge evaluation
- missed-opportunity and low-value-usage review

Current unapproved use:

- org-grade live challenge recommendation engine

### Leverage

Source:

- [2026-04-08-leverage-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-leverage-audit.md)

Key readout:

- Pearson correlation to absolute WE swing: `0.190`
- high bucket mean abs WE swing: `5.5%`
- low bucket mean abs WE swing: `2.2%`

Verdict:

- useful for pressure ordering
- not a calibrated predictive model
- correct current framing is heuristic pressure proxy

### Rubrics And Controversy

Sources:

- [2026-04-08-rubric-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-rubric-audit.md)
- [2026-04-08-controversy-audit.md](/Users/colbyreichenbach/Downloads/mlb/abs-observatory/docs/archive/models/audits/2026-04-08-controversy-audit.md)

Key rubric readout:

- team styles cover `3` buckets, with `Balanced` at `63.3%`
- umpire low-confidence share: `2.8%`

Key controversy readout:

- overturned share overall: `53.6%`
- overturned share in top decile: `100.0%`
- top-decile modeled-value `>= 0.5%` share: `97.8%`

Verdict:

- both layers are healthy in their intended roles
- both should remain clearly labeled as descriptive/editorial, not predictive truth

## Is This Respectable Relative To Public Baseball Work

Yes, with the right framing.

The strongest reason it is respectable is not that every single metric is elite. It is that the current stack now has the things serious public work often lacks:

- explicit split governance
- held-out auditing
- reproducible artifacts
- clear model cards
- honest publication boundaries

Compared with reputable public baseball work:

- RE and WE are now in a credible range for public-data models
- the MLB public WE benchmark is especially helpful because it shows the AiBS WE layer is not drifting wildly from a respected external reference
- overturn is promising, but still early
- challenge-now is the one area where honesty matters most: the evidence is not yet strong enough for a club-style operational claim

## What An Org Would Likely Think

Best-case credible reaction:

- this is a serious baseball modeling system
- the author understands data governance, leakage control, and evaluation design
- the RE/WE/value stack is thoughtful and defensible
- the overturn layer is promising and being handled honestly
- the challenge-now layer is not oversold, which increases overall credibility

Less credible claim to make today:

- that the system already proves optimal live challenge strategy for clubs

## Dead Ends Versus Good Bets

Worth continuing:

- called-pitch geometry closure
- overturn probability refreshes as the sample grows
- postgame challenge evaluation
- team and umpire consequence analysis

Do not force right now:

- org-grade live challenge-now optimization
- strong causal claims from descriptive opportunity-level policy evidence

## Recommended Product And Communication Framing

Use these as the default current framing rules:

- count-state, RE, WE:
  - empirical, audited, held-out validated
- overturn probability:
  - modeled overturn likelihood, still provisional in geometry choice
- challenge-now live:
  - experimental model lens for fans and discussion
- challenge-now postgame:
  - serious retrospective analysis of challenge quality, missed opportunities, and low-value usage
- leverage:
  - heuristic pressure proxy
- rubrics:
  - descriptive translation layer
- controversy:
  - editorial ranking layer

## Current Summary Judgment

If the question is:

- "Is the AiBS model stack now serious and respectable?"  
  Yes.

- "Is every layer closed and publication-ready at the highest standard?"  
  No.

- "Is the current stack strong enough to support a credible public baseball analytics product?"  
  Yes.

- "Is challenge-now ready to be sold as org-grade live optimization?"  
  No.

That last distinction is important. It does not weaken the whole project. It strengthens the credibility of the rest of the stack by keeping the claims narrower than the evidence.

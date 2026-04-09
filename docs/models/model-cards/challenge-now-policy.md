# Model Card: Challenge-Now Policy

## Summary

- Layer type: decomposed decision policy
- Audit sources:
  - [2026-04-08-decision-value-audit.md](../audits/2026-04-08-decision-value-audit.md)
  - [2026-04-08-inventory-cost-audit.md](../audits/2026-04-08-inventory-cost-audit.md)
- Current status: active as experimental live/fan-facing decision support and postgame analysis, not publication-ready for org-grade live optimization

## Purpose

Estimate challenge value by combining:

- overturn probability
- baseball value if the call flips
- failure value if it does not
- inventory cost of using a challenge now

Current approved uses:

- experimental live discussion layer for fan-facing product surfaces
- retrospective postgame analysis of whether challenges and non-challenges were high-value or low-value decisions

Current disallowed use:

- org-grade live optimization or autonomous in-game challenge recommendation

## Policy Formula

`expected_challenge_value = P(overturn) * success_value + (1 - P(overturn)) * failure_value - inventory_cost`

The exact decomposition is exposed in live outputs.

## Inputs

- exact `basesState`
- inning / half inning
- outs
- score state
- count
- challenge direction
- overturn probability
- RE / WE value layers
- inventory cost version

## Current Evidence

- Held-out opportunities: `9,768`
- Held-out challenged rows: `245`
- Held-out non-challenged rows: `9,523`
- Recommendation share: `0.8%`
- Historical challenge share: `2.5%`
- Positive-EV non-challenged opportunities: `78`
- Negative-EV challenged opportunities: `242`

Current inventory layer:

- `inventory_future_opportunity_v1`

Current evaluation nuance:

- validation threshold-envelope reporting is now in place
- validation team-game budget-envelope reporting is now in place
- the policy remains conservative across reasonable positive-EV thresholds
- the current budgeted selector still fails to overlap with historical challenged rows on the validation slice
- that improves transparency, but it still does not convert the audit into causal proof

Current product stance:

- live `challenge-now` should be framed as an experimental model lens, not operational truth
- the stronger analytical use today is postgame challenge evaluation and missed-opportunity review

## Serving Contract

Return:

- `successValue`
- `failureValue`
- `inventoryCost`
- `expectedChallengeValue`
- `overturnGeometryVariant`
- `overturnSplitPolicyVersion`

## Known Limitations

- opportunity-level evaluation is descriptive, not causal proof
- inventory model is improved but still early
- policy is conservative and still underfit for deployment claims
- current budget-constrained diagnostics still show a large gap between model-selected and historically challenged opportunities
- current public-data evidence is not strong enough to support org-grade live optimization claims

## Publication Boundary

Safe claim:

- AiBS challenge-now is an explainable experimental decision-support layer built from overturn, RE, WE, and inventory components, and it is useful for live discussion plus postgame review.

Unsafe claim:

- the current policy is validated enough for autonomous deployment or final org-grade operational use

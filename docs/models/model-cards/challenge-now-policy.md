# Model Card: Challenge-Now Policy

## Summary

- Layer type: decomposed decision policy
- Audit sources:
  - [2026-04-24-decision-value-audit.md](../audits/2026-04-24-decision-value-audit.md)
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

`expected_challenge_value = P(overturn) * success_value + (1 - P(overturn)) * failed_challenge_value`

Where `failed_challenge_value` includes the normal failure cost plus the bounded inventory cost. Inventory is paid only on the failed branch, because a successful challenge preserves the club's challenge inventory under the ABS rules.

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
- terminal branch mode (`win_expectancy` for supported count-state swings, `heuristic` when the challenged swing ends the plate appearance)
- inventory cost version

## Current Evidence

- Held-out opportunities: `43,297`
- Validation opportunities: `4,967`
- Held-out challenged rows: `1,129`
- Held-out non-challenged rows: `42,168`
- Raw positive-EV recommendation share: `10.9%`
- Historical challenge share: `2.6%`
- Positive-EV non-challenged opportunities: `4,261`
- Negative-EV challenged opportunities: `688`
- Validation share at a `1.0%` EV threshold: `3.2%`
- Validation share with a two-per-team-game budget: `2.6%`

Current inventory layer:

- `inventory_future_opportunity_failure_weighted_v2`

Current evaluation nuance:

- inventory is now bounded and branch-aware, so it cannot dominate normal challenge success value
- terminal walk/strikeout branches are identified explicitly; they use heuristic decision value until a dedicated post-PA terminal WE resolver is available
- validation threshold-envelope reporting is in place
- validation team-game budget-envelope reporting is in place
- the current raw positive-EV policy is more aggressive than historical challenge behavior, but stricter threshold or budget envelopes bring the recommendation rate close to observed usage
- this improves transparency, but it still does not convert the audit into causal proof

Current product stance:

- live `challenge-now` should be framed as an experimental model lens, not operational truth
- the stronger analytical use today is postgame challenge evaluation, missed-opportunity review, and model-informed discussion

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
- inventory model is now bounded and branch-aware, but still early
- terminal plate-appearance-ending swings are not yet backed by a dedicated terminal WE resolver
- policy is conservative and still underfit for deployment claims
- current public-data evidence is not strong enough to support org-grade live optimization claims

## Publication Boundary

Safe claim:

- AiBS challenge-now is an explainable experimental decision-support layer built from overturn, RE, WE, and inventory components, and it is useful for live discussion plus postgame review.

Unsafe claim:

- the current policy is validated enough for autonomous deployment or final org-grade operational use

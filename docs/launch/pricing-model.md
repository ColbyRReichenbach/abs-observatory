# Pricing And Entitlement Assumptions

## Goal
- make AI usage billable later without changing the access-control shape

## Current Plan Tiers
- `free`
  - baseline AI access
  - lower daily request cap
  - lower monthly token and budget allowance
  - no editorial AI tools
- `tier1`
  - higher request and token caps
  - chart-generation flag enabled
- `tier2`
  - higher caps again
  - chart-generation and editorial-tool flags enabled
- `tier3`
  - highest caps for future premium/editorial workflows

## Current Cost Inputs
- usage is recorded in `ai.usage_ledger`
- per-response cost is estimated from model + token counts
- global budget controls use:
  - `AI_DAILY_BUDGET_USD`
  - `AI_MONTHLY_BUDGET_USD`

## Pricing Logic To Revisit Before Paid Launch
1. measure real per-tier cost over live traffic
2. compare request mix between cheap chat and heavier analytical flows
3. set monthly pricing only after target margin is validated
4. keep paid-only features behind entitlement flags, not bespoke route forks

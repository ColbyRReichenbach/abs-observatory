# Model Card: Controversy

## Summary

- Layer type: editorial ranking layer
- Audit source: [2026-04-08-controversy-audit.md](../audits/2026-04-08-controversy-audit.md)
- Current score version: `controversy_editorial_v2`

## Purpose

Rank challenge moments for editorial and product surfaces using baseball-sensible signals rather than pure randomness or raw overturn status.

## Inputs

- overturn status
- late / close game context
- leverage proxy
- modeled value
- direct-impact tags

## Current Evidence

- Challenges scored: `2,312`
- Overturned share overall: `53.6%`
- Overturned share in top decile: `100.0%`
- Top-decile modeled-value `>= 0.5%` share: `97.8%`
- Confirmed share in top decile: `0.0%`

## Interpretation Rule

Success criterion is not perfect prediction.

Success criterion is whether top-ranked moments are concentrated in:

- overturned spots
- late / close contexts
- direct impacts
- meaningful modeled-value windows

## Known Limitations

- this is editorial, not predictive
- rankings depend on upstream value layers
- sample mix will shift as regular-season volume grows

## Publication Boundary

Safe claim:

- controversy is an editorial composite backed by modeled baseball context.

Unsafe claim:

- controversy is a predictive model of future importance

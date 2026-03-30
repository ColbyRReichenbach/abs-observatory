# Model History

Last updated: March 23, 2026

## Purpose

This document backfills the shared model lineage so later audits have a defensible origin point.

Important note:

- this is a reconstructed baseline, not a perfect contemporaneous lab notebook
- where the repo contains direct evidence, this document reflects it
- where the repo does not contain direct evidence, this document states the most defensible reconstruction rather than pretending to stronger certainty

## Shared Model Layers

The current analytical stack is built in layers:

1. state normalization
   - base/out/count/inning/score canonicalization
2. run expectancy
   - fallback-table lookup by canonicalized state
3. win expectancy / WPA
   - fallback-table lookup by canonicalized state
4. overturn probability
   - historical overturn-rate fallback tables by direction and edge context
5. decision value
   - expected challenge value built from WE when available, with heuristic fallback where needed
6. rubrics
   - report cards, controversy scoring, org risk, and style/descriptor mapping

## Reconstructed Baseline

### Initial shared-model direction

The earliest durable direction visible in the repo was:

- use shared server-side model helpers instead of page-local math
- separate expected-value logic from public-language presentation
- keep leverage, expected value, overturn probability, and controversy scoring as distinct concepts
- accept fallback logic where sample size was thin, but surface confidence honestly

### Initial limitations

Before the larger spring-training load, the main likely limitations were:

- thinner exact-state coverage in RE and WE marts
- heavier dependence on fallback tiers
- greater pressure on heuristic EV
- rubric thresholds tuned against narrower observed spreads
- zone-dependent consumers not all using one shared standard

These limitations are consistent with the Sprint 4 checklist and the later dual-zone migration work that followed.

### Initial rubric posture

The original rubric posture appears to have favored:

- readable public labels over very granular distinctions
- stronger descriptors than the later audits ultimately supported
- some bucket compression across ambiguous mid-range profiles

Later Sprint 4 work explicitly softened low-confidence extremes, added the `Hybrid` team-style escape hatch, and recalibrated risk/grade language.

## Major Confirmed Audit / Calibration Milestones

### Sprint 4 shared-model audit

Confirmed from repo docs and tests:

- shared EV, leverage, and rubric inventory was documented
- baseball-sensible benchmark tests were added
- heuristic EV was made more conservative
- WE-backed and heuristic reads were separated more honestly
- leverage ordering and top-moment ranking were recalibrated
- rubric thresholds and descriptor compression were documented

Primary references:

- `docs/product/sprint-4-model-audit-checklist.md`
- `docs/product/sprint-4-rubric-inputs.md`
- `src/lib/__tests__/baseball-sensible-models.test.ts`
- `src/lib/server/run-expectancy.ts`
- `src/lib/server/win-expectancy.ts`
- `src/lib/server/challenge-decision-value.ts`
- `src/lib/rubrics.ts`

### Dual-zone follow-through

Confirmed later follow-through:

- shared zone-model contract introduced
- downstream consumers migrated onto shared helpers
- sample and fuller-data surfaced-example validation completed

That work did not replace Sprint 4, but it reduced downstream grading and miss-severity inconsistency.

## Current Model State Before The New Audit Cycle

As of March 23, 2026:

- spring-training ABS data now covers February 20, 2026 through March 22, 2026
- live polling has idempotent ingestion and run-level game dedupe
- RE and WE still depend on fallback marts, but the available training window is larger than the earlier audit window
- the current opportunity is no longer “invent the model”
- the current opportunity is empirical audit:
  - coverage
  - fallback dependence
  - calibration
  - rubric spread

## Next History Entries To Add

Future model-history updates should record:

- the first current-state audit against the larger spring sample
- any resulting mart recalibration
- any resulting rubric threshold changes
- any external MLB benchmark comparison decisions

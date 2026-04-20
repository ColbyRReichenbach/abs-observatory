# Model Operating Procedure

This is the default audit workflow after ABS data refreshes.

The goal is to make model review repeatable, evidence-backed, and auditable.

## 1. Standard Audit Sequence

After ingest and refresh work completes:

```bash
npm run qa:abs
npm run model:audit:all
npm run model:audit:evaluate-alerts
```

These commands write dated outputs into:

- `docs/archive/models/audits/`
- `docs/archive/models/audits/artifacts/`

## 2. What Each Step Covers

`qa:abs`

- player profile coverage
- official coverage
- strike-zone resolver gaps
- missing challenge geometry inputs

`model:audit:all`

- current-state audit
- RE benchmark
- MLB WE benchmark
- overturn calibration
- decision-value audit
- leverage audit
- controversy audit
- rubric audit
- zone-edge audit

`model:audit:evaluate-alerts`

- reads the latest audit outputs
- evaluates threshold breaches
- writes model-audit alert state

## 3. Default Review Cadence

After a meaningful ingest refresh:

- run the full audit sequence
- read the latest summary first
- then read only the audits that moved materially

Weekly review:

- compare the latest audit package against the prior week
- classify each meaningful change as:
  - `no change`
  - `monitor`
  - `recalibrate`
  - `rebuild`

## 4. Manual Product Spot Check

Automated audits protect the model layer, but major model changes should still be checked on real product surfaces:

- one game page
- one team page
- one umpire page
- one strike-zone-heavy surface

## 5. Documentation Rule

If a model change is kept, the retained audit trail should show:

- what changed
- why it changed
- what audit or benchmark justified it

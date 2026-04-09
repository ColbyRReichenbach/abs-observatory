# Model Card: Rubrics And Descriptors

## Summary

- Layer type: descriptive translation layer
- Audit source: [2026-04-08-rubric-audit.md](../audits/2026-04-08-rubric-audit.md)
- Current status: active, confidence-damped

## Purpose

Translate upstream model outputs into human-readable team styles, umpire grades, descriptors, and org-watch risk tiers.

## Inputs

- challenge behavior summaries
- expected and realized value summaries
- leverage / controversy context
- confidence bands

## Current Versions

- `umpire_report_card_v2`
- `team_style_v2`
- `org_watch_risk_v2`

## Current Evidence

- Team style sample: `30` clubs
- Umpire rubric sample: `108` home-plate umpires
- Largest team-style bucket: `Balanced` at `63.3%`
- Umpire grades:
  - `D`: `51.9%`
  - `C`: `47.2%`
  - `B`: `0.9%`

## Controls

- low-confidence extremes are softened
- neutral `Balanced` / `Mixed profile` labels exist so weak separation is not overstated
- downstream org-facing summaries now prefer trusted WE-backed value paths

## Known Limitations

- rubrics are downstream translations, not independent truth
- label mix can drift as upstream models change and current-season sample grows

## Publication Boundary

Safe claim:

- rubric outputs are descriptive summaries with confidence damping.

Unsafe claim:

- rubric labels are independent predictive models or objective scouting grades

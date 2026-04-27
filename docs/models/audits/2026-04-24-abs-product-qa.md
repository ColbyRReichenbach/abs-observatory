# ABS Product QA

Date: April 24, 2026

## Scope

- Post-ingest sanity checks for the shared ABS geometry and player-profile path
- Intended to run before the full model audit suite

## Summary

- Overall status: PASS
- Checks run: 10

## Checks

| Check | Value | Status | Note |
| --- | --- | --- | --- |
| Player profiles present | 4109 | PASS | Profiles power official ABS top/bottom zone resolution. |
| Official ABS profile coverage | 4105/4109 | WARN | Falling back to inferred top/bottom is acceptable temporarily, but should not dominate. |
| Challenge batters missing profile | 0 | PASS | Every challenged batter should map cleanly to a player profile. |
| Challenges with unresolved ABS zone | 0 | PASS | Resolved zone top/bottom must exist for every challenge visual and model path. |
| Challenges missing horizontal location | 4 | WARN | Missing px forces weaker geometry reasoning. |
| Challenges missing vertical location | 4 | WARN | Missing pz forces weaker geometry reasoning. |
| Serving fallback duplicate lookup keys | 0 | PASS | Challenge-value marts must join to unique serving fallback rows. |
| Excluded non-pitch reviews | 161 | PASS | Raw review rows may exist, but user-facing ABS views must exclude them. |
| Overturned direction mismatches | 0 | PASS | Canonical direction must agree with count movement when count movement is available. |
| Team summary mismatches | 0 | PASS | Team summaries must reconcile to canonical ABS pitch facts. |

## Manual Spot-Check Reminder

- Review one real game page, one umpire page, and one team page after major ABS logic changes.
- Confirm strike-zone visuals, challenge explorer points, and ABS copy all align with the resolved MLB zone profile.

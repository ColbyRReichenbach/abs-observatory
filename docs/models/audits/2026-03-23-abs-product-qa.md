# ABS Product QA

Date: March 23, 2026

## Scope

- Post-ingest sanity checks for the shared ABS geometry and player-profile path
- Intended to run before the full model audit suite

## Summary

- Overall status: PASS
- Checks run: 6

## Checks

| Check | Value | Status | Note |
| --- | --- | --- | --- |
| Player profiles present | 1722 | PASS | Profiles power official ABS top/bottom zone resolution. |
| Official ABS profile coverage | 1722/1722 | PASS | Falling back to inferred top/bottom is acceptable temporarily, but should not dominate. |
| Challenge batters missing profile | 0 | PASS | Every challenged batter should map cleanly to a player profile. |
| Challenges with unresolved ABS zone | 0 | PASS | Resolved zone top/bottom must exist for every challenge visual and model path. |
| Challenges missing horizontal location | 4 | WARN | Missing px forces weaker geometry reasoning. |
| Challenges missing vertical location | 4 | WARN | Missing pz forces weaker geometry reasoning. |

## Manual Spot-Check Reminder

- Review one real game page, one umpire page, and one team page after major ABS logic changes.
- Confirm strike-zone visuals, challenge explorer points, and ABS copy all align with the resolved MLB zone profile.

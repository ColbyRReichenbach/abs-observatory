# Challenge Location Inference Decision

## Status
- Accepted
- Date: 2026-03-08

## Problem
Some ABS challenge rows from the MLB StatsAPI `feed/live` payload do not include analytical pitch-location fields (`pX`, `pZ`) even though the review clearly happened.

Observed local data sample:
- `978` total challenges
- `251` missing `pX/pZ`
- `249` are `challenge_level='at_bat'`
- `2` are `challenge_level='pitch'`

Root-cause split:
- `at_bat` review rows usually exist only on `play.reviewDetails`
- the feed often does not identify the exact reviewed pitch event for those rows
- the two `pitch` review rows missing `pX/pZ` still include Gameday display coordinates (`x/y`) but not analytical `pX/pZ`

## Decision
We will preserve MLB source truth and add a separate inference layer.

We will **not** overwrite canonical challenge fields:
- `abs_challenges.pitch_number`
- `abs_challenges.px`
- `abs_challenges.pz`
- `abs_challenges.strike_zone_top`
- `abs_challenges.strike_zone_bottom`

We will instead store:
- canonical reviewed-event display coordinates when available
- inferred challenged-pitch linkage for play-level reviews
- inferred location fields from the final pitch of the at-bat when the inference is strong
- explicit metadata describing the method and confidence

## Implemented Schema

### `pitches`
Added:
- `gameday_x`
- `gameday_y`

These preserve the display-coordinate system provided by the feed.

### `abs_challenges`
Added:
- `gameday_x`
- `gameday_y`
- `inferred_pitch_number`
- `inferred_play_event_index`
- `inferred_px`
- `inferred_pz`
- `inferred_strike_zone_top`
- `inferred_strike_zone_bottom`
- `inferred_zone`
- `inferred_gameday_x`
- `inferred_gameday_y`
- `inference_method`
- `inference_confidence`
- `location_source`

## Implemented Inference Rule
For `challenge_level='at_bat'`:

1. Find the final pitch event in the plate appearance.
2. Require that final pitch to be a called take:
   - `Ball`
   - `Called Strike`
   - `Ball In Dirt`
3. Validate against the terminal plate appearance outcome:
   - walk-like result + final called ball => `high`
   - strikeout-like result + final called strike => `high`
   - otherwise called-take final pitch => `medium`
4. Store the inferred pitch linkage and inferred location fields separately.

Inference method value:
- `at_bat_final_pitch_called_take`

Confidence values:
- `high`
- `medium`

## Location Source Labels
Canonical reviewed event:
- `reviewed_pitch_px_pz`
- `reviewed_pitch_xy_only`

Inferred from play-level review:
- `inferred_final_pitch_px_pz`
- `inferred_final_pitch_xy_only`

Fallback:
- `unresolved`

## Effective Read Model Rule
Analytics and UI read models should use:
- `COALESCE(pitch_number, inferred_pitch_number)` as the effective challenged pitch
- `COALESCE(px, inferred_px)` / `COALESCE(pz, inferred_pz)` as the effective analytical location
- `COALESCE(strike_zone_top, inferred_strike_zone_top)` / `COALESCE(strike_zone_bottom, inferred_strike_zone_bottom)` as the effective zone bounds

Canonical source columns remain available for strict-source auditing.

## Why We Did Not Substitute `x/y` For `pX/pZ`
`x/y` and `pX/pZ` are different coordinate systems:
- `pX/pZ` are analytical plate-location fields
- `x/y` are Gameday display coordinates

We therefore:
- store `x/y`
- expose it for audit/debug/future estimation work
- do **not** silently treat `x/y` as equivalent to `pX/pZ`

## Current Coverage
In the current spring-training sample:
- all `249` play-level review rows end on the final pitch of the at-bat
- all `249` final pitches are called takes
- `248/249` have final-pitch `pX/pZ`
- `248/249` have final-pitch `x/y`
- the remaining one still has final-pitch `pX/pZ`

This makes the implemented inference strong enough for product use, provided it remains labeled as inferred.

## Product / Analytics Guidance
Allowed:
- use effective location in analytics surfaces
- attach inferred challenge rows to the real challenged pitch in pitch timelines
- display a badge or tooltip when location is inferred

Not allowed:
- describe inferred locations as MLB-provided canonical pitch locations
- overwrite or discard the original null source fields

## Future Work
Possible later enhancements:
- fit a game-local or global `x/y -> pX/pZ` calibration model for the rare `reviewed_pitch_xy_only` cases
- add a strict-only filter in analytics for users who want source-canonical rows only
- surface `location_source`, `inference_method`, and `inference_confidence` in debug/admin views

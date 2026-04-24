# Org-Trust Model Hardening TODO

Date: April 24, 2026

This list turns the April 24 model audit into implementation work. The standard is not "looks plausible"; the standard is "a baseball ops user can trace the number, see the assumptions, and not catch us mixing units, directions, or stale sources."

## S0 - Fix Before Public Model Claims

- [x] Use one public ABS geometry contract.
  - Public/product logic should use `canonical_abs_margin`: Savant `edge_distance_calc` when present, otherwise the radius-adjusted ABS edge calculation.
  - Keep `center_only` and raw `radius_adjusted` only as internal validation variants.
  - Preserve legacy columns only as compatibility aliases until all consumers are migrated.

- [x] Make every value metric challenger-perspective by default.
  - Add explicit batting-team and challenge-team WE/RE deltas.
  - Use challenge-team deltas for team leaderboards, decision value, and "good challenge" language.
  - Keep batting-team deltas only when labeled as batting-team value.

- [x] Model terminal ball-four and strike-three challenges as game-state transitions.
  - For terminal walk states, advance forced runners and score the bases-loaded walk.
  - For terminal strikeout states, advance outs and mark inning-ending states as low-confidence/heuristic when WE lookup cannot represent three outs.
  - Use actual pitch post-state only when the challenge was overturned and the corrected ABS result really ended the plate appearance.
  - Use heuristic decision value for terminal branches until a dedicated post-PA terminal WE resolver exists.

- [x] Fix inventory cost, do not remove it.
  - Treat inventory as an option value paid only on failed challenges.
  - Convert the prior future-opportunity table from an upper-bound future value into a bounded failure-branch cost.
  - Add regression coverage so inventory cannot dominate normal challenge success value.

## S1 - Required for Trusted Ops Use

- [x] Prefer radius-adjusted/canonical overturn probability in app defaults.
  - Default TypeScript scorer to the canonical radius-adjusted model.
  - Fall back to the other geometry variant only if canonical rows are unavailable.

- [x] Make WE fallback confidence-aware.
  - Do not let low-confidence exact cells beat higher-confidence broader cells.
  - Keep low-confidence cells available only when no stronger fallback exists.

- [x] Refresh model source tables from launchd after live/Savant ingestion.
  - Rebuild recent `historical_pitch_states`.
  - Rebuild recent `modeling.called_pitch_decisions`.
  - Publish refreshed serving lookups after the warehouse model refresh.

- [x] Keep warehouse-generated model lookups populated in serving.
  - Publish `serving_run_expectancy_fallbacks`, `serving_win_expectancy_fallbacks`, and `serving_abs_overturn_probability_fallbacks` from warehouse to serving.
  - Prevent the schema script from truncating serving lookup tables when the target does not have warehouse training history.
  - Verify warehouse and serving both hold 1,464 run-expectancy rows, 76,565 win-expectancy rows, and 26 overturn-probability rows.

- [x] Make model audits warehouse-first.
  - Prefer `MODEL_AUDIT_DATABASE_URL`, then `AUDIT_DATABASE_URL`, then `WAREHOUSE_DATABASE_URL`.
  - Treat serving/local targets as explicit fallbacks, not silent defaults.

## S2 - Follow-Up Validation

- [x] Re-run warehouse model audits after schema and scorer changes.
- [x] Compare canonical ABS margins against Savant challenge outcomes.
- [x] Re-check terminal challenge coverage in `mart_game_abs_challenge_values`.
- [x] Re-check SQL vs TypeScript decision value parity on batter and fielding examples.
  - Added a gated DB parity test covering nonterminal batter and fielding challenge examples.
  - The test caught missing warehouse lookup publication and confirmed-challenge success-branch drift; both are fixed.
- [x] Update model cards and public explanatory copy after the new audit artifacts are generated.

## Remaining Org-Trust Gaps

- [ ] Add a three-out terminal-state representation or explicit terminal WE resolver so inning-ending strikeout corrections never rely on a generic heuristic.
- [ ] Continue collecting regular-season challenge outcomes; the current geometry/calibration evidence is useful, but the sample is still too young to claim vendor-grade ABS reconstruction.
- [ ] Resolve the remaining source-data coverage warnings: 4 player profiles lack official ABS zone coverage and 4 challenges still lack `px/pz`.

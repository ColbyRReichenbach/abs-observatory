# Analytics Model Layout

This directory is the dbt-compatible seam for future warehouse/model work.

Current state:
- production SQL views are still applied from `db/views.sql`
- new marts should keep a one-to-one conceptual mapping with files that will eventually live here

Expected structure:
- `staging/`: source-normalized models
- `intermediate/`: reusable derivations
- `marts/`: serving-ready analytical models

Sprint 3 baseline marts currently represented in `db/views.sql`:
- `mart_game_pitch_timeline`
- `mart_game_play_events`
- `mart_count_state_baselines`
- `mart_count_state_delta_baselines`
- `mart_zone_outcome_baselines`
- `mart_pitch_type_count_baselines`

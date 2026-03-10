# Official Savant ABS Pipeline

## Source

AiBS can now ingest official Baseball Savant gamefeed data through the public gamefeed JSON endpoint:

- `https://baseballsavant.mlb.com/gf?game_pk=<gamePk>`

Schedule discovery uses the official MLB Stats API:

- `https://statsapi.mlb.com/api/v1/schedule`

## What The Payload Gives Us

For games where Savant reports `hasAbs: true`, the gamefeed JSON exposes event-level challenge rows in `team_home` and `team_away` with:

- `is_abs_challenge`
- `abs_challenge.is_overturned`
- `abs_challenge.challenge_team_id`
- `abs_challenge.is_batter`
- `abs_challenge.edge_distance`
- pitch context:
  - `ab_number`
  - `pitch_number`
  - `inning`
  - `outs`
  - `balls`
  - `strikes`
  - `pre_balls`
  - `pre_strikes`
- player identity:
  - `batter`
  - `pitcher`
  - `catcher`
- pitch identity and location:
  - `pitch_type`
  - `pitch_name`
  - `px`
  - `pz`
  - `plate_x`
  - `plate_z`
  - `sz_top`
  - `sz_bot`
  - `zone`
- `contextMetrics`

That is reliable enough for backend ingestion without scraping DOM markup.

## Limits

- The public ABS leaderboard page is useful for aggregate validation, but it is not the event pipeline.
- The public gamefeed endpoint is the event pipeline.
- Minor-league ABS leaderboard coverage exists publicly on Savant, but challenge-event coverage through `gf` should still be validated by league/date before large historical backfills.
- The current pipeline stages official Savant data in raw tables. It does not yet replace the existing Stats API ABS ingest path.

## Tables

The raw pipeline writes to:

- `raw.savant_gamefeed_games`
- `raw.savant_abs_events`

Normalized model-facing views:

- `mart_historical_abs_overturn_inputs`
- `mart_historical_abs_team_summary`

Every fetch is also snapshotted in:

- `ops.source_snapshots`

## ETL Entry Point

```bash
python3 etl/ingest_savant_abs_gamefeed.py \
  --start-date 2026-03-01 \
  --end-date 2026-03-10 \
  --sport-id 1 \
  --game-type S
```

Key runtime controls:

- `--sleep-seconds`
- `--jitter-seconds`
- `--retries`
- `--base-backoff-seconds`
- `--only-has-abs`
- `--summary-json`

Those settings are there specifically to keep the fetch cadence conservative and resumable through idempotent upserts.

Example scan that only keeps event-positive ABS games:

```bash
python3 etl/ingest_savant_abs_gamefeed.py \
  --start-date 2026-03-01 \
  --end-date 2026-03-31 \
  --sport-id 1 \
  --game-type S \
  --only-has-abs \
  --summary-json
```

## MiLB Coverage Finding

Official public Savant ABS aggregate coverage does exist for Triple-A. The leaderboard page and embedded data confirm that:

- `https://baseballsavant.mlb.com/leaderboard/abs-challenges?year=2025&level=aaa&challengeType=batter&gameType=R&dataMode=for`

However, sampled public `gf` payloads for Triple-A dates in 2024 and 2025 returned `hasAbs: false` in testing. That means:

- official aggregate ABS history is public for MiLB
- public event-level Gamefeed ABS coverage for MiLB is not yet proven reliable enough for a broad historical backfill

Practical rule for now:

- use `gf` event ingestion as the authoritative event pipeline where `hasAbs = true`
- treat MiLB public aggregate ABS data as validation and coverage evidence, not as an event-history substitute

# ABS Observatory (V1)

Public-facing MLB ABS challenge analytics app.

## Stack
- Next.js (App Router, TypeScript)
- Postgres (Supabase-compatible schema)
- Python ETL for MLB StatsAPI ingestion
- OpenAI API for guarded NL-to-SQL and report narratives

## Implemented V1 Surfaces
- `/` live + recent games overview
- `/game/[gamePk]` challenge zone plot + timeline
- `/umpires` + `/umpires/[umpireId]`
- `/teams` + `/teams/[teamId]`
- `/query` guarded AI query explorer
- `/api/*` routes for all core summary endpoints
- `/api/v2/challenge-value` deterministic V2 stub for challenge decision value

## Database Setup
1. Create a Postgres database.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
3. Apply schema + seed + views:

```bash
npm run db:schema
```

## ETL Setup
Install ETL dependencies:

```bash
pip3 install -r etl/requirements.txt
```

Backfill a window:

```bash
python3 etl/ingest_mlb_abs.py --start-date 2026-03-01 --end-date 2026-03-04 --game-type S,R
```

Run polling loop (adaptive by success/failure intervals):

```bash
python3 etl/poll_active_games.py
```

Run local-time polling window (today + tomorrow in `America/New_York` by default):

```bash
npm run etl:poll:local
```

Optional env overrides:
- `POLL_TIMEZONE` (default `America/New_York`)
- `ACTIVE_POLL_SECONDS` (default `30`)
- `POLL_GAME_TYPE` (default `S,R`)

Generate/update one postgame report:

```bash
python3 etl/generate_game_report.py --game-pk 831638
```

Force regenerate:

```bash
python3 etl/generate_game_report.py --game-pk 831638 --force
```

Auto-report behavior:
- During ingestion, if `abstractGameState` is `Final`, ETL auto-generates a report only if one does not already exist.

## App Development

```bash
npm run dev
```

## Testing

```bash
npm run test
npm run lint
npm run build
```

Visual regression workflow:

```bash
# one-time browser install
npx playwright install chromium

# create/update baseline
npm run test:visual:update

# compare against baseline
npm run test:visual
```

Launch and case-study assets:
- `docs/launch/demo-script.md`
- `docs/launch/case-study-template.md`
- `docs/launch/architecture-diagram.md`
- `docs/launch/publication-checklist.md`

## Guardrails
- Baseball-topic prompt gate before SQL generation
- Allowlisted semantic views only:
  - `mart_abs_events_enriched`
  - `mart_team_abs_daily`
  - `mart_umpire_abs_daily`
  - `mart_game_abs_timeline`
- `SELECT`-only policy with forbidden pattern checks
- `LIMIT` required for generated queries

## Notes
- Challenge extraction handles both:
  - `allPlays[].reviewDetails`
  - `allPlays[].playEvents[].reviewDetails`
- Team metadata is locally seeded for deterministic logos/colors.

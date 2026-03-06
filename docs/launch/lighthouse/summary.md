# Lighthouse Summary (2026-03-05)

Run command baseline:

```bash
npx lighthouse http://localhost:4010/...
```

Routes audited:
- `/`
- `/game/831739?audit=1`
- `/teams`
- `/umpires`

## Scores

| Route | Performance | Accessibility | Best Practices | SEO |
|---|---:|---:|---:|---:|
| `/` | 52 | 96 | 100 | 100 |
| `/game/831739?audit=1` | 65 | 98 | 100 | 100 |
| `/teams` | 57 | 96 | 100 | 100 |
| `/umpires` | 60 | 96 | 100 | 100 |

## Artifacts
- `home.report.html` / `home.report.json`
- `game-831739.report.html` / `game-831739.report.json`
- `teams.report.html` / `teams.report.json`
- `umpires.report.html` / `umpires.report.json`

## Notes
- Accessibility target from design plan (`>= 90`) is met on all core routes.
- Game route audited with `?audit=1` to disable live polling during static audit capture.


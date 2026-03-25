# Opening Day Status

Last updated: 2026-03-24

## Current state
- `npm run build` passes
- `npm run smoke:release` passes on the public core routes
- launch gating is in place:
  - visualizer public
  - Copilot gated
  - Query Lab gated
  - daily AI editorial not part of the public launch promise

## Public routes verified
- `/`
- `/teams`
- `/teams/138?range=season`
- `/umpires`
- `/umpires/690896?range=season`
- `/game/831945`
- `/articles`
- `/about`
- `/about/about-aibs`

## Layout sanity pass
Desktop and mobile screenshots were captured on the production build for:
- `/`
- `/teams`
- `/teams/138?range=season`
- `/umpires`
- `/umpires/690896?range=season`

Artifacts:
- `.runtime/layout-review/launch-qa-commit/`

## Performance read
- home, teams index, umpires, game, about, and articles are in a launch-usable state
- the remaining long-tail outlier is `/teams/[teamId]`
  - the page is visually usable
  - screenshots complete successfully
  - smoke passes
  - full HTML stream completion can still run long under strict `curl` timeout measurement

## Remaining known issues
1. Team detail full-stream completion is still longer than ideal.
2. `data.getGameChallenges` can still produce occasional large timing warnings and should be monitored.
3. Public article detail route is absent until the first published public article exists.

## Recommended launch posture
- proceed with the current build
- do not reopen broad optimization work
- keep the walkthrough focused on:
  - `/`
  - `/teams/138?range=season`
  - `/umpires/690896?range=season`
  - `/game/831945`
  - `/about/about-aibs`

## Immediate next steps
1. Final manual route QA on the built app.
2. Export the walkthrough clip using the routes above.
3. Prepare the first public article if article-detail needs to appear in launch materials.

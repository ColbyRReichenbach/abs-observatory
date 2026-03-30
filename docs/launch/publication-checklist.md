# Publication Checklist

## Product QA
- [x] Home, game, team, umpire pages load with production data.
- [x] Public AI scope is limited to the visualizer surfaces.
- [x] Empty/error states show retry path.
- [x] Query Lab is not part of the public launch flow.
- [x] About dossier and articles desk load successfully.

## Data QA
- [ ] Challenge counts reconcile against ABS counters.
- [ ] No duplicate challenge events in sampled games.
- [ ] Seasonal and rolling windows return expected totals.
- [ ] Daily article generation path is manually tested again after launch performance work.

## UX QA
- [x] Keyboard navigation works for major controls.
- [x] Focus visible for interactive elements.
- [x] Reduced-motion behavior verified.
- [x] Public core routes render in desktop and mobile screenshot passes.

## Visual QA
- [x] Run `npm run test:visual:update` to record baseline.
- [x] Run `npm run test:visual` and confirm no diffs.
- [x] Capture desktop + mobile screenshots for launch.
- [x] Verify `/`, `/teams`, `/teams/[teamId]`, `/umpires`, `/umpires/[umpireId]` visually on the built app.

## Launch Package
- [ ] Final demo clip exported.
- [ ] Case study draft completed.
- [ ] Architecture diagram included.
- [ ] Legal, privacy, moderation, and MLB-rights disclosures published.
- [ ] Local env and deployment env both use explicit `DATABASE_URL`.
- [ ] Final walkthrough uses only public launch-scope routes.

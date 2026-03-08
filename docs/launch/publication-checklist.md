# Publication Checklist

## Product QA
- [x] Home, game, team, umpire pages load with production data.
- [x] Copilot responses include SQL + sources + confidence.
- [x] Empty/error states show retry path.

## Data QA
- [ ] Challenge counts reconcile against ABS counters.
- [ ] No duplicate challenge events in sampled games.
- [ ] Seasonal and rolling windows return expected totals.

## UX QA
- [x] Keyboard navigation works for major controls.
- [x] Focus visible for interactive elements.
- [x] Reduced-motion behavior verified.

## Visual QA
- [x] Run `npm run test:visual:update` to record baseline.
- [x] Run `npm run test:visual` and confirm no diffs.
- [x] Capture desktop + mobile screenshots for launch.

## Launch Package
- [ ] Final demo clip exported.
- [ ] Case study draft completed.
- [ ] Architecture diagram included.
- [ ] Legal, privacy, moderation, and MLB-rights disclosures published.

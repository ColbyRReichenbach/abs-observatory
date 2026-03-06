# Acceptance Validation Notes (2026-03-05)

## Core Acceptance Checks

1. Baseball-specific visual identity:
- Home cards are mini scoreboards with challenge hashes.
- Game/team pages use team motif hero treatment with logo + motif metadata.

2. Game page challenge inspection depth:
- Select a challenge via zone or list in one interaction.
- Detail pane updates immediately with pitch/context in second interaction max.

3. Range URL persistence:
- Team and umpire pages preserve `range` in URL and navigation links.

4. Mobile strike-zone usability:
- Mobile baseline screenshots captured via Playwright (`Pixel 7` project).
- Zone remains visible and interactive without forced horizontal page scroll.

5. Accessibility threshold:
- Lighthouse accessibility >= 90 for `/`, `/game/831739?audit=1`, `/teams`, `/umpires`.
- Scores recorded in `docs/launch/lighthouse/summary.md`.

6. Reduced-motion behavior:
- Global reduced-motion media query present and tested.
- Animation durations collapse to near-zero in reduced-motion mode.


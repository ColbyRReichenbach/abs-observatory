# ABS Observatory Demo Script (3-5 min)

Opening Day scope for this script:
- public core product
- visualizer AI only
- no public Copilot walkthrough
- no Query Lab walkthrough

## Tabs to prep
- `/`
- `/teams/138?range=season`
- `/umpires/690896?range=season`
- `/game/831945`
- `/about/about-aibs`

Optional:
- `/articles`

## Walkthrough order
1. Home
- Open `/`.
- Frame AiBS as a baseball product built around ABS challenge intelligence, not a generic stats dashboard.
- Show the live/recent strip, team personalities, umpire spotlighting, and pressure-call framing.
- Keep this tight. The goal is product framing, not deep analysis.

2. Team page
- Open `/teams/138?range=season`.
- Show that the team page answers one question clearly: how does this club actually use ABS?
- Highlight:
  - hero and team identity
  - KPI row
  - trend chart
  - aggression profile
  - heatmap / inning efficiency / challenge value sections
- Use the visualizer at the bottom.

Suggested prompt:
- `What does this team's challenge profile say about pressure situations?`

3. Umpire page
- Open `/umpires/690896?range=season`.
- Position it as the officiating side of the product.
- Highlight:
  - report-card framing
  - trend and season profile sections
  - breakdown boards
  - public visualizer surface

Suggested prompt:
- `What should a team notice about this umpire's challenge tendencies?`

4. Game page
- Open `/game/831945`.
- Show that the game route is the event-level view:
  - game shell
  - challenge feed / explorer
  - leverage and challenge context
- If the game is final, frame it as postgame review.
- If live, frame it as a live challenge command center.

5. About
- Open `/about/about-aibs`.
- Use this as the credibility close:
  - product intent
  - method / model rigor
  - transparency

## What not to show
- Copilot FAB
- Query Lab
- admin routes
- internal audit tooling
- daily editorial automation internals

## Closing line
- AiBS is a public-facing ABS product that combines live baseball context, audited model layers, and lightweight AI explainability without forcing users into a generic chat workflow.

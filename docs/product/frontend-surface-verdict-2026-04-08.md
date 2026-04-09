# Frontend Surface Verdict

Date: `2026-04-08`

Purpose:

- translate the completed data/model rework into a practical frontend call
- identify which page families truly need a rework pass
- separate `must rework` from `should tune` and `leave mostly alone`

This is not a full implementation plan.
It is a product-truth alignment memo.

Related references:

- [product-source-of-truth.md](./product-source-of-truth.md)
- [page-route-coverage.md](./page-route-coverage.md)
- [../models/current-model-verdict.md](../models/current-model-verdict.md)
- [../models/publication-readiness.md](../models/publication-readiness.md)
- [../archive/model-rework/org-view-analytics-refactor.md](../archive/model-rework/org-view-analytics-refactor.md)

## Overall Verdict

AiBS does **not** need a full frontend rebuild.

It **does** need a targeted page-family pass so the product matches the current model truth:

- `fan` should continue to lead with story, drama, and inspectability
- `org` should lean harder into consequence, confidence, deployment, and postgame review quality
- live `challenge-now` should stop reading like a club-ready optimization engine in org mode

The biggest remaining issue is not visual quality.
It is truth alignment.

## Priority Buckets

### Must Rework

#### 1. Game Pages

Why:

- this is where the product makes the strongest live decision-support implication
- current org live framing still overstates how mature `challenge-now` is
- this is the page family most sensitive to the yellow/red model boundaries

Current issue:

- live org still reads too much like a real-time recommendation desk
- live fan and live org are differentiated, but the org language still implies stronger actionability than the model verdict supports

What should change:

- keep live `challenge-now` as a visible fan-facing experimental lens
- reframe live org around:
  - current state consequence
  - overturn context
  - best/worst paths
  - uncertainty/confidence
  - “what this spot means” rather than “what a club should do”
- push the strongest org framing into `final/postgame`, where retrospective decision review is actually defensible

Files most implicated:

- [game/[gamePk]/page.tsx](../../src/app/game/[gamePk]/page.tsx)
- [live-hub.tsx](../../src/components/game-hub/live-hub.tsx)
- [current-decision-card.tsx](../../src/components/game-hub/current-decision-card.tsx)
- [current-challenge-window-card.tsx](../../src/components/game-hub/current-challenge-window-card.tsx)
- [pregame-hub.tsx](../../src/components/game-hub/pregame-hub.tsx)
- [postgame-hub.tsx](../../src/components/game-hub/postgame-hub.tsx)
- [challenge-explorer.tsx](../../src/components/challenge-explorer.tsx)
- [view-mode-contract.ts](../../src/lib/view-mode-contract.ts)

### Should Tune

#### 2. Home Page

Why:

- the home page sets the product thesis
- org mode currently leans a little too much on decision-quality language that can read stronger than the evidence

Current issue:

- some org summaries feel like “best decision club / most wasteful club” judgment calls
- the page should lean more on league watch, consequence, and risk than on normative ranking language

Recommended direction:

- keep the structure
- tune org headlines and section emphasis toward:
  - watch umpire
  - consequence/value context
  - deployment pattern
  - risk and opportunity framing

Files:

- [page.tsx](../../src/app/page.tsx)
- [view-mode-contract.ts](../../src/lib/view-mode-contract.ts)

#### 3. Umpire Detail And Umpire Org Surfaces

Why:

- these pages are already close to the right product
- they now have consequence-oriented org components that match the rebuilt model stack well

Current issue:

- they can still do a better job surfacing confidence / trust boundaries
- a few legacy descriptive/fan-style patterns still feel high in the org reading order

Recommended direction:

- keep the core org structure
- make trusted vs directional reads more explicit
- ensure consequence and vulnerability lead before descriptive history

Files:

- [umpires/page.tsx](../../src/app/umpires/page.tsx)
- [umpires/[umpireId]/page.tsx](../../src/app/umpires/[umpireId]/page.tsx)

#### 4. Team Detail And Team Org Surfaces

Why:

- these are the strongest org-aligned pages in the current product
- they already emphasize decision scatter, deployment, and command-center style views

Current issue:

- mostly copy/order polish, not structural mismatch
- a few fan-style visuals still sit high enough that org mode can feel partially inherited instead of intentionally led

Recommended direction:

- keep most of the current org layout
- tighten the lead question and demote anything that feels descriptive-first
- continue to prefer:
  - expected vs realized value
  - deployment
  - late-close share
  - missed or captured opportunity framing

Files:

- [teams/page.tsx](../../src/app/teams/page.tsx)
- [teams/[teamId]/page.tsx](../../src/app/teams/[teamId]/page.tsx)

### Leave Mostly Alone

#### 5. Reports / After Action Review

Why:

- this is already one of the strongest truth-aligned product surfaces
- postgame challenge analysis is where the current modeling stack is most defensible

Suggested work:

- light wording cleanup only if needed
- no major redesign required now

Files:

- [reports/[gamePk]/page.tsx](../../src/app/reports/[gamePk]/page.tsx)
- [postgame-hub.tsx](../../src/components/game-hub/postgame-hub.tsx)

#### 6. About Pages

Why:

- these were just rewritten to reflect the new data/model truth
- they already carry the right claim boundaries

Suggested work:

- leave as-is unless product naming shifts again

Files:

- [about-articles.ts](../../src/lib/about-articles.ts)

## Product Direction Call

If we only make one product-level choice from this memo, it should be:

- `live fan` keeps the experimental challenge-now lens
- `live org` shifts from recommendation energy toward consequence and uncertainty
- `postgame org` becomes the serious home for challenge process review

That matches the current model verdict:

- `RE / WE / count-state`: strong
- `overturn`: promising
- `challenge-now live optimization`: not strong enough for org-grade action claims

## Recommended Rework Order

1. `Game page family`
2. `Home org`
3. `Umpire org`
4. `Team org`
5. everything else only if still needed

## Summary Call

Answer to the core question:

- do we need to rework pages? `yes`
- do we need a huge redesign? `no`
- should we just leave the frontend alone with tiny copy edits? `also no`

The right move is a focused frontend pass centered on truth alignment, especially on the game pages.

# Recovery Audit

Date: 2026-03-24
Branch: `profiles-community-foundation`

## Purpose

After the local workspace corruption and branch recovery, this audit checks whether the launch-critical work that was expected to exist on this branch actually persisted in the recovered tree.

## Confirmed recovery gap

### About dossier

The recovered branch had reverted to the older 5-page About set:
- `about-aibs`
- `abs-explained`
- `why-i-built-aibs`
- `architect`
- `brain`

That was a real regression, not a rendering artifact.

The About desk has now been restored to the intended dossier structure:
- `about-aibs`
- `about-me`
- `why-i-built-aibs`
- `abs-explained`
- `how-aibs-works`
- `product-layer`
- `model-layer`
- `ai-layer`
- `audits-and-monitoring`
- `sources-and-credits`

Compatibility aliases were preserved through:
- `architect` -> `product-layer`
- `brain` -> `model-layer`

## Checked and present

### Launch gating
- `src/lib/launch-config.ts`
- public visualizer enabled
- public Copilot disabled
- public Query Lab disabled
- public daily AI editorial disabled by default
- public weekly editorial enabled

Supporting route wiring present:
- `src/app/layout.tsx`
- `src/app/query/page.tsx`
- `src/lib/welcome-tour.ts`

### Articles desk split
- `src/lib/articles-desk.ts`
- `The Daily Lead`
- `The Weekly Rotation`
- weekly author defaulting to `Colby Reichenbach`

### Editorial automation
- `src/lib/server/editorial-automation.ts`
- `src/lib/server/cron-auth.ts`
- `src/app/api/cron/editorial-daily/route.ts`
- `vercel.json`

### AI usage and feedback tracking
- `ai.usage_ledger` present in `db/schema.sql`
- `ai.generation_events` present in `db/schema.sql`
- visualizer surface usage wiring present
- article/report generation event tracking present

### Model audits and alerts
- `scripts/model-audits/run-all-audits.mjs`
- `scripts/model-audits/run-abs-product-qa.mjs`
- `scripts/model-audits/evaluate-alerts.mjs`
- `src/lib/server/model-audit-alerts.ts`
- admin AI / model analytics surfaces remain present

### ABS geometry and player profile work
- `src/lib/zone-model.ts`
- `etl/player_abs_profiles.py`

### Repo-integrity and release guardrails
- `scripts/repo-integrity.mjs`
- `.nvmrc`
- `verify:repo` script in `package.json`

## Result

Only one clear recovery regression was confirmed during this pass:
- the About dossier content and shell framing

That gap has been restored.

The rest of the major launch-critical systems checked in this audit were present in the recovered branch.

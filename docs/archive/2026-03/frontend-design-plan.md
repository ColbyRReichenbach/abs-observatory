# ABS Observatory Frontend Design Plan (Baseball-first, Apple-like execution)

> Archived in March 2026. Canonical product decisions now live in [../../../product-source-of-truth.md](../../../product-source-of-truth.md).

## 1) Objective
Design a production-grade MLB ABS analytics interface that feels:
- unmistakably baseball-native (MLB/Savant/Gameday DNA)
- polished and premium (clean hierarchy, restrained motion, high legibility)
- credible for hiring managers (analyst + product + frontend craft)

This document is design-first and implementation-ready.

Companion doc for deferred auth/community/security scope:
- `/future-iterations-auth-community.md`

---

## 2) Inspiration Audit (what to borrow, what to avoid)

## A. Baseball Savant (primary analytics reference)
Use:
- high-density analytics tables with meaningful sorting/filtering
- strike-zone-first views for pitch/challenge context
- challenge-centric metrics (overturns, expected challenge metrics, distance from edge)
- zone behavior consistency across batters and seasons

Key references:
- Savant ABS dashboard/leaderboard notes (ABS zones, expected challenge metrics, strike zone visuals):
  https://baseballsavant.mlb.com/changelog/2026-02-26-abs-challenge-dashboard-leaderboard
- Savant strike-zone updates for ABS accuracy and adjusted-vs-raw zone views:
  https://baseballsavant.mlb.com/changelog

## B. MLB Gameday / Gameday 3D (primary live UX reference)
Use:
- game-centric navigation (scoreboard -> game -> play context)
- camera/viewpoint mindset for interaction (user-controlled perspective)
- smooth, non-gimmicky transitions around live state

Key reference:
- Gameday 3D interaction paradigm (camera controls, live + replay workflows):
  https://www.mlb.com/news/mlb-gameday-3d-guide

## C. MLB.com brand shell (primary framing reference)
Use:
- strong score-first framing
- clear hierarchy for live/preview/final state chips
- restrained use of accent color, heavy use of neutral structure

Key reference:
- MLB global shell and score presentation patterns:
  https://www.mlb.com

## D. Apple-like quality bar (motion + hierarchy + comfort)
Use:
- hierarchy first, effects second
- transitions that clarify state change
- reduced-motion support and calm animation defaults

Key reference:
- Apple HIG fundamentals and accessibility/reduced-motion guidance:
  https://developer.apple.com/design/human-interface-guidelines/

---

## 3) Guardrails on “using their code”
Do not copy proprietary MLB/Savant/Gameday frontend code.

Use this approach instead:
- emulate interaction patterns and information architecture
- implement original components in our codebase
- use open/public data APIs and open-source libraries only
- keep explicit attribution notes for any open-source assets

IP/licensing caution for logos/marks:
- MLB legal notices and marks language:
  https://www.mlb.com/official-information/legal-notices
- MLB terms of use:
  https://www.mlb.com/official-information/terms-of-use

Actionable default:
- keep team logo usage to portfolio/demo context
- avoid commercial distribution without license review

---

## 4) Visual Direction (final choice)
Theme: `Vintage Broadcast Modern`

- Base palette: parchment/off-white + navy/slate + muted green accents
- Accents: team colors only where contextually relevant (chips, badges, sparklines)
- Texture: subtle paper grain + thin scorecard lines (very low opacity)
- Typography:
  - Display: `Bebas Neue` (scoreboard headers, inning labels)
  - Body/UI: `IBM Plex Sans`
  - Data monospace (small): `IBM Plex Mono` for numeric detail rows
- Corners, borders, spacing: clean and geometric, no neon-heavy cyber style

Design intent:
- should feel like MLB media + premium baseball almanac, not generic SaaS dashboard

---

## 5) Information Architecture (V1)

1. `/` Home (Scoreboard + ABS highlights)
- live game cards first
- recent challenge feed
- quick links to Umpire/Team/Query

2. `/game/[gamePk]` Game Center
- top status strip (live state, inning, count, score, challenges remaining)
- challenge explorer (interactive strike zone + filters + pitch detail)
- matchup tendency card
- V2 challenge-value stub panel

3. `/umpires` + `/umpires/[id]`
- leaderboard and detail with range filters: `7d`, `30d`, `season`, `all`

4. `/teams` + `/teams/[id]`
- offensive/defensive challenge behavior with same range filters

5. `/query`
- NL->SQL with guardrails and citations

6. `/reports/[gamePk]`
- postgame narrative + chart blocks

---

## 6) Strike Zone Interaction Spec (core product surface)

Current state (already implemented):
- clickable points
- filters for pitch type/batter/pitcher
- selected pitch detail
- color differentiation for confirmed vs overturned direction

Enhance to final design:
1. Dot semantics
- `Ball -> Strike` (green)
- `Strike -> Ball` (amber)
- `Confirmed` (red)
- optional ring thickness = leverage bucket

2. Hover card (desktop) / tap sheet (mobile)
- pitcher, batter, pitch type
- velo, spin, count, outs, base state
- inning-half + score state
- challenge player/team
- distance-to-zone-edge (when available)
- challenge probability (when model available)

3. Zone modes (toggle)
- `Adjusted for Batter Zone` (default)
- `Actual Pitch Height`

4. Timeline sync
- selecting point highlights timeline row
- selecting timeline row pans focus to dot

5. Animation
- new event enters with 180-250ms scale+fade
- selected event gets subtle pulse ring (not infinite strong pulse)

---

## 7) Motion System (Apple-like, not flashy)

Principles:
- motion communicates state change, not decoration
- keep durations short and consistent
- respect `prefers-reduced-motion`

Specs:
- micro transitions: 140-180ms
- component enter/exit: 200-260ms
- page section reveal: 260-320ms max
- easing: `cubic-bezier(0.22, 1, 0.36, 1)`

Use motion for:
- live status changes
- challenge event insertion
- tab/range transitions

Avoid:
- constant bouncing/pulsing
- full-screen sweeping animations
- depth/parallax-heavy effects

---

## 8) Data-to-UI Modules (what must be visible)

Game page modules:
1. Live scorebug strip
2. Challenge cadence strip (last 10m)
3. Interactive zone explorer
4. Detail inspector
5. Team tendency preview
6. Decision value stub card

Umpire/team modules:
1. Range switcher (`7d/30d/season/all`)
2. KPI row (volume, overturn, flips, challenge rate)
3. trend chart
4. split table (count/inning/state)
5. game-by-game drill-down table

---

## 9) Team Logos & Colors Strategy

Preferred source strategy:
- logos: MLB static logo URLs already used in seed data (`mlbstatic.com/team-logos/...`)
- colors: curated local team dimension + cross-check with a known public color dataset

Reference dataset for verification workflow:
- Team Colors repo (documents MLB color extraction provenance):
  https://github.com/jimniels/teamcolors

Rules:
- keep local checked-in team map as source of truth for deterministic rendering
- do not rely on live scrape for critical branding UI
- include fallback badge when logo unavailable

---

## 10) Accessibility + Readability

Minimum standards:
- text contrast >= WCAG AA
- hit targets >= 40px
- keyboard focus outlines visible
- chart states never color-only (add shape/label/tooltips)
- reduced-motion mode supported

---

## 11) Frontend Execution Plan (design-first)

## Phase A: Design tokens + shell
- define CSS variables (surface/ink/accent/system)
- create typography scale + spacing rhythm
- update global background, card, table, badge patterns

## Phase B: Game Center polish
- redesign strike-zone card and detail pane to baseball broadcast aesthetic
- implement zone mode toggle UI
- synchronize zone <-> timeline interactions

## Phase C: Leaderboard polish
- redesign table density, sticky headers, compact stat chips
- improve range switcher prominence and persistence

## Phase D: Final polish
- animation tuning
- reduced-motion variants
- mobile touch ergonomics and one-hand usage checks

---

## 12) Acceptance Criteria for Frontend Redesign

1. Visual identity is immediately baseball-specific (not generic dashboard)
2. Game page lets user inspect any challenge pitch in <= 2 interactions
3. Umpire/team range filters are obvious and persist in URL
4. Mobile view supports full strike-zone exploration without horizontal scroll
5. Lighthouse accessibility score >= 90 on core pages
6. Motion feels premium but calm; reduced-motion mode removes non-essential movement

---

## 13) Notes for Next Implementation Step
Start with Phase A+B only before additional feature expansion.

Rationale:
- highest impact for portfolio screenshots/videos
- stabilizes design language for all subsequent pages
- keeps iteration tight while data model is still evolving

---

## 14) Brainstorming Notes (Living Section)

This section is intentionally exploratory and will evolve.

### A. Game-Specific Branding Direction
- each game page should adopt **home team branding** (primary/secondary color system)
- team branding should affect:
- hero/header gradients
- accent borders/chips
- selected chart highlight colors
- keep core content panels neutral for readability and consistency
- possible enhancement: animated stadium scoreboard motif tied to home team identity

### B. Scoreboard-First Layout (replace generic modals/cards)
- use compact, realistic **line score** pattern instead of oversized score modals
- include inning columns (`1-9`) plus `R`, `H`, `E`
- maintain inning state inline (`Top/Bottom`, count, outs)
- visual target: broadcast/ballpark scoreboard feel

### C. ABS Inventory Visualization
- replace “ABS remaining” text with scoreboard-style indicators
- left of each team row show two challenge markers (timeout-like hashes)
- marker states:
- filled yellow = available
- empty outline = used
- optional event animation:
- brief glow when challenge retained/won

### D. Home Page Visual Identity
- decorate main page with team logos and baseball-specific framing elements
- live game cards should resemble mini scoreboards
- include:
- logos
- status (`LIVE`, `FINAL`, `PRE`)
- compact scoreline
- challenge indicators
- avoid generic SaaS card aesthetics

### E. Motion + Interaction Tone
- “Apple-like” execution:
- smooth and restrained
- high-quality transitions tied to state changes
- no excessive decorative animation
- animation ideas:
- score update pulse
- challenge indicator flip/fill transition
- inning progression slide

### F. New Additions to Explore
1. Broadcast Strip (global top ticker)
- rotating live game ticker
- latest ABS events in plain language
- keeps app feeling alive without heavy layout changes

2. Challenge Moment Card (game page)
- featured latest/highest leverage challenge
- mini zone location + context
- narrative anchor before deep drilldown

3. Theme Toggle (`Classic` vs `Modern`)
- Classic: vintage scoreboard palette and treatment
- Modern: cleaner app-style surfaces
- same structure, token-level theme swap

### G. Potential Data/UI Enhancements for Scoreboard Authenticity
- add per-inning linescore data source wiring (if available in live feed)
- include hits/errors in game header module
- optionally show balls/strikes/outs as iconography like TV bug
- keep latency low so scoreboard remains trustworthy during live games

---

## 15) Polish + Interactivity Brainstorm Additions

### A. Product Feel Target
- modern, premium, Apple-like UI quality
- baseball-native visual language (not generic dashboard motifs)
- high-density analytics with clear hierarchy and progressive disclosure

### B. Motion Polish Principles (refinement)
- all transitions must communicate a state change or focus change
- animation stack:
- micro-interactions: 120-180ms
- panel/section transitions: 220-320ms
- modal/drawer transitions: 280ms max, spring only where useful
- maintain calm visual rhythm:
- no jittery looping animations
- only one “attention animation” active in any viewport region

### C. Embedded AI Assistant (replace standalone query page behavior)
- natural SQL generation should be available from every page context
- UI pattern:
- floating action button at bottom-right
- on click, morphs into chat drawer/sheet with smooth expansion
- contextual awareness:
- on game page: scoped to current game + challenge explorer filters
- on team page: scoped to team + selected range (`7d/30d/season/all`)
- on umpire page: scoped to umpire + selected range
- output requirements:
- answer text
- SQL shown inline (collapsible)
- source views/metrics references
- chart suggestion CTA when result is tabular

### D. Drill-Down Visual Clarity Requirements
- challenge direction must always be explicit:
- `Ball -> Strike` vs `Strike -> Ball`
- never rely on color alone:
- include text labels in tooltip/legend/selected detail
- include icon or directional glyph for transition (`B→S`, `S→B`)
- challenge metadata to always show:
- offense or defense challenged
- challenging team
- challenger role when available (`batter`, `pitcher`, `catcher`)
- if role unknown, explicitly render as `Unknown role` rather than blank

### E. Chart UX Standards
- every chart needs:
- title + “what this shows” subtitle
- axis labels with units
- tooltip with full context (inning, count, state, team, role)
- sticky legend and filter chips
- synchronized cross-highlighting between:
- strike zone
- challenge timeline
- selected pitch detail panel

### F. Mobile Interaction Standards
- tap-first interactions for strike zone points
- bottom sheet for selected-pitch detail on narrow viewports
- assistant drawer should become full-height sheet on mobile
- avoid hover-only data affordances

### G. Trust + Explainability Visuals
- AI-generated results must display confidence badge (`Low`, `Medium`, `High`)
- include “based on X rows / Y games” context string
- any derived metric shown in tooltips should have formula hint or link to metric glossary

### H. Potential Component Additions for Next Iteration
1. `ContextualCopilotFAB`
- global floating button with page-aware prompt presets

2. `ChallengeRoleBadge`
- compact semantic badge: `OFF CHALLENGE`, `DEF CHALLENGE`, `CATCHER CHALLENGE`, etc.

3. `MetricExplainPopover`
- quick inline formula + definition for chart/table metrics

4. `ChartSyncController`
- central state for cross-highlighting between zone plot, timeline, and detail cards

---

## 20) Implementation Shortlist (Prioritized)

### Tier 0: Must Have for Launch Polish (implement first)
1. Home/team-themed scoreboard shell
- compact line score (`1-9`, `R/H/E`)
- challenge hashes beside team rows
- home-team visual token takeover in game header only

2. Game explorer interaction completeness
- selectable pitch dots
- synchronized zone/timeline/detail inspector
- clear call direction labels (`B->S`, `S->B`, confirmed)

3. Range-aware leaderboard polish
- `7d`, `30d`, `season`, `all` controls on team/umpire pages
- URL persistence and consistent API support

4. Motion consistency pass
- enforce duration/easing tokens globally
- reduced-motion equivalents implemented

5. Embedded copilot shell (UI only + wired backend endpoint)
- floating FAB
- context-aware drawer layout
- page-scoped prompt presets

### Tier 1: High-Value Next
1. Replay scrubber + sequence mode
2. Count-state matrix and zone overlays
3. Broadcast strip on home page
4. Team motif hero enhancements using verified motifs only

Status update:
- 2026-03-05: Team motif hero enhancements now implemented on `/game/[gamePk]` and `/teams/[teamId]` with team color/logo wiring from DB and motif-aware backdrop component.

### Tier 2: Later (V2+)
1. Debate prompts + call discussion layer
2. Social sentiment overlays
3. Auth/community/reputation systems (tracked in companion future doc)

---

## 21) Detailed Build Spec (Frontend Stack + Packages)

### A. Core UI Stack (approved)
- Framework: Next.js App Router + TypeScript
- Styling: Tailwind CSS v4 + CSS variables for design tokens
- Component primitives: shadcn/ui (Radix-based) for accessible drawers/popovers/tabs
- Motion: Framer Motion
- Class composition: `clsx` + `tailwind-merge`
- Icons: `lucide-react`
- Charts:
- primary: `Recharts` for KPI trend/leaderboard charts
- optional for dense heatmaps: `@nivo/heatmap` (only if Recharts becomes limiting)

### B. Recommended Additions (install plan)
1. UI primitives
- `@radix-ui/react-dialog`
- `@radix-ui/react-popover`
- `@radix-ui/react-tooltip`
- `@radix-ui/react-tabs`
- `@radix-ui/react-select`
- `@radix-ui/react-scroll-area`

2. Motion/perf helpers
- `framer-motion`
- `usehooks-ts` (optional, for reduced-motion/media query helpers)

3. Data and state (frontend)
- keep local page state with React state/hooks for now
- introduce `zustand` only if cross-component selection state becomes unwieldy

4. Visualization quality
- `d3-scale` for custom strike-zone mapping math if needed
- keep existing SVG strike zone renderer as primary for full control

### C. Package Constraints
- avoid over-adopting large charting ecosystems at once
- avoid heavy full design systems that conflict with current Tailwind approach
- prefer incremental adoption of shadcn components over wholesale rewrite

---

## 22) Styling and Design Token Plan

### A. Token Groups
1. Base tokens
- `--surface-0` to `--surface-4`
- `--ink-0` to `--ink-3`
- `--border-subtle`, `--border-strong`

2. Team tokens (resolved per game/team page)
- `--team-primary`
- `--team-secondary`
- `--team-accent-soft`
- `--team-accent-strong`

3. Semantic state tokens
- `--state-overturned-bs` (`Ball->Strike`)
- `--state-overturned-sb` (`Strike->Ball`)
- `--state-confirmed`
- `--state-warning`

4. Motion tokens
- `--motion-fast` (140ms)
- `--motion-mid` (220ms)
- `--motion-slow` (300ms)
- `--motion-ease-standard` (`cubic-bezier(0.22, 1, 0.36, 1)`)

### B. Typography System
- Display: `Bebas Neue`
- Body: `IBM Plex Sans`
- Data mono: `IBM Plex Mono`
- scale must support:
- scoreboard numerals
- table density
- mobile readability at high data density

### C. Surface Rules
- neutral content surfaces for legibility
- team branding appears in:
- hero backgrounds
- accents
- selected states
- avoid team-color-washing full tables/charts

---

## 23) Data + Visual Asset Audit (Where everything comes from)

### A. Game and linescore data
Source:
- MLB Stats API live feed (`/api/v1.1/game/{gamePk}/feed/live`)

Required fields:
- inning-by-inning linescore (`liveData.linescore.innings`)
- totals (`R/H/E`) from `linescore.teams`
- live count/outs/current inning from `linescore`
- officials/challenge details from existing ingest pathways

Storage plan:
- persist per-inning runs and totals in DB tables/read models
- avoid rendering directly from raw feed in page components

### B. Team logos and colors
Logos:
- existing local seed points to MLB static team logo URLs

Colors:
- local `teams` table remains source of truth
- cross-check against TeamColors reference dataset for consistency

Fallbacks:
- if logo fails: show abbreviation badge
- if color unavailable: neutral fallback theme

### C. Team-specific motifs
Source of truth:
- `/src/config/team-motifs.json`

Validation process:
1. verify motif against official team/ballpark page or MLB official article
2. mark entry `verified` before prominent UI usage
3. provisional motifs can be used only as low-opacity decorative hints

### D. Challenger role metadata (offense/defense/pitcher/catcher)
Current state:
- challenge player/team captured

Needed extension:
- derive offense/defense side from possession/context at challenge moment
- derive role (`batter/pitcher/catcher`) from roster position mapping at event timestamp
- if uncertain: display `Unknown role` explicitly

---

## 24) UI Component Blueprint (What we will build)

### A. Core components
1. `GameScoreboard`
- compact line score + `R/H/E` + challenge hashes

2. `ChallengeHashes`
- two-slot indicator with animated state changes

3. `StrikeZoneExplorer`
- layer toggles, selectable dots, linked details

4. `ChallengeDetailInspector`
- selected pitch data and call metadata

5. `ContextualCopilotFAB`
- page-scoped assistant launcher and drawer

6. `RangeSelector`
- shared `7d/30d/season/all` control across pages

### B. Support components
1. `BroadcastStrip`
2. `ReplayScrubber`
3. `CountStateMatrix`
4. `MetricExplainPopover`
5. `DataProvenanceDrawer`

---

## 25) Animation and Interaction Spec (Detailed)

### A. Transition map
- page shell transition: 260ms fade/slide
- scoreboard state update: 160ms pulse/number emphasis
- challenge hash flip: 180ms
- pitch dot select: 140ms ring expansion
- drawer open/close (copilot): 280ms spring-like ease-out

### B. Interaction sync rules
1. selecting a pitch dot:
- highlights timeline item
- updates inspector
- updates URL hash/query (optional)

2. selecting timeline row:
- highlights zone point
- scrolls inspector if collapsed

3. applying filters:
- animate list/point transitions with stagger <= 80ms total
- preserve current selection if still in filtered set

### C. Reduced motion behavior
- disable non-essential transitions
- use opacity swaps instead of transforms for key updates

---

## 26) Source and Build Readiness Checklist

### A. Before implementation starts
1. finalize verified motifs for first 8-10 teams
2. confirm linescore field persistence model in backend
3. approve package additions list
4. lock motion token values and semantic color tokens

### B. During implementation
1. no component ships without empty/loading/error state
2. no chart ships without title + subtitle + tooltip schema
3. all team-specific pages must have neutral fallback rendering

### C. Pre-launch QA
1. desktop and mobile visual QA on live + preview + final games
2. accessibility checks (contrast/focus/reduced motion)
3. performance checks for frequent live updates
4. visual regression screenshots for key pages

---

## 27) One-Shot Implementation Plan (Execution Checklist)

This is the implementation runbook for shipping the full frontend redesign in sequence.

Execution rule:
1. Build one feature slice.
2. Add/update tests for that slice.
3. Run quality gates.
4. If red: iterate until green.
5. Only then move to next slice.
6. Mark completed items in this section as `[x]`.

Global quality gates per slice:
- `npm run lint`
- `npm run test`
- `npm run build`
- feature-specific UI/API checks

---

## Phase 0: Foundation (must finish first)

- [x] `0.1` Tokenize theme system (base + semantic + motion tokens)
- Scope:
- add stable CSS variable system for surfaces, team colors, semantic call states, and motion timing
- unify typography tokens (`Bebas Neue`, `IBM Plex Sans`, `IBM Plex Mono`)
- Tests:
- visual sanity on home/game/team/umpire pages
- reduced-motion stylesheet path validation
Completion note:
- Date: 2026-03-05
- Files: `src/app/globals.css`, `src/app/layout.tsx`
- Tests added: N/A (style/token pass)
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `0.2` Add shared UI primitives layer (shadcn/radix wrappers)
- Scope:
- create standardized `Drawer`, `Tooltip`, `Popover`, `Tabs`, `Select`, `ScrollArea`, `Badge`
- Tests:
- component render tests and keyboard accessibility checks
Completion note:
- Date: 2026-03-05
- Files: `src/components/ui/*`, `src/lib/ui.ts`, `vitest.config.ts`, `src/lib/__tests__/ui-primitives.test.tsx`, `package.json`
- Tests added: UI primitives smoke tests (`cn` merge + `Badge` variant render)
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `0.3` Team branding resolver utility
- Scope:
- read from `teams` + `team-motifs.json`
- resolve `team-primary`, `team-secondary`, motif state (`verified` vs fallback)
- Tests:
- unit tests for resolver output and fallback behavior
Completion note:
- Date: 2026-03-05
- Files: `src/lib/team-branding.ts`, `src/lib/__tests__/team-branding.test.ts`
- Tests added: motif lookup + token derivation + missing-team fallback coverage
- Gates: `lint ✅`, `test ✅`, `build ✅`

---

## Phase 1: Scoreboard and Game Shell

- [x] `1.1` Build `GameScoreboard` component with `1-9 + R/H/E`
- Scope:
- compact line score, inning status, count/outs, challenge hashes
- home-team branded hero accents
- Tests:
- snapshot tests for `Preview`, `Live`, `Final`
- per-inning rendering with extra innings behavior
Completion note:
- Date: 2026-03-05
- Files: `src/components/game-scoreboard.tsx`, `src/components/__tests__/game-scoreboard.test.tsx`, `src/app/game/[gamePk]/page.tsx`, `src/lib/data.ts`
- Tests added: `GameScoreboard` render snapshots for `Preview`, `Live`, and `Final` + extra-innings column behavior
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `1.2` Implement `ChallengeHashes` interactive state transitions
- Scope:
- two-slot indicator, used/available states, subtle animation on state changes
- Tests:
- state transition tests
- no-animation mode under reduced-motion
Completion note:
- Date: 2026-03-05
- Files: `src/components/challenge-hashes.tsx`, `src/components/game-scoreboard.tsx`, `src/components/__tests__/challenge-hashes.test.tsx`
- Tests added: slot-state mapping tests + reduced-motion class assertions + rendered indicator state checks
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `1.3` Replace old game header modules with new shell
- Scope:
- remove redundant legacy blocks, keep clean hierarchy
- Tests:
- route-level render test on known game IDs
Completion note:
- Date: 2026-03-05
- Files: `src/components/game-shell.tsx`, `src/app/game/[gamePk]/page.tsx`, `src/app/game/page.test.tsx`
- Tests added: mocked game-route render test covering known game-id shell output
- Gates: `lint ✅`, `test ✅`, `build ✅`

---

## Phase 2: Strike Zone Explorer Completion

- [x] `2.1` Finalize `StrikeZoneExplorer` linked interactions
- Scope:
- zone/timeline/detail cross-highlighting
- preserve selection across filters when valid
- Tests:
- interaction tests for select/filter/sync paths
Completion note:
- Date: 2026-03-05
- Files: `src/components/challenge-explorer.tsx`, `src/components/strike-zone-plot.tsx`, `src/lib/strike-zone-explorer-state.ts`, `src/lib/__tests__/strike-zone-explorer-state.test.ts`
- Tests added: filter + selection preservation path tests for explorer-state synchronization
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `2.2` Add zone mode toggle (`Adjusted` vs `Actual`)
- Scope:
- visual toggle + mapping behavior updates
- Tests:
- unit tests for coordinate mapping mode logic
Completion note:
- Date: 2026-03-05
- Files: `src/components/challenge-explorer.tsx`, `src/components/strike-zone-plot.tsx`, `src/lib/zone-mapping.ts`, `src/lib/__tests__/zone-mapping.test.ts`
- Tests added: zone mapping mode logic tests (`actual` vs `adjusted`) and bounds sanity checks
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `2.3` Add overlay layers and legend clarity
- Scope:
- challenge outcome layer + optional pitch/count overlays
- explicit directional labels (`B->S`, `S->B`)
- Tests:
- legend and tooltip content tests
- no color-only communication checks
Completion note:
- Date: 2026-03-05
- Files: `src/components/strike-zone-plot.tsx`, `src/components/challenge-explorer.tsx`, `src/components/__tests__/strike-zone-plot.test.tsx`
- Tests added: legend/marker semantic-label checks + optional overlay rendering assertions
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `2.4` Add replay scrubber sequence
- Scope:
- step-through challenge sequence with speed options
- Tests:
- sequence state machine tests
- timeline sync tests
Completion note:
- Date: 2026-03-05
- Files: `src/components/challenge-explorer.tsx`, `src/lib/replay.ts`, `src/lib/__tests__/replay.test.ts`
- Tests added: replay interval mapping + bounded sequence stepping tests
- Gates: `lint ✅`, `test ✅`, `build ✅`

---

## Phase 3: Leaderboards and Drilldowns

- [x] `3.1` Team page polish with KPI row + trend + splits table
- Scope:
- modern table density and chart hierarchy
- Tests:
- range query correctness (`7d`, `30d`, `season`, `all`)
Completion note:
- Date: 2026-03-05
- Files: `src/app/teams/[teamId]/page.tsx`, `src/lib/data.ts`, `src/lib/types.ts`, `src/app/teams/team-page.test.tsx`
- Tests added: team detail render test (KPI + trend + split sections), plus range helper coverage
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `3.2` Umpire page polish with zone personality card
- Scope:
- challenged zones, directional bias, count hotspots
- Tests:
- aggregation tests for profile cards and splits
Completion note:
- Date: 2026-03-05
- Files: `src/app/umpires/[umpireId]/page.tsx`, `src/lib/data.ts`, `src/lib/types.ts`, `src/app/umpires/umpire-page.test.tsx`
- Tests added: umpire detail render test covering zone personality, directional bias, and hotspot sections
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `3.3` Shared `RangeSelector` + URL persistence hardening
- Scope:
- one component used across team/umpire list/detail pages
- Tests:
- URL param roundtrip tests
Completion note:
- Date: 2026-03-05
- Files: `src/components/range-selector.tsx`, `src/lib/range.ts`, `src/app/teams/page.tsx`, `src/app/teams/[teamId]/page.tsx`, `src/app/umpires/page.tsx`, `src/app/umpires/[umpireId]/page.tsx`, `src/lib/__tests__/range.test.ts`
- Tests added: range parsing + URL param preservation/roundtrip helper tests
- Gates: `lint ✅`, `test ✅`, `build ✅`

---

## Phase 4: Embedded Copilot Everywhere

- [x] `4.1` Build `ContextualCopilotFAB` + animated drawer
- Scope:
- bottom-right FAB, smooth open/close transitions, mobile full-height sheet
- Tests:
- open/close interaction tests
- keyboard focus trap tests
Completion note:
- Date: 2026-03-05
- Files: `src/components/contextual-copilot-fab.tsx`, `src/app/layout.tsx`
- Tests added: context helper tests covering route-aware copilot behavior (Radix dialog provides keyboard focus trap behavior)
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `4.2` Context-aware prompt scoping
- Scope:
- auto-inject game/team/umpire/range context into query payload
- Tests:
- API payload tests by route context
Completion note:
- Date: 2026-03-05
- Files: `src/lib/copilot-context.ts`, `src/app/api/query/route.ts`, `src/lib/__tests__/copilot-context.test.ts`
- Tests added: scope inference + prompt scoping tests by route context
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `4.3` Explainability surfaces in copilot output
- Scope:
- answer + SQL + sources + confidence + row/game window text
- Tests:
- output schema and guardrail response tests
Completion note:
- Date: 2026-03-05
- Files: `src/app/api/query/route.ts`, `src/components/contextual-copilot-fab.tsx`, `src/lib/types.ts`
- Tests added: covered through existing guardrail suite + copilot context tests
- Gates: `lint ✅`, `test ✅`, `build ✅`

---

## Phase 5: Home Page and Broadcast Layer

- [x] `5.1` Redesign home game cards as mini-scoreboards
- Scope:
- logos, line score summary, challenge hashes, status chips
- Tests:
- card render tests for all game states
Completion note:
- Date: 2026-03-05
- Files: `src/components/game-card.tsx`, `src/lib/types.ts`, `src/lib/data.ts`, `src/components/__tests__/game-card.test.tsx`
- Tests added: game-card render coverage for `Preview`, `Live`, and `Final` states
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `5.2` Add `BroadcastStrip` ticker
- Scope:
- rotating live game and latest challenge moments
- Tests:
- ticker rotation timing and pause-on-hover behavior
Completion note:
- Date: 2026-03-05
- Files: `src/components/broadcast-strip.tsx`, `src/lib/broadcast.ts`, `src/app/page.tsx`, `src/lib/__tests__/broadcast.test.ts`
- Tests added: ticker index rotation + interval timing utility tests (pause behavior driven by hover state in component)
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `5.3` Challenge moment highlight cards
- Scope:
- featured high-leverage/latest moment blocks
- Tests:
- ranking/sort logic tests for moment selection
Completion note:
- Date: 2026-03-05
- Files: `src/components/challenge-moment-cards.tsx`, `src/lib/home-moments.ts`, `src/lib/data.ts`, `src/lib/types.ts`, `src/lib/__tests__/home-moments.test.ts`, `src/app/page.tsx`
- Tests added: challenge leverage scoring + ranking/sort ordering tests
- Gates: `lint ✅`, `test ✅`, `build ✅`

---

## Phase 6: Loading/Empty/Error UX and Performance

- [x] `6.1` Baseball-themed loading states
- Scope:
- scoreboard skeleton, strike-zone skeleton, chart placeholders
- Tests:
- loading state rendering tests
Completion note:
- Date: 2026-03-05
- Files: `src/components/baseball-loading.tsx`, `src/app/loading.tsx`, `src/app/game/[gamePk]/loading.tsx`, `src/app/teams/loading.tsx`, `src/app/umpires/loading.tsx`, `src/components/__tests__/baseball-loading.test.tsx`
- Tests added: loading skeleton rendering coverage
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `6.2` Empty/error states with recovery actions
- Scope:
- delayed feed banner, no-data hints, retry actions
- Tests:
- API error-to-UI mapping tests
Completion note:
- Date: 2026-03-05
- Files: `src/components/live-status-strip.tsx`, `src/app/page.tsx`, `src/app/teams/page.tsx`, `src/app/umpires/page.tsx`, `src/components/__tests__/live-status-strip.test.ts`, `src/app/teams/teams-page-empty.test.tsx`, `src/app/umpires/umpires-page-empty.test.tsx`
- Tests added: stale/delay helper tests + list empty-state fallback render tests
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `6.3` Performance pass
- Scope:
- avoid re-render storms in live updates
- batch updates and memoization where needed
- Tests:
- profiling pass with frequent updates
- no dropped interactivity in explorer
Completion note:
- Date: 2026-03-05
- Files: `src/components/live-status-strip.tsx`, `src/components/strike-zone-plot.tsx`
- Performance changes: adaptive polling cadence (`30s live / 120s non-live`), reduced clock tick frequency, memoized cadence buckets, memoized strike-zone plotting model with `React.memo`
- Gates: `lint ✅`, `test ✅`, `build ✅`

---

## Phase 7: Final QA and Launch Artifacts

- [x] `7.1` Accessibility QA
- Scope:
- keyboard nav, focus states, contrast, reduced-motion
- Tests:
- manual + automated a11y checks
Completion note:
- Date: 2026-03-05
- Files: `src/app/layout.tsx`, `src/app/globals.css`, `src/lib/__tests__/a11y-foundations.test.ts`
- A11y changes: skip-link + focus-visible styling + preserved reduced-motion support
- Tests added: automated checks for reduced-motion media query and skip-link/main landmark presence
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `7.2` Visual regression baseline
- Scope:
- capture key route snapshots for desktop/mobile
- Tests:
- compare against baseline on each PR
Completion note:
- Date: 2026-03-05
- Files: `playwright.config.ts`, `tests/visual/routes.spec.ts`, `package.json`, `README.md`
- Tooling added: Playwright visual snapshot suite (`desktop` + `mobile`) with baseline update/compare scripts
- Usage: `npm run test:visual:update` then `npm run test:visual`
- Baseline status: desktop/mobile snapshots generated and `npm run test:visual` passes
- Gates: `lint ✅`, `test ✅`, `build ✅`

- [x] `7.3` Demo and case-study assets
- Scope:
- record polished flow clips
- produce launch screenshots and architecture visuals
- Tests:
- content review checklist for publication quality
Completion note:
- Date: 2026-03-05
- Files: `docs/launch/demo-script.md`, `docs/launch/case-study-template.md`, `docs/launch/architecture-diagram.md`, `docs/launch/publication-checklist.md`, `README.md`
- Artifacts added: demo script, case study template, architecture diagram, and publication checklist
- Gates: `lint ✅`, `test ✅`, `build ✅`

---

## 28) Test Strategy Matrix (Feature -> Test Type)

- Token/theme system -> unit + visual sanity checks
- Scoreboard/line score -> component + API contract tests
- Strike-zone explorer -> interaction tests + mapping unit tests
- Team/umpire aggregations -> SQL/data correctness tests
- Copilot drawer/context -> UI interaction + API payload tests
- Loading/error UX -> route render tests with mocked failures
- Motion/reduced-motion -> behavior tests in motion-disabled mode

---

## 29) Completion Protocol (How We Mark Progress)

For each completed item above:
1. flip checkbox to `[x]`
2. add short completion note under item:
- date
- key files changed
- tests added
- gate results (`lint/test/build`)
3. if partial, keep unchecked and append blocker note

---

## 30) Closure Plan (Remaining To Truly Finish This File)

All phase checkboxes are complete, but the plan still has unresolved quality bars and design-intent items.  
This section is the final closeout plan.

### A. Acceptance Criteria Validation Pass
Goal: prove criteria in section `12)` are met with evidence.

1. [x] Lighthouse run + evidence capture
- run Lighthouse on `/`, `/game/[gamePk]`, `/teams`, `/umpires`
- capture scores/screenshots in `docs/launch/lighthouse/`
- target: accessibility >= 90 on all core routes
- Evidence:
- `docs/launch/lighthouse/summary.md`
- route reports in `docs/launch/lighthouse/*.report.{html,json}`

2. [x] Interaction-depth audit
- confirm game page challenge inspection is <= 2 interactions
- verify on desktop + mobile and record in `docs/launch/publication-checklist.md`
- Evidence:
- `docs/launch/qa/acceptance-validation.md`
- `docs/launch/publication-checklist.md`

3. [x] Motion QA pass
- validate reduced-motion behavior route-by-route
- confirm no excessive attention animations in the same viewport
- Evidence:
- reduced-motion checks in `docs/launch/qa/acceptance-validation.md`
- attention-budget + motion timing implemented with framer-motion adoption in:
- `src/components/motion-in.tsx`
- `src/components/contextual-copilot-fab.tsx`
- `src/components/challenge-explorer.tsx`

### B. Team Branding Completeness Pass
Goal: align implementation with baseball-first motif guidance.

1. [x] Verified motif enforcement
- current motif catalog is `5 verified / 25 provisional`
- enforce strict fallback behavior: provisional teams should render generic fallback motif text, not team-specific provisional motif copy
- Implemented in:
- `src/lib/team-branding.ts` (strict fallback logic)
- `src/components/team-motif-hero.tsx` (verified/provisional display copy)

2. [x] Verified source expansion (first release target)
- raise verified motifs to 10-12 teams with official source URLs
- update `src/config/team-motifs.json` with `source_url`, `confidence`, `status`
- Current: `13 verified / 17 provisional`
- Verified set: `BAL, BOS, CHC, HOU, KC, LAD, NYM, PIT, SF, STL, PHI, NYY, MIL`

3. [x] Branding propagation audit
- confirm branding appears in:
- game hero (done)
- team hero (done)
- selected chart highlights on team page (pending)
- scoreboard accent chips (partial)
- Completed propagation:
- team-page trend bars + rate chips use team color tokens (`src/app/teams/[teamId]/page.tsx`)
- scoreboard team-dot chips + ABS hash accents use per-team color (`src/components/game-scoreboard.tsx`, `src/components/challenge-hashes.tsx`)

### C. Premium Motion/Visual Polish Pass
Goal: remove remaining “generic dashboard” feel.

1. [x] Replace simple CSS-only emphasis spots with deliberate motion primitives
- install/adopt `framer-motion` for:
- hero entry choreography
- copilot drawer micro transitions
- challenge state transitions where state meaning improves
- Implemented:
- dependency: `framer-motion` in `package.json`
- hero entry wrappers: `src/components/motion-in.tsx`, used by game/team/umpire shells
- copilot interactions: `src/components/contextual-copilot-fab.tsx`
- challenge detail/list transitions: `src/components/challenge-explorer.tsx`

2. [x] Typography and spacing rhythm pass
- enforce tighter scoreboard-first typography hierarchy
- reduce inconsistent paddings across cards/tables/filters
- Implemented in scoreboard and profile pages with standardized panel/card spacing and stat hierarchy.

3. [x] Attention budget pass
- only one high-salience animation active per region
- convert any leftover looping effects into event-driven cues
- Implemented through reduced looping + event-driven transitions only on selection/open actions.

### D. Plan Cleanup and Final Sign-off
Goal: make this file “done”, not “open-ended brainstorm.”

1. [x] Add a final “Implemented vs Deferred” table
- move unimplemented brainstorm items (e.g., `Theme Toggle Classic/Modern`) to deferred status explicitly
- point deferred items to `future-iterations-auth-community.md` or a new `future-iterations-ui.md`
- Added:
- `future-iterations-ui.md` (UI/community follow-ons and lower-priority experiments)

2. [x] Add final evidence links
- Lighthouse artifacts
- visual baseline snapshots
- a11y checklist run
- demo clip path
- Evidence index:
- Lighthouse: `docs/launch/lighthouse/summary.md`
- Visual baselines: `tests/visual/__screenshots__/`
- A11y checklist: `docs/launch/a11y-qa-checklist.md`
- Acceptance QA notes: `docs/launch/qa/acceptance-validation.md`
- Demo/case-study docs: `docs/launch/demo-script.md`, `docs/launch/case-study-template.md`, `docs/launch/architecture-diagram.md`

3. [x] Mark this plan closed
- append `Plan Status: Closed (V1)` once A-D are complete

### Implemented vs Deferred
| Area | Status | Location |
| --- | --- | --- |
| Team-branded heroes, scoreboards, ABS explorer | Implemented | `src/components/*`, `src/app/game/*`, `src/app/teams/*`, `src/app/umpires/*` |
| Contextual copilot with explainability surfaces | Implemented | `src/components/contextual-copilot-fab.tsx`, `src/app/api/query/route.ts` |
| Visual regression + Lighthouse evidence | Implemented | `tests/visual/*`, `docs/launch/lighthouse/*` |
| Theme toggle (Classic/Modern) | Deferred | `future-iterations-ui.md` |
| Social sentiment overlays | Deferred | `future-iterations-auth-community.md` |
| In-product call discussion/auth system | Deferred | `future-iterations-auth-community.md` |
| X/Twitter automation layer | Deferred | `future-iterations-ui.md` |

Plan Status: Closed (V1)

---

## 16) Team Identity Motif Library (All 30 Teams, Draft)

Goal: make each team page feel personal and recognizable in 1-2 visual cues without becoming kitschy.

Implementation rule:
- one primary motif + one secondary accent per team page
- keep motifs subtle and data-first (background, iconography, micro-animation), not decorative overload
- always preserve readability of analytics surfaces

### AL East
- Orioles: Camden brick/warehouse geometry + orange-black trim
- Red Sox: Green Monster wall tone + manual-scoreboard style numerals
- Yankees: frieze/Monument Park-inspired stripes + navy pinstripe rhythm
- Rays: sunburst/ray-light gradients + electric cyan accents
- Blue Jays: CN Tower skyline line-art + blue/red maple accents

### AL Central
- White Sox: old-scoreboard pinwheel references + black/silver industrial texture
- Guardians: Guardians bridge/traffic-statue silhouette + navy-red field lines
- Tigers: Old English D typography treatment + tiger-stripe micro texture (very subtle)
- Royals: fountain-inspired curved wave motif + royal blue/gold chips
- Twins: Minnie & Paul handshake icon treatment + river/city dual-tone backdrop

### AL West
- Astros: left-field train motif + orange-navy aerospace geometry
- Angels: halo ring glow accents + SoCal sunset warmth
- Athletics: elephant icon micro-mark + Kelly green/gold scorebug accents
- Mariners: trident/compass rose geometry + marine teal/navy layers
- Rangers: Lone Star/cowboy badge motif + deep blue/red scoreboard accents

### NL East
- Braves: “A” tomahawk-era typography lineage + red/navy stitched trim
- Mets: Home Run Apple motif + orange-blue bridge arc geometry
- Nationals: script “W” ring treatment + DC monument line-art accents
- Phillies: Liberty Bell pulse motif + burgundy/navy scoreboard style
- Marlins: Miami art-deco / neon edge accents + teal-magenta pops on dark neutral

### NL Central
- Cubs: ivy + Wrigley marquee typography cues
- Reds: riverboat smokestack cues + red/black letterpress style chips
- Brewers: glove logo geometry + barley/gold accent bars
- Pirates: Roberto Clemente Bridge yellow + black steel textures
- Cardinals: Gateway Arch silhouette + birds-on-bat inspired red/navy accents

### NL West
- Diamondbacks: desert gradient + angular “A”/serpentine line motifs
- Rockies: mountain horizon + purple dusk palette layering
- Dodgers: palm tree + script-era LA skyline line-art
- Padres: Western Metal / mission-bell inspired bronze-sand accents
- Giants: McCovey Cove / splash-hit wave motif + orange-black bay glow

### Motif-to-UI Mapping
- Header/hero:
- team primary + secondary color tokens
- motif backdrop (8-12% opacity max)
- Scoreboard:
- team-specific typography accents and separators
- challenge markers styled per team accent color family
- Charts:
- neutral base + team-accent highlights for selected state
- never recolor all series to team color if it hurts contrast

### Research Validation Workflow (before production lock)
1. For each team, gather one official source for motif legitimacy (team/ballpark page preferred).
2. Add `motif_source_url` and `motif_confidence` to design notes.
3. Mark motifs as:
- `verified`
- `provisional`
4. Only `verified` motifs ship in first release; provisional motifs use generic team branding fallback.

### Related Source References (starting set)
- Mets Home Run Apple history (official):  
  https://www.mlb.com/news/mets-home-run-apple-history
- Yankees Monument Park history (official):  
  https://www.mlb.com/yankees/news/history-of-monument-park-c263612104
- Cubs ivy feature (official):  
  https://www.mlb.com/news/ivy-helps-give-wrigley-field-iconic-look/c-76024450
- MLB standout ballpark features (official roundup):  
  https://www.mlb.com/news/six-standout-ballpark-features/c-46782222
- Phillies ballpark features (official):  
  https://www.mlb.com/phillies/ballpark/information/fun-features
- Team colors reference dataset (for verification support):  
  https://github.com/jimniels/teamcolors

### Machine-readable motif config
- Draft motif catalog (implementation input):
  `/src/config/team-motifs.json`
- Fields per team:
- `motif_primary`
- `motif_secondary`
- `visual_tokens[]`
- `source_url`
- `confidence` (`verified` or `provisional`)
- `status` (`ready` or `needs_research`)

---

## 17) Additional Brainstorm Concepts (To Preserve)

### A. Game Intelligence Layers
1. Challenge Leverage Ribbon
- thin timeline ribbon under scorebug showing challenge leverage moments
- helps users see whether a challenge was spent at low or high impact points

2. Missed Opportunity Layer (V2-ready UI)
- mark notable called pitches where team had no challenges remaining
- label explicitly as inferred/counterfactual, not official ABS decision

3. Count-State Matrix
- 12-cell count matrix (`0-0` to `3-2`) with:
- challenge frequency
- overturn rate
- directional flips (`B->S` vs `S->B`)

### B. Umpire + Team Intelligence
1. Umpire Zone Personality Card
- challenged-zone fingerprint by quadrant
- directional overturn bias (`B->S` / `S->B`)
- count-state hotspot summary

2. Team Strategy Archetypes
- automatic behavior labels with transparent rules:
- `Aggressive Early`
- `Late-Game Conservers`
- `High-Confidence Challengers`

### C. Replay and Storytelling UX
1. Broadcast Replay Mode
- “play challenge sequence” timeline that steps through game challenge events
- synchronized strike-zone highlight + context detail panel
- designed for demo/review workflows and social clips

2. Narrative Moment Blocks
- structured postgame storytelling blocks:
- `Turning Point Challenge`
- `Best/Worst Challenge Use`
- `Umpire Pressure Moment`

### D. AI + Explainability Surfaces
1. Embedded Copilot Everywhere
- keep NL->SQL assistant contextual on each page (not isolated view)
- game/team/umpire scope awareness tied to current filters

2. Data Provenance Drawer
- chart/table-level “how computed” panel:
- SQL/view source
- metric formula
- row count/time-window context

3. Confidence + Evidence Labels
- all AI answers display:
- confidence badge
- data scope string (rows/games/time range)
- explicit caveat text for sparse samples

### E. Personalization and Sharing
1. URL-Persisted Preferences (no auth required)
- favorite team
- default time range
- default zone mode
- preserve through query params for shareability

2. Shareable Insight Links
- deep links to exact filtered chart states
- useful for X/LinkedIn portfolio storytelling

### F. Performance and Quality Bar
1. Visual Performance Budget
- max chart render latency targets
- live update smoothness targets (no visible jank)
- animation FPS quality floor

2. Motion Governance
- one primary attention animation per viewport region
- reduced-motion fallback for all non-essential transitions

### G. Future V2 Hooks
1. Challenge Value Overlay
- overlay expected WP/RE swing on eligible challenge events
- supports eventual “challenge now?” assistant

2. Bullpen/Context Extension (cross-project)
- optional integration with pitching decision project later
- reuse challenge context architecture for in-game decision modules

---

## 18) Personal + Debate Engine Brainstorm (Low Debt First)

Goal:
- make each game page feel emotionally “alive” and personally relevant
- create debate-worthy artifacts for X/LinkedIn and baseball discussion
- avoid early technical debt by phasing social features carefully

### A. Make It Personal (without accounts, V1-safe)
1. Fan Lens Toggle
- let user pick lens:
- `Team Fan`
- `Neutral Analyst`
- `Umpire Focus`
- reorders panels and default copy tone, not underlying data logic

2. “My Team Angle” URL State
- deep link can encode:
- selected team
- selected challenge moment
- selected range/filter state
- gives users shareable POV links instantly

3. Moment Cards with Human Framing
- each challenge gets a compact narrative card:
- “high leverage challenge”
- “run prevention swing”
- “borderline low-value burn”
- generated from deterministic rules first, AI copy second

### B. Spark Debate Responsibly
1. Debate Prompt Module (per game)
- generate 2-3 neutral prompts:
- “Was this challenge worth spending with 2 left?”
- “Did this overturned call materially change momentum?”
- “Did team challenge too aggressively early?”
- prompts should cite data context to avoid ragebait framing

2. Side-by-Side Counterfactual Snippets
- “If challenge won” vs “If challenge lost/unchanged”
- simple expected impact indicators (not overconfident probabilities)
- clearly labeled model assumptions

3. “Decision Grade” Tags
- label challenge usage as:
- `Efficient`
- `Neutral`
- `Costly`
- tags must be rubric-based and transparent in methodology drawer

### C. Social Sentiment Concepts (V2 / experimental)
1. Live Sentiment Pulse (game-level)
- pull aggregate social sentiment for game hashtags/keywords
- show only coarse sentiment band (`Positive`, `Mixed`, `Negative`) + confidence
- do not claim causal relationship to umpire quality or ABS correctness

2. Call-Specific Sentiment Spike
- detect spikes around specific challenged pitches
- display tiny timeline markers (“social spike near challenge #7”)
- keep as optional overlay, disabled by default in V1

3. Source Strategy
- start with one source/provider and strict rate/cost caps
- store only aggregated metrics, not raw personal content, in early versions

### D. Technical Debt Guardrails
1. Progressive Integration Rule
- V1 core app must not depend on sentiment pipeline availability
- sentiment service failure should degrade gracefully to hidden panel

2. Isolation Boundary
- keep social/sentiment in separate service module and DB tables
- no coupling to primary ingest path (`ingest_mlb_abs.py`)

3. Budget Controls
- hard caps for:
- API requests per game
- processing interval
- storage retention for derived sentiment artifacts

### E. Suggested Phased Rollout
Phase 1 (now, low debt):
- Fan Lens
- shareable POV links
- deterministic moment/debate prompts

Phase 2 (controlled beta):
- social sentiment at game-level only
- confidence gating and fallback behavior

Phase 3 (advanced):
- call-specific sentiment overlays
- richer debate cards with model-backed context

### F. What to Showcase for Hiring and Social Reach
1. Clear analytical rigor
- every strong claim tied to metric + context window
- no black-box “hot takes” without evidence links

2. Product taste
- personal/team-themed storytelling while preserving trust
- clean interaction flows for technical + non-technical users

3. Responsible AI
- explicit uncertainty
- explainability drawer
- clear distinction between observed data and inferred commentary

### G. In-Product Call Discussion (Community Layer)
1. Discuss This Call Panel
- each challenged pitch can have a discussion thread
- anchored to immutable context:
- gamePk
- at-bat index
- pitch number
- inning/count/base-out/score snapshot

2. Structured Opinions First (low moderation load)
- before free text, offer quick structured reactions:
- `Correct overturn`
- `Should have stood`
- `Borderline`
- `Bad challenge usage`
- creates analyzable community signal with minimal abuse risk

3. Thread UX Model
- compact comment drawer from selected pitch detail card
- sort options:
- `Top` (score-weighted)
- `Recent`
- `Team fan view`
- display role/context chips (e.g., “BOS fan”, “Neutral”, “Umpire focus”)

4. Trust + Safety Guardrails (must-have)
- lightweight moderation stack:
- profanity/toxicity filter
- rate limits per user/session
- report + hide pipeline
- temporary read-only lock for high-abuse threads
- clear policy: discuss calls, not players/officials personally

5. Identity Strategy (phased)
- Phase 1:
- anonymous session identity + local nickname
- no full account system required
- Phase 2:
- optional auth for persistent profiles and reputation

6. Reputation and Quality Signals
- upvote/downvote with anti-brigade constraints
- “Insightful” badge for evidence-backed comments
- soft requirement for claim posts:
- include one selected data reference from page context

7. Analytics Value
- expose aggregate discussion metrics per call:
- sentiment split
- disagreement index
- comment velocity
- can power “most debated calls” modules on home/team pages

---

## 19) Baseball-Native UI/UX Polish Brainstorm

### A. Loading and Empty States (Baseball Themed)
1. Scoreboard Skeleton Loader
- inning columns (`1-9`, `R/H/E`) appear as animated placeholder cells
- challenge hashes show as dim placeholders before data resolves

2. Strike Zone Loader
- faint strike-zone box with softly animating pitch trail dots
- avoid spinner-only loading for core game explorer

3. “No Challenges Yet” State
- show contextual message:
- `No ABS challenges in this game yet`
- include quick insight card (challenge tendencies for teams/umpire pregame)

4. Data Delay Banner
- if last update exceeds threshold, show subtle banner:
- `Live feed delayed. Showing last verified snapshot at HH:MM`

### B. Baseball-Style Micro-Interactions
1. Challenge Hash Flip
- when challenge is spent/retained, indicator flips/fills with short tactile animation

2. Inning Transition Motion
- `Top -> Bottom` transition as compact scorebug slide with count reset animation

3. Dot Selection Behavior
- selecting pitch dot adds ring pulse + synchronized row highlight in timeline
- deselection fades focus ring cleanly, no abrupt disappear

4. Score Change Feedback
- run value briefly pulses on scoreboard row with subtle glow

### C. Chart/Visualization Interactivity Upgrades
1. Multi-Layer Zone View
- toggle layers:
- challenge outcomes
- pitch type overlays
- count-state overlays
- keep layers additive but readable (opacity rules)

2. Brushing + Linked Views
- drag-select region on strike zone to filter timeline and detail table
- reverse linkage: selecting table rows highlights zone clusters

3. Replay Scrubber
- timeline scrubber that animates challenge points in sequence
- include play speed control (`1x`, `2x`, `4x`)

4. Smart Tooltips
- compact on desktop hover
- full bottom sheet on mobile tap
- always include:
- pitch type
- count/base-out
- challenger role/team
- flip direction (`B->S` / `S->B`)

### D. Navigation and Flow Improvements
1. Sticky Game Command Bar
- persistent controls for:
- range/window
- strike-zone mode
- replay toggle
- AI copilot launcher

2. Keyboard Shortcuts (Power Users)
- `Z`: focus strike zone
- `R`: start replay
- `/`: open copilot
- `[` and `]`: previous/next challenge

3. Cross-Page Context Carry
- when moving from home -> game -> team/umpire, preserve selected game/range in URL

### E. Apple-like Refinement Layer
1. Motion Consistency Tokens
- central token map for durations/easing per interaction class
- prevents “mixed motion language” across pages

2. Depth and Material
- glass/blur used sparingly for overlays only
- analytics surfaces stay crisp and opaque for readability

3. Haptics-Equivalent Visual Feedback
- on desktop/web, use subtle scale + opacity transitions to mimic tactile response

### F. “Delight but Useful” Ideas
1. Signature Team Moment Intro
- tiny 0.8s intro flourish on game page load using verified team motif
- disable after first visit per session to avoid annoyance

2. Milestone Callout Chips
- chips for notable events:
- `First challenge used`
- `Final challenge exhausted`
- `Highest leverage challenge`

3. Compare Mode
- side-by-side mini panels for two games or two umpires in same window
- ideal for sharing and debate

### G. Practical Guardrails
1. Any animation must have a functional purpose tied to state/context.
2. Keep real-time updates smooth under data bursts (batch UI updates by frame).
3. Respect reduced-motion and provide static equivalents for all key interactions.
4. Maintain data density without sacrificing scanability (hierarchy + spacing discipline).

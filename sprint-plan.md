# ABS Observatory — Comprehensive Sprint Plan
*Derived from analytics-audit.md · Every item catalogued · March 2026*

> **For the implementing model (Opus):** This file is self-contained. Do not deviate from the embedded design rules below under any circumstances. Every component, chart, tooltip, color, and motion must follow these rules exactly as written. Reference `analytics-audit.md` for full narrative context on any item.

---

## ⚠️ MANDATORY DESIGN RULES — READ BEFORE TOUCHING ANY FILE

These rules are non-negotiable. Every chart, card, and component must follow them without exception.

### 1. Panel & Surface
```
Every visualization container → .panel class (glassmorphism, --radius-lg, border: var(--border-subtle))
Chart background inside panel → bg-white or bg-slate-50, never a raw background color
Empty state → dashed border-2 border-dashed border-gray-200, centered --ink-3 muted text
```

### 2. Chart Anatomy (Recharts)
```
Grid lines     → rgba(0,0,0,0.05), 1px stroke — never full black
Axes           → color: --ink-3 (#86868b), 10px font, uppercase, 0.08em tracking
LG AVG line    → stroke: rgba(0,0,0,0.25), strokeDasharray: "4 4", label "LG AVG" in --ink-3, 1px
Animation      → animationDuration={800} + animationEasing="ease-out" on ALL recharts charts
Motion         → --motion-mid (320ms) duration, --motion-apple-ease on Framer Motion elements
```

### 3. Tooltip Standard (SHARED COMPONENT ONLY — no ad-hoc tooltip styling ever)
Every chart tooltip must use or match this spec exactly:
```
Component:    <ChartTooltip> — create if it doesn't exist, import everywhere
Background:   #ffffff
Border:       1px solid var(--border-subtle)
Border-radius: var(--radius-md) (14px)
Padding:      10px 14px
Box-shadow:   0 8px 24px rgba(0,0,0,0.04)  [same as .panel]
Title text:   color --ink-0, 11px, font-weight 700, uppercase, tracking-widest
Value text:   color --ink-1, 13px, font-weight 600, font-family mono where numeric
Label text:   color --ink-3, 10px, regular weight
```

### 4. Team Colors — Token Rules
```
Source:          resolveTeamBranding(teamId) → { teamPrimary, teamSecondary, teamAccentSoft, teamAccentStrong }
NEVER hardcode:  Do not use any hex value for a team-color context. Use the tokens only.
Server only:     Call resolveTeamBranding() only in server components. Pass colors as props to client components.

Single-team chart:          fill: teamPrimary · area fill: teamAccentSoft (20% alpha)
Dual-team matchup:          home team → home.teamPrimary · away team → away.teamPrimary
                            If colors similar → add strokeDasharray to away line, don't change color
Multi-team / league chart:  each dot/bar → its teamPrimary · MLB Avg marker → --ink-3 (#86868b)
Umpire charts:              no team affiliation → use --accent-primary (#0066cc) as default
Dual-shading (1 team):      teamPrimary + teamPrimary+"88" (50% alpha)
```

### 5. Gradient Rules (SVG linearGradient in recharts <defs>)
```
Area chart fill:             top opacity 0.5 (teamPrimary) → bottom opacity 0.05 (teamPrimary)
Dual-series area:            Line1 → teamPrimary stroke + primary gradient fill
                             Line2 → teamSecondary stroke + secondary gradient fill
Bar charts:                  Solid teamPrimary fill — no gradient on bars
Dual bars (off/def):         Bar1 = teamPrimary · Bar2 = teamSecondary
Heatmap scale:               teamSecondary (cold/low) → teamPrimary (hot/high)
```

### 6. Typography System (never deviate)
```
Display headers:   font-display, uppercase, tracking-tight (letter-spacing: -0.04em)
Section labels:    text-[10px] font-black uppercase tracking-[0.08em–0.14em]
Body copy:         text-sm font-medium text-[var(--ink-1)] leading-relaxed
Mono / numbers:    font-mono where displaying stats
KPI numbers:       text-4xl or text-5xl font-display uppercase
```

### 7. Challenge Indicator States (ChallengeHashes component)
```
Rename: ALL instances of "ammo" → "challenges" in labels, aria, comments, props, UI copy
States:
  Available:  filled amber/gold (#ffb800 = --state-warning), faint glow — site-wide color, not team-colored
  Used/Lost:  muted gray (--ink-3) square with centered ✕ SVG inside
  Used/Won:   green square (--state-overturned-bs) with centered ✓ SVG inside
```

### 8. Back Navigation (BackPill component)
```
Styling: bg-white/70 backdrop-blur-sm border border-[var(--border-subtle)] rounded-full px-4 py-2
Label:   text-[10px] font-black uppercase tracking-[0.08em] text-[var(--ink-2)]
Icon:    ChevronLeft (12px lucide) with hover translateX(-2px)
Hover:   bg-white border-[var(--border-medium)] text-[var(--ink-0)]
```

---

## Already Complete ✅

| Done | Item |
|------|------|
| ✅ | Copilot FAB → persistent chat thread, baseball arc typing indicator, always-visible input |
| ✅ | Copilot FAB → 520px panel, drag constraints, table row rendering, aiBS identity in header |
| ✅ | Copilot FAB → sessionStorage persistence (`aibs-copilot-messages`) |
| ✅ | AIInsightBubble → "Ask Follow Up" dispatches `open-copilot` custom event, pre-fills FAB input |
| ✅ | Analytics audit v3 written and catalogued |

---

## Sprint 1 — Foundations (1–2 days)
*No new pages. Isolated, high-visibility changes that unblock everything else.*

---

### S1-1: Create Shared `<ChartTooltip>` Component
**File:** `src/components/ui/chart-tooltip.tsx` *(NEW)*
**Why first:** Every chart in sprints 2–4 imports this. Build it once.
```
Props: title, value, label, extra? (additional rows), teamColor?
Styling: exactly the tooltip standard in the design rules above — do not deviate
Export: ChartTooltip, ChartTooltipRow
```

---

### S1-2: Rename "Ammo" → "Challenges" Globally
**Files:** All components — `ChallengeHashes`, `GameCard`, `LiveHub`, all game-hub components, `contextual-copilot-fab.tsx`
- Find all instances of `ammo`, `Ammo`, `absAmmo`, `ammoRemaining` in labels, props, aria text, comments, UI strings
- Rename to `challenges`, `Challenges`, `challengesRemaining`
- **Do not change** DB column names or API field names — UI layer only
- Run `grep -r "ammo" src/` and fix every hit

---

### S1-3: ChallengeHashes — Three-State Redesign
**File:** `src/components/challenge-hashes.tsx`
- Add third state via new prop: `outcomes?: ('won' | 'lost' | null)[]`
- `null` (default): existing amber/gold filled square
- `'lost'`: `--ink-3` gray square + centered ✕ SVG (12px, strokeWidth 2.5)
- `'won'`: `--state-overturned-bs` green square + centered ✓ SVG (12px, strokeWidth 2.5)
- Update `getChallengeHashClass()` to handle all three states
- Keep amber as site-wide color — not team-colored (intentional for cross-team readability on game pages)

---

### S1-4: Create Shared `<BackPill>` Component
**File:** `src/components/ui/back-pill.tsx` *(NEW)*
```tsx
Props: label: string, href?: string, useHistory?: boolean
// If useHistory: calls router.back(). If href: hard Next.js Link.
// Styling: per design rules section 8 above
```

---

### S1-5: Add BackPill to All Deep Pages
Using `BackPill` from S1-4:
| File | Label | Method |
|------|-------|--------|
| `src/app/teams/[teamId]/page.tsx` | `← Teams` | `href="/teams"` |
| `src/app/umpires/[umpireId]/page.tsx` | `← Umpires` | `href="/umpires"` |
| `src/app/game/[gamePk]/page.tsx` | `← Schedule` | `useHistory` |
| `src/app/reports/[gamePk]/page.tsx` | `← Game` | `href={/game/${gamePk}}` |

Position: `absolute top-6 left-6` inside outermost page container.

---

## Sprint 2 — Home Page (1 day)
*All changes in `src/app/page.tsx` and `src/components/home-expandable-grid.tsx`.*

---

### S2-1: Identity Hero Strip
Between `<BroadcastStrip>` and `<GameStrip>`:
```tsx
<div className="px-6 py-8 text-center">
  <h1 className="font-display text-5xl uppercase tracking-[-0.04em] text-[var(--ink-0)]">
    ABS Observatory
  </h1>
  <p className="mt-2 text-sm font-medium text-[var(--ink-3)]">
    The home of MLB challenge intelligence.
  </p>
</div>
```
No buttons, no cards. Identity anchor only — ~100px tall.

---

### S2-2: HomeExpandableGrid — Game Count Label
**File:** `src/components/home-expandable-grid.tsx`
- Change button label from "Expand Games" → `▸ See All {gameCount} Games`
- Add `gameCount: number` prop
- When `gameCount === 0`: gray out button, label "No Games Today", `pointer-events-none`
- Pass `gameCount` from parent page via server data fetch

---

### S2-3: Today's Pulse Stat Strip
Server-rendered between `<GameStrip>` and Discovery Rail:
- 4 stats on one line: Games tracked today · Total challenges today · Success rate vs season avg · Most-challenged umpire
- Format: `15 games · 38 challenges · 54.2% success (+3.1% vs avg) · Ump: Joe West 44%`
- Styling: `text-[11px] font-medium text-[var(--ink-3)]`, centered, separated by `·`
- Data: compute server-side in page RSC

---

### S2-4: Discovery Rail — Teams & Umpires
Between Today's Pulse and `<ChallengeMomentCards>`:
```
SECTION: "Top Teams This Week"
  3 horizontal TeamIcon cards → team name + overturn rate chip + rank badge
  "See All Teams →" right-aligned link → /teams

SECTION: "Umpires in the Spotlight"
  3 umpire name cards → accuracy badge + zone archetype tag
  "See All Umpires →" right-aligned link → /umpires
```
Styling: `.panel` cards, horizontal `flex gap-4`, horizontal scroll on mobile (`overflow-x-auto`). Each card links to profile page.

---

### S2-5: Reduce Gap Before Leverage Calls
Find the `mt-32` above `<ChallengeMomentCards>` section in `page.tsx`. Change to `mt-16`.

---

### S2-6: Latest Debrief Bar
Bottom of `page.tsx`, above footer:
```tsx
<Link href="/articles" className="block w-full bg-[var(--ink-0)] text-white px-8 py-4">
  <span className="text-[11px] font-black uppercase tracking-widest">
    📰 The Daily Debrief · "{latestArticleHeadline}" → Read Now
  </span>
</Link>
```
Dark full-width bar. Fetch `latestArticleHeadline` server-side.

---

## Sprint 3 — Teams Pages (2–3 days)

---

### S3-1: Teams Leaderboard — Scatter Plot with Team Logos
**File:** `src/app/teams/page.tsx` (wherever scatter plot lives)
- Replace colored dots with `<TeamIcon>` as recharts custom `shape` prop
- Each logo placed at `(totalChallenges, overturnRate)` coordinate
- Tooltip: `<ChartTooltip>` — team name + challenges + overturn rate
- Click on point → `router.push(/teams/${teamId})`
- Axis labels: `--ink-3`, 10px, uppercase per design rules

---

### S3-2: Teams Leaderboard — Scatter Plot League Avg Crosshair
On the same scatter from S3-1:
- Bold `⊕` crosshair at `(leagueAvgChallenges, leagueAvgOverturnRate)` — `--ink-3` color
- Dashed reference lines at avg X and avg Y: `rgba(0,0,0,0.25)`, `strokeDasharray="4 4"`
- Label `"MLB Avg"` in `text-[10px] font-black uppercase text-[var(--ink-3)]`
- Four corner quadrant labels:
  - Top-right: `"Surgical"` (high volume, high success)
  - Top-left: `"Selective"` (low volume, high success)
  - Bottom-right: `"Reckless"` (high volume, low success)
  - Bottom-left: `"Passive"` (low volume, low success)

---

### S3-3: Teams Leaderboard — Floating MLB Avg Row in Table
- Sort teams by overturn rate. Compute where league avg overturn rate falls.
- Insert a non-ranked row at that position:
  - Rank column: `—` or MLB shield badge, no number
  - Team column: "MLB Avg" in italic
  - All stat columns: league average values in italic
  - Row style: `bg-[var(--surface-1)] border-y border-[var(--border-subtle)] italic`
- Surrounding team numbers are uninterrupted (e.g., #15 above, #16 below the avg row)

---

### S3-4: Teams Leaderboard — Trend Sparkline Column
In the ranked table, add a `Trend` column:
- 60px-wide recharts `<LineChart>` per row, showing team's overturn rate over last 30 days
- No axes, no labels — sparkline only
- Rising = green line, falling = red line
- Use team's `teamPrimary` color for the sparkline

---

### S3-5: Team Profile — Dual-Line Trajectory Chart
**File:** `src/app/teams/[teamId]/page.tsx`
- Replace single blended trajectory line with two `<Area>` series in a recharts `<AreaChart>`:
  - Line 1 (Offensive): stroke `teamPrimary`, fill `linearGradient` from `teamPrimary` opacity 0.5 → 0.05
  - Line 2 (Defensive): stroke `teamSecondary`, fill `linearGradient` from `teamSecondary` opacity 0.4 → 0.05
  - Both share a dashed `LG AVG` `<ReferenceLine>` at league average value
- Define `<linearGradient>` in recharts `<defs>` using resolved team tokens (passed as props from server)
- Legend: "Offensive" / "Defensive" in brand colors

---

### S3-6: Team Profile — Inning Efficiency Heatmap
**New file:** `src/components/analytics/inning-efficiency-heatmap.tsx`
- 9 rows (innings 1–9) × 2 columns (Offensive / Defensive)
- Each cell background: interpolated between `teamSecondary` (low/cold) → `teamPrimary` (high/hot) based on overturn rate
- Cell label: overturn rate % in `text-[10px] font-mono`
- Hover tooltip: `<ChartTooltip>` — inning + category + rate + sample size
- Empty cells: dashed border, `--ink-3` text "No data"

---

### S3-7: Team Profile — Home/Away Split → Visual Bar Chart
- Replace 2-row comparison table with two horizontal grouped bars
- Bar fill = success rate · `<ReferenceLine>` at league avg · `teamPrimary` fill
- Recharts `<BarChart layout="vertical">` with label overlays
- Tooltip: `<ChartTooltip>` standard

---

### S3-8: Team Profile — Schedule Strip Status-Aware Indicators
Find the schedule strip component on the team profile. Each game card renders based on `status`:
- **Past game** (`status === 'Final'`): badge `2/3 ✓` (overturned/total). Green if >50%, amber if ≤50%
- **Live game** (`status === 'In Progress'`): pulsing red dot + `● 2 remaining` (real-time challenge count)
- **Upcoming/Preview**: umpire accuracy chip — `Ump: 94% acc` in green; amber if below league avg

---

### S3-9: Team Profile — Matchup Radar Chart Fix
`src/components/game-hub/matchup-radar-chart.tsx` or team profile radar:
- 5 axes — all team axes, no umpire axes (umpire data moves to Umpire Zone Briefing):
  - Challenges per 9 innings (off)
  - Challenges per 9 innings (def)
  - Overturn rate (offense) vs league avg
  - Overturn rate (defense) vs league avg
  - Avg challenges remaining at game end
- Fill: `teamAccentSoft` (20% alpha primary) for home · dashed overlay for away
- Tooltip: `<ChartTooltip>` standard

---

## Sprint 4 — Umpire Pages (2–3 days)

---

### S4-1: Umpires Leaderboard — Distribution Histogram
**File:** `src/app/umpires/page.tsx`
- Recharts `<BarChart>` histogram of umpire accuracy ratings (bell curve shape)
- Bold vertical `<ReferenceLine>` at league avg labeled `"Umpire Avg"` in `--ink-3`
- Outlier bars at top/bottom: label umpire name directly on bar
- Click a bar → filter the table below to that accuracy range
- Chart uses `--accent-primary` (#0066cc) as bar fill (umpire context = no team color)

---

### S4-2: Umpires Leaderboard — Floating Umpire Avg Row in Table
Same pattern as S3-3 but for umpires table:
- Insert non-ranked row at the correct overturn rate position
- Row: generic umpire badge icon, "Umpire Avg" italic, league avg stat values, muted background
- Umpires above row are below league avg overturn rate (better). Umpires below are above (worse). Note: lower overturn rate = more accurate umpire.

---

### S4-3: Umpires Leaderboard — Zone Archetype Tag Column
New pill column in the umpire table:
- `Low Zone Bias` · `High Zone Loose` · `Inside Strict` · `Balanced` (derived from zone bucket data)
- Styled as a `.status-chip` pill matching existing chip patterns
- Scannable at a glance without clicking profile

---

### S4-4: Umpires Leaderboard — Confidence Indicator Column
Sample-size badge next to overturn rate:
- `● Low` (< 10 games) · `◉ Med` (10–30 games) · `⬤ High` (>30 games)
- `--state-warning`, `--accent-warm`, `--state-overturned-bs` colors respectively
- Prevents a 3-game umpire from ranking #1 without visual caveat

---

### S4-5: Umpire Profile — Percentile Rank KPI
Replace `Confirmed Calls` KPI card with `Percentile Rank`:
- Value: `23rd` (percentile among all umpires for accuracy)
- Sub-label: `vs. All Umpires`
- This is more immediately meaningful than raw count for both fan and org

---

### S4-6: Umpire Profile — Accuracy Trajectory with Home/Away Toggle
Find the accuracy trajectory line chart on umpire profile:
- Add a toggle button group on the panel header: `All Games / Home / Away`
- When toggled, re-filter the chart data. No page navigation.
- Dashed `LG AVG` `<ReferenceLine>` always visible regardless of toggle
- Line color: `--accent-primary` (#0066cc) — umpire context, no team color

---

### S4-7: Umpire Profile — Peer Comparison Percentile Bar
New small panel (right column, next to trajectory chart):
- One horizontal `<BarChart>` bar: this umpire's percentile
- Sub-labels: "Better than X% of umpires · Worse than Y%"
- Bar fill: green if >50th percentile, red if <50th
- Tooltip: `<ChartTooltip>` — umpire name + percentile + overturn rate

---

### S4-8: Umpire Profile — Rhythm Chart Late-Inning Callout
Find the inning-by-inning accuracy `<BarChart>` (Rhythm Chart):
- Add dashed `LG AVG` `<ReferenceLine>` across all innings
- Add auto-detection logic: if innings 7–9 accuracy drops >5pp below innings 1–3 baseline:
  - Show amber alert banner below chart:
    `⚠ Late-Game Fatigue Pattern Detected — This umpire's accuracy drops significantly in late innings. Consider conserving a challenge until the 7th or later.`
  - Banner: `bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] font-black text-amber-700`

---

### S4-9: Umpire Profile — Zone Heatmap League Avg Comparison
Find the zone heatmap (`umpire-heatmap.tsx` or similar):
- Below each of the 4 quadrant cells, add two sub-labels:
  - `This zone: 58%` in `--ink-1`
  - `League avg: 42%` in `--ink-3`
- Delta chip: `+16pp` in green if above avg, `-Xpp` in red if below

---

### S4-10: Umpire Profile — Directional Bias Rate + Count Fix
Find Directional Bias section (S→B / B→S cards):
- Each card currently shows raw count only. Add rate alongside:
  - Change `14` → `14 overturns (58% rate)`
  - Format: `{count} overturns ({rate}%)` in `text-sm font-medium`
  - Raw count without rate is misleading across different game volumes

---

## Sprint 5 — Game Pages (3–4 days)

---

### S5-1: Game Preview — Umpire Zone Briefing Redesign
Find umpire zone component on pregame page:
- Replace heuristic glow with real 4-quadrant grid (2×2: Up/Down × Glove/Arm)
- Each quadrant cell colored red→green by overturn rate
- Below grid: single callout stat — `"Tonight's ump overturns XX% of challenges — league avg is YY%"`
- Add league avg benchmark chip below the stat
- Fan label: plain English miss zone description
- Org label: rate + recommendation

---

### S5-2: Game Preview — Challenge Timing History Bar Chart
Find challenge timing component on pregame page:
- Replace with per-inning challenge frequency: small-multiple bar chart, one bar per inning (1–9)
- Two rows: home team and away team (each in their `teamPrimary` color)
- Faint gray bar behind each = league average for that inning
- Compact and readable — no chart legend needed (team row labeled on left)
- Tooltip: `<ChartTooltip>` — inning + challenges + vs league avg

---

### S5-3: Game Preview — Umpire × Team History Block *(Killer Feature)*
New panel on pregame page below zone briefing:
- Two horizontal bars side by side, center league-avg vertical line
- Bar 1: Team A vs. this umpire — X games, Y% overturn rate
- Bar 2: Team B vs. this umpire — X games, Y% overturn rate
- Center reference line = league avg
- Fan callout: "The Cubs have challenged 45 calls with tonight's umpire and won 71%..."
- Org callout: "We're 12/18 (67%) against this umpire historically..."
- This is the killer feature of the pregame page — no other app has this

---

### S5-4: Live War Room — At-Bat Context Strip
New full-width one-line strip (persistent above event feed):
```
Count: 1-2 · Runner on 2nd · 1 Out · This count → 52% league overturn rate · Tonight: 61%
```
- `text-[11px] font-medium` — no chart, just text + one colored stat
- When high-leverage count: entire strip pulses amber (`animate-pulse bg-amber-50`)
- Updates in real-time as count/situation changes

---

### S5-5: Live War Room — Live Event Feed (Replace Table)
Replace sparse challenge table with scrolling vertical feed of event cards:
- Max 4 visible, scrollable via overflow
- Each card (3 lines): inning tag + team icon · call description · outcome badge (OVERTURNED green / CONFIRMED gray) + WPA shift badge
- New-event cards animate in from top with `framer-motion` `AnimatePresence`

---

### S5-6: Live War Room — Inning Challenge Burn Chart (Org View)
Hidden behind Fan/Org toggle (Org mode only):
- Horizontal dot plot: innings 1–9 × team, each dot = one challenge used
- "Projected Remaining" stat below: at current usage rate, will they have challenges in the 9th?
- Color: `teamPrimary` dots per team

---

### S5-7: Postgame — Move AI Match Summary to Top (Chapter 1)
Currently buried — move to very first element on postgame page:
- Full-width, newspaper column formatting (max-w-lg, centered text)
- `font-display` headline in the report title
- AI narrative below in `text-sm font-medium text-[var(--ink-1)] leading-relaxed`
- Formatted like an article byline, not a widget

---

### S5-8: Postgame — WPA Waterfall Chart Fix
Find the WPA Waterfall chart on postgame page:
- Fix coloring: green = challenging team succeeded (overturned), red = challenging team failed
- Label bars with team abbreviation + inning, not just inning
- Add horizontal zero line at 50% baseline
- Add annotation on the biggest absolute shift: `★ "Game-changing moment."`
- Tooltip: `<ChartTooltip>` — inning + team + call + WPA delta + label

---

### S5-9: Postgame — Strike Zone Plot as First-Class Feature
Find `<StrikeZonePlot>` component (already exists, has full functionality):
- **Move it above the Forensic Pitch Log** as a standalone "Where Were the Calls?" section
- Add filter pills above the chart: `Batter / Pitcher / Inning / Outcome` (fan: basic filters, org: all unlocked)
- Expose existing props as toggle buttons: `showCountOverlay` · `showPitchOverlay`
- This is NOT a new component — it already exists and is already excellent. Just promote it.

---

### S5-10: Postgame — Challenge Decision Scorecard
New two-column card (one column per team):
- Correct challenges (green chip)
- Wrong challenges (red chip)
- Missed opportunities (estimated from umpire zone data — amber chip)
- Letter grade A/B/C/D/F (computed: correct / (correct + wrong + missed))
- One-sentence verdict: `"Smart, surgical use of challenge windows."`
- Fan: shareable card. Org: self-assessment.

---

### S5-11: Postgame — Umpire Game Grade Card (Small, Right Sidebar)
Small panel alongside or below main postgame content:
- Umpire name · tonight's overturn rate · vs career avg (delta ±) · vs tonight's league avg
- One clear letter grade (same A–F scale as S5-10)
- Styling: condensed `.panel` with `--accent-primary` accent bar at top

---

## Sprint 6 — Articles Page (2 days)

---

### S6-1: Articles Page — Auto-Open Modal (Latest Article)
**File:** `src/app/articles/page.tsx`
- On page load (`useState(true)`): open full-screen frosted modal showing latest article
- Modal: `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center`
- Inner card: frosted glass `.panel`, `max-w-2xl mx-auto`, article headline + lede + `"Read Full Debrief →"` button
- Background grid: visible but `blur-sm pointer-events-none` behind modal
- Dismiss: ✕ top-right + Esc key
- Use `sessionStorage.getItem("debrief-modal-seen")` — only auto-open once per session

---

### S6-2: Articles Page — Fixed Article Grid (3-col, 6–9 cards)
Below the modal (or on dismiss):
- 3-column grid, fixed 6–9 most recent articles
- Each card: category tag chip + headline + date + 2-line lede
- **No infinite scroll** — hard limit on card count
- `hover:shadow-lg hover:-translate-y-1` card interaction

---

### S6-3: Articles Page — "Browse Archive →" Button
Below the fixed grid:
- Single centered button: `"Browse Archive →"`
- On click: Framer Motion `layout` animation transforms the grid into calendar view (S6-4)

---

### S6-4: Articles Page — Calendar Archive View
Triggered from S6-3:
- Reuse `LeagueCalendar` component pattern (already exists at `src/components/analytics/league-calendar.tsx`)
- Month grid — days with articles show a small ink-stamp dot
- Month navigation: `← prev` / `next →` arrows
- Click a day with an article → open article detail with crumple transition (S6-5)
- Empty days: show nothing, no clutter

---

### S6-5: Article Detail — Crumple Transition (Page UX Polish)
When a user clicks any article card:
1. **Press (200ms):** CSS `perspective` + `rotateX/rotateY` keyframe fires — card corners fold inward, compresses toward center (paper crumple effect)
2. **Expand (300ms):** Framer Motion `layoutId` shared-element — card expands to fill viewport
3. **Full article:** Single-column layout (max-w-[680px] centered), serif font, drop-cap first letter. `<BackPill label="Daily Debrief" href="/articles" />` top-left.
4. **Back press:** Reverse crumple — article folds back into its card grid position

---

## Sprint 7 — Visualizer Share UX (2 days)

---

### S7-1: Shareable Viz URL — `/v/[vizId]` Route
**New file:** `src/app/v/[vizId]/page.tsx`
- On viz generation in `AIBSVisualizerChat`, store query + result in DB with the existing short ID (`Math.random().toString(36).substring(7)`)
- Viz page renders: chart full-width with site header nav + branding
- OG meta tags (see S7-3)
- Update `handleShare('x')` to share `/v/[vizId]` URL instead of current page URL

---

### S7-2: In-Chart Attribution Watermark
In every chart generated by `AIBSVisualizerChat`, add SVG `<text>`:
- Content: `absobs.io • @ColbyReichenbach`
- Position: bottom-right of SVG viewport (`x="95%" y="97%"`, `textAnchor="end"`)
- Font: 8px mono, `fill: #86868b` (--ink-3)
- On live web page: wrap in SVG `<a>` linking to site + X profile
- In screenshots: always present regardless of crop

---

### S7-3: Tweet Pre-population — Context + Stat Template
**File:** `src/components/analytics/ai-bs-visualizer-chat.tsx`
Update `handleShare('x')`:
```
Template: "Just visualized [context] ABS data on @absobs_bot 📊\n\n[1 specific stat from result]\n\nBuild yours → absobs.io/v/[vizId]"
Rules: under 200 chars total · include one real number from AI result · @absobs_bot mention · no hashtags
```

---

### S7-4: OG Meta Tags on Viz Pages
On each `/v/[vizId]` page (`src/app/v/[vizId]/page.tsx`):
```html
<meta property="og:title" content="[Query] — ABS Observatory" />
<meta property="og:description" content="[One-sentence AI result summary]" />
<meta property="og:image" content="/api/viz-og/[vizId]" />
<meta name="twitter:card" content="summary_large_image" />
```

---

### S7-5: OG Image API Route — Server-Rendered PNG
**New file:** `src/app/api/viz-og/[vizId]/route.ts`
- Uses `@vercel/og` (ImageResponse) to render chart as PNG
- Link preview on X looks like a chart image; clicking opens live interactive page
- This is the best possible social card: visual impact of screenshot + conversion of a link

---

## Sprint 8 — Fan/Org Toggle System (Architectural — Discuss First)

> ✅ Architecture decision made: use a cookie-backed analytics view mode with URL override support.
>
> Source of truth and precedence:
> 1. Valid URL param `?view=fan|org` overrides everything for that request
> 2. Otherwise read cookie `aibs_view_mode`
> 3. Otherwise default to `fan`
>
> Implementation rule:
> - resolve mode on the server for every analytics page
> - pass the resolved mode down as props
> - use client controls only to update cookie / URL, not as the source of truth
>
> Share behavior:
> - persistent browsing mode lives in cookie
> - share links can force a mode with `?view=fan` or `?view=org`

| Feature | Fan Mode | Org Mode |
|---------|----------|----------|
| KPI labels | Plain English | Technical + delta vs avg |
| Chart annotations | Story callouts (`"⚠ Late-game weakness"`) | Numerical benchmarks |
| Range / filter controls | Hidden by default | Always visible |
| AI Copilot | Hero placement, prominent | Compact sidebar |
| Trend lines | 1 blended line | 2 lines (off/def split) |
| Sample size indicators | Hidden | Always shown |
| Export controls | Hidden | Visible |
| Social / share buttons | Visible | Hidden |

Affects: every analytical page.

---

## Sprint 9 — Deferred (Data / External Dependencies)

Backend companion: [sprint-9-backend-plan.md](/Users/colbyreichenbach/Desktop/mlb/abs-observatory/sprint-9-backend-plan.md)

> ✅ Scope decision made:
>
> Build now:
> - D-5 Pregame — Umpire × Team History
> - D-8 Umpire — Pitch Type Breakdown
> - D-7 Umpire — Season-over-Season Chart only if local/staging data coverage is sufficient
>
> Optional after the above:
> - D-6 Postgame — Missed Opportunities v1, but only as an explicitly inferred model
>
> Remain deferred:
> - D-1 through D-4 until a real CLS / win-probability methodology exists
> - D-9 until a real PDF/export pipeline is chosen
> - D-10 until X/Twitter integration is intentionally scoped
>
> Rule:
> - do not ship invented leverage/WPA/CLS values
> - if the model/data is not real, the UI must stay factual or explicitly unavailable

| # | Item | Dependency |
|---|------|------------|
| D-1 | Challenge Leverage Score (CLS) | Needs pre-pitch WP by game state + count from Statcast. Compute `WPA(post) − WPA(pre)`. |
| D-2 | WPA Waterfall — Fix Logic | Currently uses `Math.random()`. Replace with real per-challenge WPA delta from game data. |
| D-3 | Live War Room — CLS Real-Time | Needs real-time Statcast WP feed. Shows potential WP swing before challenge is made. |
| D-4 | Umpire Profile — Aggregate CLS | Needs CLS data per umpire per game. Sum across all games → avg WP impact per game. |
| ✅ D-5 | Pregame — Umpire × Team History | Needs historical umpire-per-team DB data. (S5-3 spec is the UI — the data is what's pending.) |
| D-6 | Postgame — Missed Opportunities | Needs umpire zone data to estimate "should have challenged" moments for the scorecard. |
| ✅ D-7 | Umpire — Season-over-Season Chart | Needs multi-season historical accuracy data. |
| ✅ D-8 | Umpire — Pitch Type Breakdown | Needs per-pitch-type challenge data in DB. |
| D-9 | Export-to-PDF Briefing Sheet | Needs a PDF generation library (`@react-pdf/renderer` or similar). |
| D-10 | X Bot (`@absobs_bot`) | External: Twitter/X API, bot account, reply logic for mentions containing `absobs.io/v/`. |

---

## Audit Coverage Checklist

| Audit Section | Sprint | Status |
|---------------|--------|--------|
| Design System — Panel & Surface | S1-1, All | ✅ Embedded in rules |
| Design System — Chart Anatomy | S1-1, All | ✅ Embedded in rules |
| Design System — Tooltip Standard | S1-1 | ✅ Built ChartTooltip |
| Design System — Team Color Rules | All | ✅ Embedded in rules |
| Design System — Gradient Strategy | S3-5, S3-6 | ✅ S3-5, S3-6 |
| Design System — Challenge Indicator | S1-2, S1-3 | ✅ S1-2, S1-3 |
| Design System — CLS/WPA Attribution | D-1, D-2, D-3, D-4 | 🔲 Deferred (data) |
| Page 1 Preview — Matchup Radar fix | S3-9 | ✅ S3-9 |
| Page 1 Preview — Umpire Zone Briefing | S5-1 | ✅ S5-1 |
| Page 1 Preview — Challenge Timing bar | S5-2 | ✅ S5-2 |
| Page 1 Preview — Umpire × Team History | S5-3 / D-5 | ✅ S5-3 (UI) |
| Page 2 Live — At-Bat Context Strip | S5-4 | ✅ S5-4 |
| Page 2 Live — Live Event Feed | S5-5 | ✅ S5-5 |
| Page 2 Live — Challenge Burn Chart (Org) | S5-6 | ✅ S5-6 |
| Page 3 Post — AI Summary to top | S5-7 | ✅ S5-7 |
| Page 3 Post — WPA Waterfall fix | S5-8 | ✅ S5-8 |
| Page 3 Post — Strike Zone Plot promoted | S5-9 | ✅ S5-9 |
| Page 3 Post — Decision Scorecard | S5-10 / D-6 | ✅ S5-10 (UI) |
| Page 3 Post — Umpire Game Grade | S5-11 | ✅ S5-11 |
| Page 4 Teams — Scatter Plot logos | S3-1 | ✅ S3-1 |
| Page 4 Teams — Scatter Plot LG avg crosshair | S3-2 | ✅ S3-2 |
| Page 4 Teams — Floating MLB Avg row | S3-3 | ✅ S3-3 |
| Page 4 Teams — Trend sparkline | S3-4 | ✅ S3-4 |
| Page 5 Team — Dual-Line Trajectory | S3-5 | ✅ S3-5 |
| Page 5 Team — Inning Efficiency Heatmap | S3-6 | ✅ S3-6 |
| Page 5 Team — Home/Away Visual Bar | S3-7 | ✅ S3-7 |
| Page 5 Team — Schedule Strip status-aware | S3-8 | ✅ S3-8 |
| Page 6 Umpires — Distribution Histogram | S4-1 | ✅ S4-1 |
| Page 6 Umpires — Floating Umpire Avg row | S4-2 | ✅ S4-2 |
| Page 6 Umpires — Zone Archetype tag col | S4-3 | ✅ S4-3 |
| Page 6 Umpires — Confidence indicator | S4-4 | ✅ S4-4 |
| Page 7 Umpire — Percentile Rank KPI | S4-5 | ✅ S4-5 |
| Page 7 Umpire — Trajectory Home/Away toggle | S4-6 | ✅ S4-6 |
| Page 7 Umpire — Peer Comparison bar | S4-7 | ✅ S4-7 |
| Page 7 Umpire — Rhythm Chart late-inning callout | S4-8 | ✅ S4-8 |
| Page 7 Umpire — Zone Heatmap LG avg | S4-9 | ✅ S4-9 |
| Page 7 Umpire — Directional Bias rate + count | S4-10 | ✅ S4-10 |
| Page 8 Articles — Auto-open modal | S6-1 | ✅ S6-1 |
| Page 8 Articles — Fixed article grid | S6-2 | ✅ S6-2 |
| Page 8 Articles — Browse Archive button | S6-3 | ✅ S6-3 |
| Page 8 Articles — Calendar archive view | S6-4 | ✅ S6-4 |
| Page 8 Articles — Crumple transition UX | S6-5 | ✅ S6-5 |
| Home — Identity hero strip | S2-1 | ✅ S2-1 |
| Home — Game count before expand | S2-2 | ✅ S2-2 |
| Home — Today's Pulse strip | S2-3 | ✅ S2-3 |
| Home — Discovery Rail | S2-4 | ✅ S2-4 |
| Home — Reduce mt-32 gap | S2-5 | ✅ S2-5 |
| Home — Latest Debrief bar | S2-6 | ✅ S2-6 |
| Visualizer — /v/[vizId] shareable URL | S7-1 | ✅ S7-1 |
| Visualizer — In-chart attribution watermark | S7-2 | ✅ S7-2 |
| Visualizer — Tweet pre-population | S7-3 | ✅ S7-3 |
| Visualizer — OG meta tags | S7-4 | ✅ S7-4 |
| Visualizer — OG image API route | S7-5 | ✅ S7-5 |
| Copilot — Chat UI refactor | ✅ Done | ✅ Complete |
| Copilot — sessionStorage | ✅ Done | ✅ Complete |
| AIInsightBubble — Ask Follow Up wired | ✅ Done | ✅ Complete |
| Back navigation — BackPill component | S1-4 | ✅ S1-4 |
| Back navigation — All deep pages | S1-5 | ✅ S1-5 |
| Fan/Org Toggle | S8 | ✅ S8 |

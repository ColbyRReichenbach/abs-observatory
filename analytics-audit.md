# ABS Observatory — Analytics Design Audit v3
*Revised: March 5, 2026 — v3 incorporates feedback on strike zone chart placement, scatter plot logos, status-aware schedule indicators, and articles UX*

---

## Guiding Principles

### 1. Fan vs. Org View Toggle
The app can serve two audiences with fundamentally different needs. A single toggle — visible in the nav or as a sticky mode switcher — flips the page into one of two modes:

| | **Fan View** | **Org View** |
|-|---|---|
| **Tone** | Storytelling, drama, accessible | Tactical, dense, exportable |
| **Charts** | Visual-first, trend-focused | Table + chart combos, benchmarks |
| **Language** | "This umpire is way worse in late innings" | "Inning 7-9 overturn rate: +18pp vs. avg" |
| **KPIs** | 2–3 big hero stats | Full stat grid with deltas |
| **Extras** | Share buttons, social hooks | Filter strip, range controls, AI copilot |

This doesn't mean building two entirely different pages. Most components are the same — the toggle changes what's surfaced first, what's hidden behind a "See More", and how numbers are labeled. Think of it like a news article vs. its underlying data report.

### 2. Density Guidelines Per Page Type

Not every page needs the same density. Here's the target:

| Page | KPI Cards | Charts/Vizzes | Tables | Target Feel |
|------|-----------|----------------|--------|-------------|
| **Home** | 0 | 0 | 0 | Portal / Command Center |
| **Game Preview** | 3 | 3 | 0 | Intelligence Brief |
| **Live War Room** | 2 large | 2 | 1 (compact feed) | Broadcast Ticker |
| **Postgame AAR** | 4 | 2 | 1 | Forensic Report |
| **Teams Leaderboard** | 0 | 1 | 1 | Leaderboard |
| **Team Profile** | 4 | 3 | 2 | Deep Dive |
| **Umpire Leaderboard** | 0 | 1 | 1 | Leaderboard |
| **Umpire Profile** | 4 | 4 | 1 | Clinical Profile |
| **Articles** | — | 0 | 0 | Editorial |

**Rule of thumb:** If you can't explain every chart on the page in 5 seconds each, there are too many. Every chart earns its spot by being either immediately scannable or deeply rewarding on hover/interaction.

### 3. League Averages Are Context, Not Clutter
Benchmarks should appear as subtle reference lines, not as extra chart series. A dashed gray line labeled `LG AVG` on a chart is vastly more powerful than a second data series that fights for visual attention.

---

## Design System Standards

Every new chart, card, and visualization — on the home page or any analytics page — must follow these rules without exception. The existing design language is excellent; consistency is what elevates it from stylish to professional.

### Panel & Surface
| Element | Standard |
|---------|----------|
| Container | `.panel` class always (glassmorphism, `--radius-lg`, `border: var(--border-subtle)`) |
| Chart bg | `bg-white` or `bg-slate-50` inside the panel, never a raw background |
| Empty state | Dashed `border-2 border-dashed border-gray-200`, centered `--ink-3` muted text |

### Chart Anatomy
| Element | Standard |
|---------|----------|
| Grid lines | `rgba(0,0,0,0.05)` stroke, 1px — never full opaque black |
| Axes | `--ink-3` color (`#86868b`), 10px font, uppercase, 0.08em tracking |
| League avg line | Dashed `rgba(0,0,0,0.25)`, labeled `LG AVG` in `--ink-3`, 1px stroke |
| Animation | Recharts `animationDuration={800}` + `animationEasing="ease-out"` on all charts |
| Motion (Framer) | `--motion-mid` (320ms) duration, `--motion-ease-spring` easing |

### Tooltip Standard
Every chart tooltip must follow this exact format — no ad-hoc styling:
```
Background: white (#ffffff)
Border: 1px solid var(--border-subtle)
Border-radius: var(--radius-md) (14px)
Padding: 10px 14px
Box-shadow: same as .panel (0 8px 24px rgba(0,0,0,0.04))
Title: --ink-0, 11px, font-weight 700, uppercase, tracking-widest
Value: --ink-1, 13px, font-weight 600, mono where numeric
Label: --ink-3, 10px, regular weight
```
Implement as a shared `<ChartTooltip>` component that all recharts tooltips import.

### Team Color Rules in Charts
The `resolveTeamBranding(teamId)` function returns `teamPrimary`, `teamSecondary`, `teamAccentSoft` (20% alpha), and `teamAccentStrong` for all 30 teams. Use these tokens — never hardcode a hex for a team context.

| Chart Context | Color Rule |
|--------------|------------|
| **Single-team chart** (team profile) | Fill: `teamPrimary` · Area under line: `teamAccentSoft` |
| **Dual-team chart** (matchup, dual trajectory) | Home: home `teamPrimary` · Away: away `teamPrimary` · If colors are similar, add `strokeDasharray` to away instead of changing color |
| **Multi-team / league chart** (scatter, histogram) | Each team's dot/bar gets its `teamPrimary` · MLB Avg marker uses `--ink-3` (#86868b) |
| **Umpire charts** | No team affiliation — use `--accent-primary` (#0066cc) as default accent |
| **Dual-shading within one team** | Alternate `teamPrimary` and `teamPrimary + "88"` (50% alpha) — same pattern as `ChallengeAggressionRadial` |

### Team Primary + Secondary Gradient Strategy

Using only the primary color can feel flat. Blending primary and secondary adds richness without breaking brand identity. Possible in SVG-based components via recharts `<defs>` and `linearGradient`.

**When to use gradients vs. solid:**
| Use Case | Rule |
|----------|------|
| Area chart fill | `linearGradient`: `teamPrimary` at top (opacity 0.5) → `teamPrimary` at bottom (opacity 0.05) |
| Dual-series area (comparison) | Line 1: `teamPrimary` stroke + primary gradient fill · Line 2: `teamSecondary` stroke + secondary gradient fill |
| Bar charts | Solid `teamPrimary` bar fill (no gradient — cleaner on bars) |
| Dual bars (same team, off/def) | Bar 1: `teamPrimary` · Bar 2: `teamSecondary` |
| Radial bar | Alternate `teamPrimary` / `teamSecondary` by ring (as `ChallengeAggressionRadial` already does with opacity) |
| Heatmap | Gradient scale: `teamSecondary` (cold/low) → `teamPrimary` (hot/high) |

**Implementation note:** Every Recharts `AreaChart` that is team-scoped should define a `<linearGradient id="teamAreaGradient">` in its `<defs>` using the resolved team colors. Since `resolveTeamBranding` runs on the server, pass `teamPrimary` and `teamSecondary` as props to client chart components — never call the branding function in a client component.

### Challenge Indicator Redesign

> **Rename throughout:** Every instance of `"ammo"` in labels, comments, aria text, and UI copy is renamed to `"challenges"` or `"Challenge"`. No exceptions — `ChallengeHashes`, `absRemaining`, tooltips, all copy.

The `ChallengeHashes` component currently renders small square dots — active in amber/gold, inactive as empty outlines. The redesign extends this:

| State | Visual |
|-------|--------|
| **Available** | Filled amber/gold square (`--state-warning: #ffb800`) with a faint glow — same as today |
| **Used (result pending or confirmed wrong)** | Muted gray (`--ink-3`) with an `✕` SVG inside the square — clearly spent |
| **Used + overturned (won)** | Small green checkmark `✓` or filled green square with check — distinct from spent |

The amber/gold color (`#ffb800`) is already in the design system as `--state-warning` and is site-wide — not team-colored. This is intentional: on a game page with two teams, a team-colored indicator becomes ambiguous (whose challenge? what team color is dominant?). The gold is visually neutral and pops on both dark and light backgrounds.

**On game pages using both teams:** Each team row shows its own 2 (or 1) challenge indicator squares, labeled with the team name/logo. The gold/spent/check states apply to both rows identically.

### Challenge Leverage Score (WPA Attribution)

This feature is analytically valid — with careful framing. Here's the statistical breakdown and the recommended implementation:

**The math — three scenarios:**

| Scenario | Attribution Method |
|----------|-------------------|
| **Non-terminal count change** (2-2 called → 2-3, i.e., ball 2 becomes strike 3... wait, let's say 2-2 → 3-1 via ball called strike overturn) | Challenge WPA = `WPA(3-1 count, game state)` − `WPA(2-2 count, game state)`. Clean, published run-expectancy tables give this directly. The subsequent home run is an independent downstream event and gets its own WPA credit. |
| **Terminal pitch overturn** (strike 3 → ball 2, at-bat continues) | The challenge literally kept the at-bat alive. Any runs in the continuation of that at-bat have a *direct causal link* — the inning would have ended otherwise. Show: expected runs from that at-bat state + actual runs scored. |
| **Ball → strike** (batter got a gift, now struck out) | Challenge hurt the batter. WPA is negative from the batter's team perspective. |

**Your intuition is correct about the home run being partially independent.** The correct framing is:
- **Challenge itself:** worth the count-state WPA delta (e.g., `+2.8%` WP)
- **What happened next:** the home run adds more WPA, but that's the *batter's* WPA event, not the challenge's
- The exception: terminal overturn (would-have-been-out). If the at-bat should have ended, and instead produced runs, the full run expectancy of what followed is attributable to the challenge.

**Product recommendation: Add as Org-only, with Fan tooltip**

Call it **Challenge Leverage Score (CLS)** — a computed value at the moment the challenge is made:

```
CLS = WPA(post-challenge game state) − WPA(pre-challenge game state)
```

For fan view: show with a plain-language label — *"This challenge was worth +2.8% win probability."*  
For org view: show the raw number + a secondary "Inning Impact" soft-attribution if it was a terminal overturn: *"Kept inning alive. Team scored 2 runs on the continuation."*

**Where to surface it:**
- Postgame: Each row in the Forensic Pitch Log gets a `CLS` column — small, mono, colored (+green / -red / gray for 0)
- Postgame: The WPA Waterfall bars are already this! Re-label bar heights as `CLS` to make the nomenclature consistent
- Live War Room: The At-Bat Context Strip shows real-time CLS *potential* before a challenge is made: *"Correcting this 2-2 → 3-1 count here is worth ~+3.1% WP"* — tells the bench coach how valuable challenging NOW would be
- Umpire Profile: Aggregate CLS across all games — *"This umpire's miscalls have cost/given teams an average of +/-1.2% WP per game"*

**Research note:** MLB Statcast publishes pre-pitch win probability by game state + count. With that data, `CLS` is a computable real-time metric, not an estimate. The terminal-overturn "inning impact" is a soft attribution always labeled as such.

---

## Page 1 — Game Preview (Pregame Scouting Report)

**Layout philosophy:** This should feel like a printed match program — curated, confident, forward-looking. Not a data dump. Three hero panels maximum.

### Fan View
**The question it answers:** *"What should I know about tonight's game before the first pitch?"*

```
[ HERO: Matchup Overview Strip ]
  Team A logo • vs • Team B logo
  KPIs (3): Challenges Used per Game (each team) · Umpire Accuracy Rating · Tonight's Game #
  
[ ROW: 3 equal panels ]
  [1] Matchup Radar          [2] Umpire Zone Briefing     [3] Challenge Timing History
```

**Chart 1 — Matchup Radar (keep, but fix)**
5 axes, but all should differ per team:
- Challenges per 9 innings (off)
- Challenges per 9 innings (def)
- Overturn rate (offense) vs. league avg
- Overturn rate (defense) vs. league avg
- Avg challenges remaining at game end

Remove the two umpire axes — those belong in Chart 2.

**Chart 2 — Umpire Zone Briefing (redesign)**
Instead of a heuristic glow, use the real 4-quadrant zone bucket data from the umpire's profile. Show a clean 2×2 grid (Up/Down × Glove/Arm) colored red→green by overturn rate. Add a single callout stat below: *"Tonight's ump overturns XX% of challenges — league avg is YY%."* Add a league avg benchmark chip.

Fan label: *"Joe Smith struggles in the low-inside corner. Watch for challenge spots there."*
Org label: *"Low-Glove zone has 62% overturn rate. Brief your hitters on count situations."*

**Chart 3 — Challenge Timing History (redesign)**
This needs real aggregated data, not random numbers. Show per-inning challenge frequency as a simple small-multiple bar chart, one bar per inning, color is team brand. Two rows — home team and away team. Show a faint average-across-all-teams bar behind each one as reference. Compact, readable.

**New — Umpire × Team History Block** *(the most unique thing on this page)*
Has this umpire worked games involving these two teams before? Show:
- Team A vs. this umpire: X games, Y% overturn rate vs. league avg
- Team B vs. this umpire: X games, Y% overturn rate vs. league avg
- Visual: two horizontal bars side by side with a center league-avg line

Fan: *"The Cubs have challenged 45 calls with tonight's umpire and won 71% of them. This umpire is favorable for Chicago."*
Org: *"We're 12/18 (67%) against this umpire historically. Use your challenges aggressively."*

This is the killer feature of the pregame page. No other app has this.

### Org View Additions
Show the filter strip and range selector. Swap the radar's visual fill for a table comparison underneath it. Add a confidence score next to the umpire rating (based on sample size).

---

## Page 2 — Live War Room

**Layout philosophy:** This is a broadcast. Everything updates. The page should feel alive, tense, and instantly scannable. Two focal points max — the live meter and the ammo. Details live below the fold.

### Fan View
**The question it answers:** *"What's happening right now and does this challenge matter?"*

```
[ 2-col hero: ]
  [LEFT ~65%]  Live Momentum Meter (radial half-gauge, full width)
  [RIGHT ~35%] Ammo Stack (2 large animated tiles, stacked)

[ BELOW FOLD: ]
  [ At-Bat Context Strip — full width ]
  [ Live Event Feed (compact cards, most recent 3-4 visible) ]
```

**Chart 1 — Live Momentum Meter (modify)**
Keep the radial half-gauge concept. Fix the label so both team abbreviations and scores are shown prominently — currently they're tiny. Rebrand from "Win Probability" to "Momentum" unless a real WPA feed is wired up. Add a thin arc on the outside showing the swing direction of the last challenge event.

**Ammo Counters (keep, already great)**
No change needed structurally. Consider adding a visual "bullet" metaphor (3 filled/empty dots) beneath the number to show used vs. remaining at a glance alongside the number.

**New — At-Bat Context Strip (full-width bar)**
A one-line persistent strip that shows:
`Count: 1-2 · Runner on 2nd · 1 Out · This count → 52% league overturn rate · Tonight's ump: 61% overturn rate at 1-2`

No chart, just text + one color-coded stat. When it's a high-leverage count for challenging, the strip pulses amber. This is the most actionable real-time feature possible.

**Live Event Feed (replace sparse table)**
Instead of a full Challenge Explorer table, show a scrolling vertical feed of event cards. Each card is 3 lines tall:
- Inning tag + team icon
- Call description
- Outcome: green "OVERTURNED" or gray "CONFIRMED" + WPA shift badge

Max 4 visible, scrollable. The full table lives in postgame.

### Org View Additions
Show inning-by-inning challenge burn chart (horizontal dot plot, challenges used each inning). Add a "Projected Remaining" stat: at current pace of usage, will they still have a challenge in the 9th?

---

## Page 3 — Postgame (After-Action Report)

**Layout philosophy:** Forensic journalism. You already know the outcome — now understand why. Lead with the story, support with evidence, close with the archive. Three distinct chapters.

### Fan View
**The question it answers:** *"What were the most important moments and did this team make good decisions?"*

```
[ CHAPTER 1: The Story ]
  AI Match Summary — full width, newspaper column feel

[ CHAPTER 2: The Evidence ]
  [LEFT 60%]  WPA Swap Waterfall chart (full height)
  [RIGHT 40%] Challenge Decision Scorecard (2 team columns, A-F grade)

[ CHAPTER 3: The Archive ]
  Forensic Pitch Log (full table, filterable)
```

**AI Match Summary (move to top)**
This is the hook. It should be the first thing on the page, formatted like a short article byline — not buried below a chart.

**WPA Swap Waterfall (keep art direction, fix logic)**
This chart is the best in the app. The concept is right. The fix needed: color by *challenging team succeeding* (green) or *failing* (red), not by home/away favorability. Label bars with team abbreviation, not just inning. Add a horizontal zero line at 50%. Add a small annotation on the biggest shift: ★ "Game-changing moment."

**Strike Zone Plot (first-class feature — existing component)**
The `StrikeZonePlot` component already exists and is excellent — real pitch coordinates, count overlays, pitch type overlays, click-to-select, hover state, 4-color dot classification. It should be a prominent section on the postgame page, not buried inside the ChallengeExplorer table. Place it above the forensic pitch log as a standalone "Where Were the Calls?" section. The plot already supports `showCountOverlay` and `showPitchOverlay` props — expose these as toggle buttons above the chart. Add filter pills above: Batter / Pitcher / Inning / Outcome. Both Fan and Org mode show this chart; org mode unlocks all filter options.

Fan: *"Every challenged pitch, plotted exactly where it was. Tap one to see the full play."*
Org: Filter by pitcher to see which staff member generates the most challengeable calls.

**New — Challenge Decision Scorecard**
Two-column card (one per team):
- Correct challenges: N (overturned)
- Wrong challenges: N (lost)
- Missed opportunities: N (estimated from umpire zone data)
- Letter grade: A/B/C/D/F
- One sentence verdict: *"Smart, surgical use of challenge windows."*

Fan: Shareable accountability card. Org: Self-assessment, feeds next week's review.

**New — Umpire Game Grade Card (small, right sidebar)**
Umpire name, tonight's overturn rate, vs. career avg, vs. tonight's league avg. Simple ± delta. One clear grade.

### Org View Additions
Unlock a "Decision Timeline" tab in the pitch log annotated with: was it the right call? (based on umpire zone data) + was the game state appropriate for using a challenge?

---

## Page 4 — Teams Leaderboard (`/teams`)

**Layout philosophy:** Discovery surface. This page should help you find the most interesting team or confirm a suspicion. One visual overview + one clean ranked table.

```
[ HERO: Scatter Plot — Challenges vs. Overturn Rate ]
  Team logos (TeamIcon) as data points at (total challenges, overturn rate)
  Bold ⊕ MLB Avg crosshair at league average coordinates, labeled "MLB Avg"
  Dashed reference lines at avg X and avg Y creating 4 labeled quadrants
  Hover: tooltip with team name + key stats
  Click: navigate to team profile

[ TABLE: Ranked Leaderboard ]
  Columns: Rank, Team, Challenges, Success Rate (chip), Avg Unused, Trend (sparkline)
  Floating "MLB Avg" row inserted at the correct rank position: no number, MLB logo, italic values
  Sortable by any column
  Range selector above
```

The scatter plot acts as both a visualization AND a navigation device. The table is the detail. Neither should feel redundant — the scatter tells a story (which quadrant are you in?), the table gives you precision.

**Scatter Plot — Use Team Logos as Points**
Use the existing `TeamIcon` component as each data point instead of colored dots. Each logo sits at its (challenges, overturnRate) coordinate. On hover, a tooltip card shows team name + exact stats. Click navigates to the team profile. This is dramatically more readable and memorable than generic dots.

**League Average Marker on Scatter Plot**
Draw a bold crosshair reticle (`⊕`) at the (league avg challenges, league avg overturn rate) coordinate. Label it "MLB Avg" in small caps. This makes the four-quadrant system immediately actionable — you can see at a glance which teams are above/below average on both axes without needing to read numbers.

**Quadrant Labels:**
- Top-right: "Surgical" — high volume, high success
- Top-left: "Selective" — low volume, high success  
- Bottom-right: "Reckless" — high volume, low success
- Bottom-left: "Passive" — low volume, low success

**TABLE: Floating "MLB Avg" Row — Positioned at Actual Average Rank**
Do not pin the league average row to the top. Instead, calculate where the league average overturn rate lands in the actual sorted ranking, and insert the row there — between the teams above and below it. The row takes no numeric rank (the number column for this row shows `—` or the MLB logo badge), so team numbering continues uninterrupted: Cubs #15 → MLB Avg (no number) → Yankees #16. The row is visually distinguished — slightly muted background, MLB shield logo instead of a team icon, italic column values. This means the user instantly sees which teams are beating the league and which are below it.

**Trend Sparkline in table**
A 60px-wide line showing the team's overturn rate over the last 30 days. Rising = improving. No numbers needed.

---

## Page 5 — Team Profile (`/teams/[teamId]`)

**Layout philosophy:** A team's analytics "season report card." Tells sequential stories: who are we, how are we trending, what situations do we challenge in, who are the individual contributors, and how do umpires affect us. Each section is a beat.

### Fan View (4 KPIs · 3 charts · 2 tables)

```
[ HERO: Team Identity Banner (full width) ]
[ RECENT SCHEDULE STRIP (5 games with challenge outcomes annotated) ]

[ KPI ROW: 4 cards ]
  Challenges · Overturn Rate · vs. League Avg Delta · Avg Unused

[ SECTION 1: "How Are We Trending?" (2-col) ]
  [LEFT] Challenge Trajectory — dual line (Offensive + Defensive) over time
         League avg shown as dashed reference line on both
  [RIGHT] Inning Efficiency Heatmap — 9 rows (innings) × 2 cols (off/def)
          Each cell: color intensity = overturn rate. Immediately shows "we're bad in innings 1-3 on offense"

[ SECTION 2: "What Situations Do We Challenge In?" ]
  [FULL WIDTH] Challenge Aggression Radial (keep, already interactive)

[ SECTION 3: "Who's Involved?" (3-col) ]
  [LEFT] Home/Away Split → redesign as a visual 2-bar comparison, not a table
  [CENTER] Umpire Matchup Matrix (keep)
  [RIGHT] Pitching Bailout Leaderboard (keep)

[ SECTION 4: AI Copilot ]
```

**Dual-Line Trajectory Chart (new)**
Replace the single blended line with two lines: offensive challenge success and defensive challenge success, plotted per game over time. Both have a dashed league-avg reference. Immediately answers: are we better at challenging our own pitchers' calls or the opposing pitcher's calls?

**Inning Efficiency Heatmap (new)**
A 9×2 grid. Rows = innings 1–9. Columns = Offensive / Defensive. Each cell is colored on a green-to-red scale based on the team's overturn rate in that inning/situation combination. This is one of the densest charts on the page but reads instantly — you're looking for dark red cells (where the team wastes challenges) and dark green cells (where they should challenge more).

**Home/Away Split → Visual Bar**
Instead of a 2-row table, show two horizontal grouped bars side-by-side: one for home, one for away. Bar fill = success rate. Benchmark line = league avg for each split. Much more readable than a table with 2 rows.

**Schedule Strip → Status-Aware Indicators (not uniform)**
The strip contains past, live, and upcoming games — so a single indicator format won't work. Each card knows its status and renders accordingly:
- **Past game:** Show challenge outcome summary — e.g., `2/3 ✓` (overturned / total challenged) as a small badge. Green if winning ratio, amber if losing.
- **Live game:** Pulsing red dot + `● 2 remaining` showing the team's current ammo count in real time.
- **Upcoming game:** Show the assigned umpire's accuracy tier as a small colored chip — e.g., `Ump: 94% acc` in green, or a below-avg alert in amber. More useful than a future challenge outcome (which doesn't exist yet) and immediately actionable for fans and orgs alike.

This turns the schedule strip into a different kind of tool depending on where you are in the season.

### Org View Additions
Unlock the Filter Strip with: Inning Range, Leverage, Batter Side, Outcome. Expose the count-based challenge breakdown table (which pitch counts does this team challenge at, and what's the success rate). Show sample size confidence indicators on all rates.

---

## Page 6 — Umpires Leaderboard (`/umpires`)

**Layout philosophy:** Same structure as the teams leaderboard — one overview visual + one ranked table. Quick discovery, not deep analysis.

```
[ HERO: Distribution Histogram ]
  Bell curve / bar chart of all umpire accuracy ratings
  League avg marked as a bold vertical line, labeled "Umpire Avg"
  Outlier umpires labeled on the chart
  Click a bar: filter table to those umpires

[ TABLE: Ranked Leaderboard ]
  Columns: Rank, Umpire, Challenges Seen, Overturn Rate (chip), Games, Zone Archetype Tag, Confidence
  Floating "Umpire Avg" row inserted at the correct overturn rate position: no number, generic umpire badge icon, italic values
  Above-average umpires (lower overturn rate) sit above the row. Below-average sit below.
  Sortable
```

**Zone Archetype Tag (new column)**
A small pill tag derived from each umpire's dominant miss zone: `Low Zone Bias` · `High Zone Loose` · `Inside Strict` · `Balanced`. Scannable at a glance without clicking into the profile.

**Confidence Indicator**
Small sample-size badge next to overturn rate: `● Low` / `◉ Med` / `⬤ High` based on games worked. An umpire with 3 games worked at 100% accuracy shouldn't rank #1 without caveat.

---

## Page 7 — Umpire Profile (`/umpires/[umpireId]`)

**Layout philosophy:** A clinical dossier. The page has the most complex data of any in the app — the layout must breathe. Break it into clearly labeled sections with white space between them. Think of the sections as: *Who is this umpire? → How are they trending? → Where do they make mistakes? → When do they get worse? → What should you do about it?*

### Fan View (4 KPIs · 4 charts · 1 table)

```
[ HERO HEADER: Photo + Name + Summary Stats ]

[ GAMEDAY FEED: Scrollable horizontal (functional scroll buttons!) ]

[ KPI ROW: 4 cards ]
  Challenged Calls · Overturned · Accuracy Rating · Percentile Rank vs. All Umpires

[ SECTION 1: "How Are They Trending?" (2-col) ]
  [LEFT 65%] Accuracy Trajectory — game-by-game, with Home/Away toggle
             League avg dashed line always visible
  [RIGHT 35%] Peer Comparison Percentile Bar
              One horizontal bar: "This umpire is in the Nth percentile for accuracy"
              Sub-labels: Better than X% of umpires · Worse than Y%

[ SECTION 2: "Where Do They Make Mistakes?" (2-col) ]
  [LEFT] Zone Personality Heatmap (4-quadrant, real bucket data)
         Below it: " Challenges in this zone succeed X% — league avg is Y%"
  [RIGHT] Umpire Rhythm Chart (inning-by-inning accuracy)
          MUST have: dashed league-avg line + callout badge if ump degrades late
          Callout: "⚠ This umpire shows -X% accuracy in innings 7-9 vs. their early-inning baseline"

[ SECTION 3: "The Breakdown" (2-col) ]
  [LEFT] Directional Bias (S→B / B→S / etc.) — show rate AND count
  [RIGHT] Count Hotspot Table (keep, it's sharp already)

[ SECTION 4: Extreme Misses (keep) ]
[ SECTION 5: AI Copilot ]
```

**Percentile Rank KPI (new — replaces confirmed calls)**
Much more meaningful to fans and orgs than a raw count. *"23rd percentile accuracy"* immediately contextualizes this umpire's quality.

**Accuracy Trajectory with Home/Away toggle**
A toggle button on the chart panel: "All Games / Home / Away." When flipped, the line regenerates. Adds depth without adding visual clutter.

**Rhythm Chart — Late-Inning Callout (critical)**
If innings 7-9 accuracy drops >5pp below innings 1-3 accuracy, automatically show a banner below the chart:
> ⚠️ **Late-Game Fatigue Pattern Detected** — This umpire's accuracy drops significantly in late innings. Consider conserving a challenge until the 7th or later.

This single feature converts a chart into a decision recommendation.

**Directional Bias — Rate + Count (fix)**
Show: `14 overturns (58% rate)` on each bias card instead of just `14`. Raw count without rate is misleading for umpires with different game volumes.

**Zone Heatmap — add league avg comparison**
Below each quadrant, show: `This zone: 58% · League avg: 42%`. Turns a color into a number.

### Org View Additions
Unlock: season-over-season accuracy line chart. Pitch-type challenge breakdown (which pitch types get challenged most, which succeed most). Export-to-PDF briefing sheet button.

---

## Page 8 — Articles (`/articles`)

**Layout philosophy:** A premium editorial publication. No charts. No data tables. The newspaper aesthetic (`#fcf9f2` parchment, drop-caps, serif type) is already right — the structure needs work.

### Main View — The Daily Debrief

```
[ MASTHEAD: "The Daily Debrief" header — keep existing ]

[ AUTO-OPEN MODAL: Full-screen, frosted glass, on first load ]
  Today's / latest article — full headline, lede, "Read Full Debrief →" button
  Behind it: the article grid is visible but blurred
  Dismiss: small ✕ top-right, or Esc key
  (feels like a system push notification for the latest dispatch)

[ ARTICLE GRID: 3-col, 6–9 cards visible ]
  Card format: category tag + headline + date + 2-line lede
  No infinite scroll — fixed grid of recent pieces

[ "Browse Archive →" BUTTON ]
  Expands the grid via Framer Motion layout animation into:

[ CALENDAR ARCHIVE VIEW ]
  Reuses LeagueCalendar component pattern (already built)
  Month grid — days with articles show a dot / ink stamp
  Month navigation: prev/next arrows
  Click a day → article opens with crumple transition
  Empty days show nothing; no clutter

[ SIDEBAR (desktop only, right ~25%): ]
  Audit Log dark card (keep)
  Tag filters: Umpires / Teams / Daily Recap / ABS Rule Corner
```

The modal-on-load makes the latest article feel like a live editorial event, not just another card. The calendar archive turns browsing back-issues into something genuinely fun rather than a paginated list.

### Article Detail View — The "Crumple" UX

When a user clicks any article card:

1. **Press:** A CSS `perspective` + `rotateX/rotateY` keyframe fires — the card's corners fold inward and it compresses toward center (paper crumple, ~200ms)
2. **Expand:** As the crumple completes, `layoutId` Framer Motion shared-element transition fires — the card expands to fill the viewport (~300ms)
3. **Full article:** Single-column reading layout (max ~680px centered), newspaper serif, drop-cap first letter. Back button top-left: `← Return to Debrief`
4. **Back press:** Reverse — article crumples back into its card in the grid. `AnimatePresence` handles the exit animation.

```
[ ← Return to Debrief — top left ]
[ Category tag + Date ]
[ H1: Article Headline ]
[ ABS Observatory AI · March 5, 2026 ]
[ ────────────────────────────── ]
[ Drop-cap body — comfortable serif, justified ]
[ Inline linked chips: "View umpire profile →" ]
[ BOTTOM: 3 related article cards ]
```

**Key:** The crumple should feel fast and tactile — not overwrought. 200ms fold + 300ms expand. The reverse on back is equally snappy.

---

## Summary: What Changes Per View Toggle

| Feature | Fan | Org |
|---------|-----|-----|
| KPI labels | Plain English | Technical + delta vs. avg |
| Chart annotations | Story callouts ("⚠ Late-game weakness") | Numerical benchmarks |
| Range/filter controls | Hidden by default | Always visible |
| AI Copilot | Hero placement | Compact, sidebar |
| Trend lines | 1 line (blended) | 2 lines (off/def split) |
| Sample size indicators | Hidden | Always shown |
| Export controls | Hidden | Visible |
| Social / share buttons | Visible | Hidden |

---

## Page 0 — Home Page (`/`)

**Layout philosophy:** The front door. Everything else in the app is accessed from here. It needs to feel alive (real data moving), give someone an immediate reason to click something, and telegraph what kind of app this is within 3 seconds. No charts — this page is navigation and pulse.

### What Exists Today

| Component | What it does |
|-----------|-------------|
| `BroadcastStrip` | Auto-scrolling marquee of live games (score + inning) + recent challenge moments (overturned/confirmed). Clickable items link to game pages. |
| `GameStrip` | Horizontal scrolling strip of game cards (220px each) showing away/home score + status chip + inning icon. Sorted live first → scheduled → final. |
| `HomeExpandableGrid` | A single "Expand Games" button that reveals a full 3-col grid of `GameCard` components. Hidden by default. |
| `ChallengeMomentCards` | 3-col grid of the last 12 high-leverage challenge moments, each a link to that game. Colored left-border by outcome (overturned vs. confirmed). |

### What's Working
- **BroadcastStrip** is excellent — the auto-scrolling marquee sets the tone immediately. It's live data, it moves, it links. Keep it.
- **GameStrip** sorting logic (live → scheduled → final) is correct and clean. The spring animation on scroll is premium.
- **ChallengeMomentCards** correctly surfaces the leverage score and links back to the game. Good anchor for the bottom of the page.
- **GameCard** component has strong bones: team logos, ammo remaining dots, challenge count in footer.

### Issues Found

> [!NOTE]
> The `HomeExpandableGrid` is hidden behind a button by default. On most visits there will be zero live games — so the game strip shows empty cards and the expand button reveals "Stadium silence. No live games currently tracking." This is the user's first impression and it's dead. The page needs something compelling even with zero live games.

> [!NOTE]
> There is no navigation or discovery surface pointing users to Teams, Umpires, or Articles. The home page links only to individual game pages. A first-time user has no path to explore the broader app without using the nav bar.

> [!NOTE]
> The "Top Leverage Calls" section (`ChallengeMomentCards`) has a massive `mt-32` gap above it and is positioned very far down the page. Users have to scroll considerably to reach it.

> [!NOTE]
> `HomeExpandableGrid` collapses back to hidden on re-render and there's no visual indication of how many games are currently happening before you click "Expand Games."

> [!WARNING]
> The page has no hero content or identity moment. There's no headline, no tagline, no visual statement about what ABS Observatory is. A new user landing here sees a ticker + small game strip cards and has no context.

### Recommendations

**🔴 Add: Site Identity Hero**
Below the broadcast strip but above the game strip, add a brief but bold hero moment:
- `ABS OBSERVATORY` in large display font
- One-line descriptor: *"The definitive lens on MLB's challenge system."*
- No buttons, no cards — just confident framing. Takes up about 100px of vertical space and immediately tells visitors what they're looking at.

This is the equivalent of a newspaper's masthead — it's not a call to action, it's an identity anchor.

**🔴 Add: Discovery Rail — Teams & Umpires**
Above `ChallengeMomentCards`, insert a compact 2-section discovery rail:

```
[ SECTION: "Top Teams This Week" ]
  3 horizontally laid out team logo cards with: team name + overturn rate chip + rank badge
  "See All Teams →" link on the right

[ SECTION: "Umpires in the Spotlight" ]
  3 umpire name cards with: accuracy badge + zone archetype tag
  "See All Umpires →" link on the right
```

These are navigation entry points disguised as content. Clicking a card goes to the team/umpire profile. This is how the user discovers the rest of the app organically without relying on the nav.

Fan: *"Who are the best teams at challenging right now?"* — clicks, goes to team profile, gets hooked.
Org: *"Who's umpiring this week and how are they performing?"* — same entry point.

**🟡 Modify: HomeExpandableGrid → Show Game Count Before Expand**
Change the "Expand Games" button label to include the count: `▸ See All 8 Games` or `▸ 0 Games Today` (grayed, non-expandable). This sets expectations before the click. When there are zero games, hide the section entirely — don't show an empty state as the centerpiece.

**🟢 Add: "Today's Pulse" Stat Strip**
A single horizontal strip of 4 numbers — all league-wide, all today:
- Games tracked today
- Total challenges today  
- Success rate today vs. season avg
- Most challenged umpire today (name, accuracy chip)

This can be computed server-side and is extremely cheap to render. It makes the page feel like it has a daily heartbeat even when no games are live.

```
  15 games  ·  38 challenges  ·  54.2% success (+3.1% vs avg)  ·  Ump: Joe West 44%
```

**🟡 Reduce Vertical Gap** 
The `mt-32` before "Top Leverage Calls" is excessive. Cut it to `mt-16`. The page currently has too much dead space between the game strip and the moments section.

**🟢 Add: "Latest From the Debrief" Teaser**
At the very bottom of the page, above the footer, a narrow full-width bar linking to the latest article:
```
  📰  The Daily Debrief  ·  "Tipping the Scales: The Umpire's Ghost"  →  Read Now
```
Dark background, single line of text. Drives traffic to Articles and reinforces the editorial identity of the platform.

### Revised Home Page Layout

```
[ BROADCAST STRIP — scrolling ticker, keep as-is ]

[ HERO IDENTITY — "ABS Observatory" + one-line descriptor, ~100px ]

[ GAME STRIP — keep, add game count to expand button ]

[ TODAY'S PULSE — 4-stat horizontal strip, server-rendered ]

[ DISCOVERY RAIL ]
  Top 3 Teams This Week  ·  Top 3 Umpires This Week
  (clickable cards → profiles)

[ TOP LEVERAGE CALLS — ChallengeMomentCards, reduce gap ]

[ LATEST DEBRIEF BAR — dark strip linking to articles ]
```

This layout gives every section a clear job:
- Ticker = Live updates
- Hero = Identity
- Game Strip = Today's action  
- Pulse = Context
- Discovery Rail = Navigate deeper
- Moments = Drama
- Debrief Bar = Editorial

---

## Visualizer Share UX — `AIBSVisualizerChat`

### What Currently Exists

The `AIBSVisualizerChat` component is on team and umpire profile pages. It has:
- A free-text input that submits a visualization query
- A placeholder `aspect-[21/9]` chart area (real AI render pending)
- An X share button → `x.com/intent/tweet` with generic text + current page URL
- A "Share Link" copy-to-clipboard button
- Footer attribution: *"Built via aiBS a creation by Colby Reichenbach"* and *"ABS Observatory © 2026"* — both in 8–10px gray text outside the chart area (won't survive a screenshot crop)

### Problems

> [!WARNING]
> The share button links to the **current team/umpire profile page**, not a unique URL for the generated visualization. Every share from the Cubs page links to the same Cubs page regardless of what was generated.

> [!NOTE]
> Attribution text is outside the chart SVG. It won't appear in screenshots or when the chart is cropped. Branding needs to live inside the chart's SVG viewport to survive social sharing.

> [!NOTE]
> Tweet text is generic: *"Check out this custom [context] visualization I generated on ABS Observatory!"* — users will delete it. Needs a specific stat hook to earn the post.

### Shareable Visualization URL — `/v/[vizId]`

The highest-leverage change: generate a unique URL per visualization.

1. When an AI visualization is generated, store query + result in DB with a short ID (already generating `Math.random().toString(36).substring(7)` — use this)
2. Route: `/v/[vizId]` — a standalone full-page view showing only the chart with full tooltips, interactivity, branding, and site nav
3. This URL (not the profile page URL) is what gets shared

**Why this matters:** Every share becomes a landing page. Clicking the shared link opens the live interactive chart, not a generic profile. The nav is visible, the site brand is apparent, and the visitor has a natural path to explore further. Each viz URL is a low-friction conversion funnel.

### In-Chart Attribution Watermark

Add a fixed SVG `<text>` element anchored to the bottom-right of every chart's SVG viewport:

```
absobs.io  •  @ColbyReichenbach
```

- Font: 8–9px mono, `--ink-3` gray (`#86868b`)
- Always rendered inside the SVG — survives all cropping and screenshot methods
- On the live web page: wrap in SVG `<a>` tags linking to the site and X profile (clickable in browser, static in screenshots)
- One line only — two lines looks spammy

### Tweet Pre-population

Replace the generic string with a context-aware template that includes one specific stat pulled from the AI result:

```
Just visualized [Team/Umpire] ABS data on @absobs_bot 📊

[One specific stat from result — e.g. "Cubs: +14% above league avg in late-game challenges"]

Build yours → absobs.io/v/[vizId]
```

**Rules:**
- Keep under 200 chars (URL takes ~23 under t.co)
- Include one real number — this is what stops users from deleting it
- `@absobs_bot` mention so the bot can auto-reply and amplify
- Skip hashtags — they look algorithmic and reduce credibility

### Open Graph Tags for Rich Link Preview

On each `/v/[vizId]` page, set:
```html
<meta property="og:title" content="[Query] — ABS Observatory" />
<meta property="og:description" content="[One-sentence AI result summary]" />
<meta property="og:image" content="/api/viz-og/[vizId]" />  <!-- server-rendered PNG -->
<meta name="twitter:card" content="summary_large_image" />
```

The `og:image` API route server-renders the chart as a PNG using `@vercel/og` or `satori`. The link preview on X **looks** like a chart image, but clicking it opens the live interactive page. This is the best possible social card — visual impact of a screenshot with the conversion power of a link.

### X Bot Integration

When the bot (`@absobs_bot`) is mentioned in a tweet containing `absobs.io/v/`, it auto-replies with:
- A short follow-up insight on the same team/umpire
- A link to the umpire or team profile page
- Optional: quote-tweet with a different chart perspective

This creates a closed loop: user shares → bot amplifies → bot's followers see the thread → new users discover the site.

### Priority Build Order

| Priority | Feature |
|---------|---------|
| 🔴 High | Unique `/v/[vizId]` URL per generated chart |
| 🔴 High | In-SVG watermark: `absobs.io • @ColbyReichenbach` |
| 🔴 High | Tweet text with 1 real stat from AI result |
| 🟡 Med | `/api/viz-og/[vizId]` server-rendered `og:image` PNG |
| 🟡 Med | OG meta tags on each viz page |
| 🟢 Nice | SVG `<a>` clickable attribution on live page |
| 🟢 Nice | `@absobs_bot` auto-reply on tagged tweets |

---

## Copilot FAB — Chat UI Refactor

**Changes implemented:**
- Rewrote from one-shot Q&A to persistent chat thread (`messages[]` array). User bubbles right (black), AI bubbles left (blue). All history stays visible.
- Baseball arc typing indicator — `⚾` animates in a parabolic arc with spin while AI responds. Replaces `BaseballSpinner`.
- Input always visible at the bottom. No more hiding during loading or when a result is shown.
- Panel widened to 520px (mobile: `min(520px, calc(100vw - 32px))`) to accommodate tabular data.
- `result.rows` now renders as a compact `data-table` (10 rows + "+N more" overflow).
- Drag constraints bound to `window.innerWidth/Height` — panel cannot leave the viewport.
- aiBS icon + "aiBS Copilot" label in panel header with blue pulse dot.
- "Clear" button in header clears thread + sessionStorage.
- Listens for `open-copilot` custom event from `AIInsightBubble`.

**`AIInsightBubble` — Ask Follow Up wired:**
- "Ask Follow Up" chevron now `onClick` dispatches `open-copilot` custom event with `detail: { prefill: insight }`, then closes the bubble. The copilot FAB opens focused with the insight text pre-filled.

**sessionStorage persistence:**
- Chat messages are persisted to `sessionStorage` under key `aibs-copilot-messages`.
- On mount, messages are hydrated from storage — the conversation survives client-side navigations (Next.js soft routes).
- Session clears on tab close / hard refresh (intentional — not a persistent history log).
- "Clear" button also calls `sessionStorage.removeItem` to fully reset.
- Storage write is wrapped in `try/catch` for private browsing / quota edge cases.

---

## In-Page Back Navigation

Currently the only way to go back is the ABS Observatory logo in the navbar, which always returns to `/`. Deep pages (team profiles, umpire profiles, game hubs) have no contextual back path. This should be fixed with a small, tasteful contextual back pill that does not compete with the page.

### Design Spec

A single pill in the top-left of every deep page that has a clear parent. One level up only — not a full breadcrumb trail.

```
← Teams          on /teams/[teamId]
← Umpires        on /umpires/[umpireId]
← Schedule       on /game/[gamePk]
← Daily Debrief  on /articles/[slug]
```

**Anatomy:** `[ ← ChevronLeft 12px ]  [ Parent label — 10px font-black uppercase tracking-widest ]`

**Styling (on-brand, no new tokens):**
- `bg-white/70 backdrop-blur-sm` glass surface — matches `.panel` language
- `border border-[var(--border-subtle)]` · `rounded-full px-4 py-2`
- `text-[10px] font-black uppercase tracking-[0.08em] text-[var(--ink-2)]`
- Hover: `bg-white border-[var(--border-medium)] text-[var(--ink-0)]` + `translateX(-2px)` on the chevron
- Transition: `var(--motion-fast)` `var(--motion-apple-ease)`

**Positioning:** `absolute top-6 left-6` inside the page's outermost container — small enough to sit in the hero without consuming layout space.

**Where it appears:**
| Page | Label | Behavior |
|------|-------|----------|
| `/teams/[teamId]` | `← Teams` | Hard link to `/teams` |
| `/umpires/[umpireId]` | `← Umpires` | Hard link to `/umpires` |
| `/game/[gamePk]` (any hub) | `← Schedule` | `router.back()` — respects referrer |
| `/reports/[gamePk]` | `← Game` | Hard link to `/game/[gamePk]` (gamePk is in the URL already) |
| `/articles/[slug]` | `← Daily Debrief` | Hard link to `/articles` |
| `/v/[vizId]` *(proposed)* | `← ABS Observatory` | `router.back()` if same-domain referrer, else hard link to `/` |

**Pages with no back pill needed:**
- `/` `/teams` `/umpires` `/articles` — top-level nav pages
- `/query` — developer/internal tool, not in the user-facing nav
- `/about` — reached directly from the nav, no parent page context

**Why `router.back()` for games but hard links elsewhere:** Team and umpire profiles can be reached via direct URL share, so `router.back()` could exit the site. Game pages and report pages are always reached through in-app navigation so back-history is reliable.

**What it is not:** Not a sticky floating element covering content. Not a full breadcrumb bar. One pill, one level, disappears on top-level pages.

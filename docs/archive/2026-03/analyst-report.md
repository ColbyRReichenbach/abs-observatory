# ABS Observatory — Analyst Report

> Superseded as a source-of-truth planning document by [product-source-of-truth.md](../../product/product-source-of-truth.md). Keep this file for historical analysis and rationale only.

*Written from the perspective of a baseball analyst evaluating the platform for operational and fan-facing utility.*

---

## Methodology

I reviewed every page's chart components, their underlying data structures, and the dual org/fan view split. The core question for each chart: **Is this telling me something I don't already know from another chart on this page, and does it drive a decision or create a compelling moment?**

---

## PAGE 1: Home Page (`/`)

### Current State Assessment

The home page functions as a digest — live games, top teams, top umpires, high-leverage calls. The bones are solid but the data storytelling is thin.

**What works:**
- Live game strip is essential and well-placed
- Challenge moment cards (high-leverage overturned calls) are excellent fan-facing content — shareable, dramatic

**What's wrong:**

| Element | Problem |
|---|---|
| Top Teams (3 teams, overturn rate only) | One metric shown for 3 teams tells me nothing about *why* they lead or what's driving it |
| Umpires in Spotlight (lowest overturn rate) | This shows the *best* umpires — completely backwards for fan interest; most fans want controversial, not accurate |
| Season stats strip (games, challenges, success rate) | Three numbers in a sentence — zero visual impact, easy to ignore |
| No league-wide trend context | Is the overall ABS overturn rate going up or down this season? That's the macro story and it's absent |

**The headline insight is missing:** "What is the ABS system telling us about the state of officiating?" That question drives everything, and the home page never answers it.

---

### Proposed Rework

**ORG Home View:**
1. **Replace "Top Teams" spotlight** → `League Challenge Efficiency Matrix`: A compact table showing top 5 teams by *challenge efficiency score* (overturn rate × avg challenges conserved), signaling which teams are managing the window best operationally
2. **Replace "Umpires in Spotlight"** → `Umpire Watch List`: The 3 umpires with the *highest* overturn rates this week — actionable prep intel for upcoming series matchups
3. **Add `Season Trend Sparkline` in the stats strip** — a mini line chart showing season-to-date overturn rate trajectory (is ABS catching more errors as the season progresses, or fewer?)
4. **Live War Room Feed** — for in-progress games, surface live challenge remaining counters directly on the home page (team A has 0 left in the 7th is critical intel)

**FAN Home View:**
1. **Hero "Today's Most Controversial Call"** — single featured challenge moment with a zone map, inning/count/score context, and the ABS result. Auto-updated daily. Highly shareable.
2. **"The Ump Report Card" widget** — Today's scheduled umpires with their overturn rate badge (A/B/C/D/F style grade). Fans care who's behind the plate.
3. **Replace stats strip with `Season Accuracy Gauge`** — A large single donut or gauge showing league-wide ABS accuracy this season with a historical comparison annotation ("Last season: 91.2%")
4. **"This Week's Controversy Rankings"** — Top 5 umpires by this week's overturn rate with team logos of affected teams. Creates talking points.

---

## PAGE 2: Team Leaderboard (`/teams`)

### Current State Assessment

**What works:**
- The scatter plot (challenges vs overturn rate) is genuinely insightful — it separates teams that challenge frequently from those that challenge accurately. This is good quadrant analysis.
- Trend sparklines in the table are a nice touch

**What's wrong:**

| Element | Problem |
|---|---|
| Scatter plot + table both show challenges & overturn rate | Direct redundancy — the scatter plot visualizes exactly what the table numerates. Pick one or differentiate. |
| Scatter plot axes are volume vs rate | Volume alone isn't meaningful — a team that challenges 50 times in 160 games is different from one that challenges 50 times in 60 games. Should normalize by games played. |
| "Avg Remaining" in table | Without context this is uninterpretable. High remaining = conservative team? Or team that wins challenges early? |
| Sparkline size | Too small in table rows to extract signal |
| No situational context | Which teams challenge in high-leverage situations? Which ones burn challenges in the 2nd inning? |

---

### Proposed Rework

**ORG Leaderboard View:**
1. **Rework the scatter plot** → `Strategic Efficiency Quadrant`: Change X-axis to "Challenge Rate per Game" (normalized) and Y-axis to "Overturn Rate". Add a 4-quadrant overlay with labels:
   - Top-right: "High-frequency, high-success" (elite challengers)
   - Top-left: "Conservative, high-success" (disciplined)
   - Bottom-right: "High-frequency, low-success" (trigger-happy, burning window)
   - Bottom-left: "Low-frequency, low-success" (passive and losing)
   This is immediately actionable.
2. **Replace trend sparklines in table** → Small `30-day overturn rate bars` with a directional arrow (↑↓→) showing recent trend
3. **Add `Challenge Timing Index` column** — What % of each team's challenges come in high-leverage situations (7th inning+, within 2 runs)? Org-only column. This identifies strategically disciplined teams vs reactive ones.
4. **Remove redundant volume columns** — Consolidate "Challenges" and "Successful" into just "Overturn Rate" and "Challenge Rate/Game". The raw counts are table noise.

**FAN Leaderboard View:**
1. **Replace the scatter plot entirely** → `Animated Ranking Bar Chart` — Horizontal bars by overturn rate, team colors, sorted by performance. Clean, immediately readable, and visually shareable.
2. **Add "Challenge Style" personality label** per team: "Trigger-Happy", "Calculated", "Conservative", "Clutch" derived from challenge timing patterns. Fans love team archetypes.
3. **Keep simplified table** — Rank, Team, Overturn Rate, Challenge Style label only. Remove operational columns (avg remaining, games tracked).
4. **Feature "Biggest Mover" callout** — Which team improved/dropped most in overturn rate vs prior period? Single highlighted callout card at top.

---

## PAGE 3: Individual Team Page (`/teams/[teamId]`)

### Current State Assessment

This is the most chart-dense page and has the most significant redundancy problems.

**What works:**
- Hitter's Eye Heatmap — excellent. Pitch location challenge data is genuinely unique insight
- Umpire Matchup Matrix — critical for org, clearly differentiated
- KPI cards — standard and useful
- Schedule morph — good contextual anchor

**What's critically wrong:**

| Element | Problem |
|---|---|
| Challenge Trajectory (dual line: success % AND failure %) | **Severe redundancy** — success + failure = 100% always. The failure line is literally the inverse of the success line. Two lines showing one piece of information. |
| Challenge Aggression Radial (polar chart: inning ranges + offense/defense) | Combines two categorizations in one radial, which is visually confusing. Worse: the same inning×side data already appears in the Inning Efficiency Heatmap below. |
| Inning Efficiency Heatmap | Overlaps heavily with the aggression radial above it. Both show challenge patterns by inning and offensive/defensive side. |
| Home/Away Split (two progress bars) | Way too simple. Two bars that show one number each. This is a KPI card, not a chart. |
| Pitching Bailouts Leaderboard | The concept is interesting but "bailout" framing is unclear. Is this pitchers who needed ABS the most? Or who benefited most? |

The team page has **3 charts essentially showing inning/situational breakdown** (radial, inning heatmap, home/away) when one comprehensive chart would be cleaner and more actionable.

---

### Proposed Rework

**ORG Team View (6 charts max):**

1. **Keep: KPI Cards** — Standard, necessary
2. **Keep: Hitter's Eye Heatmap** — Genuinely unique, org-relevant
3. **Rework Challenge Trajectory** → Single line (overturn rate over time) + add a second Y-axis for "challenges remaining avg" per game period. This answers: "Are we winning challenges AND conserving the window?" Dual metrics, single chart, no redundancy.
4. **Consolidate Aggression Radial + Inning Heatmap** → `Situational Decision Matrix`: A proper 4×3 heatmap — Rows: Early/Middle/Late/Extras, Columns: Offense/Defense/High-Leverage. Cells show challenge count + color for overturn rate. One chart instead of two.
5. **Expand Home/Away Split** → `Context Split Analysis`: Replace simple bars with a 2-column layout showing: overturn rate, challenge rate/game, high-leverage challenge rate, and avg remaining — for home vs away. Makes the split actually insightful.
6. **Keep: Umpire Matchup Matrix** — org-critical, unique
7. **Rename + Contextualize Pitching Bailouts** → `ABS Reliance Report`: Show pitcher, # of challenges on their pitches, challenge success rate, and what the "value above average" of ABS was for them. Helps identify which pitchers benefit disproportionately from the system.
8. **Remove: Aggression Radial** (consolidated above)
9. **Remove: Inning Efficiency Heatmap** (consolidated above)

**FAN Team View (5 charts max):**

1. **Keep: KPI Cards** (simplified — just overturn rate, total challenges, season rank)
2. **"Best Moments" Feed** — Replace schedule morph with a card feed of the team's most dramatic overturned calls this season. Each card: inning, count, what was called, what ABS said. Fans love these.
3. **Overturn Rate Trend** — Single clean line chart with game-by-game results, annotated with notable moments (e.g., a dot labeled "walked-off via ABS challenge")
4. **"Which Umpires Do We Dominate?"** — Simplified umpire matchup showing 3 best and 3 worst umpire matchups as a visual win/loss comparison. Creates talking points ("We're 8-1 in ABS challenges with this ump")
5. **Strike Zone Personality Map** — Keep the Hitter's Eye Heatmap but make it visually bolder with a full strike zone overlay. Fans love seeing where pitches are. Add a caption: "Where this team challenges most" with arrows showing top zones.

---

## PAGE 4: Umpire Leaderboard (`/umpires`)

### Current State Assessment

**What works:**
- Distribution histogram is a smart orientation chart — shows the umpire "population" before diving into individual rankings
- Zone archetype labels (Balanced, Inside Strict, Wide Zone, High Zone Loose) are a nice heuristic

**What's wrong:**

| Element | Problem |
|---|---|
| Zone archetype derived from overturn rate only | "Inside Strict" should be based on directional bias data (S→B vs B→S), not raw overturn rate. Using rate alone means a high-overturn umpire gets labeled "High Zone Loose" without any actual zone location data. Misleading. |
| Distribution histogram shows overturn rate distribution | Useful but limited — doesn't show consistency (variance), improvement trends, or stakes |
| No umpire scheduling context | Which umpires have upcoming assignments this week? That's the most operationally relevant info for ORG view |
| Confidence indicator hidden behind org toggle | Sample size matters for everyone — even fans should see when a number is based on 3 games |

---

### Proposed Rework

**ORG Leaderboard View:**

1. **Replace Distribution Histogram** → `Umpire Consistency Scatter`: X-axis: overall overturn rate, Y-axis: game-to-game standard deviation (consistency). An umpire with 35% overturn rate and high variance is more dangerous than one with 42% but predictable. Quadrant labels: "Reliable Accurate", "Reliably Problematic", "Volatile Accurate", "Volatile Problematic"
2. **Add `This Week's Crew Assignments` section** — Compact list of umpires working this week with their overturn rates, so teams can prep for upcoming series. This is the most operationally valuable thing the umpire page could show.
3. **Fix zone archetype labels** — Derive from actual directional bias data (S→B rate vs B→S rate) not raw overturn rate. "Ball-Friendly", "Strike-Friendly", "Balanced", "Erratic" would be more accurate archetypes.
4. **Table column enhancement** — Add "Streak" column showing last 3 games (↑↑↓ trend arrows based on per-game overturn rate)

**FAN Leaderboard View:**

1. **Replace histogram** → `"The Ump Scale" Visual` — A horizontal spectrum with umpire dots ranging from "Never Wrong" to "Perpetually Challenged". Make it playful. Color-coded. Team logos showing which teams are most affected by each extreme.
2. **Keep table** but add: a "Controversies" count (how many extreme misses this season) and a "Teams Most Affected" mini-logo cluster
3. **"Most Improved" and "Most Declined"** callout cards — Year-over-year change in overturn rate highlighted for 2 specific umpires. Creates narrative.
4. **Remove confidence indicator** from the column header (it creates visual clutter). Instead, just dim the row styling for low-sample umpires and add a tooltip.

---

## PAGE 5: Individual Umpire Page (`/umpires/[umpireId]`)

### Current State Assessment

This page is the most data-rich in the app and has the most charts, but several are redundant and the page structure doesn't build a clear narrative.

**What works:**
- Directional Bias Cards (S→B vs B→S) — **the single most valuable chart on this page.** Knowing if an umpire squeezes strikes or gifts balls is directly actionable.
- Pitch Type Breakdown — excellent, unique, operationally relevant
- Umpire Rhythm Chart (accuracy by inning) — great for both audiences
- Extreme Misses — perfect fan content

**What's critically wrong:**

| Element | Problem |
|---|---|
| Accuracy Trajectory + KPI cards | Accuracy trajectory shows overturn rate over time. KPI cards show overall overturn rate. These tell the same story at different resolutions. One needs to go or be repurposed. |
| Zone heatmap (only 4 zones: up/down/glove/arm) | 4 zones is far too coarse for meaningful zone analysis. Can't distinguish inside-corner squeeze from low-and-away extension. The data supports more granular zone analysis from `px/pz` fields. |
| Heatmap Deep Dive table | An entire section that's a raw data dump of challenges in specific zones. This is a debugging tool, not a visualization. |
| Peer Comparison bar (single horizontal progress bar) | One percentile bar could just be a text in the KPI cards. It doesn't justify its own section. |
| Season-Over-Season chart | Shows year-over-year comparison but ABS is new — in 2026 there may only be 1-2 years of data. This chart has almost no data to display and creates a nearly empty chart. |
| Count Hotspots table (top 6 counts by challenge frequency) | Good concept, wrong format. A table of 6 rows is fine, but it buries what should be a visual insight: count profiles that create most controversy. |

The umpire page has **11 distinct visualization sections** — that's too many. The page doesn't have a clear analytical narrative; it's a data dump.

---

### Proposed Rework

**Narrative structure for umpire page:** The page should answer 3 questions in order:
1. *How accurate is this umpire overall?* (Summary + trend)
2. *Where and when do they make mistakes?* (Zone + situational patterns)
3. *What does this mean in practice?* (Bias, pitch types, extremes)

**ORG Umpire View (7 sections):**

1. **Keep: KPI Cards** — Add a 5th card: "S→B Rate / B→S Rate" ratio as a single derived metric showing lean direction. The ratio is more actionable than raw counts.
2. **Rework Accuracy Trajectory** → `Rolling Accuracy Window`: Show 5-game rolling average instead of raw game-by-game. Smooths noise, shows real trends. Add a horizontal league average reference line. This + KPI cards together answer question 1 without redundancy.
3. **Remove: Peer Comparison Bar** — Fold percentile into a KPI card. Single bar chart doesn't justify a full section.
4. **Upgrade Zone Heatmap** → `Full 9-Zone Strike Zone Map`: Use actual px/pz data to build a proper 9-cell or 16-cell strike zone visualization. Color cells by overturn rate, size cells by challenge volume. Where does this umpire have blind spots?
5. **Expand Directional Bias Cards** → `Bias Analysis Panel`: Add the count breakdown alongside directional bias — "In 2-0 counts, this umpire has 67% S→B overturns" (pitchers think it's a strike, ABS says ball). This is elite-level prep data.
6. **Keep: Pitch Type Breakdown** — unique, actionable
7. **Keep: Umpire Rhythm Chart** — actionable, unique
8. **Remove: Heatmap Deep Dive table** — raw data, not visualization
9. **Remove: Season-Over-Season** — insufficient historical data
10. **Consolidate Count Hotspots** into the Bias Analysis Panel as a supporting table

**FAN Umpire View (5 sections):**

1. **"Ump Report Card"** — Replace KPI cards with a visual grade card (A-F) with fun descriptor: "Robotic Accurate", "Inconsistently Human", "Fan Favorite Target". Shareable, creates dialogue.
2. **"The Blown Calls" Gallery** — Promote Extreme Misses to the hero section. Show top 5 most egregious calls with a zone dot chart showing where the pitch was vs the strike zone boundary. This is the most shareable content on the page.
3. **Inning Accuracy Chart** — Keep Rhythm chart, rename "Does [Name] Get Tired?" with direct annotations: "Accuracy drops 4.2 points after the 6th inning"
4. **"Call Personality Profile"** — A fun visual derived from directional bias and pitch type data. Is this ump "Fastball-Friendly"? "High Zone Hawk"? "Late-Inning Loose"? Single infographic card.
5. **5-Game Recent Feed** — Keep the recent gameday feed for context

---

## PAGE 6: Game Hub (`/game/[gamePk]`)

### Current State Assessment

The game hub is operationally sound and state-based — it correctly shows different content for pregame/live/postgame. This is the most purpose-built page and has the least redundancy.

**What works:**
- State-based routing (pregame/live/postgame) is smart architecture
- Live challenge counters (ABS remaining) are critical in-game info
- Pitch timeline gives play-by-play context

**What could be better:**

| Element | Problem |
|---|---|
| Pregame scouting — umpire context unclear | The pregame state should prominently feature today's umpire's key metrics (overturn rate, directional bias, count hotspots) — this is the most actionable pregame intel available |
| Postgame AAR is AI narrative only | A purely text report lacks visual anchors — what were the 2-3 most important challenge moments visually? |
| No risk score displayed live | The estimated overturn probability exists in the data context but unclear if surfaced prominently during live state |

---

### Proposed Rework

**ORG Game View:**

1. **Pregame State** — Add an `Umpire Intel Card` as the top section: today's umpire's overturn rate, directional bias lean (S→B or B→S), and their top 3 most-challenged count states. This is the #1 thing a bench coach wants before the game.
2. **Live State** — Make the `estimated overturn probability` a prominent visual element (large percentage badge) that updates with each new challenge context. "72% chance of overturn" is gameday intel.
3. **Postgame State** — Add a `Game Challenge Map` visual: a mini timeline showing each inning, when challenges occurred, and their outcomes (dot: green=overturned, red=confirmed). One glance shows the challenge narrative of the game.

**FAN Game View:**

1. **Pregame** — Add `"Know Your Ump Tonight"` card with umpire photo, overall grade, and their most controversial call type. Fans love pre-game narrative.
2. **Live** — Add `"Challenge Heat Meter"` — a visual that shows how many challenges remain for each team + a sense of urgency as they deplete. Makes abstract count feel dramatic.
3. **Postgame** — Feature the single `"Best Call of the Game"` and `"Worst Call of the Game"` as hero cards at the top of the AAR before the narrative text.

---

## PAGE 7: AI Copilot Query Page (`/query`)

### Current State Assessment

The query page is a raw text I/O interface. It works but has no visual scaffolding to guide users toward insightful questions, and results come back as plain text with no visual reinforcement.

**What's wrong:**
- No suggested queries to onboard users to what's possible
- Results are text + JSON dump of tool calls — not designed for consumption
- No visual output — the AI answer could reference charts that aren't rendered

---

### Proposed Rework

**ORG View:**
1. **Add `Quick Query Chips`** — 6-8 pre-built operational queries: "Which umpires have we struggled against this month?", "When should we challenge in extra innings?", "Which of our pitchers benefits most from ABS?". Click-to-populate.
2. **Structure AI response output** — Instead of a text paragraph, return a structured card: key finding (bold), supporting data points (bullet list), confidence level badge, and a "See Full Chart" link to the relevant page.

**FAN View:**
1. **Market this as `"Ask the ABS AI"`** — more accessible framing
2. **Add trending questions feed** — "Other fans are asking: Who is the worst umpire this week?"
3. **Format responses as shareable cards** — the answer should look like something fans would screenshot and post

---

## PAGE 8: Articles Page (`/articles`)

### Current State Assessment

Primarily an editorial/content page rather than an analytics visualization page.

**Observations:**
- The page correctly separates editorial content from raw analytics
- Good for fan view storytelling
- Could embed more inline data visualizations within article bodies

**Minor Recommendations:**
- Add a `"Data Snapshot"` widget at the top of the articles grid showing today's key metrics — bridges editorial and analytics
- For org view, feature analytics-first article types: "Pre-Series Umpire Report", "Weekly Challenge Efficiency Rankings"

---

## Summary: Charts to Remove vs. Add vs. Keep

### Remove (Redundancy / Low Signal)

| Chart | Page | Reason |
|---|---|---|
| Challenge Trajectory failure line | Team | Inverse of success line — one metric shown twice |
| Challenge Aggression Radial | Team | Duplicates Inning Efficiency Heatmap |
| Home/Away Split (just 2 bars) | Team | Should be KPI cards, not a chart section |
| Peer Comparison Bar (single bar) | Umpire | Fold into KPI cards |
| Heatmap Deep Dive table | Umpire | Raw data dump, not visualization |
| Season-Over-Season Chart | Umpire | Insufficient data in ABS first seasons |

### Rework (Keep concept, redesign execution)

| Chart | Page | Change |
|---|---|---|
| Scatter plot | Team Leaderboard | Normalize axes, add quadrant labels |
| Zone Heatmap | Umpire | Expand from 4 zones to 9-zone strike zone |
| Challenge Aggression + Inning Heatmap | Team | Consolidate into single Situational Decision Matrix |
| Accuracy Trajectory | Umpire | Change to rolling average with league reference line |
| Directional Bias Cards | Umpire | Expand with count-specific context |
| Zone Archetype Labels | Umpire Leaderboard | Derive from directional data, not overturn rate alone |

### Add (New Insights)

| Chart | Page | View | Value |
|---|---|---|---|
| Strategic Efficiency Quadrant (challenge rate/game vs overturn rate) | Team Leaderboard | ORG | Identifies disciplined vs reckless challengers |
| Challenge Timing Index (% high-leverage challenges) | Team Leaderboard | ORG | Situational decision quality |
| Full 9-Zone Strike Zone Map | Umpire | BOTH | Granular blind spot analysis |
| Umpire Consistency Scatter (rate vs variance) | Umpire Leaderboard | ORG | Predictability matters as much as accuracy |
| This Week's Crew Assignments | Umpire Leaderboard | ORG | Most actionable umpire prep intel |
| Bias Analysis Panel (directional × count) | Umpire | ORG | Elite pre-game prep data |
| Season Trend Sparkline / Accuracy Gauge | Home | BOTH | Macro story of ABS performance |
| Ump Report Card (Grade + descriptor) | Home / Umpire | FAN | Shareable, creates dialogue |
| "Today's Most Controversial Call" hero card | Home | FAN | Flagship fan engagement content |
| "Challenge Style" personality label | Team Leaderboard | FAN | Team archetypes fans love |
| Umpire Intel Card (pregame) | Game Hub | ORG | #1 gameday prep need |
| Game Challenge Map (postgame timeline) | Game Hub | BOTH | Visual game narrative |

---

## Overall Assessment

The platform has excellent data infrastructure and the right instincts for what matters — directional bias, pitch location challenges, situational efficiency. The gaps are:

1. **Redundancy at the chart level**: Several pages have 2-3 charts showing the same underlying metric. Every chart should answer a distinct question.

2. **Org vs Fan differentiation is underdeveloped**: Currently the main difference is some org-only columns in tables. The views need fundamentally different chart selections — org charts should drive decisions, fan charts should drive conversation.

3. **The most operationally valuable data is buried**: Directional bias (S→B vs B→S), challenge timing in leverage situations, and umpire prep intel for upcoming series are the most actionable data points on the platform. They currently sit in the middle of long pages behind more generic metrics.

4. **Fan view lacks shareable moments**: The Extreme Misses section and challenge moment cards are the most fan-friendly content — but they're not positioned as hero content. The fan view should lead with drama and stories, not leaderboard tables.

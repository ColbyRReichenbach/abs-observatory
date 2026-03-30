# Spring ABS Launch Feature Visual Brief

**Article:** What Spring Training Taught Us About ABS  
**Desk:** The Weekly Rotation  
**Purpose:** Support an analytical launch feature with 3-4 charts that each prove a specific claim.

## Visual 1: Team ABS Identity Scatter

**Claim supported:** Teams did not approach ABS uniformly. Even in spring, clubs were already separating into distinct operating profiles.

**Chart type:** Scatter plot

**Fields**
- `x`: total team challenges
- `y`: overturn rate
- optional point size: `late_share`

**Suggested annotations**
- Yankees
- Twins
- Cardinals
- Cubs
- Dodgers
- Tigers

**Why these teams**
- Yankees: highest volume
- Twins: high volume, front-loaded profile
- Cardinals: strong conversion and strong late-close usage
- Cubs: strongest late-game share
- Dodgers: lower overturn rate on moderate volume
- Tigers: low-volume reference point

**Source logic**
- final spring games only
- group by `challenge_team_id`
- filter to all clubs, annotate the highlighted subset

## Visual 2: Challenge Timing and Conversion

**Claim supported:** Timing matters. Challenge conditions get meaningfully harder in later, tighter game states.

**Chart type:** Bar chart

**Buckets**
- `early`: innings 1-3
- `middle`: innings 4-6
- `late_not_close`: inning 7+ and score differential greater than 1
- `late_close`: inning 7+ and score differential 1 or less

**Metric**
- overturn rate

**Required annotation**
- show sample size for each bucket

**Current article numbers**
- early: 58.8%
- middle: 52.8%
- late_not_close: 47.0%
- late_close: 40.3%

**Interpretation note**
- lower late conversion should be framed as a tougher challenge environment, not automatically worse team process

## Visual 3: Team Timing Profile

**Claim supported:** Some clubs appear to be using ABS with different strategic priors, not just different challenge totals.

**Chart type options**
- preferred: scatter plot
- fallback: grouped dot plot

**Preferred fields**
- `x`: early challenge share
- `y`: late challenge share

**Alternative fields**
- `x`: late_close_share
- `y`: overturn_rate

**Suggested annotations**
- Cardinals
- Cubs
- Twins
- Angels
- White Sox
- Yankees

**Why these teams**
- Cardinals: strongest late-close profile in the article
- Cubs: strongest late-game share
- Twins and Angels: strongest early-game profiles
- White Sox: another early-heavy club with weaker overall conversion
- Yankees: high-volume anchor

## Visual 4: Umpire Exposure and Review Variance

**Claim supported:** ABS pressure was not evenly distributed across umpire environments, but spring is still a directional sample rather than a final grade.

**Chart type:** Scatter plot

**Fields**
- `x`: challenged calls seen
- `y`: overturn rate

**Sample floor**
- use umpires with at least 25 challenged calls

**Suggested annotations**
- Jen Pawol
- Mitch Trzeciak
- Pete Talkington
- Matt Blackborow
- Macon Hammond
- Marvin Hudson

**Interpretation note**
- avoid reputational framing
- use this as evidence of variance and exposure, not umpire ranking theater

## Visual Package Recommendation

If the article runs with **3 visuals**:
- Team ABS Identity Scatter
- Challenge Timing and Conversion
- Umpire Exposure and Review Variance

If the article runs with **4 visuals**:
- add Team Timing Profile

## Presentation Notes

- Keep the charts clean and editorial, not dashboard-dense.
- Use annotation sparingly.
- Avoid giant ranked tables inside the article body.
- Every visual should answer:
  - what happened
  - what it means
  - why it matters heading into the regular season

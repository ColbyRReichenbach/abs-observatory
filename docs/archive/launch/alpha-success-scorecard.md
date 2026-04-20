<div align="center">

# Alpha Success Scorecard

[![Stage](https://img.shields.io/badge/Stage-Alpha%20Measurement-0F766E)](#alpha-success-scorecard)
[![Focus](https://img.shields.io/badge/Focus-Retention%20Over%20Hype-2563EB)](#1-how-to-use-this-scorecard)
[![AI](https://img.shields.io/badge/AI-Quality%20Visibility-412991)](#4-ai-surface-scorecard)
[![Community](https://img.shields.io/badge/Community-Moderation%20Control-F59E0B)](#5-community-scorecard)
[![Decision](https://img.shields.io/badge/Decision-Hold%20Or%20Expand-DC2626)](#6-decision-rules)

</div>

This scorecard defines how to judge whether AiBS is ready to move from private alpha to a wider closed beta.

It is intentionally conservative. A feature-rich product is not automatically a launch-ready product.

Related documents:

- [docs/launch/private-alpha-checklist.md](./private-alpha-checklist.md)
- [docs/launch/provider-setup-checklist.md](./provider-setup-checklist.md)
- [docs/launch/monitoring-alerts.md](./monitoring-alerts.md)
- [gap-list.md](../reference/gap-list.md)
- [product-source-of-truth.md](../product/product-source-of-truth.md)

## 1. How To Use This Scorecard

Use this weekly during private alpha.

The objective is to answer four questions:

1. Do users trust the product?
2. Do users come back?
3. Which surfaces drive repeat value?
4. Can the product be operated without constant manual intervention?

This scorecard is for internal decision-making, not marketing.

## 2. Core Weekly Scorecard

Track these every week of alpha.

### A. Reliability

- `app uptime / route availability`
- `failed deploys or rollback events`
- `critical ETL failures`
- `queued job failure count`
- `Clerk webhook sync failures`
- `AI fallback rate`

Suggested healthy alpha read:

- no repeated multi-hour outages
- no recurring ship-blocking ETL or worker failures
- AI failures are visible and triaged rather than mysterious

### B. Trust

- `data trust bugs reported`
- `chart mismatch bugs reported`
- `conflicting stat reports`
- `game page correctness issues`
- `comment moderation incidents`

Suggested healthy alpha read:

- trust-breaking issues are infrequent
- when they happen, they are diagnosable quickly
- users are not repeatedly calling out stat contradictions

### C. Retention

- `weekly active invited users`
- `repeat visitors`
- `median sessions per active user`
- `return rate after first session`

Suggested healthy alpha read:

- users return more than once
- some users build repeat habits around one or more surfaces
- traffic is not purely novelty-driven

### D. Product Clarity

- `mode confusion reports`
- `onboarding confusion reports`
- `users asking what the product is for`
- `support questions that reflect unclear IA`

Suggested healthy alpha read:

- users understand what `fan` and `org` modes are doing
- users can explain back what the product is for
- navigation problems are not dominating feedback

## 3. Product Surface Scorecard

Track which surfaces users actually use and return to.

### Primary product surfaces

- `home`
- `game views`
- `team pages`
- `umpire pages`
- `The Absolute Observer`
- `comments`

For each surface, track:

- views
- unique users
- repeat visits
- average time on surface
- comment activity if applicable
- whether the surface appears in return-user sessions

Interpretation:

- a surface with high clicks and no repeat behavior is interesting but not necessarily valuable
- a surface with moderate volume but strong repeat behavior may be part of the core product loop

## 4. AI Surface Scorecard

AiBS should measure each AI surface independently.

### Tracked AI surfaces

- `copilot`
- `chart_insight`
- `visualizer`
- `game_debrief`
- `gazette_daily_author`

For each surface, track:

- total generations
- unique users
- provider and model mix
- token usage
- estimated cost
- average latency
- fallback rate
- thumbs-up rate
- thumbs-down rate
- negative feedback buckets

Interpretation:

- high usage with weak ratings suggests a quality problem, not a demand problem
- low usage with good ratings may indicate discoverability issues
- high cost with weak repeat use is a bad monetization candidate

Suggested healthy alpha read:

- at least one AI surface shows both repeat use and acceptable feedback quality
- the worst AI surfaces are diagnosable through feedback bucket patterns
- you can separate model problems from prompt or data problems

## 5. Community Scorecard

If comments and profiles are going to matter, they need to be measured as a real product loop.

Track:

- profile creations
- users who comment
- comments per active user
- threads with actual back-and-forth discussion
- moderation actions
- hidden or deleted comment rates
- abuse or spam attempts

Suggested healthy alpha read:

- users participate without overwhelming moderation
- discussions happen in-context on product pages
- moderation workload is manageable by one owner/admin

If community usage stays low but the core analytics product is strong, community may remain a supporting feature rather than a primary growth loop.

## 6. Decision Rules

### Hold private alpha if:

- trust-breaking bugs keep appearing
- data reliability is still inconsistent
- AI failures are frequent or unclear
- onboarding is confusing enough that users do not understand the product
- moderation burden is already too high for the current scale

### Expand to closed beta if:

- product reliability is stable for multiple weeks
- repeat usage exists
- at least one core loop is clearly sticky
- AI quality is measurable and manageable
- comments and moderation are under control
- there is no major unresolved trust issue

### Do not monetize yet if:

- users are still primarily giving product-shaping feedback
- retention is weak or unclear
- AI cost is not yet mapped to user value
- the app still needs meaningful iteration based on observed behavior

## 7. Monetization Readiness Signals

Monetization should be considered only after private alpha or closed beta produces evidence of durable value.

Positive signals:

- repeat usage is consistent
- one or more features feel painful to lose
- AI cost is justified by obvious user value
- a specific audience segment emerges as the highest-value user

Likely monetization order:

1. keep the product free through early alpha and beta
2. test premium power-user features only after clear usage patterns emerge
3. evaluate org or analyst packages only after strategy surfaces are stronger and proven

## 8. Weekly Review Template

Run this review once per week during alpha:

1. What broke?
2. What did users actually return for?
3. Which AI surfaces performed best and worst?
4. What negative feedback buckets dominated?
5. Did any trust issue threaten product credibility?
6. Are we ready to invite more users, or should we hold?

If the answer to question six is not obvious, the correct choice is usually to hold and improve rather than expand prematurely.

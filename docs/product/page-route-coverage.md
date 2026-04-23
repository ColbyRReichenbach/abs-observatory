# Page And Route Coverage

This document maps the current route surface to the codebase.

It is intentionally route-first so it can be audited directly against `src/app` and `src/app/api`.

## Public Pages

Current public page routes:

- `/`
- `/about`
- `/about/[slug]`
- `/articles`
- `/articles/[slug]`
- `/game/[gamePk]`
- `/teams`
- `/teams/[teamId]`
- `/umpires`
- `/umpires/[umpireId]`
- `/reports/[gamePk]`
- `/v/[vizId]`
- `/u/[username]`
  - route is backed by the current public profile layer

## Auth And User Pages

Current authenticated or identity-related pages:

- `/login`
- `/sign-in`
- `/sign-up`
- `/dev-auth`
- `/query`

Current profile and onboarding pages:

- `/profile`
- `/welcome`

## Admin Pages

Current admin surface:

- `/admin`
- `/admin/access`
- `/admin/ai`
- `/admin/ai/review`
- `/admin/community`
  - moderation console, not a social-graph console
- `/admin/editorial`
- `/admin/users`

## Core Public API Routes

Current public-facing or product-serving API routes include:

- `/api/health`
- `/api/csrf`
- `/api/data-freshness`
- `/api/dev-auth/session`
- `/api/dev-auth/reset-walkthrough`
- `/api/live/games`
- `/api/games/[gamePk]`
- `/api/games/[gamePk]/challenges`
- `/api/games/[gamePk]/live-status`
- `/api/games/[gamePk]/pregame-history`
- `/api/games/[gamePk]/timeline`
- `/api/reports/[gamePk]`
- `/api/teams/[teamId]/summary`
- `/api/umpires/[umpireId]/summary`
- `/api/umpires/[umpireId]/pitch-types`
- `/api/umpires/[umpireId]/season-trend`
- `/api/v2/challenge-value`
- `/api/viz-og/[vizId]`

## Auth, Profile, And Community API Routes

- `/api/me`
- `/api/profile`
- `/api/comments`
- `/api/comments/[commentId]`
- `/api/comments/[commentId]/like`
- `/api/comments/[commentId]/report`

Current identity/community routes:

- `/api/profile/onboarding`
- `/api/public-profiles/[username]`

Present but intentionally disabled:

- `/api/follows/[userId]`
  - returns `501`
  - public follow relationships remain deferred

## AI, Editorial, And Internal API Routes

- `/api/ai/chat`
- `/api/ai/artifacts`
  - registers owned AI artifacts for signed-in viewers
  - lists saved artifacts back into the profile workspace
  - allows public-share-enabled visualizer artifacts to resolve through `/v/[vizId]` and `/api/viz-og/[vizId]`
- `/api/ai/feedback`
- `/api/articles`
- `/api/articles/[slug]`
- `/api/internal/jobs`
- `/api/internal/jobs/process`
- `/api/jobs/[jobRunId]`
- `/api/webhooks/clerk`
- `/api/cron/editorial-daily`
  - secured by `CRON_SECRET`
  - enqueues the previous Eastern Time slate into `ops.job_runs`

## Legacy Or Gated Routes

- `/api/query`
  - deprecated as a public product feature
  - retained as a controlled route surface, not a current product workflow

## Documentation Rule

If a route is added, removed, or gated differently, this file should be updated in the same change.

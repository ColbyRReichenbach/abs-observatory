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

## Auth And User Pages

Current authenticated or identity-related pages:

- `/login`
- `/profile`
- `/welcome`
- `/dev-auth`
- `/query`

Some of these are environment- or launch-gated, but they are still part of the current route surface.

## Admin Pages

Current admin surface:

- `/admin`
- `/admin/access`
- `/admin/ai`
- `/admin/ai/review`
- `/admin/community`
- `/admin/editorial`

## Core Public API Routes

Current public-facing or product-serving API routes include:

- `/api/health`
- `/api/csrf`
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

## Auth, Profile, And Community API Routes

- `/api/me`
- `/api/profile`
- `/api/profile/onboarding`
- `/api/public-profiles/[username]`
- `/api/follows/[userId]`
- `/api/comments`
- `/api/comments/[commentId]`
- `/api/comments/[commentId]/like`
- `/api/comments/[commentId]/report`

## AI, Editorial, And Internal API Routes

- `/api/ai/chat`
- `/api/ai/artifacts`
- `/api/ai/feedback`
- `/api/articles`
- `/api/articles/[slug]`
- `/api/cron/editorial-daily`
- `/api/internal/jobs`
- `/api/internal/jobs/process`
- `/api/jobs/[jobRunId]`
- `/api/webhooks/clerk`

## Legacy Or Gated Routes

- `/api/query`
  - deprecated as a public product feature
  - retained as a controlled route surface, not a current product workflow

## Documentation Rule

If a route is added, removed, or gated differently, this file should be updated in the same change.

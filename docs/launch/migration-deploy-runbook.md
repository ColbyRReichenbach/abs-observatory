# Migration And Deploy Runbook

## Goal
- keep schema changes rollback-safe and repeatable
- ensure deploys never depend on destructive one-shot SQL

## Rules
- apply additive schema changes first
- backfill new columns before switching reads
- switch application reads/writes only after schema is present
- remove old columns/tables only in a later release
- `npm run db:migration:verify` must pass before merge for migration-heavy changes

## Local Verification
1. `npm run db:migration:verify`
2. confirm `npm run build`
3. confirm touched suites are green

## Staging/Prod Sequence
1. back up the target database with `npm run db:backup -- <output-path>`
2. apply schema with `npm run db:schema`
3. run `npm run db:smoke`
4. deploy app/workers
5. validate ship-blocking flows
6. if deploy must be rolled back, revert the app first, then run forward-fix SQL instead of destructive rollback when possible

## Unsafe Changes
- dropping columns/tables used by the current app
- changing enum/check constraints without a compatibility window
- non-idempotent data migrations
- backfills that lock hot tables without batching

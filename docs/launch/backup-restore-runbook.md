# Backup And Restore Runbook

## Goal
- maintain a repeatable recovery path for app, editorial, community, and AI data

## Backup
1. `npm run db:backup -- .runtime/backups/manual-drill.dump`
2. confirm the output file exists and is non-empty
3. keep the latest successful drill artifact outside the app repo

## Restore
1. provision a scratch database
2. run `npm run db:restore -- .runtime/backups/manual-drill.dump "$RESTORE_DATABASE_URL"`
3. run `npm run db:smoke` against the restored database
4. validate key tables:
   - `product.users`
   - `community.comments`
   - `editorial.articles`
   - `ai.conversations`
   - `ops.audit_log`

## Drill Cadence
- before first public launch
- after major schema milestones
- quarterly once production traffic exists

## Notes
- never restore into the live production database as a drill
- prefer scratch/staging databases for validation
- raw source snapshots and evidence blobs should be retained in object storage when that layer is enabled

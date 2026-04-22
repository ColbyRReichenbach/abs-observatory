# Repo Drift Audit

Date: `2026-04-20`

This file records the current Phase 6 cleanup pass.

## What Was Removed

The repo no longer carries tracked zero-byte files.

Removed in this pass:

- `102` tracked zero-byte files
- empty placeholder components that were not imported anywhere
- empty helper modules that were not imported anywhere
- empty ETL and local-script stubs
- empty tests that added no coverage signal

Representative categories:

- dead community placeholders under `src/components/community/`
- dead analytics placeholders under `src/components/analytics/`
- empty helper modules under `src/lib/`
- empty route and page tests across `src/app/`, `src/components/`, and `src/lib/`
- empty ETL and sample-run scripts under `etl/` and `scripts/`

## Current Reference Docs

If you want current repo truth, start with:

- `docs/product/product-source-of-truth.md`
- `docs/product/page-route-coverage.md`
- `docs/reference/technical.md`
- `docs/reference/security.md`
- `docs/reference/gap-list.md`
- `docs/product/aibs-spec-rewrite-task-index.json`

These docs should be updated in the same change whenever product scope, routes, or operational boundaries move.

## Historical Docs

These are still useful, but they are not current-source-of-truth by default:

- dated files under `docs/product/`
- dated files under `docs/launch/`
- `docs/launch/lighthouse/`
- `docs/archive/models/audits/`
- exploratory or execution-plan docs under `docs/architecture/` and `docs/editorial/`

Rule:

- if a document is dated, treat it as historical unless a current-reference doc explicitly points to it for active support

## What Is Still Intentionally Deferred

These are deferred on purpose, not missing by accident:

- public follow relationships
- public visualization sharing
- broader social/community graph features
- optimization-grade live challenge strategy claims

## Outcome

Phase 6 removed the obvious fake-capability residue and tightened the active docs so they match the shipped codebase more closely.

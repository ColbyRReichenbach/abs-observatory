# AiBS Documentation Index

This directory contains the retained internal documentation set for AiBS.

The current docs are organized around one rule:

- current reference docs should be auditable against the repository as it exists now
- historical planning material should live in archive and not compete with current truth

## Current Reference

Use these first:

- [product/product-source-of-truth.md](./product/product-source-of-truth.md)
  - current product behavior, audience split, and model-truth boundaries

- [product/page-route-coverage.md](./product/page-route-coverage.md)
  - current route surface for public pages, authenticated pages, admin pages, and APIs

- [reference/technical.md](./reference/technical.md)
  - current runtime, data, route, and subsystem implementation overview

- [launch/live-polling-runbook.md](./launch/live-polling-runbook.md)
  - current local scheduled polling, ET-aware gating, prune behavior, and manual recovery workflow

- [reference/security.md](./reference/security.md)
  - current security controls and enforcement boundaries

- [reference/gap-list.md](./reference/gap-list.md)
  - current documentation and platform truth boundaries

- [product/aibs-spec-rewrite-task-index.json](./product/aibs-spec-rewrite-task-index.json)
  - current execution tracker for the repo-specific cleanup and product rewrite

- [reference/repo-drift-audit-2026-04-20.md](./reference/repo-drift-audit-2026-04-20.md)
  - current inventory of deleted drift, retained historical docs, and archive guidance

- [models/README.md](./models/README.md)
  - model audit framework and retained model-history references

## Secondary Reference

These remain useful, but are narrower in scope:

- `architecture/`
  - retained architecture decisions and implementation references

- `editorial/`
  - editorial workflow and Absolute Observer system references

- `launch/`
  - operational runbooks and launch records
  - some files are historical and should not be treated as current product truth

- `archive/`
  - dated product specs, historical launch/status material, and dated model audit evidence

## Historical Material

Historical planning material is intentionally not part of the retained docs set. Current-reference docs should stand on their own without requiring archived sprint notes or exploratory plans.

Practical rule:

- dated files are historical by default unless a current-reference doc links to them as active support material
- `docs/archive/models/audits/`, `docs/launch/lighthouse/`, dated launch notes, and dated product verdict/spec files should not be treated as current product truth

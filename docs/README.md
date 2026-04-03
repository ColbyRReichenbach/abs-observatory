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
  - current local cron polling, ET-aware gating, prune behavior, and manual recovery workflow

- [reference/security.md](./reference/security.md)
  - current security controls and enforcement boundaries

- [reference/gap-list.md](./reference/gap-list.md)
  - current documentation and platform truth boundaries

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

## Historical Material

Historical planning material is intentionally not part of the retained docs set. Current-reference docs should stand on their own without requiring archived sprint notes or exploratory plans.

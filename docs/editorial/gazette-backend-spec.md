# The Absolute Observer Backend Reference

This document describes the persisted backend model for The Absolute Observer as it exists today.

The internal module names still use `gazette_*` in some places. The current product-facing editorial brand is `The Absolute Observer`.

Related docs:

- [technical.md](../reference/technical.md)
- [product-source-of-truth.md](../product/product-source-of-truth.md)

## 1. Purpose

The editorial backend exists to make automated and assisted article generation:

- persisted
- inspectable
- resumable
- evidence-backed

## 2. Current Editorial Tables

Current persisted editorial state in `db/schema.sql` includes:

- `editorial.articles`
- `editorial.article_sections`
- `editorial.article_revisions`
- `editorial.article_evidence_blobs`
- `editorial.generation_runs`
- `editorial.generation_steps`
- `editorial.article_contributors`
- `editorial.standings_snapshots`

These are current tables, not planned additions.

## 3. Current Flow

The current editorial system supports:

- persisted article records
- persisted generation runs
- step-level telemetry for generation workflows
- evidence persistence
- contributor metadata
- standings snapshot support for editorial context

At a high level:

1. a job or manual workflow starts a generation run
2. generation steps persist step-level inputs, outputs, and status
3. validation and persistence update the article records
4. the final article, sections, evidence, and contributor metadata remain queryable after the run

## 4. Current Status Language

Generation runs currently use persisted status and validation fields defined in the schema.

The important implementation truth is:

- editorial generation is not ephemeral
- run state and step state are stored in the database
- article persistence is separate from intermediate generation telemetry

## 5. What This Document Does Not Claim

This document should not claim:

- a fully staffed newsroom workflow
- broad multi-editor operations tooling
- arbitrary provider/runtime support beyond the current live application

Those are broader product-scope questions, not current backend-table facts.

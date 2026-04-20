# Baseline Reconstruction

Date: March 23, 2026

## Purpose

Backfill the starting point for the shared AiBS model layer before the next empirical audit cycle.

This document is a reconstruction from repo evidence, not a contemporaneous audit record.

## Reconstructed Starting Point

### RE / WE strategy

The repo shows a lookup-driven strategy rather than a pure formula strategy:

- run expectancy resolves through `mart_run_expectancy_fallbacks`
- win expectancy resolves through `mart_win_expectancy_fallbacks`
- both share canonical state normalization before lookup

This suggests the original design goal was:

- empirical model tables first
- controlled fallback tiers second
- simple public explanation layer above them

### Challenge EV strategy

The repo shows a blended decision-value strategy:

- prefer WE-backed value when available
- fall back to heuristic value when state coverage is thinner
- keep recommendation language sensitive to fallback and confidence

### Rubric strategy

The repo shows a product-first rubric layer:

- map modeled spreads into fan/org descriptors
- compress public language when the model cannot support sharper distinctions
- accept some coarser bands to keep product language readable

## Known Baseline Weaknesses

Based on later Sprint 4 and dual-zone follow-through work, the baseline likely had:

- more fallback dependence than desired
- stronger descriptor language than the evidence supported in some confidence bands
- more heuristic-EV pressure than ideal
- more downstream inconsistency on zone-dependent consumers

## Confirmed Later Corrections

The repo already records that later work:

- tightened heuristic EV
- recalibrated leverage ordering
- softened low-confidence rubric extremes
- added `Hybrid` / `Mixed profile` as an escape hatch
- standardized zone-model usage across more consumers

## Why This Baseline Matters

This baseline gives the next audit cycle a reference point:

- what the original structure was
- what the likely pressure points were
- what kinds of fixes were already applied

Without this reconstruction, later audits would show current findings without explaining how the model evolved into its present form.

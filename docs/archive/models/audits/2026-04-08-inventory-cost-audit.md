# Inventory Cost Audit

Date: April 8, 2026

## Scope

- Source table: `modeling.called_pitch_decisions`
- Geometry variant: `center_only`
- Goal: estimate future opportunity cost of burning a challenge now
- Candidate target:
  - 1 remaining: future top-1 positive immediate opportunity value
  - 2 remaining: future top-2 positive immediate opportunity value

## Overview

- Train / validation / test rows: 13822 / 4967 / 9768
- Selected inventory model: `inning_bucket_close`
- Selected remaining-challenges target: 2
- Validation MAE: 0.0769
- Test MAE: 0.0980
- Current policy test recommendation share (no empirical inventory replacement): 57.4%
- Selected model test recommendation share: 7.7%

## Candidate Model Comparison On Validation

| Model | Validation MAE | Validation Bias | Validation Challenge Share | Test MAE | Test Challenge Share |
| --- | --- | --- | --- | --- | --- |
| inning_bucket_close / 2 remaining | 0.0769 | 0.0031 | 5.7% | 0.0980 | 7.7% |
| inning_bucket / 2 remaining | 0.0805 | 0.0028 | 6.2% | 0.1012 | 8.3% |
| global / 2 remaining | 0.0983 | 0.0042 | 5.5% | 0.1243 | 7.4% |
| inning_bucket_close / 1 remaining | 0.1065 | 0.0031 | 2.8% | 0.1211 | 4.3% |
| inning_bucket / 1 remaining | 0.1115 | 0.0028 | 3.2% | 0.1271 | 4.4% |
| global / 1 remaining | 0.1321 | 0.0046 | 2.8% | 0.1506 | 4.3% |

## Selected Model Buckets (inning_bucket_close, 2 remaining)

| Bucket | Sample | Mean Cost |
| --- | --- | --- |
| 2|1-3|close | 3426 | 21.52% |
| 2|1-3|not_close | 1212 | 17.00% |
| 2|4-6|close | 1812 | 17.93% |
| 2|4-6|not_close | 2948 | 12.96% |
| 2|7-8|close | 913 | 13.42% |
| 2|7-8|not_close | 2189 | 6.04% |
| 2|9+|close | 412 | 6.17% |
| 2|9+|not_close | 910 | 0.73% |

## Notes

- Immediate opportunity value here is computed before inventory cost.
- The future opportunity target is derived from later positive-value opportunities for the same challenge side in the same game.
- This is still a provisional option-value model, but it is much closer to baseball strategy than a fixed scalar penalty.


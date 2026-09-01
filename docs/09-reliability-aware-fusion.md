# Reliability-Aware Fusion

Equal-weight fusion is unsafe because evidence quality varies spatially and by acquisition. An optical observation may be cloud-obscured while SAR remains informative; SAR may be noisy, uncalibrated, or affected by geometry while optical evidence is clear. Registration and date mismatch can invalidate both as a pair even when each image is individually usable.

## Quality components

| Scope | Candidate evidence | Effect |
|---|---|---|
| Optical | cloud, shadow, haze, saturation, valid coverage, model confidence/calibration | down-weight or mask unreliable pixels/regions |
| SAR | noise floor, speckle, missing polarisation, calibration status, layover/radar shadow where detectable, model confidence | limit allowed tools and weight reliable regions only |
| Pair | geographic overlap, registration error, date separation, resolution/coverage mismatch, acquisition compatibility | gate comparison and constrain fusion scope |

Scores must retain their component values. A single scalar must not hide a blocking condition such as missing overlap or unverified calibration.

## Baseline fusion

Use transparent rule-based weights before a learned fusion model. Normalize weights only over present, compatible evidence. A conceptual late-fusion expression is:

`fused_score(r) = w_optical(r) × optical_score(r) + w_sar(r) × sar_score(r)`

Here `r` may be a pixel or region. The scores must represent compatible hypotheses; land-cover probabilities and unrelated backscatter values cannot be averaged directly. Rules, thresholds, normalization, missing-value handling, and versions belong in configuration and tests.

Learned weights are a later experiment requiring paired labels, leakage-safe evaluation, calibration, and comparison against rule-based, equal-weight, and single-modality baselines. A learned model does not remove deterministic compatibility gates.

## Failure behaviour

- **Missing modality:** continue with the usable source only if the query remains supported; name the fallback.
- **Locally invalid modality:** mask that region and renormalize weights among remaining compatible evidence.
- **Contradiction:** preserve source-specific results, record a contradiction flag, lower fused confidence, and explain plausible quality causes without inventing a resolution.
- **Both unreliable:** abstain from quantitative or semantic claims and state what new evidence is required.
- **Unsupported task:** return a structured restriction, not the closest-looking calculation.

Confidence must be calibrated against held-out geographic conditions. Fusion confidence should reflect model calibration, input quality, pair compatibility, rule coverage, and disagreement; it is not a synonym for raw softmax probability.

## Cloudy-flood example

A user supplies a cloudy optical observation and a co-covered calibrated VV/VH SAR observation, asking for flood extent. Validation finds 63% cloud-affected overlap, acceptable SAR acquisition metadata, and tolerable registration. Optical water probabilities contribute only in unmasked clear regions; the SAR flood mask and backscatter evidence dominate cloudy regions. The evidence package records per-region weights and any disagreement. If georeferencing is trusted, area is calculated from the fused/validated mask; otherwise the answer reports pixels or coverage. The final explanation states that optical evidence was down-weighted and does not portray the simple weight formula as a learned flood model.

See [ADR-001](decisions/ADR-001-hybrid-neuro-symbolic-architecture.md) and the [evaluation plan](11-evaluation-plan.md).

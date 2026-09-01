# Inference Lifecycle

The planned inference lifecycle has six evidence gates. Agent selection occurs inside those gates; it does not replace them.

## Stage 1 — Input, metadata, and query examination

For a GeoTIFF, read file integrity, band count/descriptions, width, height, data type, CRS, affine transform, pixel resolution, bounds, NoData, tags, and available acquisition/sensor fields. Missing band identity remains unavailable; quantitative values are preserved separately from previews.

For JPEG/PNG, read dimensions, colour mode, channel count, bit depth, alpha/compression information where available, and EXIF. Sensor, bands, CRS, GSD, and calibration remain unverified unless separately supplied and validated. A classifier/VLM may suggest `optical`, `sar_visualisation`, or `unknown`, but the suggestion is not scientific metadata.

Query examination extracts task, target class, requested measurement and unit, temporal relationship, requested modality, output form, and whether qualitative or quantitative evidence is expected.

## Stage 2 — Mandatory validation and workflow planning

Always validate relevant file integrity, dimensions, invalid/NoData pixels, geographic coverage, dates, available bands/polarisations, cloud/shadow/haze/saturation, pair alignment, and SAR calibration/acquisition compatibility when metadata permits. Pair checks include overlap, CRS, resolution, coverage, registration error, and date separation. An excessive or unknown error can block quantitative comparison.

Only after those checks does the planner propose a single-image, temporal, optical–SAR, or temporal-multimodal workflow; preprocessing; specialist capabilities; physics/spatial tools; provisional LoRA; outputs; and limitations. A deterministic validator rejects incompatible operations—for example, NDVI without verified red and NIR, VV/VH ratio without both polarisations, area without scale, or temporal analysis without two compatible observations.

## Stage 3 — Conditional preprocessing and specialist analysis

| Input | Proposed preprocessing | Compatible model path |
|---|---|---|
| Verified optical RGB | safe radiometric scaling if needed, invalid/cloud/shadow masks, tiling, model-specific normalization | optical SegFormer |
| Verified RGB+NIR | band-order validation, scientifically valid common-grid resampling, separate quantitative raster and normalized tensor | four-band multispectral SegFormer |
| Verified SAR VV/VH | orbit correction where required, calibration, controlled speckle filtering, terrain correction, documented backscatter representation | SAR U-Net |
| Validated temporal pair | common coverage/grid, registration estimate, same compatible semantic model at T1/T2 | mask transition baseline; optional ChangeFormer for justified difficult cases |

Every tile retains a mapping to source coordinates. Detection runs only for a query requiring instance-level localization. ChangeFormer yields binary change evidence unless trained and verified for semantic transitions.

## Stage 4 — Physics and spatial evidence

Physics tools may calculate NDVI, NDWI/MNDWI, NDBI, VV/VH ratio, backscatter statistics/differences, temporal signal differences, texture/edge statistics, and cloud/invalid-pixel statistics when their required inputs are verified. The VLM does not estimate these values from display colours.

Spatial tools derive pixel count/coverage, georeferenced area, polygon regions, intersection, overlap, adjacency, containment, distance, gain/loss, class transitions, and region IDs. Precise physical area requires trustworthy georeferencing or an externally supplied verified scale; unscaled JPEG/PNG results remain in pixels or percentages.

## Stage 5 — Reliability-aware evidence fusion

Maintain distinct quality information:

- optical: cloud, shadow, haze, saturation, valid coverage, model calibration;
- SAR: speckle/noise, missing polarisation, calibration, layover/radar shadow where detectable, valid coverage;
- pair: registration error, date separation, resolution/coverage mismatch, acquisition compatibility.

A first baseline can use normalized rule-based weights:

`fused_evidence = optical_weight × compatible_optical_evidence + sar_weight × compatible_sar_evidence`

This is not itself a complete learned-fusion model and incompatible scores must not be blindly averaged. Fusion may be per region. Missing modalities trigger single-source fallback; unreliable sources trigger restriction/abstention; contradictions stay visible in the evidence package. Unsupported requests return missing requirements rather than fabricated results.

## Stage 6 — Evidence-grounded VLM answer

The selected Qwen3.5-VL checkpoint receives the query, original image or suitable previews, verified metadata, masks/overlays, region IDs, deterministic measurements, quality/compatibility reports, fusion summary, and limitations. A chosen LoRA assists grounding/VQA, temporal reasoning, optical–SAR reasoning, or scientific reporting.

Before return, validation checks that every measurement and unit exists in evidence, every region reference resolves, no inferred metadata is stated as verified, no unscaled image receives physical area, and low quality produces a limitation. A failed answer may be regenerated once with validation feedback; a second failure returns a restricted answer assembled from deterministic evidence.

Final outputs may include natural-language explanation, evidence regions, masks, units, GeoJSON/CSV where georeferenced, confidence, limitations, and an audit trace linking claims to inputs and operations.

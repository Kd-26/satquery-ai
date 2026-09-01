# ADR-002: Sensor-Specific Input Modules and Segmenters

## Status

Accepted as design; unimplemented.

## Context

Optical RGB, multispectral RGB+NIR, and SAR VV/VH channels represent different physical measurements and require different scaling, validity checks, preprocessing, and learned representations. Channel count and colour appearance cannot identify a sensor or band.

## Decision

Use separate verified input contracts, preprocessing modules, and primary segmenters: optical RGB SegFormer, modified four-band multispectral SegFormer, and VV/VH SAR U-Net-style model. Preserve quantitative analytical rasters separately from previews/model tensors. Route by verified compatibility, not shape. Use detection only for instance localization and optional ChangeFormer only for justified paired binary change.

## Alternatives considered

- Convert every input to pseudo-RGB for one model: operationally simple but discards/aliases physical meaning.
- One universal early-fusion network: potentially useful after paired data research but difficult to validate with missing modalities and heterogeneous quality.
- One model per sensor or land-cover class: excessive operational/training fragmentation without evidence of benefit.

## Consequences

Scientific assumptions are explicit and failures can be isolated by modality. More training/evaluation pipelines and independent serving resources are required; shared ontologies and output contracts are essential.

## Risks

Sparse labelled data for a modality, calibration/preprocessing mismatch, inconsistent class probability calibration, and ontology drift between models.

## Review conditions

Review after a leakage-safe universal/multimodal model demonstrates equal or better validity, calibration, missing-modality behavior, compute cost, and interpretability across required sensors.

# Model Strategy

All model choices are proposed. Exact checkpoints, licences, input contracts, memory needs, and serving compatibility must be verified before acquisition.

## Specialist responsibilities

### Optical SegFormer

SegFormer-B2 is the planned baseline for multi-class land-cover segmentation from **verified RGB optical** imagery. Candidate classes include water, vegetation, cropland, built-up, bare land, and background/unknown, subject to compatible labels. Remote-sensing-safe augmentation, geographic evaluation, boundary metrics, and calibrated class probabilities are required.

### Multispectral SegFormer

A modified SegFormer is planned for verified RGB+NIR inputs. Its input projection expands to four bands. Compatible RGB weights may initialize the first three channels; the NIR channel may use the mean of RGB input weights or controlled random initialization, with the strategy recorded and ablated. Quantitative bands remain separate from normalized model tensors. RGB-only and RGB+NIR variants must be compared on the same geography.

### SAR U-Net

A U-Net-style encoder–decoder is the proposed VV/VH baseline. Its preprocessing is specific to the training representation and records calibration/backscatter provenance, polarisation order, filtering, and validity. Derived ratio or texture channels are permitted only when reproducible at inference. SAR is never treated as RGB merely by colourizing it.

### ChangeFormer

ChangeFormer is optional for difficult paired-image binary change proposals after a mask-comparison baseline exists. It is appropriate only with compatible registered pairs, licensed labels, and demonstrated improvement. A binary output identifies changed pixels, not semantic class transitions; those require T1 and T2 class evidence.

## VLM responsibility

A verified configurable Qwen3.5-VL checkpoint is intended for query interpretation, contextual visual reasoning, constrained workflow proposal, evidence synthesis, region grounding, and final explanation. Selected vision-encoder adaptation may improve remote-sensing patterns; PEFT Multi-LoRA may specialize grounding/VQA, temporal, optical–SAR, and reporting reasoning.

The VLM must not replace:

- precise semantic segmentation or instance localization;
- spectral-index or backscatter calculation;
- geospatial area calculation;
- registration and pair-compatibility validation;
- SAR calibration or terrain processing;
- deterministic file/metadata reading;
- answer/schema validation.

## Routing and serving

The agent requests a capability such as `segment_multispectral`; a versioned registry resolves it to an independently deployable Ray Serve model. A unified internal segmentation contract should accept an image asset, target classes, preprocessing profile, and output resolution, and return masks/probabilities with source-coordinate mappings and versions. Public users interact with the analysis API, not raw model endpoints.

Adapter selection is provisional during planning and confirmed after evidence production. The service should bound cached adapters, version them explicitly, audit request-level routing, and fall back to the evaluated base VLM. vLLM support must be verified against the exact checkpoint and adapter mechanism.

## Model acceptance gates

Each model needs a documented data licence, immutable version, typed input/output contract, small overfit result, baseline metrics, geographic test, calibration assessment, failure analysis, reproducible preprocessing, and memory/latency measurements. No benchmark value is claimed in this repository.

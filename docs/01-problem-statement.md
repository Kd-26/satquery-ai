# Problem Statement

Remote-sensing data contains physical and spatial signals that are difficult for non-specialists to query. Each modality has different assumptions: optical measurements depend on known spectral bands and atmospheric/cloud conditions; multispectral analysis depends on verified band identities and scaling; SAR analysis depends on polarisation, calibration, geometry, and speckle-aware processing; temporal comparison depends on alignment; and physical area depends on trustworthy georeferencing or an externally verified scale.

A general vision-language model can describe imagery and interpret questions, but cannot independently guarantee valid measurements, sensor compatibility, registration, calibration, or geospatial precision. It may also phrase an inference as a fact. A safe system therefore needs flexible language reasoning coupled to deterministic evidence production and validation.

## Required capabilities

- **Single-image understanding:** explain and, when supported, segment an individual observation.
- **Temporal-change reasoning:** distinguish gain, loss, and semantic transitions across validated observations.
- **Optical–SAR complementary analysis:** use each modality according to its quality without assuming interchangeable values.
- **Remote-sensing VQA:** answer questions about scenes, regions, relationships, and supported measurements.
- **Evidence-grounded answers:** link statements to regions, masks, calculations, and quality data.
- **GeoTIFF and ordinary-image support:** retain quantitative/geospatial GeoTIFF information while explicitly limiting JPEG/PNG analysis.
- **Scientific limitations:** abstain or narrow claims when scale, bands, calibration, coverage, or alignment cannot be established.

## Validity constraints

Channel count is not sensor identity: three channels do not prove RGB optical data, four do not prove RGB+NIR, and a coloured SAR rendering is not an optical measurement. A modality classifier may suggest a qualitative routing hypothesis, but that suggestion remains model-inferred and cannot unlock spectral or geospatial calculations.

Segmentation and object detection solve different problems. Semantic masks support coverage and area; detection is appropriate only for instance-level localization. Binary change masks indicate that something changed, while semantic transitions require class evidence at both times.

## Success definition

The project succeeds when it improves access to remote-sensing evidence while lowering unsupported-claim risk. Success must be evaluated separately for segmentation, change analysis, scientific measurement, agent decisions, and final-answer faithfulness. No single VQA score is sufficient; calibration, unsupported-query abstention, misregistration sensitivity, and claim citation are required.

The current repository contains design documentation only. Evaluation targets and baselines are defined in [11-evaluation-plan.md](11-evaluation-plan.md).

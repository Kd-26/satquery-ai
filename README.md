# SatQuery AI

> **STATUS: Functional backend prototype with deterministic routing and scientific-tool execution. Specialist segmentation services are still deployment dependencies.**

SatQuery AI is a proposed agentic remote-sensing visual-intelligence platform for answering natural-language questions about satellite imagery. It is designed to combine a vision-language model (VLM) with deterministic metadata, geospatial, physics, segmentation, and quality-control services so that explanations remain traceable to measurable evidence.

## Problem

Satellite data is rich in spectral, spatial, temporal, and sensor-specific information, but using it safely requires specialist knowledge. A general VLM may describe visible patterns, yet it cannot establish missing band identities, calibration, coordinate reference systems (CRS), ground sampling distance (GSD), or defensible physical area. SatQuery AI therefore separates flexible query interpretation from deterministic scientific validation.

## Inputs and analysis modes

Inputs may be GeoTIFF, JPEG, or PNG files representing verified optical RGB, verified multispectral data such as RGB+NIR, verified synthetic aperture radar (SAR) data such as VV/VH, bi-temporal observations, or complementary optical–SAR pairs. JPEG and PNG inputs remain qualitative unless trusted scale and metadata are supplied.

Implemented routing modes are:

- single-image description, segmentation, and measurement;
- bi-temporal comparison and semantic gain/loss analysis;
- optical–SAR comparison with reliability-aware evidence fusion;
- grounded visual question answering and spatial-relation analysis.

The pre-planner router distinguishes general knowledge, qualitative visual interpretation,
quality analysis, spectral analysis, SAR statistics, temporal comparison, and segmentation.
Only requests for boundaries, locations, counts, coverage, or physical feature area enter the
segmentation path. Visual interpretation sends a generated preview to the VLM but prohibits
quantitative claims. Spectral, quality, SAR, and temporal routes execute deterministic raster
tools first and use the VLM only to explain the resulting evidence.

## Architectural principle

> The VLM selects the analysis; the backend enforces scientific validity.

The agent may choose only relevant registered capabilities. It may not bypass file checks, compatibility checks, measurement preconditions, output validation, or audit logging. The VLM must never invent sensor identity, band identity, coordinates, area, or spectral measurements.

## Six-stage inference workflow

1. **Examine** inputs, available metadata, and the query.
2. **Validate and plan** with mandatory deterministic checks followed by a constrained workflow proposal.
3. **Preprocess and analyse** only with compatible modality-specific services and specialist models.
4. **Measure** spectral, SAR, geometric, temporal, and spatial evidence with deterministic tools.
5. **Fuse** evidence according to modality quality and pair compatibility, including fallback or abstention.
6. **Explain and verify** with an evidence package, answer validation, traceable outputs, confidence, and limitations.

The expanded lifecycle is in [docs/03-inference-lifecycle.md](docs/03-inference-lifecycle.md).

## Proposed technology stack

| Concern | Proposed technology | Status |
|---|---|---|
| Web | Next.js, React, MapLibre GL JS | Implemented prototype |
| API and contracts | Python, FastAPI, Pydantic | Implemented |
| Raster/geospatial | Rasterio, PyProj, Shapely, NumPy | Implemented core operations |
| ML | PyTorch, Hugging Face, MMSegmentation, Albumentations, Roboflow | Proposed |
| Specialist models | SegFormer-B2, four-band SegFormer, SAR U-Net, optional ChangeFormer | Proposed |
| Agent brain | OpenAI GPT-4o strict tool calls | Implemented; credential required |
| Visual specialist and answerer | Fine-tuned Qwen VLM on an OpenAI-compatible Modal endpoint | Implemented client; Modal deployment/credentials required |
| Orchestration | Deterministic router plus validated Pydantic tool DAG | Implemented |
| Scientific tools | NumPy, Rasterio, Shapely, PyProj | Implemented core tools |
| Serving and storage | Ray Serve, compatible vLLM, PostgreSQL/PostGIS, object storage | Proposed |
| Delivery | Docker, GitHub Actions; Kubernetes only after MVP load testing | Proposed |

## Repository map

| Path | Intended responsibility | Current state |
|---|---|---|
| `docs/` | Product, architecture, science, risks, decisions, and execution plan | Implemented |
| `frontend/` | Next.js scientific workspace | Implemented prototype |
| `backend/` | FastAPI, orchestration, providers, and scientific tools | Implemented prototype |
| `ml/` | Future training, evaluation, model, and adapter work | Empty scaffolds |
| `packages/` | Future shared contracts, registries, geospatial, and observability code | Empty scaffolds |
| `configs/` | Future versioned model, workflow, tool, and evaluation configuration | Empty scaffolds |
| `data/` | Local, Git-excluded data stages and provenance policy | Policy plus empty scaffolds |
| `artifacts/` | Local, Git-excluded masks, vectors, reports, and audit outputs | Policy plus empty scaffolds |
| `tests/` | Unit, scientific-contract, routing, and integration tests | Implemented |
| `infrastructure/` | Future Docker, Ray, database, and monitoring definitions | Empty scaffolds |
| `scripts/` | Future reproducible operational commands | Empty scaffold |

## Current state and next execution path

Implemented now:

- authoritative-first GeoTIFF, STAC, Sentinel SAFE, Landsat MTL, and explicit sidecar metadata resolution;
- quality-gated spectral, SAR, temporal, reprojection, AOI, zonal-statistics, and area operations;
- typed tool DAGs, evidence contracts, run manifests, provenance views, run history, and scientific workbench execution;
- GeoTIFF, GeoJSON, CSV, STAC, PDF, and reproducible notebook exports;
- fine-tuned Qwen-only answer synthesis, cold-start retries, deterministic segmentation routing, and strict quantitative answer verification.

Still required for production:

- deployment configuration for the segmentation and grounding model services;
- production sensor-specific atmospheric correction and calibrated segmentation checkpoints;
- persistent run state/object storage and production deployment configuration;
- model evaluation, data manifests, and licence decisions.

Development should proceed through the gates in [docs/14-roadmap.md](docs/14-roadmap.md), starting with development-foundation work only after the stack and licence decisions are accepted. No model training may begin before dataset licences, leakage-safe splits, compute estimates, a small overfit test, and baseline evaluation code are complete.

## Documentation index

- [Project overview](docs/00-project-overview.md) and [problem statement](docs/01-problem-statement.md)
- [System architecture](docs/02-system-architecture.md) and [inference lifecycle](docs/03-inference-lifecycle.md)
- [Training pipeline](docs/04-training-pipeline.md), [dataset strategy](docs/05-dataset-strategy.md), and [model strategy](docs/06-model-strategy.md)
- [Agent and tool design](docs/07-agent-and-tool-design.md), [physics-aware analysis](docs/08-physics-aware-analysis.md), and [reliability-aware fusion](docs/09-reliability-aware-fusion.md)
- [API and data contracts](docs/10-api-and-data-contracts.md), [evaluation plan](docs/11-evaluation-plan.md), and [deployment plan](docs/12-deployment-plan.md)
- [Risk register](docs/13-risk-register.md), [execution roadmap](docs/14-roadmap.md), and [demo scenarios](docs/15-demo-scenarios.md)
- [Research and standards](docs/16-research-and-standards.md), [glossary](docs/glossary.md), and [architecture decisions](docs/decisions/README.md)
- [Hybrid OpenAI + Modal setup](docs/17-hybrid-openai-modal-setup.md)
- [Data policy](data/README.md), [artifact policy](artifacts/README.md), [contribution guide](CONTRIBUTING.md), and [security policy](SECURITY.md)

## Safety and scientific validity

SatQuery AI is decision-support software, not a source of ground truth. Quantitative claims reference an input, deterministic calculation, unit, uncertainty, CRS where applicable, parameters, versions, and derivation. Missing band identity falls back to an explicitly labelled, lower-confidence approximation. Missing georeferencing falls back to pixel coverage rather than inventing physical area. Physically incompatible modalities and failed quality gates still stop execution.

## Licence

No project licence has been selected. See [LICENSE.md](LICENSE.md); until a licence is adopted, no permission to copy, modify, or redistribute is granted.

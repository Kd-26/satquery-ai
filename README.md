# SatQuery AI

> **STATUS: Repository and documentation initialized; implementation has not started.**

SatQuery AI is a proposed agentic remote-sensing visual-intelligence platform for answering natural-language questions about satellite imagery. It is designed to combine a vision-language model (VLM) with deterministic metadata, geospatial, physics, segmentation, and quality-control services so that explanations remain traceable to measurable evidence.

## Problem

Satellite data is rich in spectral, spatial, temporal, and sensor-specific information, but using it safely requires specialist knowledge. A general VLM may describe visible patterns, yet it cannot establish missing band identities, calibration, coordinate reference systems (CRS), ground sampling distance (GSD), or defensible physical area. SatQuery AI therefore separates flexible query interpretation from deterministic scientific validation.

## Planned inputs and analysis modes

Inputs may be GeoTIFF, JPEG, or PNG files representing verified optical RGB, verified multispectral data such as RGB+NIR, verified synthetic aperture radar (SAR) data such as VV/VH, bi-temporal observations, or complementary optical–SAR pairs. JPEG and PNG inputs remain qualitative unless trusted scale and metadata are supplied.

Planned modes are:

- single-image description, segmentation, and measurement;
- bi-temporal comparison and semantic gain/loss analysis;
- optical–SAR comparison with reliability-aware evidence fusion;
- grounded visual question answering and spatial-relation analysis.

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
| Web | Next.js, React, MapLibre GL JS | Proposed |
| API and contracts | Python, FastAPI, Pydantic | Proposed |
| Raster/geospatial | OpenCV, GDAL, Rasterio, ExifTool, ESA SNAP where required | Proposed |
| ML | PyTorch, Hugging Face, MMSegmentation, Albumentations, Roboflow | Proposed |
| Specialist models | SegFormer-B2, four-band SegFormer, SAR U-Net, optional ChangeFormer | Proposed |
| VLM | Configurable Qwen3.5-VL checkpoint, Transformers, PEFT Multi-LoRA | Proposed; checkpoint compatibility must be verified |
| Orchestration | LangChain, LangGraph, selected MCP-compatible interfaces | Proposed |
| Scientific tools | NumPy, GeoPandas, Shapely, PyProj, scikit-image | Proposed |
| Serving and storage | Ray Serve, compatible vLLM, PostgreSQL/PostGIS, object storage | Proposed |
| Delivery | Docker, GitHub Actions; Kubernetes only after MVP load testing | Proposed |

No dependency, checkpoint, dataset, or application component has been installed or implemented.

## Repository map

| Path | Intended responsibility | Current state |
|---|---|---|
| `docs/` | Product, architecture, science, risks, decisions, and execution plan | Documentation initialized |
| `apps/web/` | Future Next.js user interface | Empty scaffold |
| `services/` | Future API and independently testable backend capabilities | Empty scaffolds |
| `ml/` | Future training, evaluation, model, and adapter work | Empty scaffolds |
| `packages/` | Future shared contracts, registries, geospatial, and observability code | Empty scaffolds |
| `configs/` | Future versioned model, workflow, tool, and evaluation configuration | Empty scaffolds |
| `data/` | Local, Git-excluded data stages and provenance policy | Policy plus empty scaffolds |
| `artifacts/` | Local, Git-excluded masks, vectors, reports, and audit outputs | Policy plus empty scaffolds |
| `tests/` | Future unit, integration, scientific, and end-to-end tests | Empty scaffolds |
| `infrastructure/` | Future Docker, Ray, database, and monitoring definitions | Empty scaffolds |
| `scripts/` | Future reproducible operational commands | Empty scaffold |

## Current state and next execution path

Initialized now:

- Git repository metadata;
- the planned monorepo directory structure;
- project-specific documentation, policies, architecture decision records (ADRs), and ignore rules;
- a phased execution path with inputs, tasks, dependencies, exit criteria, and risks.

Still unimplemented:

- build manifests and dependency locks;
- frontend, APIs, schemas, services, databases, and deployment configuration;
- data manifests and licence decisions;
- preprocessing, scientific tools, ML training, serving, and evaluations.

Development should proceed through the gates in [docs/14-roadmap.md](docs/14-roadmap.md), starting with development-foundation work only after the stack and licence decisions are accepted. No model training may begin before dataset licences, leakage-safe splits, compute estimates, a small overfit test, and baseline evaluation code are complete.

## Documentation index

- [Project overview](docs/00-project-overview.md) and [problem statement](docs/01-problem-statement.md)
- [System architecture](docs/02-system-architecture.md) and [inference lifecycle](docs/03-inference-lifecycle.md)
- [Training pipeline](docs/04-training-pipeline.md), [dataset strategy](docs/05-dataset-strategy.md), and [model strategy](docs/06-model-strategy.md)
- [Agent and tool design](docs/07-agent-and-tool-design.md), [physics-aware analysis](docs/08-physics-aware-analysis.md), and [reliability-aware fusion](docs/09-reliability-aware-fusion.md)
- [API and data contracts](docs/10-api-and-data-contracts.md), [evaluation plan](docs/11-evaluation-plan.md), and [deployment plan](docs/12-deployment-plan.md)
- [Risk register](docs/13-risk-register.md), [execution roadmap](docs/14-roadmap.md), and [demo scenarios](docs/15-demo-scenarios.md)
- [Research and standards](docs/16-research-and-standards.md), [glossary](docs/glossary.md), and [architecture decisions](docs/decisions/README.md)
- [Data policy](data/README.md), [artifact policy](artifacts/README.md), [contribution guide](CONTRIBUTING.md), and [security policy](SECURITY.md)

## Safety and scientific validity

SatQuery AI is a decision-support concept, not a source of ground truth. Quantitative claims must reference an input, mask or region, deterministic calculation, unit, provenance, and quality information. Unverified metadata remains explicitly unverified. When required evidence is missing or contradictory, the planned system must limit, qualify, or refuse the requested measurement. The project does not claim autonomous defence, threat-detection, or structural-damage-diagnosis capability.

## Licence

No project licence has been selected. See [LICENSE.md](LICENSE.md); until a licence is adopted, no permission to copy, modify, or redistribute is granted.

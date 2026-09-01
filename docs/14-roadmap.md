# Execution Roadmap

This is the repository’s execution path. **Only Roadmap Phase 0 is complete.** The “development foundation” described in the implementation brief is the next enabling gate; it has not been started. Every increment follows: inspect → state objective/files/resources → implement one bounded capability → test → update documentation → report evidence and limitations.

## Status map

| Order | Phase | Status |
|---:|---|---|
| 0 | Repository and documentation | Complete in working tree; not committed |
| F | Development foundation gate | Not started; next recommended increment |
| 1 | Deterministic geospatial foundation | Not started |
| 2 | Physics and spatial tools | Not started |
| 3 | Specialist segmentation | Not started |
| 4 | Temporal and fusion workflows | Not started |
| 5 | Agentic planner | Not started |
| 6 | Qwen VLM adaptation | Not started |
| 7 | Product integration | Not started |
| 8 | Evaluation and hardening | Not started |

## Phase 0 — Repository and documentation

- **Objective:** establish scope, scientific invariants, ownership boundaries, and a traceable monorepo map.
- **Inputs:** the two supplied project briefs and an empty workspace.
- **Tasks:** initialize Git; create directories; write architecture, contracts, risk/evaluation/data/model plans and ADRs; add policies and ignore rules.
- **Deliverables:** repository structure, architecture, documentation-only contracts, risk register, evaluation plan, and this execution path.
- **Exit criteria:** every listed path exists; Markdown links resolve; required safety statements and status boundary are present; Git status is reviewed.
- **Dependencies:** none.
- **Main risks:** implying implementation exists, internal link drift, or hiding unresolved licence/stack decisions.
- **Current result:** initialized, pending final validation; no commit requested or created.

## Foundation gate — Reproducible development environment

- **Objective:** prepare a testable monorepo without downloading a model.
- **Inputs:** accepted architecture/ADRs; Python/Node version decision; package-manager and licence decision; small synthetic or redistributable fixtures.
- **Tasks:** create Python project/dependency groups; Next.js/TypeScript shell; `.env.example`; central configuration and structured logging; Ruff, type checking, pytest, ESLint, Prettier, Vitest; pre-commit; Docker development setup; CI.
- **Deliverables:** backend health endpoint, frontend development page, locked manifests, test/lint commands, Docker Compose and CI workflow.
- **Exit criteria:** health endpoint and page load; unit tests and lint/type checks pass; clean bootstrap is reproducible; no model/checkpoint is downloaded.
- **Dependencies:** development toolchain access and approved versions.
- **Main risks:** incompatible geospatial/ML dependencies, premature dependency sprawl, platform-specific builds.
- **Compute/data:** developer CPU; no training dataset/GPU.

## Phase 1 — Deterministic geospatial foundation

- **Objective:** ingest supported files and represent only defensible metadata and quality.
- **Inputs:** foundation gate; schema design; corrupt/valid synthetic fixtures; licence-approved tiny sample files.
- **Tasks:** implement provenance-wrapped shared schemas; GeoTIFF/JPEG/PNG gateway; file/metadata extraction; user-supplied metadata path; quality/compatibility checks; upload API; basic map vs image visualization; audit events.
- **Deliverables:** upload validation, metadata extraction, GeoTIFF/ordinary-image handling, `QualityReport`/`CompatibilityReport`, and basic visualization.
- **Exit criteria:** valid GeoTIFF fields parse; JPEG limitations remain explicit; corrupt inputs reject; shifted/incompatible pairs are detected; schemas reject provenance promotion; unit/integration/scientific tests pass.
- **Dependencies:** GDAL/Rasterio/Pillow/ExifTool decisions; Phase F.
- **Main risks:** parser vulnerabilities, ambiguous bands, CRS edge cases, decompression/raster bombs, incorrect registration thresholds.
- **Compute/data:** CPU; small controlled fixtures only.

## Phase 2 — Physics and spatial tools

- **Objective:** provide deterministic, versioned evidence calculations with declared prerequisites.
- **Inputs:** verified metadata and raster/mask contracts; hand-calculated fixtures; selected projection/unit policy.
- **Tasks:** implement supported spectral indices, SAR statistics, pixel/georeferenced area, coverage, polygonization, overlap/topology/distance, gain/loss, transition matrices, validity/quality statistics, and provenance-rich results.
- **Deliverables:** spectral indices, SAR statistics, area calculations, region topology, and unit/scientific tests.
- **Exit criteria:** known-value tests agree; missing bands and untrusted scales are rejected; CRS/units are correct; every result resolves to source/mask/region and operation version.
- **Dependencies:** Phase 1 contracts and metadata.
- **Main risks:** divide-by-zero, scaling mismatch, geographic-CRS area error, invalid geometries, accidental universal thresholds.
- **Compute/data:** CPU; numeric and small raster fixtures.

## Phase 3 — Specialist segmentation

- **Objective:** train and serve calibrated modality-specific semantic segmenters.
- **Inputs:** approved dataset registry/licences; immutable manifests; geographic splits; reproducible preprocessing/metrics; compute estimate; successful small overfit tests.
- **Tasks:** train/evaluate optical RGB SegFormer, four-band SegFormer, and SAR U-Net; compare RGB vs RGB+NIR; calibrate classes; tile/reconstruct; build versioned model registry and unified service contract.
- **Deliverables:** optical, multispectral, and SAR model versions; model registry; independently served capabilities; calibrated confidence and model cards.
- **Exit criteria:** reproducible baselines and unseen-geography results; tensor/band order and tile reconstruction tests; licence release gate; no unexplained leakage; deployment memory measured.
- **Dependencies:** Phases 1–2; completed data audit and labels.
- **Main risks:** domain shift, label noise, leakage, class imbalance, checkpoint/licence incompatibility, GPU limits.
- **Compute/data:** GPU/storage determined from pilot measurements; actual counts reported after audit.

## Phase 4 — Temporal and fusion workflows

- **Objective:** quantify semantic change and combine optical/SAR evidence without hiding incompatibility.
- **Inputs:** calibrated segmenters; pair-validation/alignment; quality reports; paired labelled evaluation data.
- **Tasks:** same-model T1/T2 masks; gain/loss/transition evidence; registration sensitivity; per-region rule-based optical–SAR weights; contradiction/fallback/abstention; optional ChangeFormer experiment only after baseline.
- **Deliverables:** alignment validation, class-transition pipeline, reliability-aware optical–SAR fusion, and optional change-model evaluation.
- **Exit criteria:** shifted pairs trigger restriction; transition/area results link to regions; fusion beats or clearly characterizes single/equal-weight baselines under quality strata; optional model is retained only on justified improvement.
- **Dependencies:** Phases 1–3 and paired data licences.
- **Main risks:** false change, inconsistent ontologies, date/acquisition mismatch, blind probability averaging, sparse paired labels.
- **Compute/data:** CPU for rule baseline; GPU only for evaluated model inference/training.

## Phase 5 — Agentic planner

- **Objective:** turn queries and validated evidence inventories into minimal, valid workflows.
- **Inputs:** stable schemas/capability registry; deterministic validators; curated valid/invalid/ambiguous plan cases.
- **Tasks:** implement LangGraph state; intent extraction; workflow proposal; strict plan validation; conditional routing; fallback/abstention; auditable invocation records; external MCP only for justified interoperability.
- **Deliverables:** LangGraph workflow, tool registry, constrained plans, fallback and abstention paths.
- **Exit criteria:** plan schema and graph tests pass; high workflow/tool selection on held-out cases; simple questions avoid unnecessary tools; blocker bypass rate is zero in the test suite.
- **Dependencies:** stable Phases 1–4 interfaces.
- **Main risks:** prompt injection, invalid tool selection, planner/tool drift, excess latency, hard-coded deployment coupling.
- **Compute/data:** CPU plus VLM access only if query parsing requires it; no fine-tuning yet.

## Phase 6 — Qwen VLM adaptation

- **Objective:** ground answers in structured remote-sensing evidence and specialize reasoning without duplicating full VLMs.
- **Inputs:** exact approved Qwen3.5-VL checkpoint/licence; compatible Transformers/PEFT/vLLM matrix; frozen evidence contracts; approved VQA/grounding datasets; base-model benchmark.
- **Tasks:** evaluate base; adapt projector/selected vision layers; train grounding/VQA, temporal, optical–SAR, and reporting LoRAs in that order; evaluate interference; implement provisional/confirmed adapter routing, caching, fallback, and answer validation.
- **Deliverables:** vision-encoder adaptation, versioned Multi-LoRA artifacts, grounded answer generation, Ray Serve adapter routing, model/evaluation cards.
- **Exit criteria:** improvements are supported by held-out/ablation evidence; hallucinated measurements and citation errors meet risk-approved thresholds; exact versions and data lineage are reproducible; two-failure restricted-answer path works.
- **Dependencies:** Phases 1–5 and training gates in [04-training-pipeline.md](04-training-pipeline.md).
- **Main risks:** unavailable/incompatible checkpoint, catastrophic forgetting, adapter interference, hallucination, GPU memory, licensing.
- **Compute/data:** measured GPU plan required before training; no silent checkpoint substitution.

## Phase 7 — Product integration

- **Objective:** provide a transparent interface for uploads, metadata correction, evidence inspection, and exports.
- **Inputs:** stable backend contracts, auth/privacy/retention decisions, validated map/vector output, accessibility design.
- **Tasks:** Next.js workflow; progress; metadata/compatibility panel; MapLibre for georeferenced assets and image viewer otherwise; T1/T2 compare; layer/region/measurement/limitation/audit panels; GeoJSON/CSV/report downloads.
- **Deliverables:** web application, interactive overlays, downloadable outputs, and audit history.
- **Exit criteria:** representative end-to-end flows pass; JPEG never masquerades as map data; authorization and retention tests pass; claims and downloads match evidence.
- **Dependencies:** Phases 1–6, security/privacy decisions.
- **Main risks:** misleading visualization, large-raster performance, sensitive metadata exposure, frontend/backend contract drift.
- **Compute/data:** staging services and small approved fixtures.

## Phase 8 — Evaluation and hardening

- **Objective:** establish attributable quality, operational safety, and deployment readiness.
- **Inputs:** integrated system; frozen benchmark manifests; risk thresholds; representative load/security cases.
- **Tasks:** five-level evaluation, required ablations, stress/OOD/misregistration tests, security review, dependency/model scanning, load/cost/memory profiling, monitoring/rollback/runbooks, documentation audit.
- **Deliverables:** benchmark results, ablation study, stress tests, security review, and deployment/runbook documentation.
- **Exit criteria:** reproducible accepted metrics; critical risks have owners/controls; no known validity-guardrail bypass; recovery and restricted-answer paths tested; stakeholders accept residual limitations.
- **Dependencies:** all earlier phases.
- **Main risks:** benchmark overfitting, unrepresentative load, metric aggregation hiding subgroup failure, operational drift.
- **Compute/data:** frozen licensed evaluation data and measured staging resources.

## Fine-grained implementation order

Within these phases, use this dependency order: licence audit → manifests → geographic splits → preprocessing → metrics → optical/multispectral/SAR baselines → calibration → temporal mask baseline → optional ChangeFormer → physics/spatial evidence → rule-based fusion → base VLM → vision adaptation → four capability LoRAs → adapter routing → constrained planner → Ray deployments → answer validation → frontend → end-to-end benchmark/ablations → latency/memory optimization → demonstration packaging.

If a dataset, checkpoint, licence, metadata field, dependency, or compute resource is unavailable, block only the dependent work, record the condition, and continue with independent safe tasks. Never invent counts, metrics, cost, or latency.

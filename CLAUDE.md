# CLAUDE.md — SatQuery AI Project Context

This file is the persistent context for any AI coding agent working on this repository. Read this in full before writing or modifying any code. It consolidates `architecture.md`, `phases.md`, `registry_spec.md`, and every domain-specific rule discovered while researching the problem statement. When in doubt, the rule in this file wins over a plausible-sounding default.

---

## 1. What this project is

**SatQuery AI** — an agentic, query-driven vision-language assistant for remote-sensing image analysis, built for Smart India Hackathon 2026, Problem Statement 26167 (Indian Space Research Organisation / ISRO-SAC).

The system answers natural-language questions about satellite imagery — single images, cross-modal optical+SAR pairs, and bi-temporal (before/after) pairs — by routing the query to the right specialist model(s)/tool(s), enforcing scientific validity in the backend, and having a remote-sensing-adapted VLM explain the resulting evidence in plain language.

**It is judged by actual ISRO scientists.** They will probe claims of "agentic" behavior live, check whether the system actually adapted a model to remote sensing (vs. wrapping a generic LLM), and test edge cases (missing bands, unverified geometry, cloud cover). The hidden evaluation set uses real Cartosat-2S optical + RISAT SAR pairs — different sensor characteristics from the Sentinel-1/2 training data. Assume domain shift is real and plan for graceful degradation, not false confidence.

---

## 2. The one law that governs every architectural decision

> **The VLM plans and explains. The backend enforces scientific validity. Specialist models and tools produce evidence. The controller ties it together into an auditable trace.**

Concretely:
- The VLM (planner call) **proposes** a workflow — it never directly decides what's scientifically valid.
- The **validator** is a deterministic rule engine, not another LLM call — it checks the plan against registry contracts and the actual verified InputProfile.
- **No number in the final answer may be invented by the VLM.** Every number must trace back to a tool/model output recorded in the evidence package. The verifier checks this before the answer is returned.
- **A failed prerequisite disables one output, not the whole answer.** E.g., missing CRS → drop hectare estimates, keep pixel-count and qualitative description.

If you (the AI agent) are ever asked to make the VLM "just answer directly" or to skip validation "for speed," push back — that violates the PS's core requirement and will fail judging.

---

## 3. Tech Stack (final decision — do not suggest Node for backend)

| Layer | Technology | Notes |
|---|---|---|
| Frontend (shared) | Next.js 14, TypeScript, Tailwind, Zustand, TanStack Query | Two modes, one design system — see §4a |
| Geospatial Viewer | MapLibre GL JS, TiTiler (COG tiles), maplibre-gl-draw | Never loads full-res rasters into the browser |
| API Gateway + Agentic Controller | **Python 3.11+, FastAPI, Pydantic v2** | Deliberately Python — tightly coupled to scientific_tools, in-process calls |
| Scientific Tools | Python, `rasterio`, `GDAL`, `numpy` | Pure functions, no ML, typed exceptions |
| Model Services | Python, PyTorch, HuggingFace `transformers`, `peft`, `bitsandbytes` | Each model = its own FastAPI microservice |
| VLM Base | Qwen2.5-VL (3B or 7B, 4-bit quantized) | Adapted via LoRA. **Qwen3.5-VL note:** real, released Feb 2026, more capable, but very new — verify PEFT/LoRA/quantization tooling maturity before switching; Qwen2.5-VL is the safe default if that tooling isn't solid yet |
| Training Pipeline | Python, PyTorch, PEFT, SLURM (university GPU cluster) | Fully offline, separate from inference |
| DB | PostgreSQL + PostGIS extension + SQLModel/SQLAlchemy (async) | PostGIS backs the Evidence Explorer's region/geometry queries |
| Cataloging | STAC via `pystac` | Every image/mask/evidence package is a STAC Item |
| Reproducible exports | `nbformat`, `fiona`/`shapely` | Notebook generation, GeoJSON/Shapefile export |
| Object Store | Local filesystem under `./artifacts/` for now (S3-compatible interface reserved for later) | No MinIO/Docker yet |
| Registry | YAML files + Pydantic-validated Python loader | See §7 |

**Explicitly deferred (do not build unless asked):** Docker/docker-compose, Kubernetes, Nginx, automated test suites, Celery (using FastAPI `BackgroundTasks` for now instead).

Rationale for Python backend over Node: the agentic controller calls `scientific_tools/` functions in-process dozens of times per request (band math, geometry, fusion). Splitting that across a Node/Python boundary adds a network hop and a second deployment target for no benefit, in a project where the actual bottleneck is GPU/training time, not backend language ergonomics.

---

## 4. Repository Structure

Not duplicated here — the project starter scaffold already establishes this. When creating a new file for any chunk in `phases_ml.md`/`phases_dev.md`, mirror the convention of sibling files already present in the same directory rather than inventing a new layout.

## 4a. Two Product Surfaces (read before touching frontend code)

This system ships as **two frontend modes sharing one backend, one registry, and one design system** — never build them as separate products:

| Mode | Purpose | Mandatory for PS scope? |
|---|---|---|
| **Quick Query** | Upload → query → dual-register (plain-language + technical) answer. The PS's stated target user is a non-expert — this mode is that answer. | **Yes — this alone must fully satisfy all 5 mandatory PS capabilities.** |
| **Evidence Explorer** | A four-panel scientific IDE (Geospatial Viewer, Scientific Analysis, Processing History, Research Experiment "What-If" Engine) opened from any completed run. This is the team's differentiator feature, aimed at how ISRO's own scientists would want to interrogate an answer. | No — additive depth. If time runs out, Quick Query alone still ships a complete, PS-compliant product. |

Full design: `architecture.md §3.11` (Evidence Explorer), `§15–17` (evidence graph schema, STAC/reproducibility, design system/UX flow). **Never let Explorer work block or delay Quick Query work** — see the risk register in `architecture.md §14`.

**Frontend look-and-feel is a hard constraint, not a preference:** dark-first "Mission Control" theme, one restrained teal accent (`#3DDBD9`), monospace for all data/numeric readouts, no gradients/glow-blobs/bouncy-animation "generic AI product" clichés. Full color tokens and typography rules: `architecture.md §17.2–17.3`. If you're asked to add a UI element and the instinct is to reach for a purple-to-blue gradient or a glassmorphism card, that's the signal to stop and re-read §17.

**Performance is an architecture decision, not an afterthought:** never load a full-resolution raster into the browser (tile via MapLibre+TiTiler from COGs), cache server state with TanStack Query so panel switches don't re-fetch, virtualize long lists, code-split the Experiment Panel so it doesn't bloat the initial bundle. Full budget: `architecture.md §17.4`.

---

## 5. Core Data Schemas (exact shapes — do not invent alternate field names)

### InputProfile
```json
{
  "image_id": "img_0091", "format": "GeoTIFF", "dimensions": [1024, 1024],
  "channels": 4, "band_identities": ["R", "G", "B", "NIR"],
  "sensor_type": "optical_multispectral", "sensor_family": "sentinel-2",
  "crs": "EPSG:32643",
  "pixel_spacing_m": [10.0, 10.0], "acquisition_date": "2025-11-02",
  "sar_polarization": null, "nodata_value": 0, "valid_pixel_fraction": 0.94,
  "verified_fields": ["dimensions", "crs", "pixel_spacing"],
  "missing_fields": ["cloud_mask"],
  "capability_restrictions": ["area_estimation: uncertain without cloud mask"]
}
```
`sensor_family` is one of `sentinel-1`, `sentinel-2`, `cartosat-2s`, `risat`, `unknown` — resolved at ingestion from metadata/sidecars, never guessed from appearance. This is what the validator checks against each candidate model's `known_domain_shift_sensors` (see §8 "Domain shift & resolution enforcement" below and `registry_spec.md §7`).

### ExecutionPlan (VLM planner output — must be strict JSON, no prose)
```json
{
  "workflow": "temporal", "images": ["img_0091", "img_0092"],
  "target_classes": ["water", "cropland"], "required_models": ["SEG_RGBNIR_v1"],
  "optional_tools": ["compute_spectral_index:NDWI"],
  "requested_outputs": ["change_map", "area_estimate"],
  "final_adapter": "LORA_TEMPORAL_v1",
  "fallback": "spatial_description_without_hectares_if_scale_unavailable"
}
```

### EvidencePackage
```json
{
  "run_id": "run_2026_00417",
  "claims": [{"claim": "water area increased", "measurement": "gain_area_ha=14.2",
              "region_id": "reg_003", "source_images": ["img_0091", "img_0092"],
              "tool": "measure_regions", "confidence": 0.81}],
  "masks_ref": "./artifacts/run_2026_00417/masks/",
  "overlays_ref": "./artifacts/run_2026_00417/overlays/",
  "limitations": ["cloud cover 6% at T2, excluded from valid area"],
  "model_versions": {"SEG_RGBNIR_v1": "1.0.0", "LORA_TEMPORAL_v1": "1.0.0"}
}
```

### SARRaster (typed wrapper — replaces bare `np.ndarray` for all SAR data)
```python
class SARRaster(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    array: np.ndarray
    representation: Literal["dB", "linear"]
    polarization: Literal["VV", "VH"]
```
Every SAR array is wrapped in this the moment it's read (`raster_io`) or produced (`prepare_model_input`). Representation is set **once, honestly**, from the product's documented processing level or the registry's declared `input_contract.representation` — never inferred later from the numbers. Full rationale: `registry_spec.md §8`.

### RegistryEntry — see `registry_spec.md` §2 for the full field list. Note the `known_domain_shift_sensors` field added alongside `resolution_range_m`.

### Evidence Graph tables (Evidence Explorer only — extends EvidencePackage, doesn't replace it)
`regions` (PostGIS geometry column), `evidence_nodes` (graph node per claim/measurement/region/mask/model/input, linked via `parent_node_id`), `experiments` (versioned What-If reruns, parent run never mutated), `feedback_tags` (Accepted/Rejected/Needs Review). Full schema: `architecture.md §15`. The flat `claims` list in `EvidencePackage` is one traversal of this same graph — Quick Query and Evidence Explorer must never read from two different representations of the same run.

All schemas use `model_config = ConfigDict(extra="forbid")` — an unexpected field is a bug, not a feature to silently accept.

---

## 6. Component Contracts (function signatures the whole system depends on)

```python
# controller/ingestion.py
def ingest_upload(file_bytes: bytes, filename: str) -> str: ...          # returns image_id
def validate_file(path: str) -> None: ...                                 # raises UnsupportedFormatError / CorruptFileError
def inspect_image(image_id: str) -> dict: ...
def resolve_metadata(image_id: str, sidecar: dict | None) -> InputProfile: ...

# controller/planner.py
def plan(query: str, image_ids: list[str], input_profiles: list[InputProfile]) -> ExecutionPlan: ...

# controller/validator.py
def validate_plan(plan: ExecutionPlan, profiles: list[InputProfile]) -> ValidationResult: ...

# controller/preprocessing.py
def prepare_model_input(image_id: str, model_id: str) -> dict: ...        # raises IncompatibleInputError

# controller/executor.py
def run_single_image_workflow(plan, validation) -> dict: ...
def run_temporal_workflow(plan, validation) -> dict: ...
def run_crossmodal_workflow(plan, validation) -> dict: ...

# controller/evidence.py
def build_evidence_package(run_id, workflow_result, plan) -> EvidencePackage: ...

# controller/answerer.py
def generate_answer(query, evidence, plan) -> str: ...

# controller/verifier.py
def verify_answer(answer_text, evidence) -> VerificationResult: ...

# scientific_tools/*
compute_ndvi(nir, red) -> np.ndarray
compute_ndwi(green, nir) -> np.ndarray
compute_mndwi(green, swir1) -> np.ndarray
compute_ndbi(swir1, nir) -> np.ndarray
backscatter_stats(sar_array: SARRaster, region_mask=None) -> dict
vv_vh_ratio(vv: SARRaster, vh: SARRaster) -> np.ndarray                    # raises ValueError if .representation != "linear" (type-checked, not inferred from values)
measure_regions(mask, pixel_spacing_m, crs) -> dict                        # raises UnverifiedGeometryError
check_pair_compatibility(profile_a, profile_b) -> dict
compute_valid_mask(raster, nodata_value, cloud_mask=None) -> np.ndarray
compare_dates(mask_t1, mask_t2, valid_mask) -> dict
fuse_evidence(p_opt, q_opt, p_sar, q_sar) -> dict
estimate_optical_reliability(image_array, cloud_mask) -> np.ndarray
estimate_sar_reliability(sar_array, layover_shadow_mask=None) -> np.ndarray
```

---

## 7. Registry System — Summary (full detail in `registry_spec.md`)

The registry (`backend/registry/`) is the single source of truth for what models/adapters/tools exist and what input they require. **Nothing is called unless it's registered.** Validate every YAML against `RegistryEntry` at import time — crash on startup if a file is malformed, don't fail silently mid-request.

Directory: `registry/models/*.yaml`, `registry/adapters/*.yaml`, `registry/tools/*.yaml`.

Key entries already specified (see `registry_spec.md §4` for full YAML): `SEG_RGB_v1`, `SEG_RGBNIR_v1`, `SEG_SAR_VV_VH_v1`, `GROUNDING_v1`, `CHANGE_BASELINE_v1`, `FUSION_v1`, `LORA_GENERAL_v1`, `LORA_TEMPORAL_v1`, `LORA_CROSSMODAL_v1`, plus 4 scientific-tool entries.

Versioning: patch = retrain same contract; minor = add class/optional field; major = breaking `input_contract` change. Never overwrite an `id` — old execution traces must remain interpretable.

---

## 8. Domain Rules the Agent Must Never Violate

These come directly from the remote-sensing research done for this PS. Violating them produces plausible-looking but scientifically wrong code.

**Band identity & sensor type**
- Channel count never implies band identity. 4 channels ≠ RGB+NIR (could be RGBA). A coloured image is not proof of optical sensing (a SAR preview can be colourized). A grayscale raster is not proof of SAR.
- A missing metadata field stays `null`/unknown — never infer it from appearance.
- HV is not a substitute for VH; polarization order in `input_contract` must be matched exactly.

**File formats**
- GeoTIFF need not be georeferenced; a GeoTIFF need not contain NIR/SWIR/calibrated reflectance just because it's a GeoTIFF.
- Operational imagery is GeoTIFF/TIFF only. PNG/JPEG are accepted **only** for the four prescribed public benchmarks (BigEarthNet.txt, VRSBench, RSVQA, CDVQA) — never treat a benchmark JPEG as if it has recoverable scientific bands.
- Converting JPEG→TIFF changes the container, not the content — it cannot recover lost NIR/SWIR/SAR calibration/coordinate transform.

**SAR-specific**
- SAR representation (dB vs linear) is fixed at training time and must match at inference. `vv_vh_ratio()` must operate on **linear power**, not dB — dB values require subtraction (log-ratio), never division.
- **This is enforced by type, not by inspecting the numbers.** Every SAR array is a `SARRaster` (see §5) with an explicit `representation` field set once at creation. `vv_vh_ratio()` and friends check `.representation`, they do not guess from value ranges (a heuristic like "negative values mean dB" is unreliable — positive dB values exist). If you're asked to write SAR math against a bare `np.ndarray` instead of `SARRaster`, push back — that reopens exactly the bug this fixes.
- SAR calibration/terrain correction should not be reapplied to already-processed products.

**Domain shift & resolution enforcement**
- `resolution_range_m` in a registry entry is **enforced by `validate_plan()`**, not just descriptive metadata. If `InputProfile.pixel_spacing_m` is outside a candidate model's `resolution_range_m` by more than a configured factor (default 5×), the plan is a hard error, not a silent pass.
- `InputProfile.sensor_family` (`sentinel-1`/`sentinel-2`/`cartosat-2s`/`risat`/`unknown`) is checked against each candidate model's `known_domain_shift_sensors`. A match always adds an explicit `restrictions` entry and caps downstream confidence, even if the resolution check alone would have passed — resolution overlap does not mean radiometry/physics match.
- `sensor_family == "unknown"` is itself a restriction-worthy state — never assume an unverified sensor matches the training distribution.
- Full enforcement policy and table: `registry_spec.md §7`.

**Spectral indices**
- NDVI = (NIR−Red)/(NIR+Red); NDWI = (Green−NIR)/(Green+NIR); MNDWI = (Green−SWIR1)/(Green+SWIR1); NDBI = (SWIR1−NIR)/(SWIR1+NIR). NDBI and NDMI computed from the same bands are negatives of each other — not independent confirmation of anything.
- Never compute indices on display-stretched/contrast-adjusted composite values — only on scaled, radiometrically valid scientific bands. Mask near-zero denominators (return NaN, don't divide by ~0).

**Geometry & area**
- Ground area requires a valid mask **and** trustworthy geospatial geometry (CRS + pixel spacing) — not just a spectral band. For lat/lon (geographic) rasters, use geodesic/equal-area calculation; never multiply degree-valued pixel dimensions as if they were metres.
- Without verified scale, report pixel-based coverage with a stated denominator — never invent hectares.
- Upsampling a coarse sensor does not create real spatial detail; preserve original resolution in the evidence record.

**Pairs (temporal & cross-modal)**
- Two images of the same place are not automatically "change" data — validate modality and acquisition-date relationship before routing (see `check_pair_compatibility()`).
- A single-pixel misregistration between T1/T2 can create fake "change" at every edge — validate alignment, don't assume georeferenced ⇒ co-registered.
- Cloud-obscured or otherwise invalid pixels are **unknown**, not "no change." Restrict all temporal comparison to the common valid area.
- Optical+SAR pairs are not automatically simultaneous — check the acquisition-date gap; flood water, for example, can change between two sensors' passes.
- For the hidden ISRO/SAC eval set: pairs are stated as pre-georeferenced and co-registered — validate that claim, don't blindly re-register data that's already aligned.

**Fusion**
- Fusion reliability weights are computed by a tested backend method, never invented by the VLM.
- If both modalities are unreliable for a pixel/region, return `unknown` — never force a confident average from two bad inputs.
- Preserve disagreements between modalities in the output; don't silently hide them.

**Segmentation**
- A multiclass segmenter typically predicts all trained classes internally; the wrapper/tool selects only the requested subset — this is not multiple separate model runs.
- A semantic segmentation mask is not an object count. Bounding boxes are not exact footprints/boundaries. Use a real detector for counts, not a proxy from segmentation.

**VLM & LoRA**
- A generic, unadapted VLM does not satisfy this PS — remote-sensing adaptation via LoRA (or similar) is mandatory.
- CNN measurements/metadata are text context for the VLM's language component — they do not go into the vision encoder as pixels.
- Activate the correct LoRA (per registry `activation_point`) **before** the relevant forward pass — loading and activating are separate operations.
- The planner and answerer can be the same base model in two separate calls; a second "agent LLM" is not required.
- Confidence must come from a calibrated source — the VLM saying "I'm confident" is not a confidence score.

**Datasets — quirks that will silently corrupt training if missed**
- **BigEarthNet.txt**: the Hub exposes an `all_data` split but each row also has its own `split` field — filter on the row-level field, never train on the whole `all_data` table as if it were all training data.
- **RSVQA**: has low-resolution, high-resolution, and BigEarthNet-derived variants. The PS does not specify which. Require an explicit `variant` argument in the loader — never silently default to one.
- **VRSBench**: boxes are reference targets for evaluation, not model predictions — don't conflate published comparison-figure model outputs with ground truth.
- **CDVQA**: derives from SECOND imagery; SECOND's semantic-change masks are a separate resource from CDVQA's QA pairs — don't mix them into one loader silently. White in SECOND's change maps means "unchanged," not a land-cover class.
- Split all datasets **by scene/geography**, not by random row, to avoid leakage between train/val/test (different crops or dates from the same site can still leak).

**Evaluation set**
- No public dataset here is Cartosat-2S/RISAT — expect a domain-shift gap on the actual hidden ISRO/SAC evaluation set. Validate transfer where possible; report the gap honestly rather than assuming BigEarthNet fine-tuning fully solves it.

---

## 9. Coding Conventions

- Every scientific/controller function that has a documented failure mode raises a **typed exception** (`MissingBandError`, `IncompatiblePairError`, `UnverifiedGeometryError`, `IncompatibleInputError`, `UnsupportedFormatError`, `CorruptFileError`, `PlannerParseError`, `RegistryEntryNotFoundError`) — never return `None`/silently degrade without recording it in `restrictions`/`limitations`.
- Pydantic models use `ConfigDict(extra="forbid")`.
- Every module in `scientific_tools/` and `controller/` gets a docstring citing which `architecture.md` section it implements.
- No hardcoded per-model preprocessing in the executor — always route through the registry's `input_contract` (see `prepare_model_input`).
- Prefer graceful degradation (add to `restrictions`/`limitations`, drop one output) over hard failure, **except** for missing required model/adapter or genuinely incompatible pairs, which are hard errors.
- Config/secrets via `.env` + `pydantic-settings`; never hardcode endpoints or credentials in code.

---

## 10. Commit Conventions

Small, incremental commits — 2–3 per chunk, per `phases.md`. Conventional-commit-style prefixes: `feat:`, `fix:`, `chore:`, `refactor:`, `perf:`, `docs:`. No test-suite commits yet (deferred). No Docker/infra commits yet (deferred).

---

## 11. Build Status & Roadmap

Full phase-by-phase build order with ready-to-use AI prompts: **`docs/phases_ml.md`** (dataset prep, training, eval) and **`docs/phases_dev.md`** (backend, agentic controller, frontend, Evidence Explorer). Full registry contracts: **`docs/registry_spec.md`**. Full system design: **`docs/architecture.md`**.

Critical path: Phase 1 (schemas + registry) must be done before Integration or Backend Phase 2 can proceed correctly — every other component reads these shapes. **Phases 13–19 in `phases_dev.md` (Evidence Explorer + design system) come strictly after Phase 12 (Quick Query fully working end-to-end) — never let Explorer work delay or block the mandatory PS-scope path.**

Team split (reference — adjust to actual team):
- **ML:** `phases_ml.md` — dataset loaders, segmentation/LoRA training, model services, eval harness
- **Backend/Integration/Frontend (single engineer or split further):** `phases_dev.md` — schemas, registry, scientific tools, agentic controller, Quick Query GUI, Evidence Explorer

---

## 12. Explicitly Out of Scope (for now — don't build unless asked)

- Docker, docker-compose, Kubernetes, Nginx configs.
- Automated test suites (unit/integration).
- Celery/Redis async job queues (using FastAPI `BackgroundTasks` instead).
- MinIO/S3 (using local `./artifacts/` filesystem storage instead).
- Learned (as opposed to evidence-level) fusion — evidence-level weighted fusion is the required first version.
- ChangeFormer training — baseline diff-of-segmentations is the required first version; ChangeFormer is an optional upgrade behind a config flag.

---

## 13. Known Risks (keep these in mind when making design suggestions)

| Risk | Mitigation already designed in |
|---|---|
| Domain shift: Sentinel-trained models vs. Cartosat-2S/RISAT hidden eval | **Enforced at runtime**, not just documented: `validate_plan()` checks `resolution_range_m` and `known_domain_shift_sensors` against `InputProfile.sensor_family`/`pixel_spacing_m` and attaches restrictions/confidence caps automatically (`registry_spec.md §7`); eval harness additionally reports the gap honestly post-hoc |
| Insufficient compute/time to train every specialist | Baseline-first policy; one shared LoRA before splitting into task adapters |
| "Agentic" claim not demonstrated convincingly live | Plan JSON + machine-readable execution trace shown in GUI TracePanel |
| Unknown judging metric weights (PS has a placeholder table) | Broad eval harness covering all axes (VQA, grounding, change, fusion, calibration) instead of one guessed metric |
| Live demo failure (network/GPU) | `demo_fallback/` cached JSON responses + `?fallback=` param in frontend |
| Evidence Explorer feature scope threatens core PS-mandatory scope | Explorer is strictly additive and built after Quick Query is complete (see §4a, §11); Quick Query alone must satisfy every mandatory PS requirement with zero dependency on the Explorer |

---

## 14. When You (the AI agent) Are Uncertain

1. Check this file first.
2. Check `docs/architecture.md` for system design intent.
3. Check `docs/phases.md` for the exact chunk prompt this task corresponds to.
4. Check `docs/registry_spec.md` if the question involves any model/tool/adapter contract.
5. If still uncertain, prefer the option that **fails loudly with a typed exception or adds an explicit restriction/limitation**, over one that silently guesses — this matches the entire project's design philosophy and is what ISRO judges are specifically looking for.

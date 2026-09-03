# SatQuery AI — Dev Build Phases
### Backend, agentic controller, and frontend — owned by the software engineer

This is the non-ML slice of `phases.md`: repo scaffolding, schemas/registry, scientific tools, the agentic controller (planner/validator/executor/evidence/answerer/verifier), and the frontend. This is the bulk of the system's engineering surface area — the ML side trains and serves models, this side is what makes the whole thing "agentic" rather than a script.

**Companion file:** `phases_ml.md` covers dataset prep, model training, and evaluation — owned by the ML engineer. Read `CLAUDE.md`, `architecture.md`, and `registry_spec.md` for full context before starting; this file assumes that context.

---

## Handoff Points With `phases_ml.md`

| When | What you need from ML | What ML needs from you |
|---|---|---|
| Before Phase 6.2 (preprocessing) | Nothing yet — you can build `prepare_model_input()` against the registry contract alone, mocking the model call | — |
| Before Phase 6.3 (executor dispatch) | ML's `seg_rgb_service` / `seg_sar_service` / `grounding_service` must be callable at `POST /infer` (Chunk 6.1 in `phases_ml.md`) — even a stub response unblocks you | Your registry loader (Phase 1.2) must exist first — ML writes real registry YAMLs against your schema |
| Before Phase 9.2 (answerer) | ML's `vlm_service.generate()` must be callable with an `adapter_id` param | — |
| Ongoing | ML updates registry YAML `eval_summary`/`version` after training runs — pull latest before demo prep | You own the registry loader code; ML only edits YAML content, not the loader logic |

**Suggested order:** Start Phase 0 → Phase 1 immediately (nothing blocks you). By the time you reach Phase 6, ping the ML engineer to make sure at least stub versions of the model services exist — you don't need real trained weights to keep building, just the HTTP contract.

**Phases 13–19 (Evidence Explorer + design system) come strictly after Phase 12.** They're the differentiator feature, not mandatory PS scope — Quick Query (Phases 0–12) must be fully working end-to-end on its own first. If time runs out mid-Explorer, Quick Query alone still satisfies every mandatory PS requirement.

---

## Phase 0 — Repo Scaffolding

*(If your starter scaffold already covers this, skip straight to Phase 1 — these chunks exist for teams starting from an empty repo.)*

### Chunk 0.1 — Backend skeleton (FastAPI)
**Builds:** `backend/` folder tree, FastAPI app entrypoint, config loading, empty routers.

**AI Prompt:**
> "Create a FastAPI backend skeleton for a project called SatQuery AI. Folder structure: `backend/api/` (routers), `backend/controller/` (planner, validator, executor, verifier — empty modules with docstrings for now), `backend/scientific_tools/` (empty modules: raster_io.py, indices.py, sar_stats.py, geometry.py, alignment.py, quality.py, compare.py, fuse.py — each with a module docstring describing its future responsibility), `backend/registry/` (empty, will hold YAML manifests + loader), `backend/schemas/` (Pydantic v2 models — leave empty for now), `backend/db/` (SQLAlchemy setup — leave empty for now). Add `backend/main.py` that creates the FastAPI app, mounts a placeholder `/health` route returning `{"status": "ok"}`, and loads settings from a `.env` file via `pydantic-settings`. Add `requirements.txt` with fastapi, uvicorn, pydantic, pydantic-settings, sqlalchemy, psycopg2-binary, rasterio, python-multipart. Do not add Docker files or test files."

**Commits:**
1. `chore: scaffold backend folder structure`
2. `feat: add FastAPI app entrypoint with health check`
3. `chore: add requirements.txt and settings loader`

### Chunk 0.2 — Frontend skeleton (Next.js)
**Builds:** Next.js + TypeScript + Tailwind app shell, empty page routes matching the GUI plan.

**AI Prompt:**
> "Scaffold a Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend called `frontend/` for a satellite-imagery Q&A app named SatQuery AI. Create empty page stubs: `/` (upload + query), `/benchmark` (browse sample datasets), `/history` (past runs). Create empty component files with prop-type interfaces only (no logic yet): `UploadPanel.tsx`, `QueryBox.tsx`, `MapViewer.tsx`, `EvidencePanel.tsx`, `TracePanel.tsx`, `ReportExport.tsx`. Add a minimal shared layout with a top nav linking the three pages. Do not add any backend calls yet, no Docker."

**Commits:**
1. `chore: scaffold Next.js frontend with Tailwind`
2. `feat: add page routes and shared layout`
3. `feat: add empty component stubs with typed props`

---

## Phase 1 — Data Contracts & Registry Foundation

**This phase blocks everyone else — finish it first.**

### Chunk 1.1 — Core Pydantic schemas
**Builds:** `backend/schemas/` — InputProfile, ExecutionPlan, EvidencePackage, RegistryEntry, SARRaster.

**AI Prompt:**
> "In `backend/schemas/`, create Pydantic v2 models matching these examples: InputProfile (image_id, format, dimensions, channels, band_identities, sensor_type, **sensor_family: Literal['sentinel-1','sentinel-2','cartosat-2s','risat','unknown']**, crs, pixel_spacing_m, acquisition_date, sar_polarization, nodata_value, valid_pixel_fraction, verified_fields, missing_fields, capability_restrictions), ExecutionPlan (workflow, images, target_classes, required_models, optional_tools, requested_outputs, final_adapter, fallback), EvidencePackage (run_id, claims as a list of {claim, measurement, region_id, source_images, tool, confidence}, masks_ref, overlays_ref, limitations, model_versions), RegistryEntry (id, type, modality, input_contract as a dict, classes, resolution_range_m: list[float] | None, endpoint, version, adapter_compatible, calibrated_confidence, trained_on, eval_summary, **known_domain_shift_sensors: list[str] | None**, notes), and **SARRaster** (array: np.ndarray with `model_config = ConfigDict(arbitrary_types_allowed=True)`, representation: Literal['dB','linear'], polarization: Literal['VV','VH']) — this wraps every SAR array from now on so downstream code checks `.representation` as a typed field instead of guessing dB-vs-linear from pixel value ranges. Use strict typing, Optional where a field may be unknown, and add `model_config = ConfigDict(extra='forbid')` on all non-ndarray models to catch typos early. One file per schema: `input_profile.py`, `execution_plan.py`, `evidence_package.py`, `registry_entry.py`, `sar_raster.py`, plus an `__init__.py` exporting all of them."

**Commits:**
1. `feat: add InputProfile (with sensor_family) and RegistryEntry (with known_domain_shift_sensors) schemas`
2. `feat: add ExecutionPlan, EvidencePackage, and SARRaster schemas`
3. `refactor: export schemas from package __init__`

### Chunk 1.2 — Registry manifests + loader
**Builds:** `backend/registry/models/*.yaml`, `backend/registry/adapters/*.yaml`, `registry_loader.py`.

**AI Prompt:**
> "Using the RegistryEntry schema in `backend/schemas/registry_entry.py`, create placeholder YAML manifest files under `backend/registry/models/` for: `seg_rgb_v1.yaml`, `seg_sar_vv_vh_v1.yaml`, `grounding_v1.yaml`, `change_baseline_v1.yaml`, `fusion_v1.yaml` — and under `backend/registry/adapters/` for `lora_general_v1.yaml`, `lora_temporal_v1.yaml`, `lora_crossmodal_v1.yaml`, and under `backend/registry/tools/` for `compute_spectral_index.yaml`, `sar_statistics.yaml`, `measure_regions.yaml`, `fuse_evidence.yaml`. Use the exact field values from `registry_spec.md §4` for each file. Then write `backend/registry/registry_loader.py` with functions: `load_all_models() -> list[RegistryEntry]`, `load_all_adapters() -> list[RegistryEntry]`, `load_all_tools() -> list[RegistryEntry]`, `get_by_id(entry_id: str) -> RegistryEntry` (raise `RegistryEntryNotFoundError` if missing), `query(modality=None, task=None, type=None) -> list[RegistryEntry]`. Load and validate every YAML against the Pydantic schema at import time and raise a clear error naming the bad file if validation fails."

**Commits:**
1. `feat: add YAML registry manifests for models, adapters, and tools`
2. `feat: implement registry_loader with validation on load`
3. `feat: add query() helper for filtering registry by modality/task/type`

### Chunk 1.3 — Database models
**Builds:** `backend/db/models.py` (SQLAlchemy/SQLModel).

**AI Prompt:**
> "Using SQLModel, create ORM models in `backend/db/models.py` matching these tables: `images`, `input_profiles`, `execution_plans`, `execution_traces`, `evidence_packages`, `answers`. Use UUID primary keys, JSON columns for the *_json fields, and proper foreign keys (input_profiles.image_id → images.id, execution_traces.plan_id → execution_plans.id, etc). Add `backend/db/session.py` with an async SQLAlchemy engine + session factory reading `DATABASE_URL` from settings. Do not add Alembic yet, do not add Docker — assume a local Postgres instance is already running and reachable via the URL in `.env`."

**Commits:**
1. `feat: add SQLModel ORM models for core tables`
2. `feat: add async db session factory`
3. `chore: add DATABASE_URL to settings and .env.example`

---

## Phase 2 — Ingestion & Scientific Tools

### Chunk 2.1 — Raster I/O + upload validation
**Builds:** `raster_io.py`, `ingest_upload()`, `validate_file()`.

**AI Prompt:**
> "In `backend/scientific_tools/raster_io.py`, using `rasterio`, implement: `read_raster_metadata(path) -> dict` (returns dimensions, dtype, channel count, CRS, transform, nodata), `read_bands(path, band_indices=None) -> np.ndarray`, and `is_georeferenced(path) -> bool`. In `backend/controller/ingestion.py`, implement `validate_file(path) -> None` that raises `UnsupportedFormatError` if the extension isn't in {tif, tiff, png, jpg, jpeg}, raises `CorruptFileError` if rasterio can't open it, and checks file size against a configurable max. Implement `ingest_upload(file_bytes, filename) -> str` that saves the file to a local `./artifacts/{image_id}/original.<ext>` path (image_id = uuid4), calls validate_file, and returns the image_id. Raise typed exceptions, don't silently swallow errors."

**Commits:**
1. `feat: add raster_io module for metadata and band reading`
2. `feat: add validate_file with typed exceptions`
3. `feat: implement ingest_upload with local artifact storage`

### Chunk 2.2 — Input profiling
**Builds:** `inspect_image()`, `resolve_metadata()` → InputProfile.

**AI Prompt:**
> "In `backend/controller/ingestion.py`, add `inspect_image(image_id: str) -> dict` that uses `raster_io.read_raster_metadata` plus a heuristic band-identity guesser (if 3 bands assume RGB unless a sidecar JSON says otherwise, if 4 bands mark NIR as 'unknown_band_4' rather than assuming NIR — channel count must never imply band identity). Add `resolve_metadata(image_id: str, sidecar: dict | None) -> InputProfile` that merges verified raster metadata with any trusted sidecar metadata (acquisition date, sar_polarization, sensor_type) the user optionally supplies, and populates `verified_fields` / `missing_fields` / `capability_restrictions` accordingly (e.g. if no CRS found, add 'area_estimation: unavailable without CRS' to capability_restrictions). Return a validated `InputProfile` pydantic object."

**Commits:**
1. `feat: add inspect_image heuristic metadata extraction`
2. `feat: implement resolve_metadata merging sidecar and raster data`
3. `fix: enforce band-identity caution rules in capability_restrictions`

### Chunk 2.3 — Spectral & SAR scientific tools
**Builds:** `indices.py`, `sar_stats.py`.

**AI Prompt:**
> "In `backend/scientific_tools/indices.py`, implement `compute_ndvi(nir, red)`, `compute_ndwi(green, nir)`, `compute_mndwi(green, swir1)`, `compute_ndbi(swir1, nir)`. Each function must validate input arrays are same shape and float dtype, handle near-zero denominators by returning NaN there (not dividing by zero), and raise `MissingBandError` if a required band array is None. In `backend/scientific_tools/sar_stats.py`, implement all SAR functions to accept the `SARRaster` schema from `backend/schemas/sar_raster.py` — never a bare `np.ndarray` — so representation checks are type-based, not inferred from pixel values: `backscatter_stats(sar: SARRaster, region_mask=None) -> dict` (mean, median, std over valid pixels, optionally masked to a region), `vv_vh_ratio(vv: SARRaster, vh: SARRaster) -> np.ndarray` (raise `ValueError` immediately if `vv.representation != 'linear'` or `vh.representation != 'linear'` — check the field, do NOT attempt to detect dB-vs-linear by inspecting the numbers, since positive dB values exist and a value-based heuristic is unreliable), and `temporal_backscatter_diff(sar_t1: SARRaster, sar_t2: SARRaster)` (raise `ValueError` if the two inputs have different `.representation` — comparing dB against linear is meaningless even if the shapes match)."

**Commits:**
1. `feat: implement spectral index functions (NDVI, NDWI, MNDWI, NDBI)`
2. `feat: implement SAR backscatter statistics accepting typed SARRaster inputs`
3. `fix: enforce representation match via type field in vv_vh_ratio and temporal_backscatter_diff`

### Chunk 2.4 — Geometry, alignment, quality, compare, fuse
**Builds:** `geometry.py`, `alignment.py`, `quality.py`, `compare.py`, `fuse.py`.

**AI Prompt:**
> "Implement five scientific-tool modules in `backend/scientific_tools/`. `geometry.py`: `measure_regions(mask, pixel_spacing_m, crs) -> dict` returning area in m² and hectares, using geodesic correction if CRS is geographic (degrees) rather than projected — raise `UnverifiedGeometryError` if pixel_spacing_m or crs is missing. `alignment.py`: `check_pair_compatibility(profile_a, profile_b) -> dict` checking CRS match, overlapping bounding boxes, and acquisition-date gap, returning pass/fail per check plus `compatible: bool`. `quality.py`: `compute_valid_mask(raster, nodata_value, cloud_mask=None) -> np.ndarray`. `compare.py`: `compare_dates(mask_t1, mask_t2, valid_mask) -> dict` returning gain/loss/net-change masks restricted to the valid area. `fuse.py`: `fuse_evidence(p_opt, q_opt, p_sar, q_sar) -> dict` implementing `p_fused = (q_opt*p_opt + q_sar*p_sar)/(q_opt+q_sar)`, returning `unknown` per-pixel where `q_opt+q_sar == 0`."

**Commits:**
1. `feat: implement measure_regions with geodesic-aware area calc`
2. `feat: implement check_pair_compatibility and compute_valid_mask`
3. `feat: implement compare_dates and fuse_evidence`

---

## Phase 5 — Planner & Validator

### Chunk 5.1 — VLM Planner service
**Builds:** `backend/controller/planner.py`.

**AI Prompt:**
> "In `backend/controller/planner.py`, implement `plan(query: str, image_ids: list[str], input_profiles: list[InputProfile]) -> ExecutionPlan`. Build a prompt that gives the VLM (via `model_services/vlm_service/inference.generate`, no adapter — fixed default config) the query text, image previews, input profiles, and a serialized summary of the current registry (`registry_loader.query()`), then instructs it to respond ONLY with JSON matching the `ExecutionPlan` schema — include the schema itself in the prompt as a guide. Parse the response with `ExecutionPlan.model_validate_json`, and if parsing fails, retry once with an error-correction message showing the parse error to the model. Raise `PlannerParseError` if it fails twice."

**Commits:**
1. `feat: implement planner prompt construction from registry and profiles`
2. `feat: add structured JSON parsing with one retry on failure`
3. `fix: raise typed PlannerParseError after repeated failures`

### Chunk 5.2 — Plan Validator
**Builds:** `backend/controller/validator.py`.

**AI Prompt:**
> "In `backend/controller/validator.py`, implement `validate_plan(plan: ExecutionPlan, profiles: list[InputProfile]) -> ValidationResult` where `ValidationResult` (define in schemas) has fields `approved: bool`, `restrictions: list[str]`, `errors: list[str]`, `confidence_caps: dict[str, float]` (model_id → max allowed confidence). Checks: (1) every model_id in `plan.required_models` exists in the registry and its `input_contract` bands are actually present in the relevant InputProfile's `band_identities`; (2) if `plan.workflow == 'temporal'`, call `alignment.check_pair_compatibility` and fail if not compatible; (3) if `'area_estimate'` is in `requested_outputs` but the profile has an area-related capability_restriction, don't fail the whole plan — add to `restrictions` instead and let downstream code drop just that output; (4) if `plan.final_adapter` isn't in the registry's adapters, that's a hard error; **(5) resolution/sensor-family compatibility — for each required model, compare `InputProfile.pixel_spacing_m` against the registry entry's `resolution_range_m`: if outside range by more than a configurable factor (default 5×, read from settings), that's a hard error; if outside range but within the factor, add to `restrictions` and set `confidence_caps[model_id] = 0.5` (configurable); separately, if `InputProfile.sensor_family` appears in the model's `known_domain_shift_sensors`, ALWAYS add a `restrictions` entry naming the specific domain-shift risk and apply the same confidence cap, even if the resolution check alone passed; if `sensor_family == 'unknown'`, add a restriction noting domain-shift risk cannot be assessed.** Only case (4), case (1)'s missing-model, and case (5)'s beyond-factor resolution mismatch should set `approved=False`; everything else degrades into `restrictions`/`confidence_caps`, not `errors`. Reference `registry_spec.md §7` for the exact policy table this implements."

**Commits:**
1. `feat: implement validate_plan with model/band compatibility checks`
2. `feat: add pair-compatibility and adapter-existence checks`
3. `feat: add resolution/sensor-family domain-shift enforcement with confidence caps`

---

## Phase 6 — Executor: Single-Image Workflow

> Note: Chunk 6.1 (model service wrappers) lives in `phases_ml.md` — you depend on it here but don't build it.

### Chunk 6.2 — prepare_model_input()
**Builds:** `backend/controller/preprocessing.py`.

**AI Prompt:**
> "In `backend/controller/preprocessing.py`, implement `prepare_model_input(image_id: str, model_id: str) -> dict` that reads the target model's `input_contract` from the registry, loads the raw raster via `raster_io.read_bands`, reorders/selects bands to match `input_contract['bands']` or `input_contract['polarization_order']`, applies the documented scale/normalization from the contract, tiles the image if larger than the model's expected input size (record tile offsets for later stitching), and returns `{tensor_or_path, tile_transforms, band_order_used}`. Raise `IncompatibleInputError` if a required band/polarization is missing from the image's InputProfile."

**Commits:**
1. `feat: implement prepare_model_input reading registry contracts`
2. `feat: add tiling with recorded transforms for large images`
3. `fix: raise IncompatibleInputError on missing required bands`

### Chunk 6.3 — Executor DAG (single-image branch)
**Builds:** `backend/controller/executor.py`.

**AI Prompt:**
> "In `backend/controller/executor.py`, implement `run_single_image_workflow(plan: ExecutionPlan, validation: ValidationResult) -> dict` that: calls `preprocessing.prepare_model_input` for each required model, calls the appropriate model service over HTTP (`httpx`) using the endpoint from the registry entry, stitches tiled outputs back using the recorded transforms, applies `quality.compute_valid_mask` to restrict outputs to valid pixels, runs any `optional_tools` from the plan (e.g. `compute_spectral_index:NDWI`) via the scientific_tools functions from Phase 2, and returns a structured `dict` of `{masks, scores, measurements, tool_outputs}` ready for evidence assembly. Log every model/tool call with timing into a list of trace-step dicts matching the `execution_traces` DB schema, and return that trace list alongside the results. If the model service isn't up yet, code against a mocked HTTP response matching the documented contract."

**Commits:**
1. `feat: implement run_single_image_workflow with model dispatch`
2. `feat: add tile stitching and valid-pixel masking to executor output`
3. `feat: add execution trace logging for every model/tool call`

---

## Phase 7.1 — Temporal Workflow

**Builds:** extend `executor.py` with `run_temporal_workflow()`.

**AI Prompt:**
> "In `backend/controller/executor.py`, add `run_temporal_workflow(plan: ExecutionPlan, validation: ValidationResult) -> dict`. Steps: run the single-image segmentation branch independently on T1 and T2 (reuse the helper from Chunk 6.3, don't duplicate it), compute a shared valid-mask as the intersection of both dates' valid pixels, call `compare.compare_dates(mask_t1, mask_t2, shared_valid_mask)` to get gain/loss/net masks per requested class, and if `'area_estimate'` is in requested_outputs and not restricted, call `geometry.measure_regions` on the gain/loss masks. Return the same result+trace shape as the single-image workflow so downstream evidence assembly code is uniform across workflows."

**Commits:**
1. `feat: add run_temporal_workflow reusing single-image segmentation`
2. `feat: compute shared valid-mask and gain/loss/net change regions`
3. `feat: add conditional area measurement for temporal outputs`

> Note: Chunk 7.2 (change model upgrade path) lives in `phases_ml.md`.

---

## Phase 8 — Cross-Modal Fusion

### Chunk 8.1 — Reliability estimation
**Builds:** `backend/scientific_tools/reliability.py`.

**AI Prompt:**
> "Create `backend/scientific_tools/reliability.py` implementing `estimate_optical_reliability(image_array, cloud_mask) -> np.ndarray` (per-pixel score in [0,1], lower where cloud_mask flags cloud/shadow or where pixel saturation is detected) and `estimate_sar_reliability(sar_array, layover_shadow_mask=None) -> np.ndarray` (lower where speckle-affected regions or provided layover/shadow mask indicates unreliable data; default to a uniform moderate score if no mask is available, clearly documented as an approximation). Both must return arrays of the same shape as their input, values in [0,1], never negative."

**Commits:**
1. `feat: implement estimate_optical_reliability with cloud/saturation checks`
2. `feat: implement estimate_sar_reliability with layover/shadow handling`
3. `docs: document uniform-score fallback assumption in reliability.py`

### Chunk 8.2 — Cross-modal executor branch
**Builds:** extend `executor.py` with `run_crossmodal_workflow()`.

**AI Prompt:**
> "In `backend/controller/executor.py`, add `run_crossmodal_workflow(plan: ExecutionPlan, validation: ValidationResult) -> dict`. Steps: run seg_rgb_service on the optical image and seg_sar_service on the SAR image for the shared requested classes only (drop any class not in both models' supported classes, add a note to `restrictions` explaining why), compute per-pixel reliability with `reliability.py` functions, call `fuse.fuse_evidence` to combine class probabilities, and where fused reliability is zero for a pixel, mark that region as `unknown` rather than guessing. Return the same result+trace shape as the other two workflows."

**Commits:**
1. `feat: add run_crossmodal_workflow with shared-class filtering`
2. `feat: integrate reliability scoring into fusion call`
3. `fix: mark zero-reliability regions as unknown instead of guessing`

---

## Phase 9 — Evidence Package, Answerer, Verifier

### Chunk 9.1 — Evidence package builder
**Builds:** `backend/controller/evidence.py`.

**AI Prompt:**
> "In `backend/controller/evidence.py`, implement `build_evidence_package(run_id: str, workflow_result: dict, plan: ExecutionPlan, validation: ValidationResult) -> EvidencePackage`. For each measurement in `workflow_result`, create a `claim` entry with a plain-language `claim` string (e.g. 'water area increased'), the numeric `measurement`, the `region_id`, `source_images`, the `tool` that produced it, and a `confidence` value (pull from model scores if calibrated, else omit and mark uncalibrated in `limitations`) — **then clamp `confidence` to `validation.confidence_caps[model_id]` if that model_id has an entry, never let a raw model score exceed the cap the validator set for domain-shift/resolution risk**. Save masks/overlays to `./artifacts/{run_id}/masks/`, `.../overlays/` and populate `masks_ref`/`overlays_ref`. Populate `model_versions` from the registry entries actually used. Populate `limitations` from any `restrictions` carried over from the ValidationResult, including the resolution/sensor-family ones."

**Commits:**
1. `feat: implement build_evidence_package assembling claims and refs`
2. `feat: persist masks/overlays to artifact store paths`
3. `feat: propagate validation restrictions into evidence limitations`

### Chunk 9.2 — Answerer
**Builds:** `backend/controller/answerer.py`.

**AI Prompt:**
> "In `backend/controller/answerer.py`, implement `generate_answer(query: str, evidence: EvidencePackage, plan: ExecutionPlan) -> dict` returning `{technical: str, plain_language: str}` — **two answers from one evidence package, not two separate pipelines.** Call `model_services/vlm_service/inference.generate` with `adapter_id=plan.final_adapter` twice with different system instructions on the same evidence context: the technical variant states exact measurements/units/limitations for a GIS-literate reader; the plain-language variant translates the same underlying claims into everyday phrasing a non-expert would understand (e.g. 'the water body grew by about 20 football fields' instead of '14.2 ha'), while still respecting the same no-invented-numbers and limitations-disclosure rules. Both variants pass the same evidence context — never let the plain-language version drop a limitation the technical version discloses. Pass image previews plus a serialized text summary of `evidence.claims` and `evidence.limitations` as context (not the raw masks/rasters)."

**Commits:**
1. `feat: implement generate_answer with adapter-conditioned VLM call`
2. `feat: add dual-register (technical + plain-language) answer generation from one evidence package`
3. `docs: document no-raw-raster-to-VLM rule in answerer.py`

### Chunk 9.3 — Verifier
**Builds:** `backend/controller/verifier.py`.

**AI Prompt:**
> "In `backend/controller/verifier.py`, implement `verify_answer(answer_text: str, evidence: EvidencePackage) -> VerificationResult` (schema: `passed: bool`, `flagged_claims: list[str]`, `notes: list[str]`). Extract numeric mentions from `answer_text` (regex for numbers + units) and check each against the closest matching claim's `measurement` within a small tolerance; flag any number that doesn't correspond to a claim. Check that every region ID or image ID mentioned actually exists in `evidence.claims`/`source_images`. If `flagged_claims` is non-empty, set `passed=False` and the caller should fall back to a conservative, evidence-only templated answer rather than the free-text one."

**Commits:**
1. `feat: implement verify_answer with numeric claim cross-checking`
2. `feat: add region/image reference validation to verifier`
3. `feat: add conservative fallback trigger when verification fails`

---

## Phase 10 — GUI

### Chunk 10.1 — Upload + Query flow
**Builds:** `UploadPanel.tsx`, `QueryBox.tsx`, API integration.

**AI Prompt:**
> "Implement `UploadPanel.tsx` to support three upload modes (single image, cross-modal pair, bi-temporal pair) with drag-and-drop, calling `POST /api/v1/images` for each file and `POST /api/v1/pairs` when two files are related, storing returned `image_id`s in React state. Implement `QueryBox.tsx` with a text input plus a dropdown of the PS's representative queries as quick-fill templates. Wire a 'Run' button that calls `POST /api/v1/query` with the collected image_ids and query text, then polls `GET /api/v1/runs/{run_id}` every 2 seconds until status is 'done', showing a loading state in between."

**Commits:**
1. `feat: implement UploadPanel supporting single/pair/temporal modes`
2. `feat: implement QueryBox with representative-query templates`
3. `feat: wire run submission and polling to backend API`

### Chunk 10.2 — Map viewer with overlays
**Builds:** `MapViewer.tsx`.

**AI Prompt:**
> "Implement `MapViewer.tsx` using deck.gl (or Leaflet if simpler for GeoTIFF rendering) to display the uploaded image preview as a base layer and overlay returned masks/overlays (from the run result's `masks_ref`/`overlays_ref` URLs) as semi-transparent colored layers, one per class, with a legend and per-layer opacity toggle. For bi-temporal results, add a before/after slider component. For cross-modal results, add a toggle between optical view, SAR view, and fused overlay."

**Commits:**
1. `feat: implement MapViewer base layer and mask overlay rendering`
2. `feat: add before/after slider for temporal results`
3. `feat: add optical/SAR/fused view toggle for cross-modal results`

### Chunk 10.3 — Evidence, trace, and report export
**Builds:** `EvidencePanel.tsx`, `TracePanel.tsx`, `ReportExport.tsx`.

**AI Prompt:**
> "Implement `EvidencePanel.tsx` to render the run's answer with a **plain-language ⇄ technical toggle** (switching between `answer.plain_language` and `answer.technical` from `generate_answer`'s dict output — both already fetched in one call, this is a client-side toggle, not a re-fetch), a table of claims (measurement, region, confidence), and a limitations list, all sourced from `GET /api/v1/runs/{run_id}`. Implement `TracePanel.tsx` to render the machine-readable execution trace from `GET /api/v1/runs/{run_id}/trace` as a collapsible step-by-step list (step name, model/tool used, params, duration). Implement `ReportExport.tsx` with a button calling `GET /api/v1/runs/{run_id}/report` and triggering a browser download of the returned PDF. Style all three using the design tokens from Phase 13 — data values (measurements, confidence, run IDs) in the monospace font, everything else in the UI font."

**Commits:**
1. `feat: implement EvidencePanel with plain-language/technical toggle and claims table`
2. `feat: implement TracePanel rendering machine-readable execution trace`
3. `feat: implement ReportExport with PDF download`

---

## Phase 12 — End-to-End Integration & Demo Prep

### Chunk 12.1 — Full pipeline API endpoint
**Builds:** `backend/api/query.py` wiring everything together.

**AI Prompt:**
> "In `backend/api/query.py`, implement `POST /api/v1/query` as the full orchestration entrypoint: call `ingestion` (if not already done), `planner.plan`, `validator.validate_plan`, then dispatch to `executor.run_single_image_workflow` / `run_temporal_workflow` / `run_crossmodal_workflow` based on `plan.workflow`, then `evidence.build_evidence_package`, `answerer.generate_answer`, `verifier.verify_answer`, persisting every intermediate object to the DB tables from Phase 1.3 and the trace list to `execution_traces`. Return `{run_id}` immediately and run the actual work as a background task (FastAPI `BackgroundTasks` is fine for now, no Celery needed yet), updating a `status` field the polling endpoint reads."

**Commits:**
1. `feat: implement full query orchestration endpoint`
2. `feat: persist plan/evidence/answer/trace to database per run`
3. `feat: run orchestration as background task with pollable status`

### Chunk 12.2 — Demo rehearsal assets
**Builds:** cached fallback runs + `docs/demo_script.md`.

**AI Prompt:**
> "Run the full pipeline once for each of the PS's five representative queries (land-cover description, region highlighting, bi-temporal change, optical+SAR joint analysis, built-up area trend) against real or benchmark sample images, and save each run's full API response JSON to `demo_fallback/{query_slug}.json`. Write `docs/demo_script.md` documenting: the exact click-path for each query in the GUI, what to say while it's running, and a note that if live inference fails, the frontend can be pointed at the cached JSON via a `?fallback=query_slug` URL param — implement that fallback param in the frontend's run-fetching logic too."

**Commits:**
1. `feat: cache full pipeline outputs for all 5 representative queries`
2. `docs: write demo_script.md with click-path and talking points`
3. `feat: add ?fallback= URL param support to frontend run fetching`

---

## Phase 13 — Frontend Design System Foundation

*Read `architecture.md §17` in full before starting either chunk — every visual decision below is specified there, this phase just builds it.*

### Chunk 13.1 — Design tokens & theme
**Builds:** `frontend/styles/tokens.css` (or Tailwind theme extension), global font loading.

**AI Prompt:**
> "Set up the SatQuery AI design system as Tailwind theme tokens (or CSS custom properties if simpler to consume from both Quick Query and Evidence Explorer components): colors — `bg-primary: #0B0E14`, `bg-panel: #12161F`, `bg-panel-raised: #181D29`, `border-subtle: #232937`, `text-primary: #E6E9EF`, `text-secondary: #8A93A6`, `accent: #3DDBD9`, `success: #3FB950`, `warning: #D29922`, `danger: #F85149`; class-overlay colors — `water: #4C8DFF`, `vegetation: #3FB950`, `built-up: #F0883E`, `cropland: #9ECE6A`, `bare-soil: #C9A876`, `unknown: #5B6272`. Load Inter (UI text) and JetBrains Mono (all numeric/data readouts) as the two font families — define a `font-mono` utility class that every measurement, coordinate, run ID, and confidence score component will use. Set a consistent border-radius scale (6px small, 8px default — no fully-rounded pills) and a single transition duration token (180ms ease-out) used for all state-change animations, nothing bouncier. Do NOT add any gradient background utilities or glow/blur shadow presets — this is a deliberate omission per the design system's anti-pattern list."

**Commits:**
1. `feat: add design token color palette (Mission Control theme)`
2. `feat: add mask-class color tokens and monospace data font`
3. `chore: set consistent border-radius and transition-duration tokens, no gradients`

### Chunk 13.2 — Shared UI primitives
**Builds:** `frontend/components/ui/` — Button, Panel, Tabs, Slider, Badge, DataReadout.

**AI Prompt:**
> "Build a shared UI primitives library in `frontend/components/ui/` using the tokens from Chunk 13.1, used by both Quick Query and Evidence Explorer so neither ever hand-rolls its own button/card styling: `Button.tsx` (primary/secondary/ghost variants, no gradient fills), `Panel.tsx` (flat surface, 1px `border-subtle`, `bg-panel`, no heavy box-shadow), `Tabs.tsx`, `Slider.tsx` (for the Experiment Panel's threshold controls), `Badge.tsx` (for confidence/status indicators — success/warning/danger variants), and `DataReadout.tsx` (renders a label + monospace value, used for every measurement/coordinate/run-ID/confidence display in the entire app — this is the component that makes numbers look like instrument readouts, not chat text). Write each with clear TypeScript prop interfaces and no inline ad-hoc Tailwind classes outside these files — every other component should compose these primitives, not redefine styling."

**Commits:**
1. `feat: add Button, Panel, and Tabs UI primitives`
2. `feat: add Slider and Badge primitives`
3. `feat: add DataReadout primitive for monospace data display`

---

## Phase 14 — Two-Mode Frontend Flow & State Layer

### Chunk 14.1 — Mode routing and cross-mode navigation
**Builds:** App Router structure for `/` (Quick Query) and `/explorer/[runId]` (Evidence Explorer).

**AI Prompt:**
> "Set up Next.js App Router routes: `/` renders Quick Query mode (upload, query, dual-register answer — from Phase 10), `/explorer/[runId]` renders the Evidence Explorer four-panel workspace for a given run. Add a persistent, unobtrusive 'Open in Evidence Explorer' button/link on the Quick Query results view that navigates to `/explorer/{runId}`. Both routes must share the same root layout (design tokens, fonts) from Phase 13 — no separate theme or layout file per mode. Reference the UX flow diagram in `architecture.md §17.5` for the exact navigation shape."

**Commits:**
1. `feat: add /explorer/[runId] route for Evidence Explorer`
2. `feat: add Open in Evidence Explorer navigation from Quick Query results`
3. `chore: share root layout and design tokens across both modes`

### Chunk 14.2 — State and data layer
**Builds:** Zustand store + TanStack Query setup.

**AI Prompt:**
> "Set up TanStack Query as the server-state layer for both frontend modes: a `useRun(runId)` hook wrapping `GET /api/v1/runs/{run_id}`, a `useEvidenceGraph(runId)` hook for the Explorer's graph data, both cached so switching between Explorer panels never re-fetches data already in memory. Set up a Zustand store (`frontend/state/explorerStore.ts`) with selector-based subscriptions (not one large object) for: `selectedRegionId`, `activeExperimentId`, `panelLayout`. Verify that changing `selectedRegionId` only re-renders components that actually subscribe to it (e.g. the Scientific Analysis Panel), not the entire Explorer shell — this is the concrete mechanism behind the 'not laggy' requirement in `architecture.md §17.4`."

**Commits:**
1. `feat: add TanStack Query hooks for run and evidence graph data`
2. `feat: add Zustand store with selector-based subscriptions for Explorer state`
3. `perf: verify region selection only re-renders subscribed components`

---

## Phase 15 — Evidence Graph, PostGIS & STAC Backend Layer

### Chunk 15.1 — PostGIS schema
**Builds:** extends `backend/db/models.py` with `regions`, `evidence_nodes`, `experiments`, `feedback_tags`.

**AI Prompt:**
> "Extend `backend/db/models.py` (SQLModel) with the tables from `architecture.md §15`: `regions` (id, run_id, a PostGIS `Geometry` column via `geoalchemy2`, class_label, source_mask_ref), `evidence_nodes` (id, run_id, node_type enum [claim|measurement|region|mask|model|input], content_json, parent_node_id self-referencing FK, created_at), `experiments` (id, parent_run_id FK, parameter_overrides_json, rerun_stage_from, created_at, status), `feedback_tags` (id, evidence_node_id FK, tag enum [accepted|rejected|needs_review], reviewer_note, created_at). Ensure the Postgres connection setup enables the PostGIS extension (`CREATE EXTENSION IF NOT EXISTS postgis;` — note this in a comment for whoever provisions the actual database, no migration tooling needed yet). Add a helper `regions_touching_point(lon, lat) -> list[Region]` using a PostGIS spatial query (`ST_Contains` or `ST_Intersects`), since this is what backs 'click a region on the map to inspect it.'"

**Commits:**
1. `feat: add PostGIS-backed regions table with geoalchemy2`
2. `feat: add evidence_nodes, experiments, and feedback_tags tables`
3. `feat: add regions_touching_point spatial query helper`

### Chunk 15.2 — Evidence graph builder
**Builds:** `backend/controller/evidence_graph.py`.

**AI Prompt:**
> "In `backend/controller/evidence_graph.py`, implement `build_evidence_graph(run_id: str, evidence: EvidencePackage) -> None` that walks each claim in `evidence.claims` and writes the full node chain from `architecture.md §3.11` (claim → measurement → region → mask → model → inputs) into the `evidence_nodes` table, linking each node to its parent via `parent_node_id`, and writing/upserting the corresponding `regions` row with its PostGIS geometry from the claim's `region_id`. This function is called immediately after `build_evidence_package()` (Phase 9.1) — the flat claims list and the graph are two views of the same run, built from the same call site, never two independently-maintained representations. Add `get_evidence_graph(run_id: str) -> dict` (a nested-JSON traversal of the graph, for the frontend's `useEvidenceGraph` hook) and `get_node_lineage(node_id: str) -> list[dict]` (walks parent_node_id up to the root, for a single claim's full evidence chain)."

**Commits:**
1. `feat: implement build_evidence_graph writing full node chain to DB`
2. `feat: add get_evidence_graph traversal for frontend consumption`
3. `feat: add get_node_lineage for single-claim evidence chain lookup`

### Chunk 15.3 — STAC catalog and reproducibility manifest
**Builds:** `backend/controller/reproducibility.py`.

**AI Prompt:**
> "In `backend/controller/reproducibility.py`, implement `register_stac_item(image_id_or_run_id: str, asset_type: str, file_path: str, properties: dict) -> None` using `pystac` to create/update a STAC Item for any image, mask, or evidence package, linked to its `run_id`, stored in a local STAC catalog under `./artifacts/stac_catalog/`. Implement `write_run_manifest(run_id: str, plan: ExecutionPlan, evidence: EvidencePackage, profiles: list[InputProfile]) -> None` that writes `./artifacts/{run_id}/run_manifest.json` matching the shape in `architecture.md §16` (input_checksums via `hashlib.sha256`, sensor_bands, crs, pixel_resolution_m, model_versions, software_versions of key packages via `importlib.metadata.version`, tool_formulas_used, user_corrections — empty list initially, populated later by Phase 18.3). This manifest is the single source of truth the notebook export (Phase 19.2) will be generated from — do not let the notebook generator re-derive this information independently."

**Commits:**
1. `feat: implement register_stac_item writing STAC catalog entries`
2. `feat: implement write_run_manifest with checksums and version tracking`
3. `docs: document run_manifest.json as the single source for notebook export`

---

## Phase 16 — Geospatial Viewer Panel (Panel A)

### Chunk 16.1 — COG tile viewer with overlays
**Builds:** `frontend/components/explorer/GeospatialViewer.tsx`, TiTiler setup.

**AI Prompt:**
> "Set up a lightweight TiTiler service (or the `titiler.core` FastAPI app mounted directly) that serves Cloud-Optimized GeoTIFF tiles for any artifact under `./artifacts/`. In `frontend/components/explorer/GeospatialViewer.tsx`, build a MapLibre GL JS map that loads the original image as a raster tile layer from TiTiler, and overlays each mask/region as a separate toggleable raster or vector layer using the class-color tokens from Phase 13.1, with a legend component and a per-layer opacity slider (reuse the `Slider` primitive from Phase 13.2). Never fetch or decode the full-resolution GeoTIFF client-side — the whole point of TiTiler here is tile-based loading, verify this by checking network requests are tile requests (e.g. `/tiles/{z}/{x}/{y}`), not one large file download."

**Commits:**
1. `feat: set up TiTiler service for COG tile serving`
2. `feat: implement GeospatialViewer with MapLibre base layer and mask overlays`
3. `perf: verify tile-based loading, no full-raster client fetch`

### Chunk 16.2 — Swipe, side-by-side, AOI draw, click-to-inspect
**Builds:** extends `GeospatialViewer.tsx`.

**AI Prompt:**
> "Extend `GeospatialViewer.tsx` with: a before/after swipe control for bi-temporal runs (T1/T2 layers with a drag-to-reveal slider), a side-by-side split view toggle for cross-modal runs (optical pane | SAR pane, synced pan/zoom), an AOI drawing tool using `maplibre-gl-draw` producing a GeoJSON polygon, and a click handler that calls `regions_touching_point()` (Phase 15.1) via a backend endpoint and sets `selectedRegionId` in the Zustand store (Phase 14.2) — this is what drives the Scientific Analysis Panel (Phase 17.1) updating on click, without the viewer needing to know anything about that panel."

**Commits:**
1. `feat: add before/after swipe control for bi-temporal runs`
2. `feat: add optical/SAR side-by-side split view with synced pan/zoom`
3. `feat: add AOI drawing and click-to-select-region wired to shared state`

---

## Phase 17 — Scientific Analysis & Processing History Panels

### Chunk 17.1 — Scientific Analysis Panel (Panel B)
**Builds:** `frontend/components/explorer/AnalysisPanel.tsx`.

**AI Prompt:**
> "Build `AnalysisPanel.tsx` that reads `selectedRegionId` from the Zustand store (Phase 14.2) and fetches that region's metrics from a new backend endpoint `GET /api/v1/regions/{region_id}/metrics` (implement this endpoint by calling `get_node_lineage()` from Phase 15.2 and pulling the measurement/model nodes). Render: area/coverage, NDVI/MNDWI/NDBI values, VV/VH backscatter distribution (a small chart via the existing `chart_display` pattern or a lightweight chart library), gain/loss/class-transition data for temporal runs, cloud coverage %, fusion weights for cross-modal runs, and per-class confidence — every numeric value through the `DataReadout` primitive (Phase 13.2) so it renders in monospace. Show a clear empty state ('select a region on the map') when no region is selected, never a blank panel."

**Commits:**
1. `feat: implement GET /api/v1/regions/{region_id}/metrics endpoint`
2. `feat: implement AnalysisPanel rendering region-scoped scientific metrics`
3. `feat: add empty state for no-region-selected`

### Chunk 17.2 — Processing History Panel (Panel C)
**Builds:** `frontend/components/explorer/ProcessingHistoryPanel.tsx`.

**AI Prompt:**
> "Build `ProcessingHistoryPanel.tsx` rendering the execution trace from `GET /api/v1/runs/{run_id}/trace` (already built in Phase 6.3/12.1) as a vertical timeline: input validation → cloud masking → alignment → segmentation → index calculation → area measurement → fusion → VLM explanation, each step collapsed by default showing step name + duration, expandable to show exact parameters, model/adapter version (from `run_manifest.json`, Phase 15.3), timestamp, and a link to the generated artifact (mask/overlay file). Use `react-window` if the trace list can exceed ~20 steps for temporal/cross-modal runs, per the virtualization principle in `architecture.md §17.4`."

**Commits:**
1. `feat: implement ProcessingHistoryPanel as an expandable step timeline`
2. `feat: link each step to its model version and generated artifact`
3. `perf: virtualize the step list with react-window`

---

## Phase 18 — Research Experiment "What-If" Engine (Panel D)

### Chunk 18.1 — Backend rerun/versioning
**Builds:** `backend/controller/experiments.py`, new API endpoint.

**AI Prompt:**
> "In `backend/controller/experiments.py`, implement `create_experiment(parent_run_id: str, parameter_overrides: dict) -> str` (returns new `experiment_id`) that: reads the parent run's stored `ExecutionPlan`, applies the overrides (e.g. `{'segmentation_threshold': 0.6}`, `{'model_id': 'SEG_RGBNIR_v1'}` swapping to an alternate registered model, `{'fusion_weight_override': {...}}`, `{'tool_toggle': {'compute_spectral_index:NDWI': false}}`), determines the earliest affected stage in the executor DAG (Phase 6.3/7.1/8.2) so only that stage and everything downstream reruns — reuse the existing `run_single_image_workflow`/`run_temporal_workflow`/`run_crossmodal_workflow` functions, don't duplicate their logic — and writes the result as a new row in the `experiments` table (Phase 15.1) with `status` tracking, **never modifying the parent run's stored evidence**. Add `POST /api/v1/runs/{run_id}/experiments` (body: parameter_overrides) and `GET /api/v1/experiments/{experiment_id}` endpoints."

**Commits:**
1. `feat: implement create_experiment with stage-boundary-aware reruns`
2. `feat: add parameter override support for threshold, model swap, and tool toggle`
3. `feat: add experiment API endpoints, never mutating parent run`

### Chunk 18.2 — Experiment Panel UI
**Builds:** `frontend/components/explorer/ExperimentPanel.tsx`.

**AI Prompt:**
> "Build `ExperimentPanel.tsx`, code-split so it only loads when this panel is opened (per the performance principle in `architecture.md §17.4`, use Next.js `dynamic()` import). Include: a threshold `Slider` (Phase 13.2), a model-swap dropdown populated from `GET /api/v1/registry/models?task=...` (filtered to the current stage's task — the same registered models the agent could have chosen), toggles for optional physics tools, a fusion-weight adjustment control for cross-modal runs, and a 'Run Experiment' button calling `POST /api/v1/runs/{run_id}/experiments` from Chunk 18.1. On completion, render a side-by-side mask comparison (original vs. new experiment) reusing the `GeospatialViewer` in a split layout, and a 'Save as new experiment' confirmation — the original run's view is never replaced in place."

**Commits:**
1. `feat: implement ExperimentPanel with threshold, model-swap, and tool-toggle controls`
2. `perf: code-split ExperimentPanel with dynamic import`
3. `feat: add side-by-side old-vs-new mask comparison view`

### Chunk 18.3 — Manual mask correction
**Builds:** extends `ExperimentPanel.tsx`, new backend endpoint.

**AI Prompt:**
> "Add a manual mask-correction tool to `ExperimentPanel.tsx` — a simple polygon add/remove paint tool (reuse `maplibre-gl-draw` from Phase 16.2) over the currently selected region's mask, letting a scientist manually include/exclude pixels. On save, call a new backend endpoint `POST /api/v1/experiments/{experiment_id}/corrections` that stores the correction as a `feedback_tags`-linked record (Phase 15.1) referencing the original evidence node and the corrected geometry, and appends it to that experiment's `run_manifest.json.user_corrections` list (Phase 15.3) — this is what makes the correction show up in reproducibility exports and, later, the active-learning feedback loop (Phase 19.3)."

**Commits:**
1. `feat: add manual mask correction paint tool to ExperimentPanel`
2. `feat: implement POST /api/v1/experiments/{experiment_id}/corrections endpoint`
3. `feat: append corrections to run_manifest.json for reproducibility`

---

## Phase 19 — Export, Reproducible Notebooks & Feedback Loop

### Chunk 19.1 — Export endpoints
**Builds:** `backend/api/exports.py`.

**AI Prompt:**
> "In `backend/api/exports.py`, implement export endpoints for any run or experiment: `GET /api/v1/runs/{run_id}/export/geotiff` (zips all mask/index rasters), `GET /api/v1/runs/{run_id}/export/geojson` (region boundaries via `shapely`/`fiona` from the `regions` PostGIS table), `GET /api/v1/runs/{run_id}/export/csv` (flattened measurements table), `GET /api/v1/runs/{run_id}/export/stac` (the STAC catalog subset for this run, from Phase 15.3), `GET /api/v1/runs/{run_id}/export/audit-report` (PDF, reuses the existing report generator from Phase 12.1 but includes the full evidence graph, not just the flat claims). Wire an `ExportMenu.tsx` component in the Explorer offering all five as download options."

**Commits:**
1. `feat: implement GeoTIFF, GeoJSON, and CSV export endpoints`
2. `feat: implement STAC and audit-report export endpoints`
3. `feat: add ExportMenu component wiring all export options`

### Chunk 19.2 — Reproducible notebook generation
**Builds:** `backend/controller/notebook_export.py`.

**AI Prompt:**
> "In `backend/controller/notebook_export.py`, implement `generate_notebook(run_id: str) -> str` (returns a file path) using `nbformat` to build a `.ipynb` that reconstructs the exact pipeline run from that run's `run_manifest.json` (Phase 15.3): cells that install pinned package versions, load the original input images by their stored checksums/paths, re-run the same tool calls with the same parameters (spectral indices, SAR stats, area measurement) using the actual `scientific_tools/` functions as importable code, and print the same claims. This must be generated **from the manifest**, not hand-templated per workflow type, so it never drifts from what actually ran. Add `GET /api/v1/runs/{run_id}/export/notebook` serving the result."

**Commits:**
1. `feat: implement generate_notebook building .ipynb from run_manifest.json`
2. `feat: add notebook export endpoint`
3. `docs: document manifest-driven generation to prevent drift from actual run`

### Chunk 19.3 — Feedback loop / active-learning tagging
**Builds:** `EvidenceTagControl.tsx`, backend endpoint.

**AI Prompt:**
> "Add an `EvidenceTagControl.tsx` component usable on any claim/node in the Analysis Panel or Processing History Panel, offering Accepted/Rejected/Needs Review buttons (styled with the `Badge` primitive's success/warning/danger variants from Phase 13.2). Wire it to `POST /api/v1/evidence-nodes/{node_id}/feedback` which writes to the `feedback_tags` table (Phase 15.1). Add `training/data_prep/feedback_export.py` (cross-reference `phases_ml.md`) that queries all `accepted`-tagged nodes with their associated corrected masks and exports them in a format the ML team's dataset loaders (Phase 3.1 in `phases_ml.md`) can consume as additional verified training samples later — this closes the loop from Explorer usage back into the training pipeline, it does not retrain anything automatically."

**Commits:**
1. `feat: implement EvidenceTagControl and feedback API endpoint`
2. `feat: add feedback_export.py querying accepted nodes for future training`
3. `docs: cross-reference feedback loop with phases_ml.md dataset loaders`

---

## Summary: Dev Commit Count

| Phase | Chunks | Commits |
|---|---|---|
| Phase 0 | 2 | 6 |
| Phase 1 | 3 | 9 |
| Phase 2 | 4 | 12 |
| Phase 5 | 2 | 6 |
| Phase 6 (6.2–6.3) | 2 | 6 |
| Phase 7.1 | 1 | 3 |
| Phase 8 | 2 | 6 |
| Phase 9 | 3 | 9 |
| Phase 10 | 3 | 9 |
| Phase 12 | 2 | 6 |
| Phase 13 (design system) | 2 | 6 |
| Phase 14 (two-mode flow) | 2 | 6 |
| Phase 15 (evidence graph/STAC) | 3 | 9 |
| Phase 16 (Geospatial Viewer) | 2 | 6 |
| Phase 17 (Analysis + History panels) | 2 | 6 |
| Phase 18 (What-If Engine) | 3 | 9 |
| Phase 19 (Export/notebook/feedback) | 3 | 9 |
| **Total** | **41** | **123** |

Combined with ML's 36 commits (`phases_ml.md`), the full project history lands at **~159 commits across 53 chunks**. Phases 13–19 (Evidence Explorer + design system) are strictly additive — build them only after Phase 12 (Quick Query end-to-end) is fully working, per `architecture.md §14` and `CLAUDE.md §4a`.

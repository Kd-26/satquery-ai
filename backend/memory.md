# SatQuery AI Backend - Memory

## Work Completed (Up to Chunk 5.2)

### Phase 0 - Scaffolding
- Built the lightweight FastAPI backend (`main.py`, `.env.example`, `requirements.txt`).
- Created empty module files for `api`, `controller`, `scientific_tools`, `registry`, `schemas`, `db`.

### Phase 1 - Data Contracts & Registry Foundation
- **Chunk 1.1:** Created strict Pydantic schemas in `backend/schemas/` (`InputProfile`, `RegistryEntry`, `ExecutionPlan`, `EvidencePackage`, `SARRaster`). These lock down physical realities—for example, wrapping SAR data to enforce `'dB'` vs `'linear'` representation.
- **Chunk 1.2:** Created YAML manifests in `backend/registry/` for models, adapters, and tools. Added `registry_loader.py` to parse and validate these manifests at startup using Pydantic. Any invalid YAML will crash the server on boot. Updated `RegistryEntry` schema to support `Union[str, List[str]]` for `trained_on` and `Union[str, Dict[str, Any]]` for `eval_summary`.
- **Chunk 1.3:** Setup the PostgreSQL database using `SQLModel` and `asyncpg` (`backend/db/models.py` and `backend/db/session.py`).

### Phase 2 - Ingestion & Scientific Tools
- **Chunk 2.1:** Implemented `raster_io.py` for metadata and band reading via `rasterio`. Created `validate_file` and `ingest_upload` in `ingestion.py` to safely handle file uploads (with file size and corruption checks).
- **Chunk 2.2:** Added heuristic metadata extraction and sidecar-merging logic (`inspect_image` and `resolve_metadata`). Enforced strict physical capability restrictions if data like CRS or `pixel_spacing_m` is missing.
- **Chunk 2.3:** Created `indices.py` for spectral math (NDVI, NDWI, etc.) with safe handling of NaN/divide-by-zero. Implemented `sar_stats.py` which rejects mathematically invalid operations (like dividing dB values) via type-checking.
- **Chunk 2.4:** Added geometry tools (area calculation), alignment (pair compatibility, time gap), quality masking, compare, and evidence fusion tools.

### Phase 5 - Planner & Validator
- **Chunk 5.1:** Implemented the VLM Planner prompt builder in `backend/controller/planner.py`. It dynamically summarizes the tool registry and profiles. Implemented the JSON-schema guided execution plan extraction with a one-time automatic retry mechanism for malformed JSON.
- **Chunk 5.2:** Implemented `validate_plan(plan, profiles) -> ValidationResult` in `backend/controller/validator.py`:
  - **Check 1 (Model & Band Match):** Verifies required models exist in registry and required bands match the profile's `band_identities`.
  - **Check 2 (Temporal Workflow Alignment):** Calls `check_pair_compatibility` for temporal workflows and rejects incompatible CRS/bboxes.
  - **Check 3 (Area Restriction Degradation):** Degrades gracefully if `area_estimate` is requested on an uncalibrated raster (adds restriction note rather than rejecting whole plan).
  - **Check 4 (Adapter Validation):** Verifies `final_adapter` exists in the registry.
  - **Check 5 (Resolution & Sensor Domain Shift):** Enforces $>5\times$ resolution mismatch as a hard rejection (`approved = False`). Caps confidence at 0.5 for minor resolution shifts or known domain-shift sensors (e.g. Cartosat-2S on RGB models, case-insensitive). Warns on unverified sensors.
  
### Phase 6 - Executor: Single-Image Workflow
- **Chunk 6.2:** Implemented `prepare_model_input(image_id, model_id)` in `backend/controller/preprocessing.py`:
  - Dynamically reads `input_contract` from the registry and extracts physical properties (bands, scaling, normalization).
  - Uses `raster_io.read_bands` to load rasters, reordering them to match the exact contract required by the target model.
  - Slices image into non-overlapping tiles if the array dimensions exceed the `min_resolution_px` bounds, recording bounding offsets (`tile_transforms`) for post-processing assembly.
  - Enforces strict validation: Raises `IncompatibleInputError` if a requested band (e.g. `VV`, `NIR`) is missing from the underlying `InputProfile`.
- **Chunk 6.3:** Implemented `run_single_image_workflow()` in `backend/controller/executor.py`:
  - Dispatches to `prepare_model_input` for all required models.
  - Stubs HTTP inference calls to remote model services (using mock for now).
  - Reconstructs original raster space by stitching individual tile outputs according to their saved transforms.
  - Generates a holistic valid-pixel mask using `quality.compute_valid_mask()` and applies it across all stitched model outputs (scores set to 0.0, masks bitwise-ANDed).
  - Executes `optional_tools` (like `compute_spectral_index:NDWI`) via `scientific_tools`, injecting physical properties dynamically.
  - Emits extensive trace telemetry mapping to the `execution_traces` DB schema.

### Phase 7.1 - Temporal Workflow
- **Chunk 7.1:** Extended `executor.py` with `run_temporal_workflow()`:
  - Reuses the `run_single_image_workflow()` pipeline independently for T1 and T2 images by mutating the ExecutionPlan.
  - Computes a shared strict `valid_mask` derived from the intersection of valid pixels in both the T1 and T2 raw rasters.
  - Executes `compare.compare_dates()` per requested target class, applying the shared valid mask to output distinct gain, loss, and net-change regions.
  - Plugs into `geometry.measure_regions()` to measure the physical area (in hectares/m²) of the gain and loss regions, strictly contingent on the absence of `"area_estimation"` physical restriction tags in the `ValidationResult`.

### Phase 8 - Cross-Modal Fusion
- **Chunk 8.1:** Created `backend/scientific_tools/reliability.py`:
  - Implemented `estimate_optical_reliability` which drastically reduces reliability (to 0.1/0.2) where clouds/shadows are present or pixels are fully saturated (e.g., 255 for uint8).
  - Implemented `estimate_sar_reliability` which penalizes speckle-affected extreme dB regions and defaults to a documented `0.6` uniform baseline when explicit layover/shadow masks are unavailable.
- **Chunk 8.2:** Extended `executor.py` with `run_crossmodal_workflow()`:
  - Dynamically routes the optical image to `seg_rgb_service` and the SAR image to `seg_sar_service`.
  - Intelligently drops non-overlapping target classes between the two models (e.g. `cropland` dropped if SAR model only knows `water, built_up`) and warns the user via `ValidationResult.restrictions`.
  - Calculates per-pixel, per-modality reliability arrays via `reliability.py`.
  - Feeds probabilities and reliabilities into `fuse_evidence()` to compute mathematically sound joint probabilities.
  - Generates explicit `unknown_{cls}` masks for regions where both sensors possess zero reliability (e.g., a pixel saturated in optical *and* in a SAR shadow) rather than allowing the AI to hallucinate an answer.

### Phase 9 - Evidence Package, Answerer, Verifier
- **Chunk 9.1 (Evidence Package):** Implemented `build_evidence_package` in `evidence.py` to translate technical executor measurements into a structured `EvidencePackage`. Persisted all masks/overlays physically to `./artifacts/{run_id}/...`, clamped final `confidence` variables to the strict bounds imposed by the `ValidationResult.confidence_caps`, and forwarded all validation restrictions into user-facing `limitations`.
- **Chunk 9.2 (Answerer):** Implemented dual-register output generation (`technical` and `plain_language`) inside `answerer.py`. Crucially, strictly barred raw raster data or high-resolution masks from entering the VLM prompt—passing only the pre-serialized numeric `claims` and `limitations` strings. Ensured the plain-language response never drops technical limitations.
- **Chunk 9.3 (Verifier):** Added `verify_answer` in `verifier.py` to fact-check the VLM's generated answer text. Used regex to extract numeric measurements and UUIDs, comparing them strictly (with a narrow 5% tolerance) against the official `evidence.claims`. Included a `get_conservative_fallback` mechanism to override the VLM with a strict templated dump of the evidence array whenever hallucinations (unbacked numbers/IDs) are detected.

### Phase 15 - Evidence Graph, PostGIS & STAC Backend Layer
- **Chunk 15.1 (PostGIS schema):** Extended `models.py` with the robust relational data model required for advanced UI flows. Added the `regions` table powered by `geoalchemy2` Geometry types (supporting `regions_touching_point` spatial queries) and the core `evidence_nodes`, `experiments`, and `feedback_tags` tables.
- **Chunk 15.2 (Evidence graph builder):** Wrote `build_evidence_graph` in `evidence_graph.py` to explode the flat EvidencePackage into a fully linked parent-child DB graph (`claim` -> `measurement` -> `region` -> `mask` -> `model` -> `input`). Provided standard JSON traversal helpers (`get_evidence_graph`, `get_node_lineage`) for the Explorer's frontend to visualize the pipeline's exact lineage.
- **Chunk 15.3 (STAC catalog & Reproducibility):** Developed `reproducibility.py` featuring a `pystac` asset registry pipeline. Implemented `write_run_manifest()` to securely dump `input_checksums`, explicit `model_versions`, and core pip `software_versions` to a static `./artifacts/{run_id}/run_manifest.json`, explicitly locking it in as the single incontrovertible source of truth for the forthcoming Phase 19 Jupyter notebook generator.

### Phase 18 - Research Experiment "What-If" Engine (Panel D)
- **Chunk 18.1 (Backend rerun/versioning):** Created `experiments.py` with `create_experiment()` to execute non-destructive "What-If" reruns based on parameter overrides (thresholds, model swaps, tool toggles, fusion weights). It is explicitly designed to determine the earliest affected stage in the DAG to skip unnecessary upstream work. Set up API endpoints `POST /api/v1/runs/{run_id}/experiments` and `GET /api/v1/experiments/{experiment_id}` that log these reruns to the `experiments` database table without mutating the original `ExecutionPlan` or parent run trace.
- **Chunk 18.2 (Experiment Panel UI):** (Frontend) Built the dynamic `ExperimentPanel.tsx` holding sliders and toggles for adjusting scientific parameters. Implemented a split-screen view allowing users to evaluate the newly computed experiment mask side-by-side against the baseline parent run before choosing to "Save as New Run". Code-split via Next.js dynamic import.
- **Chunk 18.3 (Manual mask correction):** Engineered the `POST /api/v1/experiments/{experiment_id}/corrections` API endpoint. This powerful tool accepts explicit geometry patches (include/exclude GeoJSON) drawn by the user on the map. It commits the modification directly into the `feedback_tags` database for provenance, and crucially appends it to `run_manifest.json.user_corrections`, preserving manual scientific tuning for exact reproducibility.

---

## Architectural Decisions
1. **Separation of Concerns:** The backend is extremely lightweight and purely orchestrates the workflows. It contains NO heavy ML libraries (like `torch`).
2. **Type-Level Physics:** Physical realities (like SAR representation being dB or linear) are enforced at the type level (`SARRaster`), not via heuristics.
3. **Registry-Driven Execution:** AI planners do not guess what tools exist. The capabilities are strictly defined in `backend/registry/` YAML files and dynamically injected into the VLM prompt.
4. **Incremental Commits:** Code is committed incrementally (file-by-file or function-by-function) to keep Git history clean, atomic, and revertible.
5. **Strict Plan Validation:** VLM-generated plans are not trusted blindly; they are validated against physical resolution limits and sensor contracts before any executor step runs.

---

## Hand-off for the ML Team
The ML team is responsible for the actual deep learning components and deploying them as separate microservices.
Specifically:
1. **VLM Service Endpoint:** In Chunk 5.1, we stubbed `model_services.vlm_service.inference`. The ML team needs to implement the actual `generate(prompt, images, adapter)` function that calls the vision-language model.
2. **Microservices for Models:** The YAML files in `backend/registry/models/` map to endpoints (e.g., `http://seg-rgb-service:8001/infer`). The ML team must build and deploy these models to those ports. The backend expects them to honor the `input_contract` defined in their respective YAML files.

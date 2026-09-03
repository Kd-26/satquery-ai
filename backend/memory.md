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

# SatQuery AI Backend - Memory

## Work Completed (Up to Chunk 5.1)

### Phase 0 - Scaffolding
- Built the lightweight FastAPI backend (`main.py`, `.env.example`, `requirements.txt`).
- Created empty module files for `api`, `controller`, `scientific_tools`, `registry`, `schemas`, `db`.

### Phase 1 - Data Contracts & Registry Foundation
- **Chunk 1.1:** Created strict Pydantic schemas in `backend/schemas/` (`InputProfile`, `RegistryEntry`, `ExecutionPlan`, `EvidencePackage`, `SARRaster`). These lock down physical realities—for example, wrapping SAR data to enforce `'dB'` vs `'linear'` representation.
- **Chunk 1.2:** Created YAML manifests in `backend/registry/` for models, adapters, and tools. Added `registry_loader.py` to parse and validate these manifests at startup using Pydantic. Any invalid YAML will crash the server on boot.
- **Chunk 1.3:** Setup the PostgreSQL database using `SQLModel` and `asyncpg` (`backend/db/models.py` and `backend/db/session.py`).

### Phase 2 - Ingestion & Scientific Tools
- **Chunk 2.1:** Implemented `raster_io.py` for metadata and band reading via `rasterio`. Created `validate_file` and `ingest_upload` in `ingestion.py` to safely handle file uploads (with file size and corruption checks).
- **Chunk 2.2:** Added heuristic metadata extraction and sidecar-merging logic (`inspect_image` and `resolve_metadata`). Enforced strict physical capability restrictions if data like CRS or `pixel_spacing_m` is missing.
- **Chunk 2.3:** Created `indices.py` for spectral math (NDVI, NDWI, etc.) with safe handling of NaN/divide-by-zero. Implemented `sar_stats.py` which rejects mathematically invalid operations (like dividing dB values) via type-checking.
- **Chunk 2.4:** Added geometry tools (area calculation), alignment (pair compatibility, time gap), quality masking, compare, and evidence fusion tools.

### Phase 5 - Planner & Validator
- **Chunk 5.1:** Implemented the VLM Planner prompt builder in `backend/controller/planner.py`. It dynamically summarizes the tool registry and profiles. Implemented the JSON-schema guided execution plan extraction with a one-time automatic retry mechanism for malformed JSON.

---

## Architectural Decisions
1. **Separation of Concerns:** The backend is extremely lightweight and purely orchestrates the workflows. It contains NO heavy ML libraries (like `torch`).
2. **Type-Level Physics:** Physical realities (like SAR representation being dB or linear) are enforced at the type level (`SARRaster`), not via heuristics.
3. **Registry-Driven Execution:** AI planners do not guess what tools exist. The capabilities are strictly defined in `backend/registry/` YAML files and dynamically injected into the VLM prompt.
4. **Incremental Commits:** Code is committed incrementally (file-by-file or function-by-function) to keep Git history clean, atomic, and revertible.

---

## Hand-off for the ML Team
The ML team is responsible for the actual deep learning components and deploying them as separate microservices.
Specifically (so far):
1. **VLM Service Endpoint:** In Chunk 5.1, we stubbed `model_services.vlm_service.inference`. The ML team needs to implement the actual `generate(prompt, images, adapter)` function that calls the vision-language model.
2. **Microservices for Models:** The YAML files in `backend/registry/models/` map to endpoints (e.g., `http://seg-rgb-service:8001/infer`). The ML team must build and deploy these models to those ports. The backend expects them to honor the `input_contract` defined in their respective YAML files.

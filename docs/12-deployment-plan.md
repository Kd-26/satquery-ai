# Deployment Plan

This is a proposed deployment shape. No container, service, database, or cloud resource has been created.

## Proposed services

| Service | Responsibility | Typical resource |
|---|---|---|
| FastAPI gateway | public analysis/job endpoints, auth/limits, contract validation | CPU |
| LangGraph orchestrator | state transitions, capability selection, retries, audit | CPU |
| Metadata and quality | file parsing, metadata provenance, mandatory checks | CPU; isolated external tools |
| Preprocessing | optical/multispectral/SAR preparation, tiling, grid alignment | CPU/GPU by profile |
| Optical segmenter | verified RGB semantic masks | GPU |
| Multispectral segmenter | verified RGB+NIR semantic masks | GPU |
| SAR segmenter | verified VV/VH masks | GPU |
| Change analysis | mask transitions and optional paired model | CPU/GPU |
| Physics/spatial | indices, statistics, areas, topology, geometries | CPU |
| Fusion | quality-based evidence combination and contradictions | CPU |
| Qwen VLM and adapter manager | evidence-grounded reasoning, bounded adapter cache | GPU |
| Reporting | validation and GeoJSON/CSV/report packaging | CPU |
| PostgreSQL/PostGIS | jobs, metadata, measurements, footprints/regions, versions | persistent CPU service |
| Object storage | uploaded and derived rasters/reports | persistent storage |
| Monitoring | structured logs, metrics, traces, alerts | CPU/storage |

Ray Serve may route independently scalable model capabilities; vLLM is used only if the exact Qwen checkpoint and adapter strategy are compatible. The public API must not expose a separate endpoint per model.

## MVP deployment

Prefer one GPU server where feasible, one FastAPI backend, a LangGraph worker, Ray Serve model deployments, PostgreSQL/PostGIS, and local or S3-compatible object storage under Docker Compose. Load only the models required for the MVP, bound request and raster sizes, queue GPU work, and record memory/latency from measurements. The web frontend may be a separate container.

The MVP needs environment templates, health/readiness checks, typed internal requests, timeouts/retries, circuit breakers, checksummed model/config versions, structured logs, artifact retention, backups, and secrets outside images and Git. External parsing/SNAP processes require resource and permission isolation.

## Scale-up

After an MVP load test demonstrates bottlenecks, consider independent autoscaling, GPU-aware model placement, request queues/backpressure, adapter caching/eviction, multi-node object storage/database services, and regional data controls. Kubernetes is a later option, not an MVP requirement. Scale decisions must use observed utilization, queue time, failure, and memory data.

## Delivery path

1. local reproducible development and contract tests;
2. Docker Compose integration environment with synthetic/small licensed fixtures;
3. CI lint, unit, scientific, integration, security, and artifact checks;
4. staging with access controls, retention, monitoring, and load tests;
5. risk review and controlled production release.

GitHub Actions is proposed for CI. No workflow exists yet because dependency and manifest choices belong to the next phase.

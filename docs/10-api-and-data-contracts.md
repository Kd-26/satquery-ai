# API and Data Contracts

This document proposes schemas; no API or Pydantic model is implemented. Contracts should reject unknown verified fields, use stable IDs, and version both schema and producers.

## Provenance classification

Every metadata value is wrapped with `field`, typed `value` (or `null`), `unit` where relevant, `provenance`, and `source`. Allowed provenance values are:

- `verified_file_metadata`: parsed from a trusted field and validated;
- `user_supplied`: provided separately and retained as such until independently verified;
- `model_inferred`: a non-authoritative suggestion;
- `derived`: deterministically calculated from referenced inputs;
- `unavailable`: absent or unusable, with a reason.

Provenance is not silently promoted. A user-supplied band map may make a workflow eligible only under an explicit policy; it must not be relabelled as file metadata.

## Request and input schemas

| Schema | Required core fields | Key invariants |
|---|---|---|
| `AnalysisRequest` | `request_id`, `query`, `assets[]`, requested outputs, optional supplied metadata | at least one asset; no raw secret in trace; quantitative unit is explicit |
| `UserQuery` | raw text, parsed task/target/measurement/time/modality/unit, parser version | parsed values remain model-inferred until plan validation |
| `ImageAsset` | `image_id`, URI/reference, media type, checksum, byte size, role, metadata reference | immutable content identity; role distinguishes single/T1/T2/optical/SAR without claiming sensor verification |
| `VerifiedMetadata` | asset ID and provenance-wrapped width, height, bands, descriptions, CRS, transform, resolution, bounds, NoData, dates, sensor/product, calibration | unavailable is explicit; channel count never assigns band/sensor identity |
| `QualityReport` | asset ID, metrics, masks, warnings, blocking errors, recommended preprocessing, evaluator version | blocking conditions cannot be overwritten by planner |
| `CompatibilityReport` | asset IDs, overlap, CRS/grid/resolution/date/registration/acquisition checks, blockers | comparison scope and error estimates are explicit |

## Planning and invocation schemas

| Schema | Required core fields | Key invariants |
|---|---|---|
| `WorkflowPlan` | workflow/task, input IDs, targets, preprocessing, capabilities, tools, output requirements, provisional adapter, limitations, plan version | every selected capability is registered; deterministic validation status is separate from proposal |
| `ToolInvocation` | invocation/run ID, capability/tool version, referenced inputs, parameters, start/end/status, output refs, warnings/errors | parameters are typed; no prompt-supplied executable code |
| `ModelInvocation` | invocation/run ID, capability, model/version/checksum, preprocessing version, input/output refs, device/serving version, confidence calibration version | records exact resolved model; public plan need not expose deployment URL |

## Evidence schemas

| Schema | Required core fields | Key invariants |
|---|---|---|
| `SegmentationResult` | asset/model IDs, class ontology, mask reference, probability reference if retained, validity mask, CRS/transform, confidence summary | mask maps to original coordinates and model version |
| `ChangeResult` | T1/T2/result IDs, alignment reference, binary/semantic type, gain/loss/transition refs, confidence, quality flags | binary change is not mislabeled semantic transition |
| `PhysicsMeasurement` | tool/formula version, input bands/masks, region ID, value/unit, valid count, quality flags, provenance | unit and prerequisites validate; measurement points to evidence |
| `SpatialRelation` | subject/object region IDs, predicate/operation, value/unit if applicable, geometry/CRS, quality | all region IDs resolve; tolerance and distance method are recorded |
| `EvidenceRegion` | region ID, class/hypothesis, source refs, geometry/mask ref, measurements, confidence, quality, supporting/contradicting tools | geometry coordinate system and source lineage are explicit |
| `FusionResult` | modality/source refs, component quality, per-region weights, fused hypothesis, contradiction/fallback flags, calibration version, limitations | weights apply only to compatible evidence; blockers remain visible |

## Output and trace schemas

| Schema | Required core fields | Key invariants |
|---|---|---|
| `FinalAnswer` | answer text/structured claims, evidence/region IDs per claim, confidence, limitations, downloadable refs, validation status | every measurement/unit/region resolves; unsupported metadata is absent or qualified |
| `AuditRecord` | event ID, run/request ID, actor/component, timestamp, event type, input/output references, versions, decision/reason, previous-event link | append-oriented, redacted, tamper-evident strategy to be selected |

## Documentation-only example

```json
{
  "field": "pixel_size_x",
  "value": 10.0,
  "unit": "metre",
  "provenance": "verified_file_metadata",
  "source": "GeoTIFF affine transform"
}
```

Future schema tests must cover missing/conflicting metadata, invalid provenance promotion, unknown fields, band/tool mismatch, unscaled-area rejection, unresolved region references, and schema-version migration. Service inputs and outputs must validate at their boundary.

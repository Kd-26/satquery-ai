# ADR-001: Hybrid Neuro-Symbolic Architecture

## Status

Accepted as design; unimplemented.

## Context

A VLM can interpret a natural-language question and synthesize visual context, but it is not a dependable metadata parser, pixel-precise segmenter, spectral calculator, area engine, or registration validator. A purely deterministic pipeline, however, cannot flexibly interpret diverse queries and select only needed analyses.

## Decision

Adopt **Mask → Measure → Explain**. Specialist neural models produce versioned masks/probabilities; deterministic physics and spatial tools derive measurements with units/provenance; the VLM explains a validated structured evidence package. Always-run metadata, quality, plan, evidence, output, and audit controls surround conditional agent-selected work.

## Alternatives considered

- End-to-end VLM answering directly from images: simpler but cannot guarantee measurements or provenance.
- Fixed workflow running every model/tool: predictable but expensive, irrelevant for simple queries, and increases error surface.
- Deterministic GIS only: scientifically traceable but insufficient for language understanding and contextual visual reasoning.

## Consequences

Measurements become testable and claim-linked; responsibilities are independently evaluable and deployable. The system requires schemas, region identity, versioning, fusion, and orchestration across more components.

## Risks

Error accumulation, latency, contract drift, and a false impression that deterministic tools automatically make upstream masks correct. Confidence and contradiction must survive the pipeline.

## Review conditions

Review if an evaluated end-to-end model can satisfy the same provenance/abstention requirements, orchestration dominates latency without quality benefit, or measurement tasks no longer form the product scope.

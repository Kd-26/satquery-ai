# Architecture Decision Records

Architecture decision records (ADRs) explain foundational choices and their trade-offs. They document design intent; they do not imply implementation.

| ADR | Decision | Status |
|---|---|---|
| [ADR-001](ADR-001-hybrid-neuro-symbolic-architecture.md) | Hybrid “Mask → Measure → Explain” architecture | Accepted design; unimplemented |
| [ADR-002](ADR-002-sensor-specific-segmentation.md) | Sensor-specific input modules and segmenters | Accepted design; unimplemented |
| [ADR-003](ADR-003-constrained-agent-orchestration.md) | Constrained planning with deterministic guardrails | Accepted design; unimplemented |
| [ADR-004](ADR-004-multi-lora-vlm.md) | Shared adapted VLM with capability-oriented Multi-LoRA | Accepted design; unimplemented |

New ADRs use the next sequential number and include Status, Context, Decision, Alternatives considered, Consequences, Risks, and Review conditions. Superseded ADRs remain in history and link to the replacement. Changes to core invariants, provenance, service boundaries, model families, public contracts, or deployment trust boundaries require an ADR before implementation.

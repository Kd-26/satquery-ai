# ADR-004: Shared Adapted VLM with Capability-Oriented Multi-LoRA

## Status

Accepted as design; unimplemented and conditional on compatibility evaluation.

## Context

Grounded single-image VQA, temporal reasoning, optical–SAR synthesis, and scientific reporting emphasize different behaviours. Multiple full VLM deployments duplicate base weights and operations. One indiscriminate adapter can cause capability interference, while one adapter per sensor/tool/class creates fragmentation.

## Decision

After establishing an exact licensed Qwen3.5-VL baseline, use one shared base with selected vision-encoder adaptation and four capability-oriented PEFT LoRAs: grounding/VQA, temporal reasoning, optical–SAR reasoning, and scientific reporting. Select provisionally at planning and confirm after evidence production. Prefer one dominant adapter; evaluate any sequential/combined use. Serve with Ray/vLLM only when exact compatibility is verified, with versioning, bounded cache, audit, and base fallback.

## Alternatives considered

- Separate complete VLM per capability: isolation at high memory/deployment cost.
- One combined LoRA: simpler routing but greater interference risk.
- Full fine-tuning: potentially strong but expensive and harder to version/serve.
- Adapter per class, sensor, or formula: excessive data and operational fragmentation.

## Consequences

Base weights can be shared and adapters independently evaluated/versioned. The system needs routing datasets, interference ablations, adapter lifecycle controls, and serving compatibility work.

## Risks

Wrong-adapter routing, catastrophic forgetting during vision adaptation, interference, unsupported multimodal LoRA paths, memory pressure, or unavailable/licence-incompatible checkpoint.

## Review conditions

Review after base evaluation, checkpoint/licence verification, combined-vs-specific adapter ablation, measured serving performance, or any change to the selected VLM family.

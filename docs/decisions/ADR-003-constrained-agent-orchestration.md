# ADR-003: Constrained Agent Orchestration

## Status

Accepted as design; unimplemented.

## Context

Queries need different workflows, yet a free-form agent can select incompatible models, skip quality checks, invent parameters, or overuse costly tools. Deterministic routing alone is brittle for varied natural language.

## Decision

Use a typed LangGraph state machine. The VLM/planner proposes a `WorkflowPlan` from a registered capability inventory. Deterministic validators enforce required metadata, bands, scale, pair compatibility, quality blockers, output schemas, and final claim links. Always-run controls and audit logging cannot be skipped. Internal functions remain typed services; MCP is reserved for justified external interoperability.

## Alternatives considered

- Free-form agent with arbitrary tool calls: flexible but unsafe and difficult to audit.
- Hard-coded workflow per question template: safe for a narrow demo but poor coverage and maintainability.
- Expose every low-level operation as MCP: interoperable but enlarges security/operational surface unnecessarily.

## Consequences

Plans are inspectable, invalid combinations are testable, and minimal workflows are possible. Capability schemas/configurations become critical infrastructure and graph evolution requires migration/testing.

## Risks

Prompt injection, stale registries, validator gaps, loops/retries, and divergence between proposed plan and resolved deployment.

## Review conditions

Review when task coverage changes materially, another orchestrator offers stronger typed guarantees, external interoperability becomes central, or plan-validation tests expose structural limitations.

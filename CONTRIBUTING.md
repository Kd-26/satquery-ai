# Contributing to SatQuery AI

SatQuery AI is currently at documentation-only Phase 0. Contributions must preserve the boundary between initialized scaffolding, proposed design, and implemented behaviour.

## Before changing the repository

1. Read the [architecture](docs/02-system-architecture.md), [inference lifecycle](docs/03-inference-lifecycle.md), [risk register](docs/13-risk-register.md), and [roadmap](docs/14-roadmap.md).
2. Select one bounded capability and identify its acceptance criteria.
3. Record an architecture decision if the change alters a documented invariant or service boundary.
4. Check licences before introducing data, models, or copied implementation material.

## Change expectations

- Do not present proposed components as working.
- Never infer sensor or band identity from channel count alone.
- Keep analytical rasters separate from display previews and normalized model tensors.
- Put reusable contracts in `packages/`, service code in `services/`, training code in `ml/`, and user-facing code in `apps/`.
- Add unit tests and, where relevant, integration and scientific-validation tests.
- Preserve measurement provenance, uncertainty, and abstention behaviour.
- Do not commit datasets, credentials, model weights, generated artifacts, or personal information.

## Documentation and review

Use concise Markdown, relative links, and explicit status labels such as **Implemented**, **Proposed**, or **Blocked**. Update the relevant roadmap and changelog entry with each completed phase. Pull-request descriptions should list files changed, tests run, results, limitations, and any data/model/compute used. Performance, dataset size, accuracy, cost, and latency must be reported only from recorded results.

## Architecture decisions

Create a sequential ADR under `docs/decisions/` when changing a foundational decision. Follow the sections in [the ADR index](docs/decisions/README.md): Status, Context, Decision, Alternatives considered, Consequences, Risks, and Review conditions.

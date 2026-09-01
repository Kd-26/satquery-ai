# Data Policy

The `data/` tree is a local staging convention, not a bundled dataset. No dataset has been selected, downloaded, audited, or licensed for this repository.

## Stages

| Directory | Policy |
|---|---|
| `raw/` | Immutable bytes as received; never edited in place |
| `interim/` | Reversible intermediate products with recorded transformations |
| `processed/` | Model- or analysis-ready derivatives linked to raw source IDs |
| `annotations/` | Labels, provenance, reviewer state, and class ontology |
| `samples/` | Small redistributable examples only after licence and privacy review |

Large datasets are not stored in Git. DVC or an equivalent versioned object-storage workflow may be introduced after storage and governance decisions are made.

Every scene or patch must record source, licence, checksum, modality, verified sensor/band metadata where available, spatial/temporal coverage, processing history, and allowed use. Every annotation must distinguish official, expert-reviewed, human-reviewed pseudo-label, and unreviewed weak-label provenance. Auto-labels must remain separate from verified labels.

Train, validation, and test splits must be made geographically—and where relevant temporally—before extracting overlapping patches. Dataset licences, redistribution conditions, benchmark restrictions, and leakage checks are release gates. Raw data remains immutable; processed products must point to both source material and a reproducible transformation version.

See [the dataset strategy](../docs/05-dataset-strategy.md) and [training pipeline](../docs/04-training-pipeline.md).

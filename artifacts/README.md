# Artifact Policy

The `artifacts/` tree is reserved for generated analysis outputs. Artifacts are local by default and ignored by Git; no artifact currently exists.

| Directory | Intended content |
|---|---|
| `masks/` | Segmentation, validity, quality, gain/loss, and change rasters |
| `vectors/` | GeoJSON or equivalent polygons derived from traceable masks |
| `reports/` | Human- and machine-readable analysis reports |
| `audit_logs/` | Append-oriented execution events and evidence links |

## Identity and naming

Every execution receives an opaque `run_id`; each input has an `image_id`; and each evidence geometry has a `region_id`. A provisional file pattern is `<run_id>__<image_id>__<artifact-type>__<version>.<ext>`. Region identifiers are stored in sidecar metadata or in vector properties rather than inferred from filenames.

Every generated output must record its producing tool/model and version, source image checksum, preprocessing profile, input mask/bands, coordinate reference system when applicable, unit, quality flags, timestamps, and configuration version. Reports must link claims to measurements and region IDs. Audit records must avoid secrets and unnecessary sensitive imagery metadata.

Model weights and training outputs do not belong in this directory or in Git. Retention, object-storage, integrity, and access-control rules remain to be selected before deployment.

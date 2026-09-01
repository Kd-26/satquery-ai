# Security Policy

## Project status

SatQuery AI currently contains documentation and empty scaffolding only; no application endpoint or deployed service exists. This policy describes expectations for future implementation.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue. Contact the repository owner through a private channel associated with the hosting account. A dedicated security address and response service-level objective must be selected before the first public deployment.

Include the affected revision, reproduction steps, expected impact, and whether sensitive imagery or credentials may be exposed. Do not include real secrets or restricted imagery in the report.

## Planned security boundaries

- Treat uploaded imagery, metadata, prompts, EXIF, filenames, and model outputs as untrusted input.
- Enforce file-size, format, decompression, raster-dimension, and processing-time limits.
- Isolate geospatial parsers and external tooling such as ExifTool or SNAP with least privilege.
- Validate workflow plans against a capability allow-list; never execute prompt-supplied code or URLs.
- Keep credentials outside Git and redact them from logs and audit exports.
- Authorize access to original images, derived regions, reports, and job traces separately.
- Record model, adapter, tool, and configuration versions without logging unnecessary sensitive content.
- Scan dependencies, containers, and model artifacts before release; pin verified sources and hashes.

## Remote-sensing considerations

Geolocation and acquisition metadata can be sensitive even when the image appears harmless. Future retention, access-control, deletion, and geographic-data policies must be threat-modelled before user uploads are accepted. Outputs must not imply security, defence, threat, or damage-diagnosis guarantees.

## Supported versions

No released or supported software version exists yet. This section will be updated when the first implementation release is published.

# Project Overview

## Vision

SatQuery AI aims to make remote-sensing evidence queryable in natural language without weakening scientific controls. A user should be able to ask which land-cover class changed, how much trusted area is affected, or whether SAR corroborates a cloud-obscured optical observation. The intended result is an auditable evidence package and a constrained explanation—not an unconstrained visual guess.

## Remote-sensing and ISRO relevance

The concept is relevant to workflows involving Earth-observation imagery available through Indian Space Research Organisation (ISRO), Space Applications Centre (SAC), and other licensed sources. Potential uses include flood extent, vegetation condition, surface-water monitoring, land-cover change, and planning support. Any future use of ISRO data, evaluation material, or problem-statement assets must follow the supplied licence, redistribution, geographic, and benchmark rules. No ISRO integration or endorsement currently exists.

## Intended users

- remote-sensing and geographic information system (GIS) analysts;
- disaster-management authorities;
- agriculture, irrigation, and water agencies;
- environmental-monitoring teams;
- infrastructure-planning authorities;
- researchers evaluating multimodal and agentic Earth-observation systems.

SatQuery AI is not intended to replace expert review for consequential decisions.

## Questions, inputs, and outputs

Supported-query goals include scene description, remote-sensing visual question answering, semantic segmentation, area or coverage measurement, bi-temporal gain/loss, semantic transition, optical–SAR comparison, spatial relationships, and evidence-grounded explanation.

| Input | Scientific treatment |
|---|---|
| GeoTIFF | Read bands, descriptions, data type, CRS, affine transform, resolution, bounds, NoData, tags, and available acquisition metadata; preserve quantitative values |
| JPEG/PNG | Read dimensions, colour mode, channels, and available EXIF; sensor, bands, CRS, GSD, and calibration remain unverified unless supplied and validated |
| Bi-temporal pair | Validate dates, overlap, compatible grids, resolution, and registration before measuring change |
| Optical–SAR pair | Validate modality metadata, coverage, acquisition compatibility, and per-modality quality before fusion |

Planned outputs include a natural-language answer, segmentation/change mask, evidence overlay, deterministic spectral or SAR measurements, area/coverage where scale is trusted, spatial relations, confidence, limitations, GeoJSON/CSV where georeferenced, and an execution trace.

## Differentiators

- **Mask → Measure → Explain:** masks are the primary measurement surface; tools calculate; the VLM explains.
- **Provenance-aware metadata:** verified, user-supplied, inferred, derived, and unavailable values remain distinguishable.
- **Sensor-specific processing:** optical, multispectral, and SAR data are not forced into an unsafe shared channel representation.
- **Selective execution:** qualitative questions can avoid costly segmentation, while quantitative questions must satisfy measurement preconditions.
- **Reliability-aware fusion:** cloud, speckle, alignment, date, and coverage quality affect evidence weights and abstention.
- **Claim-to-evidence links:** every measurement is intended to reference its image, region or mask, calculation, unit, and quality information.

## MVP boundary

The proposed first product milestone accepts GeoTIFF and ordinary image uploads; extracts explicit metadata; returns mandatory quality reports; supports a single verified optical workflow for water, vegetation, and built-up segmentation; calculates supported indices and georeferenced areas; uses a constrained planner and a base VLM plus one grounding/VQA adapter; and displays/downloads evidence-linked outputs.

## Non-goals

- inferring missing physical metadata from appearance or channel count;
- universal sensor support or universal land-cover thresholds;
- using a VLM as a spectral calculator, registration tool, or area engine;
- fully autonomous defence, threat detection, or structural-damage diagnosis;
- operational emergency decisions without authoritative data and expert review;
- model training, data acquisition, or production serving during repository-initialization phase.

See the [system architecture](02-system-architecture.md), [roadmap](14-roadmap.md), and [risk register](13-risk-register.md).

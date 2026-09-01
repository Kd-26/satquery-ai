# Demo Scenarios

These are acceptance narratives, not working demonstrations. Models, tool results, and numeric outcomes remain hypothetical until implemented and evaluated.

## 1. Single optical image — water area

- **Input:** georeferenced GeoTIFF with verified RGB band descriptions, valid transform/CRS, and acceptable cloud quality.
- **Query:** “Calculate the water-covered area.”
- **Workflow:** single image → validation → optical preprocessing → segmentation → area → explanation.
- **Models/tools:** optical SegFormer; valid-pixel coverage, polygonization, georeferenced area.
- **Evidence:** water mask, region polygons/IDs, class confidence, area operation and quality report.
- **Output:** area and coverage with unit, mask/GeoJSON, evidence-linked answer, confidence, and limitations.
- **Limitations:** cloud/shadow and class confusion; physical area is blocked if the transform/CRS or scale is untrusted.

## 2. Multispectral image — vegetation and NDVI

- **Input:** GeoTIFF with verified, compatible red/green/blue/NIR bands and quantitative scaling.
- **Query:** “Compare vegetation condition within the highlighted regions.”
- **Workflow:** multispectral single image → four-band segmentation → NDVI → region summaries.
- **Models/tools:** multispectral SegFormer; NDVI and spatial aggregation.
- **Evidence:** vegetation mask, NDVI raster/statistics, valid-pixel counts, region IDs.
- **Output:** relative condition by region, cited measurements, mask/overlay, and assumptions.
- **Limitations:** NDVI saturation, season/phenology, cloud/shadow, and lack of field validation; no universal health threshold.

## 3. Bi-temporal pair — built-up gain

- **Input:** two verified co-covered multispectral observations with acceptable dates, common-grid conversion, and registration error.
- **Query:** “Has built-up area increased between these dates?”
- **Workflow:** temporal pair → pair validation/alignment → same semantic segmenter at T1/T2 → transitions → area.
- **Models/tools:** compatible multispectral segmenter; NDBI where verified NIR/SWIR exist; gain/loss, transition matrix, georeferenced area.
- **Evidence:** T1/T2 built-up masks, gain regions, signal/index support, registration report.
- **Output:** change direction and supported amount, region IDs/GeoJSON, contradictions and confidence.
- **Limitations:** NDBI/bare-soil confusion, seasonal differences, resolution and residual-registration error; ChangeFormer is not automatically invoked.

## 4. Cloudy optical plus SAR — flood assessment

- **Input:** co-covered optical and calibrated VV/VH SAR observations with compatible dates and adequate alignment.
- **Query:** “Use SAR evidence because the optical image is cloudy. Which cropland regions were newly inundated?”
- **Workflow:** optical–SAR plus temporal evidence as supplied → quality/compatibility → specialist masks → transition/topology → per-region fusion.
- **Models/tools:** optical/multispectral and SAR segmenters; backscatter/VV-VH evidence where valid; cloud masks; intersection of previous cropland with new water; reliability weights.
- **Evidence:** source-specific masks, cloud and SAR quality, newly inundated region IDs, weights and contradiction flags.
- **Output:** qualified inundation regions/area, SAR-primary rationale, evidence overlay/GeoJSON, limitations.
- **Limitations:** requires sufficient temporal/semantic inputs for “newly”; SAR geometry/speckle and date mismatch may force abstention.

## 5. JPEG-only input — qualitative result

- **Input:** ordinary JPEG with dimensions and colour metadata but no trusted sensor, bands, CRS, GSD, or calibration.
- **Query:** “How many hectares are water?”
- **Workflow:** single image → metadata/quality → plan restriction; optional qualitative segmentation only if modality routing is supported.
- **Models/tools:** compatible qualitative model if validated; pixel count/coverage, never spectral indices or georeferenced area.
- **Evidence:** explicit unavailable metadata, optional pixel mask, valid-pixel coverage, reason physical area is blocked.
- **Output:** qualitative description or pixels/percentage plus request for trustworthy scale/georeferencing; no hectares.
- **Limitations:** unknown physical bands, sensor, calibration, scale, location, and projection.

## 6. Unsupported spectral request

- **Input:** verified RGB optical GeoTIFF without NIR or SWIR.
- **Query:** “Calculate NDVI, MNDWI, and NDBI.”
- **Workflow:** single image → verified band inventory → deterministic plan rejection for all three requested indices.
- **Models/tools:** no spectral tool invocation; optional visual answer only if separately requested.
- **Evidence:** band inventory and tool requirement mismatch.
- **Output:** restricted answer listing the missing NIR/SWIR requirements.
- **Limitations:** appearance cannot recover missing quantitative bands; the planner may not substitute a visual estimate.

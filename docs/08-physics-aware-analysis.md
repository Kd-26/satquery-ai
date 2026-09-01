# Physics-Aware Analysis

These proposed tools are deterministic functions with typed requirements. Thresholds, epsilon handling, reflectance scaling, masking, projection, and resampling must be versioned. No universal class threshold is assumed.

## Spectral and SAR tools

| Tool | Required verified inputs | Formula/operation and range | Assumptions and failure conditions | Georeferencing | Neural-evidence role |
|---|---|---|---|---|---|
| NDVI | NIR, red; compatible grid and scaling | `(NIR - Red) / (NIR + Red)`; normally `[-1, 1]` for valid finite values | comparable reflectance; mask near-zero denominator, NoData, cloud/shadow; invalid with unknown bands | Not required for per-pixel index | supports/contradicts vegetation mask; no universal vegetation threshold |
| NDWI | green, NIR | `(Green - NIR) / (Green + NIR)`; normally `[-1, 1]` | comparable values; mask invalid denominator/cloud; turbidity, shadow, built surfaces can confound | Not required | independent water evidence where bands are verified |
| MNDWI | green, SWIR | `(Green - SWIR) / (Green + SWIR)`; normally `[-1, 1]` | verified SWIR/green and compatible scale/grid; invalid for RGB-only data | Not required | can reduce some built-up confusion; threshold remains scene-dependent |
| NDBI | SWIR, NIR | `(SWIR - NIR) / (SWIR + NIR)`; normally `[-1, 1]` | verified comparable bands; bare soil and dryness can confound; mask invalid denominator | Not required | supports/contradicts built-up prediction, never proves it alone |
| VV/VH ratio | calibrated co-registered VV and VH in compatible representation | ratio in linear power, or difference if both are in dB; range depends on representation | do not divide dB values; mask noise floor/invalid pixels; fail if one polarisation or calibration/representation is unknown | Not required for per-pixel statistic | tests SAR segmentation consistency with a documented training/physics representation |
| Backscatter difference | compatible calibrated T1/T2 backscatter for same polarisation | `sigma0_T2 - sigma0_T1` in dB, or documented ratio/difference in linear scale | acquisition geometry, orbit, calibration, terrain, and registration must be comparable | Not required for signal difference; required for mapped region measurement | supports temporal anomaly; cannot identify semantic cause by itself |
| Texture statistics | numeric raster plus window/scale | e.g. local variance, entropy, or gray-level co-occurrence features | window and quantization affect value; NoData, edges, speckle, and resolution must be handled; no universal range | Not required | contextual support or contradiction for masks |
| Edge statistics | numeric raster or mask | documented gradient/edge operator and summary per region | operator, scale, resampling, noise, and tile boundaries affect result | Not required | evaluates boundary agreement, texture, or structural change |

Normalized differences use an epsilon only to identify unstable denominators; it must not turn missing or invalid inputs into valid zeros. Output records include band IDs, source asset/version, valid-pixel count, mask, formula version, and quality flags.

## Spatial, quality, and temporal tools

| Tool | Required input | Operation/unit | Assumptions and failure conditions | Georeferencing | Evidence role |
|---|---|---|---|---|---|
| Pixel-count area | boolean/class mask | count of valid target pixels; `pixel²` or pixels | mask and validity grid must align; not a physical area | No | qualitative/relative coverage |
| Georeferenced area | mask, affine transform, CRS | sum pixel footprint or polygon area; convert to `m²`, `km²`, or `ha` | CRS/unit must support valid area; use appropriate equal-area/geodesic method; reject unknown scale | Yes, or independently trusted scale with explicit provenance | primary physical-area measurement from segmentation mask |
| Coverage | target and valid masks | `target_valid_pixels / valid_pixels × 100%` | denominator and scope must be stated; invalid if no valid pixels | No for percentage; yes to map result | normalizes mask extent to observed area |
| Cloud/shadow estimation | suitable optical bands/quality layer or evaluated estimator | cloud/shadow probability/mask and affected percentage | weak for unavailable bands; confuse snow, bright soil, water, terrain shadow; estimator provenance required | No | reduces optical reliability and marks unusable regions |
| Temporal gain/loss | registered T1/T2 semantic masks and validity overlap | `gain = class_T2 ∧ ¬class_T1`; `loss = class_T1 ∧ ¬class_T2` | common ontology/grid/coverage and acceptable registration error; edge dilation sensitivity should be tested | Required for physical area; not for pixel counts | produces evidence regions and class-transition matrix |
| Intersection/union/difference | aligned masks or valid geometries | boolean mask or geometry set operation | repair/reject invalid geometries; use common CRS | Required for geographic output/distance | quantifies overlap and semantic transitions |
| Adjacency/containment/distance | region geometries | topological predicate or distance | tolerance and coordinate units must be declared; geographic CRS is unsafe for naive Euclidean distance | Yes for physical distance | supports spatial-language answers |

## Measurement contract

Every result must include tool/operation name and version, input assets/bands/masks, `region_id`, numeric value, unit, valid-pixel count, provenance, quality flags, assumptions, and links to generated geometry or raster. A result may contradict neural evidence; both remain in the evidence package and the fusion layer decides whether to qualify or abstain.

Scientific tests should use hand-calculated arrays, known-area geometries in suitable projections, invalid denominators, missing-band cases, and synthetic registration shifts. The VLM receives results; it does not execute these calculations visually.

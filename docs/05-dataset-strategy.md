# Dataset Strategy

No dataset is approved or present. Each entry below is a proposed role that must be reconciled with the official version, licence, annotation schema, split rules, and the project/problem-statement constraints.

## Provisional dataset matrix

| Dataset family | Modality | Available annotations | Intended use | Required conversion | Licensing status | Leakage risk | Required quality control |
|---|---|---|---|---|---|---|---|
| BigEarthNet | Multispectral Sentinel imagery | Primarily scene-level multi-label land-cover annotations | domain adaptation, image–text/instruction pairs, auxiliary weak supervision | band selection/scaling; label-to-text mapping; pseudo-masks only if separately generated/reviewed | Verification required before use/redistribution | overlapping patches, geographic and source-scene overlap | cloud/season review, scene-level split, label-provenance checks |
| GeoChat | Remote-sensing imagery/text | instruction/VQA-style records according to verified release | domain language, VQA/instruction adaptation | schema normalization and image provenance mapping | Verification required | image/question duplicates across tuning/evaluation | inspect source datasets, licences, task splits, answer quality |
| VRSBench | Remote-sensing vision-language | caption, VQA, and grounding tasks according to verified release | VQA/grounding training or evaluation | normalize boxes/regions and task schema | Verification required | shared source imagery and near-duplicate prompts | validate coordinate conventions, source provenance, official splits |
| RSVQA | Optical remote-sensing imagery | question/answer pairs | scene-level semantic/spatial VQA | normalize question types and imagery references | Verification required | geographic/scene overlap and generated-question templates | official split adherence, answer and metadata audit |
| CDVQA | Bi-temporal imagery | change-focused question/answer pairs | temporal reasoning evaluation/adaptation | pair, date, change-type, and answer normalization | Verification required | temporal/geographic pair leakage | pair identity, alignment, label and split audit |
| LoveDA | Optical RGB | dense land-cover segmentation masks | optical semantic segmentation | ontology mapping, tiling, ignore-mask handling | Verification required | city/domain and overlapping-tile leakage | official split review, boundary/label audit, class balance |
| Sen1Floods11 | Sentinel-1/2 flood data | flood labels and multimodal assets according to verified release | SAR/multispectral flood segmentation and fusion evidence | verified band/polarisation mapping, calibration/preprocessing record | Verification required | event/geography leakage | event-based splits, cloud/validity masks, label/date checks |
| ChangeFormer-associated datasets | Bi-temporal optical pairs | binary change masks; dataset-specific classes | optional change-model benchmark after semantic baseline | official pairing/tiling and binary-mask mapping | Per-dataset verification required | scene adjacency, temporal and geographic leakage | official conventions, registration, label/licence audit |

BigEarthNet labels must **not** be treated as dense segmentation masks. Any generated pseudo-mask is weak supervision and must be stored separately with teacher, confidence, physics checks, and review status.

## Intake requirements

External datasets can be used only after checking applicable ISRO/SAC/SIH or other problem-statement rules, the dataset and source-imagery licences, redistribution and derivative restrictions, benchmark usage restrictions, personal/sensitive metadata, and geographic/temporal leakage. Record the exact dataset version and immutable source checksum.

Split scenes geographically—and temporally for events—before extracting overlapping patches. Use “scenes” and “patches,” not database “rows,” for imagery volume.

## Label priority and pseudo-labeling

1. official manually verified masks;
2. trusted public segmentation datasets;
3. expert-reviewed project annotations;
4. human-reviewed pseudo-labels;
5. unreviewed pseudo-labels for limited weak supervision only.

A candidate pseudo-label pipeline is teacher prediction → applicable physics consistency check → confidence filter → boundary refinement → human review → provenance record. Water can be checked with NDWI/MNDWI or SAR evidence only when inputs support them; vegetation with NDVI plus seasonal/shadow review; built-up with NDBI where SWIR/NIR exist plus bare-soil review. Validate a representative pilot before scaling.

## Sample-count decisions to be completed after dataset audit

No exact sample count is asserted. A provisional pilot may use 500–1,000 carefully sampled patches, followed by several thousand verified patches per modality only if licences, balance, geographic/sensor/resolution diversity, annotation quality, learning curves, storage, and compute justify expansion. These are planning ranges, not requirements or statements about dataset availability.

The machine-readable registry belongs to a future phase and should contain source, licence, modality, sensor, bands/polarisations, resolution, geography, dates, annotation type/classes, actual scene/patch counts, storage size, split, checksums, and allowed project use.

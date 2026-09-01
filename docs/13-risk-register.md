# Risk Register

Status: initial design register. Owners are intentionally unassigned until project roles exist.

| Risk | Cause | Impact | Detection | Mitigation | Residual limitation | Owner |
|---|---|---|---|---|---|---|
| Incorrect band identity | channel-count or display-order assumption; missing metadata | invalid indices/model routing | provenance/schema checks; band-contract tests | require verified/user-supplied mapping under policy; block incompatible tools | some files remain unusable quantitatively | TBD |
| JPEG treated as calibrated data | appearance mistaken for reflectance/georeferencing | fabricated indices or hectares | answer/plan validator; negative tests | mark sensor/bands/CRS/GSD/calibration unavailable; pixel/qualitative output only | user-supplied scale can still be wrong | TBD |
| Cloud contamination | cloud/shadow/haze not masked | false land-cover/flood result | optical quality masks and stratified evaluation | mask/down-weight; alternative date or SAR fallback | thin cloud and shadow ambiguity | TBD |
| SAR speckle | coherent imaging noise or mismatched preprocessing | unstable boundaries/statistics | speckle/noise metrics; sensitivity tests | training-consistent controlled filtering and confidence reduction | detail may be lost; geometry effects remain | TBD |
| Misregistration mistaken for change | spatial shift/resampling mismatch | false gain/loss | alignment estimate; synthetic-shift tests | validate first; tolerance/edge handling; block excessive error | subpixel residual errors remain | TBD |
| Resolution mismatch | incompatible pixel support and resampling | biased comparison/area | grid/resolution compatibility report | scientifically justified common grid and uncertainty | fine features cannot be recovered | TBD |
| Dataset leakage | overlapping scenes/patches, geography, dates, source images | inflated metrics | manifest overlap and geospatial checks | split scenes/geography/time before tiling; immutable IDs | unknown upstream duplicates | TBD |
| Weak-label noise | unchecked teacher/pseudo masks | biased segmenters | sampled expert review; disagreement/error audits | confidence/physics filtering; provenance separation; limited weighting | physics checks have confounders | TBD |
| Domain shift | new geography, season, sensor, processing level | degraded accuracy/calibration | stratified OOD tests and monitoring | diverse training, OOD flags, recalibration, abstention | unseen conditions cannot be eliminated | TBD |
| VLM hallucination | fluent generation exceeds evidence | false metadata/measurements | claim-to-evidence validator; human audit | structured evidence, one retry, deterministic restricted answer | qualitative wording can still mislead | TBD |
| LoRA interference | adapter conflict or wrong routing | degraded grounding/reasoning | base/combined/wrong-route ablations | capability adapters, explicit versions, dominant-adapter policy, fallback | some queries span capabilities | TBD |
| GPU memory pressure | multiple models/adapters and large tiles | OOM or job failure | serving metrics/load tests | bounded adapters, batching/tiling, queues, placement, fallback | latency/capacity trade-off | TBD |
| Slow multi-model inference | unnecessary tools, preprocessing, queueing | poor user experience/timeouts | per-node traces and load tests | selective plans, cache safe intermediates, async jobs, time budgets | rigorous workflows remain expensive | TBD |
| Unsupported area calculation | no trusted scale or unsuitable CRS | invalid physical area | measurement precondition and unit validation | return pixels/coverage or request verified metadata | no physical-area answer for unscaled image | TBD |
| Overconfidence | uncalibrated models or hidden quality issues | unsafe decisions | reliability diagrams, abstention/OOD tests | calibrate per model/task; preserve quality and disagreement | confidence is not correctness guarantee | TBD |
| Licensing restrictions | incompatible data/model/software terms | inability to train, redistribute, or deploy | licence registry and release review | use only approved versions; isolate non-redistributable assets; replace if needed | availability and terms can change | TBD |

## Review cadence

Review this register at every phase gate and after dataset/model selection, architecture change, scientific failure, security incident, or deployment change. A risk cannot be closed solely because a component passes a happy-path demo; its residual limitation and monitoring must remain explicit.

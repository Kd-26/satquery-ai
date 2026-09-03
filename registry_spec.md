# SatQuery AI — Registry Specification

## 1. What the registry is and why it exists

The registry is the **single source of truth for "what the system is allowed to do."** Every model, adapter, and scientific tool the agent can call is declared here, with an explicit contract describing what input it needs and what it's trained/permitted to output.

This exists because of one architectural law from `architecture.md`:

> The agent chooses task, models, tools, and adapter. The **backend enforces** compatibility, prerequisites, and validity.

Without a registry, "enforcement" would just be scattered `if` statements guessing what each model needs — exactly the kind of silent-assumption bug the whole project is designed to avoid (e.g. "4 channels means RGB+NIR," "SAR with a colourful preview must be optical"). With a registry, enforcement becomes a **generic, reusable check**: *does this image's verified InputProfile satisfy this model's declared input_contract?* If not, the model is simply not selectable for this input, full stop — no guessing, no fallback logic buried in code.

It also solves three concrete problems from the PS and your own field guide:

1. **"HV is not a drop-in replacement for VH"** — the registry makes exact band/polarization order and representation (dB vs linear) an explicit, checkable field instead of an assumption baked into model code.
2. **Auditability** — the PS requires an "auditable execution summary containing the selected task, model/tool names, and key parameters." The registry is what makes that summary meaningful: the trace can say "SEG_SAR_VV_VH_v1, version 1.0.0" instead of just "a SAR model."
3. **Swappability** — when you retrain a better segmenter or add a ChangeFormer upgrade, you add a new YAML file and bump a version. No code touches the planner, validator, or executor.

---

## 2. Registry Entry Schema

Every registry file — model, adapter, or tool — validates against one Pydantic schema (`backend/schemas/registry_entry.py`, built in Phase 1.1 of `phases.md`):

```python
class RegistryEntry(BaseModel):
    id: str                         # unique, e.g. "SEG_RGB_v1"
    type: Literal["segmentation", "detection", "change", "fusion",
                   "lora_adapter", "scientific_tool"]
    modality: Literal["optical_rgb", "optical_multispectral", "sar",
                       "cross_modal", "temporal", "n/a"]
    input_contract: dict             # shape depends on `type`, see §3
    classes: list[str] | None        # None for adapters/tools
    resolution_range_m: list[float] | None
    endpoint: str | None              # HTTP endpoint, None for tools (in-process functions)
    adapter_compatible: bool = False
    calibrated_confidence: bool = False
    version: str                      # semver
    trained_on: list[str] | None      # dataset names, for provenance
    eval_summary: dict | None         # accuracy numbers from the eval harness
    known_domain_shift_sensors: list[str] | None   # sensors NOT in trained_on that
                                                     # the model may still be asked to run
                                                     # on at inference (e.g. ["Cartosat-2S", "RISAT"])
    notes: str | None
```

> **`resolution_range_m` is not descriptive metadata — it is enforced.** As of this revision, `validate_plan()` checks every candidate model's `resolution_range_m` against the actual `InputProfile.pixel_spacing_m` before approving a plan. See §7 for the exact enforcement policy. This closes a real gap: a model trained on 10–30m Sentinel-2 data being silently run on sub-metre Cartosat-2S imagery would previously produce a confidently wrong mask with no warning anywhere in the system.

`model_config = ConfigDict(extra="forbid")` — an unknown field in a YAML file should fail loudly at load time, not silently get ignored.

---

## 3. Directory Layout

```
backend/registry/
├── models/
│   ├── seg_rgb_v1.yaml
│   ├── seg_rgbnir_v1.yaml
│   ├── seg_sar_vv_vh_v1.yaml
│   ├── grounding_v1.yaml
│   ├── change_baseline_v1.yaml
│   └── fusion_v1.yaml
├── adapters/
│   ├── lora_general_v1.yaml
│   ├── lora_temporal_v1.yaml
│   └── lora_crossmodal_v1.yaml
├── tools/
│   ├── compute_spectral_index.yaml
│   ├── sar_statistics.yaml
│   ├── measure_regions.yaml
│   └── fuse_evidence.yaml
└── registry_loader.py
```

Models/adapters have real HTTP endpoints (they're served processes). Tools are pure Python functions in `scientific_tools/` — their registry entries exist purely for the planner/validator to know they exist and what they require, not for dispatch (the executor calls them directly by import, not over HTTP).

---

## 4. Full YAML Contracts

### 4.1 Segmentation model — RGB

```yaml
# backend/registry/models/seg_rgb_v1.yaml
id: SEG_RGB_v1
type: segmentation
modality: optical_rgb
input_contract:
  bands: [R, G, B]
  dtype: uint8
  scale: [0, 255]
  normalization: imagenet_mean_std
  min_resolution_px: [256, 256]
classes: [water, vegetation, built_up, bare_soil, cropland]
resolution_range_m: [0.3, 30]
endpoint: "http://seg-rgb-service:8001/infer"
adapter_compatible: false
calibrated_confidence: true
version: "1.0.0"
trained_on: ["BigEarthNet.txt", "BigEarthNet_v2_maps"]
eval_summary:
  miou: null   # filled in by training/eval/report_card.py after training
known_domain_shift_sensors: ["Cartosat-2S"]
notes: >
  Trained on Sentinel-2 true-colour composites. Expect a domain-shift
  gap on Cartosat-2S imagery (different sensor, resolution, radiometry) —
  validate before trusting on the hidden ISRO/SAC eval set. The validator
  will automatically attach a restriction whenever this model is selected
  for an image whose resolved sensor_family is in known_domain_shift_sensors,
  regardless of whether the resolution check alone would have passed.
```

### 4.2 Segmentation model — RGB+NIR (multispectral)

```yaml
# backend/registry/models/seg_rgbnir_v1.yaml
id: SEG_RGBNIR_v1
type: segmentation
modality: optical_multispectral
input_contract:
  bands: [R, G, B, NIR]
  dtype: uint16
  scale: [0, 10000]          # Sentinel-2 reflectance scaling convention
  normalization: per_band_minmax
  min_resolution_px: [256, 256]
classes: [water, vegetation, built_up, bare_soil, cropland]
resolution_range_m: [10, 30]
endpoint: "http://seg-rgbnir-service:8003/infer"
adapter_compatible: false
calibrated_confidence: true
version: "1.0.0"
trained_on: ["BigEarthNet.txt", "BigEarthNet_v2_maps"]
eval_summary:
  miou: null
notes: >
  Requires all four bands present and correctly ordered per input_contract.bands.
  Do not substitute a 4-channel RGBA image — RGBA is not RGB+NIR.
```

### 4.3 Segmentation model — SAR

```yaml
# backend/registry/models/seg_sar_vv_vh_v1.yaml
id: SEG_SAR_VV_VH_v1
type: segmentation
modality: sar
input_contract:
  polarization_order: [VV, VH]
  representation: dB          # fixed at train time; do not feed linear power
  calibration_required: true
  min_resolution_px: [256, 256]
classes: [water, built_up]     # deliberately a SUBSET of the optical classes
resolution_range_m: [5, 20]
endpoint: "http://seg-sar-service:8002/infer"
adapter_compatible: false
calibrated_confidence: true
version: "1.0.0"
trained_on: ["Sentinel-1 labeled subset"]
eval_summary:
  miou: null
known_domain_shift_sensors: ["RISAT"]
notes: >
  HV is NOT a valid substitute for VH. If a required polarization is
  missing from the InputProfile, this model must not be selected —
  the validator should reject the plan or the planner should fall back
  to a class the model doesn't need (see fallback field in ExecutionPlan).
  `representation: dB` is a type-level fact, not inferred at runtime from
  pixel value ranges — see §8, "SAR Representation Typing".
```

### 4.4 Grounding / detection model

```yaml
# backend/registry/models/grounding_v1.yaml
id: GROUNDING_v1
type: detection
modality: optical_rgb
input_contract:
  bands: [R, G, B]
  dtype: uint8
  requires_text_query: true
classes: null   # open-vocabulary, driven by the referring text
resolution_range_m: [0.3, 5]
endpoint: "http://grounding-service:8004/infer"
adapter_compatible: false
calibrated_confidence: false
version: "0.1.0"
trained_on: ["VRSBench referring-expression split"]
eval_summary:
  iou_at_50: null
notes: >
  v0.1.0 is a stub (see phases.md Chunk 6.1) — real weights pending.
  Response contract is fixed regardless so downstream code doesn't change
  when the real model is swapped in.
```

### 4.5 Change model (baseline, upgradeable)

```yaml
# backend/registry/models/change_baseline_v1.yaml
id: CHANGE_BASELINE_v1
type: change
modality: temporal
input_contract:
  requires_pair: true
  same_modality_required: false   # both dates must be internally consistent,
                                    # but T1/T2 sensor need not match this field
  underlying_segmenters: [SEG_RGB_v1, SEG_RGBNIR_v1, SEG_SAR_VV_VH_v1]
classes: [water, vegetation, built_up, bare_soil, cropland]
resolution_range_m: [5, 30]
endpoint: "http://change-service:8005/infer"
adapter_compatible: false
calibrated_confidence: false
version: "1.0.0"
trained_on: null   # baseline is diff-of-segmentations, not independently trained
eval_summary:
  change_accuracy: null
notes: >
  Baseline implementation is segment(T1) vs segment(T2) then compare_dates().
  Flip USE_TRAINED_CHANGE_MODEL to swap in a ChangeFormer checkpoint under
  the same id/endpoint once trained — bump version to 2.0.0 when you do.
```

### 4.6 Fusion engine

```yaml
# backend/registry/models/fusion_v1.yaml
id: FUSION_v1
type: fusion
modality: cross_modal
input_contract:
  requires_pair: true
  same_class_required: true       # can only fuse a class both modalities support
  requires_reliability_scores: true
classes: [water, built_up]        # bounded by SEG_SAR_VV_VH_v1's supported classes
resolution_range_m: null
endpoint: null                     # in-process function, not a served model
adapter_compatible: false
calibrated_confidence: false
version: "1.0.0"
trained_on: null
eval_summary:
  fusion_benefit_delta: null
notes: >
  Implements evidence-level fusion (weighted probability combination),
  not feature-level fusion. See scientific_tools/fuse.py. If both inputs'
  reliability is 0 for a pixel, output is "unknown", never a guess.
```

### 4.7 LoRA adapters

```yaml
# backend/registry/adapters/lora_general_v1.yaml
id: LORA_GENERAL_v1
type: lora_adapter
modality: n/a
input_contract:
  base_model: "Qwen2.5-VL"
  activation_point: language_component
  rank: 16
  alpha: 32
task: "vqa_captioning_grounding"
classes: null
endpoint: null                     # loaded in-process by vlm_service
adapter_compatible: true
calibrated_confidence: false
version: "1.0.0"
trained_on: ["BigEarthNet.txt", "VRSBench", "RSVQA"]
eval_summary:
  vqa_accuracy: null
  captioning_score: null
  grounding_iou: null
notes: "Default adapter for single-image workflows."
```

```yaml
# backend/registry/adapters/lora_temporal_v1.yaml
id: LORA_TEMPORAL_v1
type: lora_adapter
modality: n/a
input_contract:
  base_model: "Qwen2.5-VL"
  activation_point: language_component
  rank: 16
  alpha: 32
  image_order: [T1, T2]            # fixed, documented — order matters
task: "change_understanding"
classes: null
endpoint: null
adapter_compatible: true
calibrated_confidence: false
version: "1.0.0"
trained_on: ["CDVQA"]
eval_summary:
  change_vqa_accuracy: null
notes: "Selected by planner whenever plan.workflow == 'temporal'."
```

```yaml
# backend/registry/adapters/lora_crossmodal_v1.yaml
id: LORA_CROSSMODAL_v1
type: lora_adapter
modality: n/a
input_contract:
  base_model: "Qwen2.5-VL"
  activation_point: language_component
  rank: 16
  alpha: 32
task: "cross_modal_reasoning"
classes: null
endpoint: null
adapter_compatible: true
calibrated_confidence: false
version: "1.0.0"
trained_on: ["BigEarthNet.txt paired samples (some synthetic QA)"]
eval_summary:
  crossmodal_vqa_accuracy: null
  synthetic_fraction: null
notes: "Report synthetic_fraction honestly — don't hide templated-QA reliance."
```

### 4.8 Scientific tools (registered for planner/validator visibility only)

```yaml
# backend/registry/tools/compute_spectral_index.yaml
id: TOOL_SPECTRAL_INDEX
type: scientific_tool
modality: optical_multispectral
input_contract:
  supported_indices:
    NDVI: [NIR, Red]
    NDWI: [Green, NIR]
    MNDWI: [Green, SWIR1]
    NDBI: [SWIR1, NIR]
classes: null
endpoint: null                     # dispatched in-process, not over HTTP
adapter_compatible: false
calibrated_confidence: false
version: "1.0.0"
notes: "Each index requires its exact band pair to be present in the InputProfile."
```

```yaml
# backend/registry/tools/sar_statistics.yaml
id: TOOL_SAR_STATISTICS
type: scientific_tool
modality: sar
input_contract:
  requires_calibrated_backscatter: true
  supported_ops: [mean, median, std, vv_vh_ratio, temporal_diff]
classes: null
endpoint: null
adapter_compatible: false
calibrated_confidence: false
version: "1.0.0"
notes: "vv_vh_ratio requires linear representation, not dB — enforced in code."
```

```yaml
# backend/registry/tools/measure_regions.yaml
id: TOOL_MEASURE_REGIONS
type: scientific_tool
modality: n/a
input_contract:
  requires_valid_mask: true
  requires_geometry: [crs, pixel_spacing_m]
classes: null
endpoint: null
adapter_compatible: false
calibrated_confidence: false
version: "1.0.0"
notes: "Without verified CRS + pixel spacing, disable hectare output; report pixel count with stated denominator instead."
```

```yaml
# backend/registry/tools/fuse_evidence.yaml
id: TOOL_FUSE_EVIDENCE
type: scientific_tool
modality: cross_modal
input_contract:
  requires_reliability_scores: true
  requires_matching_class: true
classes: null
endpoint: null
adapter_compatible: false
calibrated_confidence: false
version: "1.0.0"
notes: "Formula: p_fused = (q_opt*p_opt + q_sar*p_sar) / (q_opt + q_sar); zero denominator → unknown."
```

---

## 5. Registry Loader Interface

```python
# backend/registry/registry_loader.py

def load_all_models() -> list[RegistryEntry]:
    """Load + validate every YAML under registry/models/."""

def load_all_adapters() -> list[RegistryEntry]:
    """Load + validate every YAML under registry/adapters/."""

def load_all_tools() -> list[RegistryEntry]:
    """Load + validate every YAML under registry/tools/."""

def get_by_id(entry_id: str) -> RegistryEntry:
    """Raise RegistryEntryNotFoundError if not found."""

def query(modality: str | None = None,
          task: str | None = None,
          type: str | None = None) -> list[RegistryEntry]:
    """Filter across models+adapters+tools by any combination of fields."""
```

All entries are validated **at import time** (module-level load), not lazily — a broken YAML file should crash the backend on startup, not fail silently mid-request.

---

## 6. How Each Component Uses the Registry

| Component | Registry usage |
|---|---|
| **Planner** | Calls `query()` to get a text-serializable summary of available models/adapters/tools (id, modality, classes, task) to include in its prompt — the planner can only propose what the registry lists. |
| **Validator** | Calls `get_by_id()` for every model/adapter/tool named in the plan; compares the entry's `input_contract` against the actual `InputProfile` (band presence, polarization order, geometry availability) **and** compares `resolution_range_m` / `known_domain_shift_sensors` against `InputProfile.pixel_spacing_m` / `sensor_family` to decide `approved` vs `restrictions` vs `errors`. See §7. |
| **Preprocessing (`prepare_model_input`)** | Reads `input_contract` (bands, scale, normalization, tiling size) to build the exact tensor the model expects — this is the *only* place preprocessing rules live, never hardcoded per-model in the executor. |
| **Executor** | Resolves `endpoint` from the registry entry to know which microservice to call; for tools (`endpoint: null`), dispatches to the corresponding Python function directly. |
| **Evidence Builder** | Pulls `version` from each registry entry actually used, to populate `evidence_package.model_versions` for the audit trail. |
| **Answerer** | Resolves `plan.final_adapter`'s registry entry to know `activation_point` (vision encoder vs language component) before telling `vlm_service` how to activate it. |
| **Eval Harness** | Writes results back into each entry's `eval_summary` field after training/evaluation runs, so the registry doubles as a living scoreboard. |
| **Evidence Explorer — Experiment Panel** | Calls `query(task=...)` to populate the "swap model" dropdown with every registered model compatible with the current stage — a scientist manually picks from the exact same registry the agent chose from automatically, so the What-If Engine's alternatives are always real, deployable models, never hypothetical ones. See `architecture.md §3.11 D`. |

---

## 7. Resolution & Sensor-Family Compatibility Enforcement

**Why this exists:** documenting `resolution_range_m` in a YAML file is worthless if nothing reads it before a model runs. The hidden ISRO/SAC evaluation set uses Cartosat-2S (optical) and RISAT (SAR) — sensors with different resolution, radiometry, and physics than the Sentinel-1/Sentinel-2 + benchmark data every model here is trained on. This section makes that gap a **runtime-checked fact**, not a footnote in an eval report written after the demo already happened.

**InputProfile gains a `sensor_family` field**, resolved at ingestion time (`resolve_metadata()`) from acquisition metadata/sidecars where available, falling back to `"unknown"` if it can't be verified — never guessed from appearance:

```json
"sensor_family": "cartosat-2s"   // one of: sentinel-1, sentinel-2, cartosat-2s, risat, unknown
```

**Validator enforcement policy** (`validate_plan()`, extends the checks in §6):

| Condition | Outcome |
|---|---|
| `pixel_spacing_m` falls within the model's `resolution_range_m` | Pass, no note |
| `pixel_spacing_m` falls outside `resolution_range_m` by up to a configurable factor (default **5×**) | `approved=True`; add to `restrictions`: `"<model_id> resolution mismatch: trained for Xm, input is Ym — treat outputs as extrapolated"`; cap any downstream `confidence` value for that model's outputs at a configured ceiling (default 0.5) |
| `pixel_spacing_m` falls outside `resolution_range_m` by more than the factor | Hard error — plan is rejected; the planner must be asked to replan or the query answered with an explicit "cannot analyze at this resolution with available models" message |
| `sensor_family` is in the model's `known_domain_shift_sensors` (regardless of whether resolution alone would pass) | Always add a `restrictions` entry naming the specific domain-shift risk, even if the plan is otherwise approved — this is a physics/radiometry warning, not just a resolution warning |
| `sensor_family == "unknown"` | Add to `restrictions`: `"sensor family unverified — domain-shift risk cannot be assessed"`; do not silently assume it matches the training distribution |

This is why `known_domain_shift_sensors` is a separate field from `resolution_range_m` in the schema (§2) — a sensor can be in-range on resolution but still differ meaningfully in radiometry/physics (e.g. RISAT vs Sentinel-1 have different incidence angles and calibration conventions even when pixel spacing overlaps).

## 8. SAR Representation Typing (dB vs Linear)

**Why this exists:** SAR backscatter division only means the same thing whether it's dB or linear values passing through the surface, and a purely runtime heuristic ("does this array contain negative numbers?") is not reliable — positive dB values exist, and a heuristic can pass corrupted or edge-case data silently. This is a physics constraint, and physics constraints belong in the type system, not in a `if` statement guessing from a distribution.

**Enforcement:** every SAR array that enters a scientific tool is wrapped in a typed container the moment it's read, not passed around as a bare `np.ndarray`:

```python
class SARRaster(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)
    array: np.ndarray
    representation: Literal["dB", "linear"]
    polarization: Literal["VV", "VH"]
```

The `representation` field is set **once**, honestly, at the point of creation — either by `raster_io.read_bands()` reading the product's documented processing level, or by `prepare_model_input()` applying the exact conversion a registry entry's `input_contract.representation` declares. Every downstream function (`vv_vh_ratio`, `backscatter_stats`, `temporal_backscatter_diff`) takes `SARRaster` objects, not raw arrays, and checks `.representation` **by field, not by inspecting the numbers**:

```python
def vv_vh_ratio(vv: SARRaster, vh: SARRaster) -> np.ndarray:
    if vv.representation != "linear" or vh.representation != "linear":
        raise ValueError(
            "vv_vh_ratio requires linear representation; got "
            f"vv={vv.representation}, vh={vh.representation}. "
            "dB subtraction is already a log-ratio — do not divide dB values."
        )
    ...
```

This makes a representation mismatch a **type-validation error caught before any math runs**, not a statistical guess that can be fooled by an unusual value distribution. `TOOL_SAR_STATISTICS`'s registry entry (§4.8) should be read as implicitly requiring `SARRaster` inputs wherever it's invoked — the tool's `input_contract.requires_calibrated_backscatter` field already implies this, but the enforcement now lives in the schema, not just the docstring.

## 9. Versioning Policy

- Bump the **patch** version (`1.0.0` → `1.0.1`) for a retrain with the same architecture/classes/contract (e.g. more epochs, better checkpoint).
- Bump the **minor** version (`1.0.0` → `1.1.0`) if you add a class or a new optional input field without breaking existing callers.
- Bump the **major** version (`1.0.0` → `2.0.0`) if the `input_contract` changes in a breaking way (e.g. new required band, different normalization) — the validator's compatibility check depends on this being accurate.
- Never overwrite a YAML file's `id` — create a new file/id if the model is meaningfully different (e.g. `SEG_RGB_v2` alongside `SEG_RGB_v1`) so old execution traces referencing `SEG_RGB_v1` remain interpretable.

---

## 10. Worked Use-Case Walkthrough

**Query:** *"Has the built-up area increased, decreased, or remained unchanged?"* with a Cartosat-2S optical GeoTIFF pair (T1, T2).

1. **Planner** calls `registry.query(task="change_understanding")` and `registry.query(modality="optical_rgb")`, sees `SEG_RGB_v1` and `LORA_TEMPORAL_v1` are available, and proposes an `ExecutionPlan` with `workflow: temporal`, `required_models: [SEG_RGB_v1]`, `target_classes: [built_up]`, `final_adapter: LORA_TEMPORAL_v1`.
2. **Validator** calls `registry.get_by_id("SEG_RGB_v1")`, checks its `input_contract.bands == [R,G,B]` against both InputProfiles — both have R,G,B verified — approved. Checks `resolution_range_m` against the Cartosat-2S `pixel_spacing_m`: Cartosat-2S (~0.6-1m) is well outside `SEG_RGB_v1`'s trained range (0.3-30m technically overlaps at the low end, but `known_domain_shift_sensors` includes `"Cartosat-2S"` regardless) — adds `restrictions: ["SEG_RGB_v1 sensor domain-shift risk: trained on Sentinel-2, running on Cartosat-2S"]` per §7, plan stays approved but flagged. Checks CRS/geometry for area estimation; if Cartosat metadata lacks pixel spacing, adds `restrictions: ["area_estimate disabled: pixel spacing unverified"]` rather than failing the whole plan.
3. **Preprocessing** reads `SEG_RGB_v1`'s `input_contract` (scale `[0,255]`, imagenet normalization) to prepare both T1 and T2 tensors identically.
4. **Executor** resolves `SEG_RGB_v1.endpoint`, calls it twice (T1, T2), then calls `compare_dates()` directly (a tool, `endpoint: null`) restricted to `built_up`.
5. **Evidence Builder** records `model_versions: {"SEG_RGB_v1": "1.0.0"}` and both `restrictions` — the area-estimate limitation and the sensor domain-shift warning — into `evidence.limitations`, and caps the `confidence` field on any `SEG_RGB_v1`-derived claim at the configured domain-shift ceiling.
6. **Answerer** resolves `LORA_TEMPORAL_v1.input_contract.activation_point == language_component`, tells `vlm_service` to activate that adapter before generating, respecting `image_order: [T1, T2]`.
7. **Verifier** cross-checks that the answer doesn't state a hectare figure (since it was restricted) and that it does mention the "increased/decreased/unchanged" direction backed by the `compare_dates()` output.

Every one of those seven steps depended on a registry lookup — that's the entire point of the file.

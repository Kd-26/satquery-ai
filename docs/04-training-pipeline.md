# Training Pipeline

Training is proposed only after contracts, licences, evaluation code, compute estimates, and leakage controls exist. No dataset or checkpoint has been downloaded and no training has started.

## Ordered phases

### 1. Data audit

Inventory dataset source, licence, redistribution/benchmark restrictions, modality, sensor, bands/polarisations, resolution, geography, dates, annotations, classes, and storage. Define scene-level geographic and temporal splits before patch extraction. Record all exclusions and potential overlap with evaluation regions.

### 2. Label strategy

Prefer official manual masks, trusted public segmentation labels, and expert-reviewed project annotations. Treat auto-labels as weak supervision until representative human review. Record teacher, physics consistency checks, thresholds, boundary processing, confidence, and reviewer state; reject uncertain pseudo-labels.

### 3. Specialist segmenters

Train and evaluate the RGB optical, verified RGB+NIR, and verified VV/VH models separately. Start with a tiny overfitting test, then a small baseline, then leakage-safe expansion. Use multi-class masks where suitable and calibrate per-class confidence.

### 4. Temporal baseline

Validate and align T1/T2, run the same compatible semantic segmenter, and calculate class gains, losses, and transitions. Add ChangeFormer only when paired labels exist and the baseline demonstrably misses subtle change. A binary change proposal does not name semantic transitions by itself.

### 5. Vision-encoder adaptation

Evaluate the unmodified, exact Qwen3.5-VL checkpoint first. Verify licence and Transformers/vLLM/PEFT compatibility. Initially freeze the language backbone, train a supported multimodal projector if appropriate, and fine-tune selected late vision-encoder layers at low learning rate. Compare against the frozen baseline and monitor forgetting.

### 6. Multi-LoRA

Train capability-oriented adapters rather than class/tool-specific adapters:

1. grounding/VQA;
2. temporal-change reasoning;
3. optical–SAR reasoning;
4. scientific reporting.

Compare the base model, one combined adapter, separate adapters, wrong-adapter routing, and full fine-tuning where compute permits. Prefer one dominant adapter per answer unless sequential use is explicitly supported and evaluated.

### 7. Tool-use training

Build examples that map query plus verified metadata/quality to allowed workflows. Include valid, ambiguous, unsupported, and adversarial combinations. Validate every target plan with deterministic rules; do not train a planner to bypass capability preconditions.

### 8. Joint evaluation

Evaluate masks, transition/area measurements, workflow/tool selection, grounding, final-answer faithfulness, calibration, and abstention. Run required component ablations from [11-evaluation-plan.md](11-evaluation-plan.md).

## Training gates

Full training cannot start until:

- every dataset use has a recorded licence decision;
- machine-readable manifests and geographic/temporal splits exist;
- compute/storage requirements are estimated from measured pilots;
- preprocessing and evaluation are reproducible;
- a small overfitting experiment succeeds;
- baseline metrics and failure reporting work;
- deterministic evidence contracts match the VLM examples.

## Practical sequence

Audit/licence → manifests → geographic splits → preprocessing → metrics → three segmentation baselines → confidence calibration → mask-based temporal baseline → optional ChangeFormer evaluation → physics/spatial tools → rule-based fusion → base-VLM evaluation → selected vision adaptation → four LoRAs → adapter routing → constrained planner → Ray integration → answer validation → frontend → end-to-end/ablation tests → latency/memory optimization → demonstration packaging.

Actual scene/patch counts, metrics, compute, cost, and time must come from recorded runs, never planning assumptions.

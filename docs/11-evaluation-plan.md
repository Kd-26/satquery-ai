# Evaluation Plan

Evaluation is proposed at five separate levels. Splits must prevent geographic, temporal, event, and source-image leakage. Results must identify dataset/version, actual scene/patch counts, class distribution, preprocessing, model/tool/config versions, uncertainty, and failure cases.

## 1. Segmentation

- mean and per-class intersection over union (IoU);
- macro-F1, per-class precision and recall;
- boundary F1;
- calibration error and reliability diagrams;
- robustness across geography, sensor/resolution, cloud, and SAR acquisition conditions.

## 2. Change analysis

- binary change IoU/F1;
- gain/loss area error;
- semantic transition accuracy;
- false-change rate under controlled misregistration;
- sensitivity to date, resolution, and coverage mismatch.

Report binary and semantic results separately. Evaluate mask-comparison baseline before optional ChangeFormer.

## 3. Scientific measurement

- absolute/relative physical-area error where reference geometry is valid;
- pixel-area/coverage agreement where georeferencing is absent;
- index calculation agreement with hand-calculated/independent reference values;
- spatial intersection, overlap, topology, and distance accuracy;
- registration and resampling sensitivity;
- correct refusal rate when inputs or units are unsupported.

## 4. Agent

- workflow-selection accuracy;
- tool-selection precision/recall;
- invalid-tool and unnecessary-tool-call rates;
- plan-schema validity;
- unsupported-query abstention accuracy;
- deterministic-blocker bypass rate, whose target is zero.

Use a curated matrix of valid, missing, conflicting, ambiguous, and adversarial metadata/query cases.

## 5. Final answer

- remote-sensing VQA accuracy by task;
- grounding/region-reference quality;
- faithfulness to evidence;
- measurement citation and unit accuracy;
- confidence calibration and abstention;
- hallucinated measurement/metadata rate;
- limitation-reporting completeness.

Answers should be checked programmatically and by qualified review for a representative sample. Fluency cannot compensate for failed evidence links.

## Required baselines and ablations

1. direct base VLM;
2. fixed VLM pipeline or fine-tuned VLM only, clearly defined;
3. segmentation only;
4. segmentation plus deterministic physics/spatial tools;
5. full reliability-aware agentic system;
6. full system without Multi-LoRA;
7. full system without reliability weighting;
8. equal-weight vs rule-weighted vs single-modality fusion under quality strata;
9. capability-specific Multi-LoRA vs combined adapter and wrong-adapter routing.

Each comparison must use compatible test data and disclose component differences. The goal is to attribute improvements and harms, not only report the best system.

## Test tiers and release gates

- **Unit:** metadata, bands, formulas, areas, geometry, quality weights, workflow and answer validation.
- **Integration:** single GeoTIFF, qualitative JPEG, temporal pair, optical–SAR pair, low-quality fallback, missing-band rejection.
- **Scientific:** known NDVI, known polygon area, synthetic shifts, cloud down-weighting, SAR fallback, semantic transitions.
- **ML:** shape/order, tile reconstruction, deterministic inference, version recording, adapter routing.
- **End to end:** upload → validation → plan → evidence tools/models → VLM → evidence-linked output.

No metric target is invented here. Thresholds will be set after audited baselines and risk-based stakeholder review. Release requires reproducibility, critical scientific tests, zero known guardrail bypass, documented calibration, security review, and accepted residual limitations.

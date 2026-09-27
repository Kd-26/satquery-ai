# SatQuery AI: Comprehensive Guide (From Scratch to Advanced)

SatQuery AI is an agentic remote-sensing visual-intelligence platform. It is designed to answer natural language questions about satellite imagery (optical, multispectral, and SAR). 

This guide breaks down everything about SatQuery AI—from the core problem it solves to the deep architectural, backend, frontend, and ML details.

---

## 1. Introduction: The Problem and the Solution

### The Problem
Satellite data is incredibly complex. It has spatial constraints, distinct spectral bands (like Near-Infrared or Short-Wave Infrared), temporal changes, and complex sensor physics (like SAR backscatter). 
A generic Vision-Language Model (VLM) might describe what a picture *looks* like, but it cannot accurately measure ground area, confirm band identities, or run scientific spectral indices (like NDVI). If a general VLM answers questions about satellite data, it is prone to hallucinating numbers, coordinates, and physical reality.

### The Solution: Separation of Concerns
SatQuery AI solves this by wrapping a VLM in a strict, deterministic enforcement layer. The core architectural principle is:

> **The VLM plans and explains. The backend enforces scientific validity. Specialist models and tools produce evidence. The controller ties it all together and produces an auditable trace.**

The VLM is never allowed to invent sensor identities, coordinates, or measurements. Every quantitative claim must be traceable to a deterministic physics/math calculation or a specialized model.

---

## 2. Core Architecture and Data Modes

The system operates across several modes based on the input data:
1. **Single-Image VQA:** Analyzing one optical, multispectral, or SAR image.
2. **Bi-Temporal Change:** Comparing two images of the same area over time to detect semantic changes (e.g., gain/loss of water).
3. **Cross-Modal (Optical + SAR):** Fusing data from optical sensors and SAR sensors to provide reliability-aware conclusions.

### Two Data Representations
To maintain scientific integrity, the system strictly separates data representations:
- **Scientific Raster:** The raw, calibrated values, original bands, and NoData masks. Consumed only by deterministic scientific tools.
- **Visual Preview:** A display-ready RGB/false-color composite. Consumed by the VLM vision encoder and the frontend GUI.

---

## 3. The 10-Step Inference Lifecycle (Backend / Agentic Controller)

SatQuery AI does not use a free-roaming LLM agent. It uses a **constrained planner and a deterministic executor** state machine.

1. **Ingest:** Accept image upload, assign an ID, and save to artifact store. Validate the file format.
2. **Profile Input:** Read metadata (CRS, pixel spacing, bands). Create an `InputProfile` that explicitly lists verified fields, missing fields, and capability restrictions.
3. **VLM Planner:** The VLM analyzes the query, metadata, and the Model Registry. It outputs a strict JSON `ExecutionPlan` detailing the workflow, required models, and target classes.
4. **Plan Validator:** Rule-engine check. It ensures requested models match available bands, resolutions are compatible, and fallback policies are in place. If it fails, the system does bounded replanning.
5. **Preprocessing:** Tiles large images, reorders bands, and normalizes data according to the target model's strict input contract.
6. **Executor (DAG):** Dispatches to specialist models (like a Segmentation Model or Change Model) in parallel. Returns masks and scores.
7. **Scientific Tools:** Runs deterministic tools on the masks. Calculates NDVI/NDWI, extracts SAR backscatter stats, and computes geodesic area in hectares/m².
8. **Evidence Package Builder:** Compiles all outputs, measurements, masks, and confidence caps into a rigid `EvidencePackage`.
9. **Answerer (LoRA-activated VLM):** The VLM is called again—this time to explain the `EvidencePackage` in plain text. It generates two versions: a technical answer and a plain-language answer.
10. **Verifier:** Cross-checks every numeric claim in the VLM's final text against the actual evidence package. If the VLM hallucinated a number, it rejects the answer and falls back to a template.

---

## 4. Machine Learning (ML) Strategy

The ML architecture is divided into the overarching VLM and the specialized vision models. No training happens at inference time; all training happens offline on a SLURM cluster.

### Vision-Language Model (VLM)
- **Base Model:** Qwen2.5-VL (7B or smaller quantized variant), chosen for its function-calling capabilities and strong image+text reasoning.
- **Adaptation (PEFT/LoRA):** Fine-tuned on remote sensing datasets (like BigEarthNet, VRSBench, RSVQA).
- **Multiple Roles:** 
  - *General Adapter:* For standard VQA and captioning.
  - *Temporal Adapter:* Fine-tuned on CDVQA for change description.
  - *Cross-Modal Adapter:* For reasoning across paired Optical/SAR inputs.

### Specialist Models
Instead of relying on the VLM to highlight pixels, SatQuery uses dedicated models:
- **Optical/MS Segmenter:** SegFormer (B0/B2) or U-Net trained on BigEarthNet v2.
- **SAR Segmenter:** U-Net adapted with a VV/VH input head.
- **Grounding/Detection:** Grounding-DINO-tiny or YOLO-World fine-tuned on VRSBench.
- **Change Detection:** ChangeFormer (Siamese network) or a baseline difference-of-segmentations.

### Fusion Engine
When combining Optical and SAR data, the system calculates a per-pixel *reliability score* (e.g., optical reliability drops in cloudy pixels; SAR reliability drops in layover/shadow areas). The fusion engine weights model predictions based on this reliability.

---

## 5. Frontend Architecture & Design

The frontend is built with **Next.js, TypeScript, Tailwind CSS, Zustand (state), and TanStack Query (caching)**. It uses a "Mission Control" dark-theme design system to look like a professional scientific instrument, not a generic AI chatbot.

It has two distinct modes that share the exact same backend data:

### 1. Quick Query Mode
Designed for non-experts. The user uploads an image, asks a question, and gets a clear answer. Features a toggle to switch between Plain-Language and Technical answers.

### 2. Evidence Explorer
Designed for GIS scientists and ISRO evaluators. This is a 4-panel deep-dive into *why* the AI answered the way it did:
- **Geospatial Viewer:** A MapLibre GL JS map serving Cloud-Optimized GeoTIFF (COG) tiles via TiTiler. Never loads the full raster client-side. Allows T1/T2 swipe comparisons.
- **Scientific Analysis:** Shows NDVI stats, class transitions, and areas for the specific region the user clicks on.
- **Processing History:** Shows the literal execution trace timeline (which models ran, how long they took, and generated artifacts).
- **Research Experiment ("What-If" Engine):** Scientists can change segmentation thresholds or swap models. The backend intelligently reruns *only* the affected downstream DAG stages, creating a new versioned `experiment_id` without overwriting the original run.

---

## 6. Data, Artifacts & Reproducibility

Every conclusion must be defensible.

- **PostgreSQL & PostGIS:** Stores the execution traces, evidence graphs, and geospatial polygons (`regions`). This allows complex spatial queries like "which claims touch this polygon".
- **Object Storage (MinIO/S3):** Stores raw GeoTIFFs, masks, and generated PNG overlays.
- **STAC (SpatioTemporal Asset Catalog):** Every image and mask is registered as a STAC item, making the system enterprise-grade and interoperable.
- **Reproducible Exports:** Generates PDF audit reports and reproducible Jupyter Notebooks (`nbformat`), which can run the exact deterministic pipeline locally based on a `run_manifest.json`.

---

## 7. Development & Deployment

- **Backend:** FastAPI, Pydantic v2 schemas, Celery/Redis for async jobs.
- **Registry:** YAML manifests define the strict "input contracts" (expected bands, resolutions) for every model and tool.
- **Evaluation Harness:** Automatically scores the system on VQA Accuracy (RSVQA), Grounding IoU, Segmentation mIoU, and Expected Calibration Error (ECE) before any deployment.
- **Deployment:** Dockerized for local dev, SLURM for training, and GPU instances for the final ISRO SIH demo. It includes cached demo fallbacks in case of live network failures.

---

## Summary
SatQuery AI treats the LLM/VLM not as a magic box that knows everything, but as a smart orchestrator and translator. By forcing the VLM to use a deterministic backend, specialist segmenters, and strict physics calculations, SatQuery ensures that every hectare of water measured and every cloud obscured is scientifically valid, traceable, and fully transparent to the user.

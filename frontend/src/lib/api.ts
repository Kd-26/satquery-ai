/**
 * SatQuery AI — Typed API Client
 * All backend calls go through this module.
 * In development, Next.js rewrites /api/v1/* → http://localhost:8000/api/v1/*
 * (see next.config.mjs). Set NEXT_PUBLIC_API_BASE_URL to override for production.
 */

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

// ─── Generic fetch helper ────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`API ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UploadImageResponse {
  status: string;
  image_id: string;
  has_preview: boolean;
}

export interface PairResponse {
  status: string;
  pair_id: string;
}

export interface QueryRequest {
  query: string;
  image_ids: string[];
}

export interface QueryResponse {
  status: string;
  run_id: string;
}

export interface Claim {
  claim: string;
  measurement: number;
  region_id: string;
  confidence: number;
  tool?: string;            // e.g. "geometry.pixel_fraction" | "geometry.measure_regions"
  source_images?: string[];
}

export interface TraceStep {
  // Fields sent by backend controller
  step?: string;
  model_id?: string;
  duration_s?: number;
  status?: string;
  note?: string;
  // Legacy/frontend fields kept for compatibility
  step_name?: string;
  model_or_tool?: string;
  parameters?: Record<string, unknown>;
  execution_time_ms?: number;
}

export interface AnswerObj {
  plain_language: string;
  technical: string;
}

export type RunStatusValue = "pending" | "running" | "done" | "failed" | "cancelled";

export interface RunResult {
  run_id: string;
  status: RunStatusValue;
  progress: number;
  stage?: string;
  error?: string;
  answer?: string;
  answer_obj?: AnswerObj;
  claims?: Claim[];
  limitations?: string[];
  traces?: TraceStep[];
  image_ids?: string[];
}

export interface RunEventPayload {
  run_id: string;
  status: RunStatusValue;
  stage: string;
  progress: number;
  error?: string | null;
  updated_at: number;
}

export interface TileInfo {
  image_id: string;
  tile_url_template: string;
  bounds: [number, number, number, number]; // [west, south, east, north] in EPSG:4326
  titiler_available: boolean;
}

export interface GraphNode {
  id: string;
  type: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: { source: string; target: string }[];
}

export interface ExperimentResponse {
  experiment_id: string;
  status: string;
}

export interface ExperimentResult {
  experiment_id: string;
  parent_run_id: string;
  status: string;
  overrides: Record<string, unknown>;
}

export interface FeedbackResponse {
  status: string;
  tag_id: string;
}

export interface RegionMetrics {
  area_hectares: number;
  confidence: number;
  cloud_coverage_pct: number;
  fusion_weight: number;
  ndvi_mean: number;
  vh_backscatter: number;
}

// ─── Ingestion ───────────────────────────────────────────────────────────────

/**
 * Upload a satellite image file.
 * Returns image_id to be used in subsequent query calls.
 * Supports progress tracking via onProgress callback.
 */
export async function uploadImage(
  file: File,
  onProgress?: (pct: number) => void
): Promise<UploadImageResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}/api/v1/images`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText) as UploadImageResponse);
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(formData);
  });
}

/**
 * Returns the URL of the display-ready RGB preview PNG for an uploaded image.
 * The preview is generated server-side automatically on upload.
 *
 * Usage:
 *   <img src={getImagePreviewUrl(imageId)} alt="satellite preview" />
 *
 * Returns undefined when imageId is falsy (nothing uploaded yet).
 */
export function getImagePreviewUrl(imageId: string | undefined): string | undefined {
  if (!imageId) return undefined;
  return `${BASE}/api/v1/images/${imageId}/preview`;
}

/**
 * Link two images as a bi-temporal pair.
 */
export async function linkImagePair(
  imageId1: string,
  imageId2: string,
  relation: string = "temporal"
): Promise<PairResponse> {
  return apiFetch<PairResponse>("/api/v1/pairs", {
    method: "POST",
    body: JSON.stringify({ image_id_1: imageId1, image_id_2: imageId2, relation }),
  });
}

// ─── Query & Runs ────────────────────────────────────────────────────────────

/**
 * Submit a natural-language query against a set of uploaded images.
 * Returns run_id to poll for results.
 */
export async function submitQuery(req: QueryRequest): Promise<QueryResponse> {
  return apiFetch<QueryResponse>("/api/v1/query", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

/**
 * Poll the status + results of a run.
 */
export async function getRun(runId: string): Promise<RunResult> {
  return apiFetch<RunResult>(`/api/v1/runs/${runId}`);
}

/**
 * Poll run until status is 'done' or 'failed'.
 * intervalMs — how often to poll (default 2s).
 * timeoutMs  — maximum total wait time (default 5 min).
 */
export async function pollRun(
  runId: string,
  onUpdate?: (result: RunResult) => void,
  intervalMs = 2000,
  timeoutMs = 300_000
): Promise<RunResult> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await getRun(runId);
    onUpdate?.(result);
    if (result.status === "done" || result.status === "failed" || result.status === "cancelled") {
      return result;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error("Run polling timed out");
}

/**
 * Requests cancellation of a running (or pending) run. Cancellation is
 * cooperative on the backend — it's checked between pipeline stages, so it
 * may take a moment to take effect.
 */
export async function cancelRun(runId: string): Promise<{ status: string; run_id: string }> {
  return apiFetch(`/api/v1/runs/${runId}/cancel`, { method: "POST" });
}

/**
 * Subscribes to live stage-transition events for a run via Server-Sent
 * Events. Returns an unsubscribe function. Automatically stops once the
 * backend closes the stream (run reached a terminal state).
 */
export function subscribeRunEvents(
  runId: string,
  onEvent: (payload: RunEventPayload) => void,
  onError?: (err: Event) => void
): () => void {
  const es = new EventSource(`${BASE}/api/v1/runs/${runId}/events`);
  es.onmessage = (e) => {
    try {
      onEvent(JSON.parse(e.data) as RunEventPayload);
    } catch {
      // Ignore malformed frames rather than crashing the subscriber.
    }
  };
  es.onerror = (err) => {
    onError?.(err);
  };
  return () => es.close();
}

/**
 * Fetch the evidence graph for a completed run.
 */
export async function getRunGraph(runId: string): Promise<GraphData> {
  return apiFetch<GraphData>(`/api/v1/runs/${runId}/graph`);
}

// ─── Tiles (MapLibre GL / TiTiler) ──────────────────────────────────────────

/**
 * Resolve an image_id to a TiTiler tile URL template + geographic bounds,
 * so MapLibre GL can add it as a raster source. The backend resolves the
 * filesystem path server-side — the frontend never sees or guesses it.
 * Throws (via apiFetch) if the raster is missing or has no verified CRS.
 */
export async function getImageTileInfo(imageId: string): Promise<TileInfo> {
  const info = await apiFetch<TileInfo>(`/api/v1/tiles/resolve/${imageId}`);
  return {
    ...info,
    // Tile paths returned by the backend are relative to the API root.
    tile_url_template: `${BASE}${info.tile_url_template}`,
  };
}

// ─── Exports ─────────────────────────────────────────────────────────────────

export type ExportFormat = "geotiff" | "geojson" | "csv" | "stac" | "audit-report" | "notebook";

/**
 * Trigger a run export. Returns the raw Response so caller can stream/download.
 * For JSON formats call .json(); for binary formats call .blob().
 */
export async function exportRun(
  runId: string,
  format: ExportFormat
): Promise<Response> {
  const res = await fetch(`${BASE}/api/v1/runs/${runId}/export/${format}`);
  if (!res.ok) throw new Error(`Export failed: ${res.status}`);
  return res;
}

/**
 * Helper: trigger a browser file download for a run export.
 */
export async function downloadRunExport(
  runId: string,
  format: ExportFormat
): Promise<void> {
  const res = await exportRun(runId, format);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const ext: Record<ExportFormat, string> = {
    geotiff: "zip",
    geojson: "geojson",
    csv: "csv",
    stac: "json",
    "audit-report": "pdf",
    notebook: "ipynb",
  };
  a.download = `${runId}.${ext[format]}`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Experiments ─────────────────────────────────────────────────────────────

/**
 * Create an experiment from a parent run with parameter overrides.
 */
export async function createExperiment(
  runId: string,
  parameterOverrides: Record<string, unknown>
): Promise<ExperimentResponse> {
  return apiFetch<ExperimentResponse>(`/api/v1/runs/${runId}/experiments`, {
    method: "POST",
    body: JSON.stringify(parameterOverrides),
  });
}

/**
 * Fetch the current status and results of an experiment.
 */
export async function getExperiment(experimentId: string): Promise<ExperimentResult> {
  return apiFetch<ExperimentResult>(`/api/v1/experiments/${experimentId}`);
}

/**
 * Save a manual mask correction to an experiment.
 */
export async function saveCorrection(
  experimentId: string,
  evidenceNodeId: string,
  geometryGeojson: Record<string, unknown>,
  operation: "include" | "exclude"
): Promise<{ status: string; message: string }> {
  return apiFetch(`/api/v1/experiments/${experimentId}/corrections`, {
    method: "POST",
    body: JSON.stringify({ evidence_node_id: evidenceNodeId, geometry_geojson: geometryGeojson, operation }),
  });
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export type FeedbackTag = "accepted" | "rejected" | "needs_review";

/**
 * Submit a feedback tag on an evidence node.
 */
export async function submitFeedback(
  nodeId: string,
  tag: FeedbackTag,
  note?: string
): Promise<FeedbackResponse> {
  return apiFetch<FeedbackResponse>(`/api/v1/evidence-nodes/${nodeId}/feedback`, {
    method: "POST",
    body: JSON.stringify({ tag, note }),
  });
}

// ─── Regions ─────────────────────────────────────────────────────────────────

/**
 * Fetch computed metrics for a region.
 */
export async function getRegionMetrics(regionId: string): Promise<RegionMetrics> {
  return apiFetch<RegionMetrics>(`/api/v1/regions/${regionId}/metrics`);
}

// ─── Health ──────────────────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string; app: string }> {
  return apiFetch("/health");
}

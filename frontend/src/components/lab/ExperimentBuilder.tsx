"use client";

import { useEffect, useState } from "react";
import {
  Map as MapIcon,
  Database,
  Box,
  SlidersHorizontal,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { getImageMetadata, type RasterMetadata } from "@/lib/api";
import { useImageStore } from "@/lib/imageStore";

interface ExperimentBuilderProps {
  onRunExperiment?: (overrides: Record<string, unknown>) => void;
  /** Image IDs currently in the lab input (from the lab page). */
  imageIds?: string[];
  /** Pipeline/route info from the most recently completed run. */
  route?: { mode: string; required_tools: string[]; requires_segmentation: boolean } | null;
}

function formatBounds(bounds: [number, number, number, number]): string {
  return bounds.map((v) => v.toFixed(4)).join(", ");
}

export default function ExperimentBuilder({ onRunExperiment, imageIds = [], route }: ExperimentBuilderProps) {
  const lastImageIds = useImageStore((s) => s.lastImageIds);
  const effectiveIds = imageIds.length > 0 ? imageIds : lastImageIds;

  const [metas, setMetas] = useState<RasterMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveIds.length === 0) {
      setMetas([]);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all(effectiveIds.map((id) => getImageMetadata(id)))
      .then(setMetas)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [effectiveIds.join(",")]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Derive display values from real metadata
  const bounds = metas[0]?.bounds;
  const crs = metas[0]?.crs;
  const bandIds = metas.flatMap((m) => m.band_identities).filter(Boolean);
  const dims = metas[0]?.dimensions;

  // Pipeline label: prefer route info, else derive from bands
  let pipelineLabel = "Awaiting run";
  if (route) {
    const tools = route.required_tools.length > 0 ? route.required_tools.join(" → ") : route.mode;
    pipelineLabel = route.requires_segmentation ? `${tools} + Segmentation` : tools;
  } else if (bandIds.includes("NIR") || bandIds.includes("nir")) {
    pipelineLabel = "Spectral Index pipeline";
  } else if (bandIds.some((b) => b.toLowerCase().includes("vv") || b.toLowerCase().includes("vh"))) {
    pipelineLabel = "SAR backscatter pipeline";
  } else if (effectiveIds.length > 1) {
    pipelineLabel = "Temporal change pipeline";
  } else if (effectiveIds.length === 1) {
    pipelineLabel = "Single-image analysis";
  }

  return (
    <div className="bg-surface border border-stroke rounded-3xl p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <SlidersHorizontal className="w-5 h-5 text-sky-400" />
        <h3 className="text-lg font-medium text-text-primary">Experiment Setup</h3>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted ml-auto" />}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-xs mb-4">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="space-y-4 flex-1">
        {/* Area of Interest — real bounds */}
        <div className="group border border-stroke rounded-2xl p-4 hover:border-sky-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
              <span className="text-sm font-medium text-text-primary">Area of Interest</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${bounds ? "text-sky-400 bg-sky-500/10" : "text-muted bg-stroke/20"}`}>
              {bounds ? "Georeferenced" : "No CRS"}
            </span>
          </div>
          {bounds ? (
            <>
              <p className="text-xs text-muted font-mono">W:{bounds[0].toFixed(4)} S:{bounds[1].toFixed(4)}</p>
              <p className="text-xs text-muted font-mono">E:{bounds[2].toFixed(4)} N:{bounds[3].toFixed(4)}</p>
              {crs && <p className="text-[10px] text-muted/60 mt-1">{crs}</p>}
            </>
          ) : (
            <p className="text-xs text-muted">
              {effectiveIds.length === 0 ? "No images loaded yet" : "Image has no geospatial reference"}
            </p>
          )}
        </div>

        {/* Inputs — real filenames + band count */}
        <div className="group border border-stroke rounded-2xl p-4 hover:border-sky-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
              <span className="text-sm font-medium text-text-primary">Input Data</span>
            </div>
            <span className="text-xs text-muted">{effectiveIds.length} file{effectiveIds.length !== 1 ? "s" : ""}</span>
          </div>
          {effectiveIds.length > 0 ? (
            <div className="space-y-1">
              {metas.map((m, i) => (
                <div key={effectiveIds[i]} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-sky-400/80 truncate max-w-[160px]" title={effectiveIds[i]}>
                    {effectiveIds[i].slice(0, 10)}…
                  </span>
                  <span className="text-[10px] text-muted shrink-0">
                    {m.channel_count}ch · {m.dimensions[0]}×{m.dimensions[1]}px
                  </span>
                </div>
              ))}
              {loading && effectiveIds.length > metas.length && (
                <p className="text-[10px] text-muted animate-pulse">Loading metadata…</p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted">Add image IDs in the Analysis inputs field above</p>
          )}
          {bandIds.length > 0 && (
            <p className="text-[10px] text-muted mt-2 font-mono truncate" title={bandIds.join(", ")}>
              Bands: {bandIds.slice(0, 6).join(", ")}{bandIds.length > 6 ? "…" : ""}
            </p>
          )}
        </div>

        {/* Pipeline — real route from run or derived from bands */}
        <div className="group border border-stroke rounded-2xl p-4 hover:border-sky-500/30 transition-colors">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
              <span className="text-sm font-medium text-text-primary">Pipeline</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </div>
          <p className="text-xs text-muted capitalize">{pipelineLabel}</p>
          {route?.required_tools && route.required_tools.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {route.required_tools.map((tool) => (
                <span key={tool} className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400/80 font-mono">
                  {tool}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <button
        onClick={() =>
          onRunExperiment?.({
            source: "experiment_builder",
            pipeline: pipelineLabel,
            image_ids: effectiveIds,
            bounds: bounds ?? null,
            crs: crs ?? null,
            band_identities: bandIds,
          })
        }
        disabled={effectiveIds.length === 0}
        className="w-full relative rounded-full text-sm mt-6 group disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span className="absolute rounded-full accent-gradient opacity-80 group-hover:opacity-100 transition-opacity duration-300 disabled:opacity-30" style={{ inset: "-1px" }} />
        <span className="relative z-10 block w-full px-6 py-3 rounded-full bg-bg text-text-primary font-medium text-center">
          Initialize Run
        </span>
      </button>
    </div>
  );
}

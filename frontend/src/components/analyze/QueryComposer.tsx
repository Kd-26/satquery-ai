"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Lightbulb, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { submitQuery, linkImagePair } from "@/lib/api";
import { useJobsStore } from "@/lib/jobsStore";
import type { UploadedFile } from "@/components/analyze/DropZone";

interface QueryComposerProps {
  onComplete: (runId: string) => void;
  mode: "simple" | "scientific";
  files?: UploadedFile[]; // uploaded files with imageIds from DropZone
}

const EXAMPLE_QUERIES = [
  "How much has the coastline eroded between 2022 and 2024?",
  "Detect and count ships visible in the harbor.",
  "Calculate the NDVI change in the southern agricultural zone.",
  "Identify flooded areas using SAR backscatter thresholds.",
];

export default function QueryComposer({ onComplete, mode, files = [] }: QueryComposerProps) {
  const [query, setQuery] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRun = async () => {
    if (!query.trim()) return;
    setAnalyzing(true);
    setError(null);

    try {
      // Collect image IDs from successfully uploaded files
      const imageIds = files
        .filter((f) => f.status === "done" && f.imageId)
        .map((f) => f.imageId as string);

      // If two images uploaded, link them as a bi-temporal pair
      if (imageIds.length === 2) {
        await linkImagePair(imageIds[0], imageIds[1]).catch(() => {
          // Non-blocking — pair linking is best-effort
        });
      }

      const res = await submitQuery({ query: query.trim(), image_ids: imageIds });
      useJobsStore.getState().startTracking(res.run_id, query.trim().slice(0, 60));
      onComplete(res.run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query submission failed");
      setAnalyzing(false);
    }
  };

  const charLabel = query.length > 0 ? `${query.length} chars` : "Natural language";
  const hasImages = files.some((f) => f.status === "done" && f.imageId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary">Natural Language Query</h3>
        {!hasImages && (
          <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-full border border-yellow-500/20">
            No images — demo mode
          </span>
        )}
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#89AACC] to-[#4E85BF] rounded-3xl opacity-20 group-hover:opacity-40 transition duration-500 blur" />
        <div className="relative bg-surface border border-stroke rounded-3xl p-4 flex flex-col">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) handleRun(); }}
            placeholder={
              mode === "simple"
                ? "Ask a plain language question about your imagery…"
                : "Specify a scientific measurement objective with sensor parameters…"
            }
            className="w-full bg-transparent text-text-primary placeholder:text-muted/50 px-2 py-2 outline-none resize-none min-h-[140px] text-sm leading-relaxed"
          />
          <div className="flex items-center justify-between mt-2 border-t border-stroke pt-3">
            <div className="flex items-center gap-2 text-muted">
              {mode === "scientific" && (
                <button className="p-1.5 rounded-lg hover:bg-white/5 hover:text-text-primary transition-colors">
                  <Sparkles className="w-4 h-4" />
                </button>
              )}
              <span className="text-xs">{charLabel}</span>
              <span className="text-xs text-muted/50">· Ctrl+Enter to run</span>
            </div>
            <button
              onClick={handleRun}
              disabled={query.length === 0 || analyzing}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                query.length > 0 && !analyzing
                  ? "bg-text-primary text-bg hover:scale-105"
                  : "bg-stroke/40 text-muted cursor-not-allowed"
              }`}
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-bg border-t-transparent animate-spin" />
                  Planning...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate Plan
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div className="bg-sky-500/5 border border-sky-500/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sky-400 mb-2">
          <Lightbulb className="w-4 h-4" />
          <h4 className="text-sm font-medium">Capability Hints</h4>
        </div>
        <p className="text-xs text-sky-400/80 leading-relaxed">
          {hasImages
            ? `${files.filter((f) => f.status === "done").length} image(s) uploaded. You can query for: `
            : "No images uploaded yet — query will run in demo mode. Upload imagery for: "}
          <strong>area measurements, geographic distances, NDVI, and SAR backscatter</strong>
          {files.filter((f) => f.status === "done").length < 2 ? ". Temporal changes require 2 images." : " and temporal change detection."}
        </p>
      </div>

      <div>
        <p className="text-xs text-muted uppercase tracking-[0.2em] mb-3 px-1">Example queries</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {EXAMPLE_QUERIES.map((q, i) => (
            <button
              key={i}
              onClick={() => setQuery(q)}
              className="text-left px-4 py-3 rounded-2xl bg-surface border border-stroke hover:border-white/20 hover:bg-white/5 transition-all duration-200 text-sm text-muted hover:text-text-primary group"
            >
              <span className="mr-2 text-xs opacity-40 group-hover:opacity-70 transition-opacity">{i + 1}.</span>
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { Play, Settings2, Code2, ShieldCheck, ChevronRight } from "lucide-react";
import Link from "next/link";

interface PlanReviewProps {
  mode: "simple" | "scientific";
}

export default function PlanReview({ mode }: PlanReviewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-text-primary">Execution Plan</h3>
        <span className="text-xs px-2.5 py-1 rounded-full bg-sky-500/15 text-sky-400">Ready</span>
      </div>

      {mode === "simple" ? (
        <div className="bg-surface border border-stroke rounded-3xl p-6 md:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#89AACC] to-[#4E85BF] p-[1px] mx-auto mb-6">
            <div className="w-full h-full bg-surface rounded-full flex items-center justify-center">
              <ShieldCheck className="w-8 h-8 text-sky-400" />
            </div>
          </div>
          <h4 className="text-xl md:text-2xl text-text-primary font-display italic mb-3">Analysis Ready</h4>
          <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
            SatQuery AI will extract the water bodies from the provided GeoTIFF using a multispectral segmentation model, calculate the total area, and return the exact measurement in square kilometers.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-stroke rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-stroke bg-bg/50 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-medium text-text-primary">Workflow Graph</span>
            </div>
            <span className="text-xs text-muted font-mono">v1.4.2-opt</span>
          </div>
          
          <div className="p-4 space-y-2">
            {[
              { step: 1, name: "Load GeoTIFF", detail: "EPSG:4326, 4 Bands, 10m GSD" },
              { step: 2, name: "Preprocess (Cloud Mask)", detail: "Threshold: < 10% (Pass)" },
              { step: 3, name: "Calculate NDWI", detail: "(Green - NIR) / (Green + NIR)" },
              { step: 4, name: "Apply Threshold", detail: "NDWI > 0.3" },
              { step: 5, name: "Extract Polygons", detail: "Morphological closing applied" },
              { step: 6, name: "Calculate Area", detail: "Spheroid area in km²" },
              { step: 7, name: "Generate Qwen VLM Summary", detail: "Adapter: Explanation-v2" },
            ].map((s) => (
              <div key={s.step} className="flex gap-4 p-3 rounded-xl hover:bg-white/5 group transition-colors">
                <div className="flex flex-col items-center">
                  <div className="w-6 h-6 rounded-full bg-bg border border-stroke flex items-center justify-center text-xs text-muted group-hover:border-sky-500/50 group-hover:text-sky-400 transition-colors">
                    {s.step}
                  </div>
                  {s.step < 7 && <div className="w-px h-full bg-stroke my-1 group-hover:bg-sky-500/30" />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-sm font-medium text-text-primary">{s.name}</p>
                  <p className="text-xs text-muted font-mono mt-1">{s.detail}</p>
                </div>
                <button className="text-muted hover:text-text-primary self-start mt-1">
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Link href="/insights" className="relative rounded-full text-sm transition-transform duration-200 hover:scale-105 group">
          <span className="absolute rounded-full accent-gradient opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={{ inset: "-2px" }} />
          <span className="relative z-10 flex items-center gap-2 px-8 py-3 rounded-full bg-bg text-text-primary font-medium">
            <Play className="w-4 h-4" />
            Execute Analysis
          </span>
        </Link>
      </div>
    </div>
  );
}

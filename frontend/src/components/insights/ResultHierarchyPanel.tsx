"use client";

import { Info, BarChart3, ChevronRight } from "lucide-react";
import { useMode } from "@/contexts/ModeContext";

export default function ResultHierarchyPanel() {
  const { mode } = useMode();

  return (
    <div className="bg-bg/80 backdrop-blur border border-stroke rounded-xl overflow-hidden h-full flex flex-col">
      <div className="p-4 border-b border-stroke flex items-center justify-between">
        <h3 className="font-medium text-text-primary flex items-center gap-2">
          <Info className="w-5 h-5 text-muted" />
          Findings & Evidence
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted mb-3 font-semibold">Direct Answer</h4>
          <p className="text-text-primary leading-relaxed bg-white/5 p-4 rounded-lg border border-stroke/50">
            Based on the temporal analysis, there is a <span className="font-bold text-blue-400">14% reduction</span> in coastal vegetation cover in the specified region between 2023 and 2024.
          </p>
        </div>

        <div>
          <h4 className="text-xs uppercase tracking-wider text-muted mb-3 font-semibold">Key Evidence</h4>
          <div className="space-y-2">
            {[
              "NDVI values dropped below 0.3 threshold in Zone A",
              "Increased backscatter intensity (SAR VH) indicates structural loss",
              "Erosion line receded by 12 meters on average"
            ].map((evidence, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                <div className="mt-0.5 text-blue-400">
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
                <span className="text-sm text-text-primary/90">{evidence}</span>
              </div>
            ))}
          </div>
        </div>

        {mode === "scientific" && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h4 className="text-xs uppercase tracking-wider text-muted mb-3 font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Measured Outputs
            </h4>
            <div className="bg-black/40 border border-stroke rounded-lg p-4 text-xs font-mono text-muted space-y-2">
              <div className="flex justify-between">
                <span>Total Area Analyzed:</span>
                <span className="text-text-primary">450.2 sq km</span>
              </div>
              <div className="flex justify-between">
                <span>Mean NDVI (2023):</span>
                <span className="text-green-400">0.62</span>
              </div>
              <div className="flex justify-between">
                <span>Mean NDVI (2024):</span>
                <span className="text-red-400">0.45</span>
              </div>
              <div className="flex justify-between">
                <span>Confidence Score:</span>
                <span className="text-text-primary">0.94</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

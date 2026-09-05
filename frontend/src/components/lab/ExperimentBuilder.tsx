"use client";

import { Map as MapIcon, Database, Box, SlidersHorizontal, ChevronRight } from "lucide-react";

export default function ExperimentBuilder() {
  return (
    <div className="bg-surface border border-stroke rounded-3xl p-6 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-6">
        <SlidersHorizontal className="w-5 h-5 text-sky-400" />
        <h3 className="text-lg font-medium text-text-primary">Experiment Setup</h3>
      </div>

      <div className="space-y-4 flex-1">
        {/* Area of Interest */}
        <div className="group border border-stroke rounded-2xl p-4 hover:border-sky-500/30 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapIcon className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
              <span className="text-sm font-medium text-text-primary">Area of Interest</span>
            </div>
            <span className="text-xs text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">Selected</span>
          </div>
          <p className="text-xs text-muted">BBox: [72.8, 19.0, 72.9, 19.1]</p>
        </div>

        {/* Inputs */}
        <div className="group border border-stroke rounded-2xl p-4 hover:border-sky-500/30 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
              <span className="text-sm font-medium text-text-primary">Input Data</span>
            </div>
            <span className="text-xs text-muted">2 Files</span>
          </div>
          <p className="text-xs text-muted">Coastal_T1.tif, Coastal_T2.tif</p>
        </div>

        {/* Model Pipeline */}
        <div className="group border border-stroke rounded-2xl p-4 hover:border-sky-500/30 transition-colors cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-muted group-hover:text-sky-400 transition-colors" />
              <span className="text-sm font-medium text-text-primary">Pipeline</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted" />
          </div>
          <p className="text-xs text-muted">SegFormer-B4 → Optical/SAR Fusion</p>
        </div>
      </div>

      <button className="w-full relative rounded-full text-sm mt-6 group">
        <span className="absolute rounded-full accent-gradient opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={{ inset: "-1px" }} />
        <span className="relative z-10 block w-full px-6 py-3 rounded-full bg-bg text-text-primary font-medium text-center">
          Initialize Run
        </span>
      </button>
    </div>
  );
}

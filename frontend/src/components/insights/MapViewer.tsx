"use client";

import { Map as MapIcon, Layers } from "lucide-react";

export default function MapViewer() {
  return (
    <div className="relative w-full h-[600px] bg-bg/50 border border-stroke rounded-xl overflow-hidden flex flex-col items-center justify-center">
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)`,
        backgroundSize: `24px 24px`
      }}></div>
      
      <div className="z-10 flex flex-col items-center">
        <MapIcon className="w-16 h-16 text-muted mb-4" />
        <h3 className="text-xl font-medium text-text-primary">Satellite Imagery Canvas</h3>
        <p className="text-sm text-muted mt-2">Map engine and layers will render here</p>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button className="p-3 rounded-lg bg-bg/80 border border-stroke backdrop-blur hover:bg-white/5 transition-colors text-text-primary">
          <Layers className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

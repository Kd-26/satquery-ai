"use client";

import { Plus, Minus, MousePointer2, Ruler, MousePointerClick, Download } from "lucide-react";

interface MapCanvasProps {
  activeTab: string;
}

const IMAGE_MAP: Record<string, string> = {
  Semantic: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=2072",
  Change:   "https://images.unsplash.com/photo-1594708767771-a7502209ff51?auto=format&fit=crop&q=80&w=2072",
  Quality:  "https://images.unsplash.com/photo-1579202673506-4b63e804f8dd?auto=format&fit=crop&q=80&w=2072",
  Source:   "https://images.unsplash.com/photo-1589136152341-2b0e7a25032f?auto=format&fit=crop&q=80&w=2072",
};

export default function MapCanvas({ activeTab }: MapCanvasProps) {
  const imgUrl = IMAGE_MAP[activeTab] ?? IMAGE_MAP["Source"];

  return (
    <div className="relative w-full h-full bg-[#0A0A0A] overflow-hidden group">
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out scale-105 group-hover:scale-100"
        style={{ backgroundImage: `url(${imgUrl})` }}
      />

      {activeTab === "Semantic" && (
        <div
          className="absolute inset-0 opacity-40 mix-blend-color"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 50%, #38bdf8 0%, transparent 60%), radial-gradient(circle at 20% 30%, #38bdf8 0%, transparent 40%)",
          }}
        />
      )}

      {activeTab === "Change" && (
        <div
          className="absolute inset-0 opacity-50 mix-blend-color"
          style={{ backgroundImage: "radial-gradient(circle at 70% 60%, #f87171 0%, transparent 40%)" }}
        />
      )}

      {/* Zoom Controls */}
      <div className="absolute right-4 bottom-4 flex flex-col gap-2 z-10">
        <div className="bg-surface/80 backdrop-blur-md border border-stroke rounded-xl overflow-hidden flex flex-col">
          <button className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors border-b border-stroke/50">
            <Plus className="w-4 h-4" />
          </button>
          <button className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors border-b border-stroke/50">
            <Minus className="w-4 h-4" />
          </button>
          <button className="p-2.5 text-sky-400 bg-sky-500/10 hover:bg-sky-500/20 transition-colors">
            <MousePointer2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tool Controls */}
      <div className="absolute left-4 top-4 flex flex-col gap-2 z-10">
        <div className="bg-surface/80 backdrop-blur-md border border-stroke rounded-xl overflow-hidden flex flex-col">
          <button className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors border-b border-stroke/50" title="Inspect Pixel">
            <MousePointerClick className="w-4 h-4" />
          </button>
          <button className="p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors" title="Measure">
            <Ruler className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Coordinate Bar */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        {[
          { label: "Lat", value: "19.0760° N" },
          { label: "Lon", value: "72.8777° E" },
          { label: "Zoom", value: "14.2" },
        ].map((c) => (
          <div key={c.label} className="bg-surface/80 backdrop-blur-md border border-stroke rounded-lg px-3 py-1.5 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-muted font-medium">{c.label}</span>
            <span className="text-xs text-text-primary font-mono">{c.value}</span>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="absolute top-4 right-4 z-10">
        <button className="bg-surface/80 backdrop-blur-md border border-stroke rounded-full p-2.5 text-muted hover:text-text-primary hover:bg-white/10 transition-colors">
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

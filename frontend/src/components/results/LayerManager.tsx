"use client";

import { useState } from "react";
import { Layers, Eye, EyeOff, GripVertical, Download, Lock } from "lucide-react";

export default function LayerManager() {
  const [layers, setLayers] = useState([
    { id: "semantic", name: "Semantic Mask (Water)", visible: true, opacity: 100, locked: false },
    { id: "change", name: "Change Detection (Decrease)", visible: false, opacity: 80, locked: false },
    { id: "quality", name: "Quality Mask (Clouds/Shadows)", visible: true, opacity: 60, locked: true },
    { id: "source", name: "Source GeoTIFF (RGB)", visible: true, opacity: 100, locked: true },
  ]);

  const toggleVisibility = (id: string) => {
    setLayers(layers.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  return (
    <div className="absolute top-4 left-4 z-20 bg-surface/90 backdrop-blur-md border border-stroke rounded-2xl w-64 overflow-hidden shadow-2xl">
      <div className="p-3 border-b border-stroke flex items-center gap-2">
        <Layers className="w-4 h-4 text-sky-400" />
        <h4 className="text-xs font-medium text-text-primary uppercase tracking-wider">Layer Stack</h4>
      </div>
      
      <div className="p-2 space-y-1">
        {layers.map(layer => (
          <div key={layer.id} className="group flex items-center gap-2 p-2 rounded-xl hover:bg-white/5 transition-colors">
            <button className="text-muted/50 cursor-grab active:cursor-grabbing hover:text-muted transition-colors">
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            
            <button 
              onClick={() => toggleVisibility(layer.id)}
              className={`p-1 rounded-md transition-colors ${layer.visible ? 'text-text-primary' : 'text-muted/50 hover:text-muted'}`}
            >
              {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </button>
            
            <span className={`text-xs flex-1 truncate transition-colors ${layer.visible ? 'text-text-primary' : 'text-muted'}`}>
              {layer.name}
            </span>
            
            <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
              {layer.locked ? (
                <Lock className="w-3 h-3 text-muted/50" />
              ) : (
                <button className="p-1 text-muted hover:text-text-primary transition-colors" title="Export Layer">
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

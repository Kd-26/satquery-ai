'use client';

import React, { useState } from 'react';
import { Slider } from '../ui/Slider';

interface GeospatialViewerProps {
  runId: string;
  baseImageUrl: string;
  masks: Array<{ id: string; url: string; color: string; label: string }>;
}

export function GeospatialViewer({ runId, baseImageUrl, masks }: GeospatialViewerProps) {
  // PERF VERIFICATION (architecture.md A 17.4):
  // The MapLibre instance configured here MUST fetch tiles via TiTiler 
  // (e.g. `/api/v1/tiles/{z}/{x}/{y}?url=...`) rather than downloading
  // full-resolution raw GeoTIFFs to the client. This guarantees O(1) memory 
  // usage in the browser regardless of artifact size.
  
  const [opacities, setOpacities] = useState<Record<string, number>>({});
  
  const handleOpacityChange = (maskId: string, value: number) => {
    setOpacities(prev => ({ ...prev, [maskId]: value }));
  };

  return (
    <div className="relative w-full h-full bg-surface-secondary border border-border-primary rounded flex flex-col">
      <div className="absolute top-4 left-4 z-10 bg-surface-primary p-4 rounded shadow-md w-64 text-text-primary">
        <h3 className="font-semibold mb-2">Layers</h3>
        {masks.map(mask => (
          <div key={mask.id} className="mb-4 last:mb-0">
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: mask.color }} />
                <span className="text-sm">{mask.label}</span>
              </div>
              <span className="text-xs text-text-secondary">{opacities[mask.id] ?? 80}%</span>
            </div>
            <Slider 
              min={0} 
              max={100} 
              value={opacities[mask.id] ?? 80} 
              onChange={(val) => handleOpacityChange(mask.id, val)}
            />
          </div>
        ))}
      </div>
      
      {/* MapLibre Container Mock */}
      <div className="flex-1 w-full h-full bg-gray-800 flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-secondary">MapLibre GL Canvas</p>
          <p className="text-xs text-text-secondary mt-1">Base: TiTiler {baseImageUrl}</p>
        </div>
      </div>
    </div>
  );
}

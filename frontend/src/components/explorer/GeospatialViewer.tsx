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
  const [viewMode, setViewMode] = useState<'standard' | 'swipe' | 'split'>('standard');
  const [swipePosition, setSwipePosition] = useState<number>(50);
  
  const handleOpacityChange = (maskId: string, value: number) => {
    setOpacities(prev => ({ ...prev, [maskId]: value }));
  };

  return (
    <div className="relative w-full h-full bg-surface-secondary border border-border-primary rounded flex flex-col">
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-4">
        <div className="bg-surface-primary p-4 rounded shadow-md w-64 text-text-primary">
          <h3 className="font-semibold mb-2">View Mode</h3>
          <select 
            className="w-full bg-surface-secondary border border-border-primary rounded p-1 text-sm text-text-primary mb-4"
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
          >
            <option value="standard">Standard Overlay</option>
            <option value="swipe">Bi-Temporal Swipe</option>
            <option value="split">Cross-Modal Split</option>
          </select>
          
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
        ))}
        </div>
      </div>
      
      {/* MapLibre Container Mock */}
      <div className="flex-1 w-full h-full bg-gray-800 flex relative overflow-hidden items-center justify-center">
        {viewMode === 'swipe' && (
          <div 
            className="absolute top-0 bottom-0 z-20 w-1 bg-brand-primary cursor-col-resize"
            style={{ left: `${swipePosition}%` }}
            onMouseDown={(e) => {
              const handleMouseMove = (moveEvent: MouseEvent) => {
                const newPos = (moveEvent.clientX / window.innerWidth) * 100;
                setSwipePosition(Math.max(0, Math.min(100, newPos)));
              };
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-lg">
              <span className="text-xs tracking-tighter">||</span>
            </div>
          </div>
        )}
        
        {viewMode === 'split' && (
          <div className="absolute inset-0 flex">
            <div className="w-1/2 h-full border-r border-brand-primary/50 relative">
              <div className="absolute top-4 right-4 bg-surface-primary/80 px-2 py-1 text-xs text-text-primary rounded">Optical</div>
            </div>
            <div className="w-1/2 h-full relative">
              <div className="absolute top-4 right-4 bg-surface-primary/80 px-2 py-1 text-xs text-text-primary rounded">SAR</div>
            </div>
          </div>
        )}
        
        <div className="text-center">
          <p className="text-text-secondary">MapLibre GL Canvas ({viewMode} mode)</p>
          <p className="text-xs text-text-secondary mt-1">Base: TiTiler {baseImageUrl}</p>
        </div>
      </div>
    </div>
  );
}

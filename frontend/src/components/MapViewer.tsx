"use client";
import React, { useState } from 'react';

export interface MapViewerProps {
 imageIds: string[];
 runResult: any | null;
}

export const MapViewer: React.FC<MapViewerProps> = ({ imageIds, runResult }) => {
 const [opacity, setOpacity] = useState<number>(0.5);
 const [sliderPos, setSliderPos] = useState<number>(50);
 const [viewMode, setViewMode] = useState<'optical' | 'sar' | 'fused'>('fused');

 const hasOverlays = runResult && (runResult.masks_ref || runResult.overlays_ref || runResult.status === 'done');

 return (
 <div className="relative w-full h-full min-h-[600px] bg-panel-raised flex flex-col">
 {/* Toolbar */}
 <div className="absolute top-4 left-4 right-4 z-10 flex justify-between bg-panel/90 p-2 rounded backdrop-blur-sm">
 <div className="flex items-center gap-4">
 <span className="font-semibold text-sm">Map Layers</span>
 {imageIds.length === 2 && (
 <div className="flex items-center gap-2 text-sm border-l pl-4 ml-2">
 <span>View:</span>
 <select 
 className="border rounded p-1"
 value={viewMode}
 onChange={(e) => setViewMode(e.target.value as any)}
 >
 <option value="optical">Optical Only</option>
 <option value="sar">SAR Only</option>
 <option value="fused">Fused / Split</option>
 </select>
 </div>
 )}
 {imageIds.length === 2 && viewMode === 'fused' && (
 <div className="flex items-center gap-2 text-sm border-l pl-4 ml-2">
 <span>Before/After</span>
 <input 
 type="range" 
 min="0" max="100" 
 value={sliderPos} 
 onChange={(e) => setSliderPos(parseInt(e.target.value))} 
 className="w-24"
 />
 </div>
 )}
 {hasOverlays && (
 <label className="flex items-center gap-2 text-sm">
 Overlay Opacity
 <input 
 type="range" 
 min="0" max="1" step="0.1" 
 value={opacity} 
 onChange={(e) => setOpacity(parseFloat(e.target.value))} 
 />
 </label>
 )}
 </div>
 </div>

 {/* Main Map Area - Mocking Leaflet/DeckGL canvas */}
 <div className="flex-1 flex items-center justify-center relative overflow-hidden">
 {imageIds.length === 0 ? (
 <p className="text-text-secondary">No images loaded.</p>
 ) : (
 <div className="relative w-full h-full flex items-center justify-center">
 <div className="w-3/4 h-3/4 border-4 border-dashed border-subtle flex items-center justify-center bg-subtle relative">
 {imageIds.length === 2 ? (
 <>
 <div className="absolute inset-0 bg-subtle flex items-center justify-start pl-4 overflow-hidden" style={{ width: `${sliderPos}%` }}>
 <span className="text-text-secondary font-medium z-0 whitespace-nowrap">T1 Image ({imageIds[0]})</span>
 </div>
 <div className="absolute inset-0 bg-gray-400 flex items-center justify-end pr-4 overflow-hidden" style={{ left: `${sliderPos}%` }}>
 <span className="text-text-primary font-medium z-0 whitespace-nowrap">T2 Image ({imageIds[1]})</span>
 </div>
 <div className="absolute top-0 bottom-0 w-1 bg-panel cursor-ew-resize z-20" style={{ left: `${sliderPos}%` }} />
 </>
 ) : (
 <span className="text-text-secondary font-medium z-0">Base Image Render (ID: {imageIds[0]})</span>
 )}
 
 {/* Overlay Mock */}
 {hasOverlays && (
 <div 
 className="absolute inset-0 bg-accent text-primary z-10 flex items-center justify-center mix-blend-multiply"
 style={{ opacity }}
 >
 <span className="text-primary font-bold drop--md">Semantic Mask Overlay</span>
 </div>
 )}
 </div>
 </div>
 )}
 </div>

 {/* Legend */}
 {hasOverlays && (
 <div className="absolute bottom-4 right-4 bg-panel/90 p-3 rounded text-sm">
 <h4 className="font-bold mb-2 border-b pb-1">Legend</h4>
 <div className="flex items-center gap-2 mb-1">
 <div className="w-4 h-4 bg-accent text-primary rounded-sm"></div>
 <span>Target Class (Mask)</span>
 </div>
 </div>
 )}
 </div>
 );
};

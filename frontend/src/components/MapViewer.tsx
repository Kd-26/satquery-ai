"use client";
import React, { useState } from 'react';

export interface MapViewerProps {
    imageIds: string[];
    runResult: any | null;
}

export const MapViewer: React.FC<MapViewerProps> = ({ imageIds, runResult }) => {
    const [opacity, setOpacity] = useState<number>(0.5);

    const hasOverlays = runResult && (runResult.masks_ref || runResult.overlays_ref || runResult.status === 'done');

    return (
        <div className="relative w-full h-full min-h-[600px] bg-gray-200 flex flex-col">
            {/* Toolbar */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between bg-white/90 p-2 rounded shadow backdrop-blur-sm">
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-sm">Map Layers</span>
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
                    <p className="text-gray-500">No images loaded.</p>
                ) : (
                    <div className="relative w-full h-full flex items-center justify-center">
                        <div className="w-3/4 h-3/4 border-4 border-dashed border-gray-400 flex items-center justify-center bg-gray-300 relative">
                            <span className="text-gray-600 font-medium z-0">Base Image Render (ID: {imageIds[0]})</span>
                            
                            {/* Overlay Mock */}
                            {hasOverlays && (
                                <div 
                                    className="absolute inset-0 bg-blue-500 z-10 flex items-center justify-center mix-blend-multiply"
                                    style={{ opacity }}
                                >
                                    <span className="text-white font-bold drop-shadow-md">Semantic Mask Overlay</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Legend */}
            {hasOverlays && (
                <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded shadow text-sm">
                    <h4 className="font-bold mb-2 border-b pb-1">Legend</h4>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 bg-blue-500 rounded-sm"></div>
                        <span>Target Class (Mask)</span>
                    </div>
                </div>
            )}
        </div>
    );
};

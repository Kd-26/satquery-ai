'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';

export function ExportMenu({ runId }: { runId: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (type: string) => {
    // In a real app, this would trigger a file download from the backend endpoint
    console.log(`Triggering export: /api/v1/runs/${runId}/export/${type}`);
    window.open(`/api/v1/runs/${runId}/export/${type}`, '_blank');
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <Button variant="secondary" onClick={() => setIsOpen(!isOpen)}>
        Export & Share
      </Button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-surface-primary border border-border-primary rounded shadow-xl z-50 overflow-hidden flex flex-col">
          <button 
            className="px-4 py-3 text-left text-sm text-text-primary hover:bg-surface-secondary border-b border-border-primary/50"
            onClick={() => handleExport('geotiff')}
          >
            <div className="font-medium">Raw GeoTIFFs</div>
            <div className="text-xs text-text-secondary mt-1">Download original masks and indices</div>
          </button>
          <button 
            className="px-4 py-3 text-left text-sm text-text-primary hover:bg-surface-secondary border-b border-border-primary/50"
            onClick={() => handleExport('geojson')}
          >
            <div className="font-medium">GeoJSON Vectors</div>
            <div className="text-xs text-text-secondary mt-1">Export vector boundaries</div>
          </button>
          <button 
            className="px-4 py-3 text-left text-sm text-text-primary hover:bg-surface-secondary border-b border-border-primary/50"
            onClick={() => handleExport('csv')}
          >
            <div className="font-medium">CSV Measurements</div>
            <div className="text-xs text-text-secondary mt-1">Spreadsheet of all calculated metrics</div>
          </button>
          <button 
            className="px-4 py-3 text-left text-sm text-text-primary hover:bg-surface-secondary border-b border-border-primary/50"
            onClick={() => handleExport('stac')}
          >
            <div className="font-medium">STAC Catalog</div>
            <div className="text-xs text-text-secondary mt-1">SpatioTemporal Asset Catalog format</div>
          </button>
          <button 
            className="px-4 py-3 text-left text-sm text-brand-primary hover:bg-surface-secondary"
            onClick={() => handleExport('audit-report')}
          >
            <div className="font-medium">PDF Audit Report</div>
            <div className="text-xs text-text-secondary mt-1">Full scientific evidence graph & provenance</div>
          </button>
        </div>
      )}
    </div>
  );
}

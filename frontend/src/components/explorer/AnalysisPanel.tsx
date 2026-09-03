'use client';

import React, { useEffect, useState } from 'react';
import { DataReadout } from '../ui/DataReadout';
import { Panel } from '../ui/Panel';

interface AnalysisPanelProps {
  selectedRegionId: string | null;
}

export function AnalysisPanel({ selectedRegionId }: AnalysisPanelProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedRegionId) {
      setMetrics(null);
      return;
    }
    
    setLoading(true);
    // Real call would be to /api/v1/regions/${selectedRegionId}/metrics
    // For this demonstration, we'll mock the fetch response
    setTimeout(() => {
      setMetrics({
        area_hectares: 14.2,
        confidence: 0.88,
        cloud_coverage_pct: 5.2,
        fusion_weight: 0.7,
        ndvi_mean: 0.65,
        vh_backscatter: -15.2
      });
      setLoading(false);
    }, 500);
  }, [selectedRegionId]);

  if (!selectedRegionId) {
    return (
      <Panel className="h-full flex items-center justify-center">
        <p className="text-text-secondary">Select a region on the map</p>
      </Panel>
    );
  }

  return (
    <Panel className="h-full overflow-y-auto">
      <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-primary pb-2">
        Scientific Analysis
      </h3>
      
      {loading ? (
        <p className="text-text-secondary">Loading region metrics...</p>
      ) : metrics ? (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <DataReadout label="Area" value={metrics.area_hectares} unit="ha" />
            <DataReadout label="Confidence" value={(metrics.confidence * 100).toFixed(1)} unit="%" />
          </div>
          
          <div className="border-t border-border-primary pt-4">
            <h4 className="text-sm font-medium text-text-secondary mb-3">Spectral Indices</h4>
            <div className="grid grid-cols-2 gap-4">
              <DataReadout label="NDVI (Mean)" value={metrics.ndvi_mean} />
              <DataReadout label="Cloud Cover" value={metrics.cloud_coverage_pct} unit="%" />
            </div>
          </div>

          <div className="border-t border-border-primary pt-4">
            <h4 className="text-sm font-medium text-text-secondary mb-3">SAR Backscatter</h4>
            <DataReadout label="VH Polarization" value={metrics.vh_backscatter} unit="dB" />
            
            {/* Minimal distribution chart placeholder */}
            <div className="mt-4 h-24 bg-surface-secondary border border-border-primary rounded flex items-center justify-center">
              <span className="text-xs text-text-secondary">VV/VH Distribution Chart</span>
            </div>
          </div>
          
          {metrics.fusion_weight !== undefined && (
            <div className="border-t border-border-primary pt-4">
              <h4 className="text-sm font-medium text-text-secondary mb-3">Cross-Modal Fusion</h4>
              <DataReadout label="Optical Weight" value={(metrics.fusion_weight * 100).toFixed(0)} unit="%" />
            </div>
          )}
        </div>
      ) : null}
    </Panel>
  );
}

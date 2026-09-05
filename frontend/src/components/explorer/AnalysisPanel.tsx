'use client';

import React, { useEffect, useState } from 'react';
import { DataReadout } from '../ui/DataReadout';
import { Panel } from '../ui/Panel';

interface AnalysisPanelProps {
  selectedRegionId: string | null;
}

interface RegionMetrics {
  area_hectares: number;
  confidence: number;
  cloud_coverage_pct: number;
  fusion_weight: number;
  ndvi_mean: number;
  vh_backscatter: number;
}

export function AnalysisPanel({ selectedRegionId }: AnalysisPanelProps) {
  const [metrics, setMetrics] = useState<RegionMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRegionId) {
      setMetrics(null);
      setError(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/regions/${selectedRegionId}/metrics`)
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.detail || `Failed to load metrics (${res.status})`);
        }
        return res.json() as Promise<RegionMetrics>;
      })
      .then((data) => { if (isMounted) setMetrics(data); })
      .catch((err) => {
        console.error('[AnalysisPanel] Failed to fetch region metrics:', err);
        if (isMounted) setError(err instanceof Error ? err.message : 'Unknown error');
      })
      .finally(() => { if (isMounted) setLoading(false); });

    return () => { isMounted = false; };
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
      ) : error ? (
        <p className="text-xs text-danger">{error}</p>
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

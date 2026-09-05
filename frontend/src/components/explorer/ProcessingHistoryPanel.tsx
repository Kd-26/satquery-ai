'use client';

import React, { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Badge } from '../ui/Badge';
import { VariableSizeList as List } from 'react-window';

interface TraceStep {
  id: string;
  name: string;
  duration_ms: number;
  timestamp: string;
  parameters: any;
  model_version?: string;
  artifact_url?: string;
}

// Mock trace data for rendering
const MOCK_TRACE: TraceStep[] = [
  { id: '1', name: 'Input Validation', duration_ms: 150, timestamp: '2026-09-03T18:00:01Z', parameters: { checks: ['crs', 'resolution'] } },
  { id: '2', name: 'Cloud Masking', duration_ms: 850, timestamp: '2026-09-03T18:00:02Z', parameters: { threshold: 0.2 }, artifact_url: '/artifacts/run-123/masks/cloud.tif' },
  { id: '3', name: 'Segmentation', duration_ms: 4200, timestamp: '2026-09-03T18:00:06Z', parameters: { classes: ['water'] }, model_version: 'SEG_RGB_v1@1.2.0', artifact_url: '/artifacts/run-123/masks/water.tif' },
  { id: '4', name: 'Area Measurement', duration_ms: 300, timestamp: '2026-09-03T18:00:06Z', parameters: { crs: 'EPSG:4326', pixel_spacing: 10 } },
];

export function ProcessingHistoryPanel({ runId }: { runId: string }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const listRef = React.useRef<any>(null);
  
  // Create 30 items for testing virtualization
  const steps = [...MOCK_TRACE];
  while (steps.length < 30) {
    steps.push({ ...MOCK_TRACE[0], id: `mock-${steps.length}`, name: `Step ${steps.length}` });
  }

  const toggleExpand = (id: string, index: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    if (listRef.current) {
      listRef.current.resetAfterIndex(index);
    }
  };

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const step = steps[index];
    const isExpanded = expanded[step.id];

    return (
      <div style={{ ...style }} className="px-4">
        <div 
          className="border border-border-primary rounded bg-surface-secondary p-3 mb-2 cursor-pointer hover:bg-surface-primary/50 transition-colors h-full"
          onClick={() => toggleExpand(step.id, index)}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">{(step.duration_ms / 1000).toFixed(1)}s</Badge>
              <span className="text-sm font-medium text-text-primary">{step.name}</span>
            </div>
            <span className="text-xs text-text-secondary">{new Date(step.timestamp).toLocaleTimeString()}</span>
          </div>
          
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-border-primary text-xs text-text-secondary">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="font-semibold text-text-primary">Parameters:</span>
                  <pre className="mt-1 bg-surface-primary p-2 rounded overflow-x-auto text-[10px] font-mono border border-border-primary">
                    {JSON.stringify(step.parameters, null, 2)}
                  </pre>
                </div>
                <div className="flex flex-col gap-2">
                  {step.model_version && (
                    <div>
                      <span className="font-semibold text-text-primary">Model Version:</span>
                      <p className="font-mono text-brand-primary">{step.model_version}</p>
                    </div>
                  )}
                  {step.artifact_url && (
                    <div>
                      <span className="font-semibold text-text-primary">Artifact:</span>
                      <a href={step.artifact_url} target="_blank" rel="noreferrer" className="block text-brand-primary hover:underline mt-1">
                        Download Mask
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Panel className="h-full flex flex-col p-0">
      <div className="p-4 border-b border-border-primary">
        <h3 className="text-lg font-semibold text-text-primary">Processing History</h3>
        <p className="text-xs text-text-secondary mt-1">Full node chain & artifact lineage</p>
      </div>
      
      <div className="flex-1 overflow-hidden pt-4">
        <List
          ref={listRef}
          height={600} // This should be dynamic based on container in a real app
          itemCount={steps.length}
          itemSize={(index) => expanded[steps[index].id] ? 180 : 60}
          width="100%"
        >
          {Row}
        </List>
      </div>
    </Panel>
  );
}

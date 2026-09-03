'use client';

import React, { useState } from 'react';
import { Panel } from '../ui/Panel';
import { Slider } from '../ui/Slider';
import { Button } from '../ui/Button';

// Note: In Next.js App Router, to fulfill the code-split perf rule (architecture.md 17.4),
// this component should be imported in the parent layout using:
// const ExperimentPanel = dynamic(() => import('./ExperimentPanel'), { ssr: false })

export default function ExperimentPanel({ runId }: { runId: string }) {
  const [threshold, setThreshold] = useState<number>(50);
  const [modelId, setModelId] = useState<string>('SEG_RGB_v1');
  const [tools, setTools] = useState<Record<string, boolean>>({
    'compute_spectral_index:NDWI': true,
    'quality.compute_valid_mask': true
  });
  const [fusionWeight, setFusionWeight] = useState<number>(50);
  const [experimentResult, setExperimentResult] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const toggleTool = (tool: string) => {
    setTools(prev => ({ ...prev, [tool]: !prev[tool] }));
  };

  const handleRunExperiment = () => {
    setIsRunning(true);
    // Mock API call to POST /api/v1/runs/{run_id}/experiments
    setTimeout(() => {
      setExperimentResult({
        experiment_id: 'exp-1234',
        masks: [{ id: 'new_water', color: '#00f', label: 'Water (Exp)' }]
      });
      setIsRunning(false);
    }, 1500);
  };

  return (
    <Panel className="h-full flex flex-col overflow-y-auto">
      <h3 className="text-lg font-semibold text-text-primary mb-4 border-b border-border-primary pb-2">
        What-If Engine (Experiment)
      </h3>
      
      {!experimentResult ? (
        <div className="flex flex-col gap-6 flex-1">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Model Swap</label>
            <select 
              value={modelId} 
              onChange={e => setModelId(e.target.value)}
              className="w-full bg-surface-secondary border border-border-primary rounded p-2 text-text-primary text-sm"
            >
              <option value="SEG_RGB_v1">SEG_RGB_v1 (Baseline)</option>
              <option value="SEG_RGBNIR_v1">SEG_RGBNIR_v1 (Multispectral)</option>
              <option value="SEG_SAR_VV_VH_v1">SEG_SAR_VV_VH_v1 (Radar)</option>
            </select>
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-text-secondary">Segmentation Threshold</label>
              <span className="text-xs text-brand-primary">{(threshold / 100).toFixed(2)}</span>
            </div>
            <Slider min={0} max={100} value={threshold} onChange={setThreshold} />
          </div>
          
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-text-secondary">Cross-Modal Fusion Weight (Opt/SAR)</label>
              <span className="text-xs text-brand-primary">{fusionWeight}% / {100 - fusionWeight}%</span>
            </div>
            <Slider min={0} max={100} value={fusionWeight} onChange={setFusionWeight} />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">Physics Tools Override</label>
            <div className="space-y-2">
              {Object.entries(tools).map(([tool, enabled]) => (
                <label key={tool} className="flex items-center gap-2 text-sm text-text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={enabled} 
                    onChange={() => toggleTool(tool)}
                    className="rounded border-border-primary text-brand-primary focus:ring-brand-primary"
                  />
                  {tool}
                </label>
              ))}
            </div>
          </div>
          
          <div className="mt-auto pt-4 border-t border-border-primary">
            <Button onClick={handleRunExperiment} className="w-full" disabled={isRunning}>
              {isRunning ? 'Running DAG...' : 'Run Experiment'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          <div className="bg-surface-secondary p-3 rounded mb-4 border border-brand-primary">
            <h4 className="text-sm font-medium text-brand-primary">Experiment Complete</h4>
            <p className="text-xs text-text-secondary mt-1">Comparing original run with experimental adjustments.</p>
          </div>
          
          {/* Side-by-side mock comparison view (reusing GeospatialViewer concept) */}
          <div className="flex-1 flex gap-2 mb-4 h-64 bg-gray-900 rounded overflow-hidden">
            <div className="w-1/2 h-full flex items-center justify-center border-r border-border-primary relative">
              <span className="absolute top-2 left-2 bg-black/60 px-2 py-1 text-xs text-white rounded">Original</span>
              <p className="text-xs text-text-secondary">TiTiler Canvas</p>
            </div>
            <div className="w-1/2 h-full flex items-center justify-center relative">
              <span className="absolute top-2 left-2 bg-brand-primary/80 px-2 py-1 text-xs text-white rounded">Experiment</span>
              <p className="text-xs text-text-secondary">TiTiler Canvas</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setExperimentResult(null)}>
              Discard
            </Button>
            <Button className="flex-1">
              Save as New Run
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Settings2, RotateCcw, PlayCircle, Loader2 } from "lucide-react";

interface ParameterConsoleProps {
  selectedRunId?: string;
  onOverridesChange?: (overrides: Record<string, unknown>) => void;
  onRunExperiment?: (overrides: Record<string, unknown>) => void;
  creating?: boolean;
}

const DEFAULTS = { cloudLimit: 10, ndwiThresh: 0.3, morphSize: 3, confThresh: 0.85 };

export default function ParameterConsole({
  selectedRunId,
  onOverridesChange,
  onRunExperiment,
  creating,
}: ParameterConsoleProps) {
  const [params, setParams] = useState(DEFAULTS);

  // Notify parent whenever params change
  useEffect(() => {
    onOverridesChange?.({
      cloud_limit: params.cloudLimit,
      ndwi_threshold: params.ndwiThresh,
      morph_kernel_size: params.morphSize,
      confidence_threshold: params.confThresh,
    });
  }, [params]);

  const handleReset = () => setParams(DEFAULTS);

  const handleRun = () => {
    onRunExperiment?.({
      cloud_limit: params.cloudLimit,
      ndwi_threshold: params.ndwiThresh,
      morph_kernel_size: params.morphSize,
      confidence_threshold: params.confThresh,
    });
  };

  return (
    <div className="bg-surface border border-stroke rounded-3xl p-6 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-sky-400" />
          <h3 className="text-lg font-medium text-text-primary">Hyperparameters</h3>
        </div>
        <button onClick={handleReset} className="p-1.5 text-muted hover:text-text-primary transition-colors" title="Reset to defaults">
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {selectedRunId && (
        <p className="text-[10px] text-muted font-mono mb-4 bg-bg border border-stroke rounded-lg px-3 py-2">
          Base run: <span className="text-sky-400">{selectedRunId}</span>
        </p>
      )}

      <div className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-hide">
        {/* Cloud Threshold */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <label className="text-sm font-medium text-text-primary">Cloud Cover Masking Limit</label>
              <p className="text-[10px] text-muted">Maximum allowable cloud % before pixel rejection</p>
            </div>
            <span className="text-xs text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded">{params.cloudLimit}%</span>
          </div>
          <input
            type="range" min="0" max="100"
            value={params.cloudLimit}
            onChange={(e) => setParams({ ...params, cloudLimit: parseInt(e.target.value) })}
            className="w-full accent-sky-400 h-1 bg-stroke rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* NDWI Threshold */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <label className="text-sm font-medium text-text-primary">NDWI Water Threshold</label>
              <p className="text-[10px] text-muted">Value above which pixel is classified as water</p>
            </div>
            <span className="text-xs text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded">{params.ndwiThresh}</span>
          </div>
          <input
            type="range" min="-1" max="1" step="0.05"
            value={params.ndwiThresh}
            onChange={(e) => setParams({ ...params, ndwiThresh: parseFloat(e.target.value) })}
            className="w-full accent-sky-400 h-1 bg-stroke rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Confidence Cutoff */}
        <div>
          <div className="flex justify-between items-end mb-2">
            <div>
              <label className="text-sm font-medium text-text-primary">Model Confidence Cutoff</label>
              <p className="text-[10px] text-muted">Minimum probability for SegFormer output</p>
            </div>
            <span className="text-xs text-sky-400 font-mono bg-sky-500/10 px-2 py-0.5 rounded">{params.confThresh}</span>
          </div>
          <input
            type="range" min="0" max="1" step="0.01"
            value={params.confThresh}
            onChange={(e) => setParams({ ...params, confThresh: parseFloat(e.target.value) })}
            className="w-full accent-sky-400 h-1 bg-stroke rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={handleRun}
        disabled={creating}
        className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-sky-500/40 text-sky-400 text-sm font-medium hover:bg-sky-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Running…</>
        ) : (
          <><PlayCircle className="w-4 h-4" /> Run Experiment</>
        )}
      </button>
    </div>
  );
}

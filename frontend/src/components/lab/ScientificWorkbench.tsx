"use client";

import { useCallback, useState } from "react";
import { Activity, BarChart3, FlaskConical, Loader2, Radar, Waves } from "lucide-react";
import { executeWorkbenchTool, pollRun, type RunResult } from "@/lib/api";

const TOOLS = [
  { id: "NDVI", label: "Vegetation index", icon: Activity, detail: "NIR and red normalized difference" },
  { id: "NDWI", label: "Water index", icon: Waves, detail: "Green and NIR normalized difference" },
  { id: "MNDWI", label: "Modified water index", icon: Waves, detail: "Green and SWIR1 normalized difference" },
  { id: "NDBI", label: "Built-up index", icon: BarChart3, detail: "SWIR1 and NIR normalized difference" },
  { id: "QUALITY", label: "Quality gate", icon: FlaskConical, detail: "NoData, clouds, shadows and saturation" },
  { id: "SAR", label: "SAR statistics", icon: Radar, detail: "VV/VH backscatter summaries" },
] as const;

interface ScientificWorkbenchProps {
  imageIds: string[];
  onComplete?: (run: RunResult) => void;
}

export default function ScientificWorkbench({ imageIds, onComplete }: ScientificWorkbenchProps) {
  const [selected, setSelected] = useState<string>("NDVI");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    if (!imageIds.length) {
      setError("Add at least one image ID before running a scientific tool.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const accepted = await executeWorkbenchTool(imageIds, selected);
      const result = await pollRun(accepted.run_id, (update) => setProgress(update.progress));
      if (result.status === "failed") throw new Error(result.error || "Tool execution failed");
      onComplete?.(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tool execution failed");
    } finally {
      setRunning(false);
    }
  }, [imageIds, onComplete, selected]);

  return (
    <section className="bg-surface border border-stroke rounded-3xl p-6" aria-labelledby="workbench-title">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 id="workbench-title" className="text-base font-medium text-text-primary">Scientific tool workbench</h2>
          <p className="text-xs text-muted mt-1">Deterministic tools run before narrative synthesis.</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-green-400">Evidence mode</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const active = selected === tool.id;
          return (
            <button key={tool.id} type="button" onClick={() => setSelected(tool.id)} aria-pressed={active} className={`text-left p-3 rounded-2xl border transition-colors ${active ? "border-sky-500/60 bg-sky-500/10" : "border-stroke hover:border-sky-500/30"}`}>
              <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-sky-400" /><span className="text-sm text-text-primary">{tool.label}</span></div>
              <p className="text-[11px] text-muted mt-1.5">{tool.detail}</p>
            </button>
          );
        })}
      </div>
      <label className="block mt-5 text-xs text-muted" htmlFor="workbench-images">Image IDs (comma separated)</label>
      <div id="workbench-images" className="mt-1.5 min-h-10 bg-bg border border-stroke rounded-xl px-3 py-2 text-xs font-mono text-muted break-all">{imageIds.join(", ") || "No images selected"}</div>
      {running ? <div className="mt-4 h-1 rounded bg-stroke overflow-hidden"><div className="h-full bg-sky-400 transition-all" style={{ width: `${progress}%` }} /></div> : null}
      {error ? <p role="alert" className="mt-3 text-xs text-red-400">{error}</p> : null}
      <button type="button" disabled={running || !imageIds.length} onClick={execute} className="mt-5 w-full rounded-full bg-sky-500/15 border border-sky-500/30 px-4 py-3 text-sm text-sky-300 hover:bg-sky-500/20 disabled:opacity-40">
        {running ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Running {progress}%</span> : `Run ${selected}`}
      </button>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ExperimentBuilder from "@/components/lab/ExperimentBuilder";
import ParameterConsole from "@/components/lab/ParameterConsole";
import { createExperiment, getExperiment, getRunHistory, getRun, type ExperimentResult, type RunStatusValue, type RunResult } from "@/lib/api";
import { Loader2, AlertCircle, CheckCircle2, FlaskConical } from "lucide-react";
import ScientificWorkbench from "@/components/lab/ScientificWorkbench";
import { useRouter } from "next/navigation";
import { useImageStore } from "@/lib/imageStore";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const statusColor: Record<string, string> = {
  done: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  running: "bg-blue-500/20 text-blue-400",
  pending: "bg-yellow-500/20 text-yellow-400",
  cancelled: "bg-neutral-500/20 text-neutral-400",
};

type HistoryRun = { run_id: string; status: RunStatusValue; stage: string; progress: number; image_ids: string[]; updated_at: number };

export default function LabPage() {
  const router = useRouter();
  // Experiment state
  const [selectedRunId, setSelectedRunId] = useState("");
  const [runs, setRuns] = useState<HistoryRun[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [experiment, setExperiment] = useState<ExperimentResult | null>(null);
  const [expError, setExpError] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [imageIdInput, setImageIdInput] = useState("");
  const imageIds = imageIdInput.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 2);
  // Route from the selected run — used by ExperimentBuilder to show real pipeline info
  const [selectedRunResult, setSelectedRunResult] = useState<RunResult | null>(null);

  // Auto-populate from the global image store (set by DropZone after upload)
  const { lastImageIds, clearLastImageIds } = useImageStore();
  useEffect(() => {
    if (lastImageIds.length > 0 && !imageIdInput) {
      setImageIdInput(lastImageIds.join(", "));
    }
  // Only run on mount — intentionally omit imageIdInput to avoid overwriting user edits
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load notes from localStorage whenever the selected run changes
  useEffect(() => {
    const stored = localStorage.getItem(`lab-notes-${selectedRunId}`);
    setNotes(stored ?? "");
  }, [selectedRunId]);

  const handleNotesChange = (value: string) => {
    setNotes(value);
    localStorage.setItem(`lab-notes-${selectedRunId}`, value);
  };

  useEffect(() => {
    getRunHistory()
      .then(({ runs: history }) => {
        setRuns(history);
        setSelectedRunId((current) => current || history[0]?.run_id || "");
      })
      .catch((error: Error) => setHistoryError(error.message));
  }, []);

  // Load the full run result whenever selection changes (for real pipeline info)
  useEffect(() => {
    if (!selectedRunId) { setSelectedRunResult(null); return; }
    getRun(selectedRunId).then(setSelectedRunResult).catch(() => setSelectedRunResult(null));
  }, [selectedRunId]);

  const handleCreateExperiment = async (paramOverrides: Record<string, unknown>) => {
    if (!selectedRunId) {
      setExpError("Run a scientific tool first, then select its run from history.");
      return;
    }
    setCreating(true);
    setExpError(null);
    setExperiment(null);
    try {
      const res = await createExperiment(selectedRunId, paramOverrides);
      // Poll for result
      let result: ExperimentResult | null = null;
      for (let i = 0; i < 15; i++) {
        result = await getExperiment(res.experiment_id);
        if (result.status !== "running") break;
        await new Promise((r) => setTimeout(r, 2000));
      }
      setExperiment(result);
    } catch (e) {
      setExpError(e instanceof Error ? e.message : "Experiment failed");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 lg:px-12 pt-8 pb-20">

        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="w-8 h-px bg-stroke" />
            <span className="text-xs text-muted uppercase tracking-[0.3em]">Research Environment</span>
          </div>
          <h1 className="text-4xl md:text-5xl text-text-primary leading-[1.1]">
            Scientific <span className="font-display italic">lab</span>
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] gap-6 mb-6">
          <div className="bg-surface border border-stroke rounded-3xl p-6">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="lab-image-ids" className="text-sm font-medium text-text-primary">Analysis inputs</label>
              {lastImageIds.length > 0 && imageIdInput === lastImageIds.join(", ") && (
                <span className="flex items-center gap-1.5 text-xs text-green-400">
                  <FlaskConical className="w-3.5 h-3.5" />
                  Auto-filled from last upload
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-1 mb-3">Paste one image ID, or two comma-separated IDs for temporal analysis.</p>
            <div className="flex gap-2">
              <input id="lab-image-ids" value={imageIdInput} onChange={(event) => setImageIdInput(event.target.value)} className="flex-1 bg-bg border border-stroke rounded-xl px-4 py-3 text-sm font-mono text-text-primary outline-none focus:border-sky-500/50" placeholder="image-id-1, image-id-2" />
              {lastImageIds.length > 0 && (
                <button
                  onClick={() => { setImageIdInput(lastImageIds.join(", ")); }}
                  title="Restore last uploaded image IDs"
                  className="px-3 py-2 rounded-xl border border-stroke bg-bg text-xs text-muted hover:text-text-primary hover:border-sky-500/40 transition-colors"
                >
                  ↺ Restore
                </button>
              )}
              {imageIdInput && (
                <button
                  onClick={() => { setImageIdInput(""); clearLastImageIds(); }}
                  title="Clear inputs"
                  className="px-3 py-2 rounded-xl border border-stroke bg-bg text-xs text-muted hover:text-red-400 hover:border-red-500/40 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <ScientificWorkbench imageIds={imageIds} onComplete={(result) => router.push(`/insights?runId=${encodeURIComponent(result.run_id)}`)} />
        </div>

        {/* Main 3-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Experiment Builder */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease }}
          >
            <ExperimentBuilder
              onRunExperiment={handleCreateExperiment}
              imageIds={imageIds}
              route={selectedRunResult?.route ?? null}
            />
          </motion.div>

          {/* Centre: Parameter Console + Run History */}
          <motion.div
            className="lg:col-span-5 space-y-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease }}
          >
            <ParameterConsole
              selectedRunId={selectedRunId}
              onRunExperiment={handleCreateExperiment}
              creating={creating}
            />

            {/* Experiment Result */}
            {(creating || experiment || expError) && (
              <div className="bg-surface border border-stroke rounded-3xl p-5">
                <h3 className="text-sm font-medium text-text-primary mb-3">Experiment Result</h3>
                {creating && (
                  <div className="flex items-center gap-2 text-sky-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Running experiment…</span>
                  </div>
                )}
                {expError && (
                  <div className="flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{expError}</span>
                  </div>
                )}
                {experiment && !creating && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="text-sm font-medium capitalize">{experiment.status}</span>
                    </div>
                    <div className="text-xs font-mono text-muted space-y-1">
                      <p>id: {experiment.experiment_id.slice(0, 16)}…</p>
                      <p>parent: {experiment.parent_run_id}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Run History */}
            <div className="bg-surface border border-stroke rounded-3xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-medium text-text-primary">Run History</h3>
                <span className="text-xs text-muted">{runs.length} runs</span>
              </div>
              <div className="space-y-3">
                {runs.map((run) => (
                  <div
                    key={run.run_id}
                    onClick={() => setSelectedRunId(run.run_id)}
                    className={`group flex items-center gap-4 p-3 rounded-2xl bg-bg border transition-all cursor-pointer ${
                      selectedRunId === run.run_id
                        ? "border-sky-500/50 bg-sky-500/5"
                        : "border-stroke hover:border-sky-500/30"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted">{run.run_id.slice(0, 12)}…</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor[run.status] ?? statusColor.pending}`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted truncate">{run.stage} · {run.image_ids.length} image(s)</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-display text-text-primary">{run.progress}%</p>
                      <p className="text-[10px] text-muted">{new Date(run.updated_at * 1000).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
                {!runs.length && <p className="text-xs text-muted">{historyError ?? "No analysis runs yet."}</p>}
              </div>
            </div>
          </motion.div>

          {/* Right: Run Comparison */}
          <motion.div
            className="lg:col-span-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease }}
          >
            <div className="bg-surface border border-stroke rounded-3xl p-6 h-full">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-medium text-text-primary">Run Comparison</h3>
                <button className="text-xs text-sky-400 hover:text-sky-300 transition-colors">Select runs</button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                {runs.slice(0, 2).map((run) => (
                  <div key={run.run_id} className="bg-bg border border-stroke rounded-2xl p-4 flex flex-col gap-2">
                    <span className="text-[10px] font-mono text-muted uppercase">{run.run_id.slice(0, 10)}…</span>
                    <p className="text-2xl font-display text-text-primary">{run.progress}%</p>
                    <p className="text-[10px] text-muted leading-relaxed">{run.stage} · {run.status}</p>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted leading-relaxed">
                Select completed runs to inspect their provenance manifests and compare evidence. Quantitative deltas are shown only when compatible units, CRS, and source bands are verified.
              </p>

              <div className="mt-6 pt-5 border-t border-stroke">
                <h4 className="text-xs text-muted uppercase tracking-wider mb-3">Research Notes</h4>
                <textarea
                  value={notes}
                  onChange={(e) => handleNotesChange(e.target.value)}
                  className="w-full bg-bg border border-stroke rounded-2xl p-3 text-sm text-text-primary placeholder:text-muted/50 outline-none resize-none min-h-[80px] text-xs leading-relaxed focus:border-sky-500/50 transition-colors"
                  placeholder="Record hypothesis, observations, and conclusions for this experiment…"
                />
                {notes && (
                  <p className="text-[10px] text-muted/60 mt-1 text-right">Auto-saved to browser storage</p>
                )}
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useRef } from "react";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import MapCanvas, { type MapCanvasHandle, type LayerState, type ActiveTool, type CompareMode } from "@/components/results/MapCanvas";
import LayerManager from "@/components/results/LayerManager";
import PairComparison from "@/components/results/PairComparison";
import EvidencePanel from "@/components/results/EvidencePanel";
import MeasurementTable from "@/components/results/MeasurementTable";
import ConfidenceBar from "@/components/results/ConfidenceBar";
import ProvenancePanel from "@/components/results/ProvenancePanel";
import { Download, Share2, Printer, CheckCircle, Loader2, AlertCircle, Ban, XCircle } from "lucide-react";
import { getRun, getRunGraph, downloadRunExport, cancelRun, type RunResult, type GraphData, type ExportFormat } from "@/lib/api";

const ease = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const POLL_INTERVAL = 2500;

const DEFAULT_LAYERS: LayerState[] = [
  { id: "semantic", name: "Semantic Mask",        visible: true,  opacity: 70,  locked: false },
  { id: "change",   name: "Change Detection",     visible: false, opacity: 80,  locked: false },
  { id: "quality",  name: "Quality Mask",         visible: true,  opacity: 60,  locked: false },
];

// Inner component that uses useSearchParams — must be wrapped in Suspense
function InsightsContent() {
  const searchParams = useSearchParams();
  const runId = searchParams.get("runId");

  // ─── Map state (lifted from MapCanvas / LayerManager) ─────────────────────
  const [activeTab,   setActiveTab]   = useState<string>("Semantic");
  const [compareMode, setCompareMode] = useState<CompareMode>("swipe");
  const [activeTool,  setActiveTool]  = useState<ActiveTool>("select");
  const [layers,      setLayers]      = useState<LayerState[]>(DEFAULT_LAYERS);

  // Ref to MapCanvas imperative handle — for Layer Manager → map binding
  const mapRef = useRef<MapCanvasHandle>(null);

  // ─── Run polling ──────────────────────────────────────────────────────────
  const [run,         setRun]         = useState<RunResult | null>(null);
  const [graph,       setGraph]       = useState<GraphData | null>(null);
  const [loading,     setLoading]     = useState(!!runId);
  const [error,       setError]       = useState<string | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);
  const [exporting,   setExporting]   = useState<ExportFormat | null>(null);
  const [cancelling,  setCancelling]  = useState(false);

  useEffect(() => {
    if (!runId) return;
    let stopped = false;

    const poll = async () => {
      try {
        const result = await getRun(runId);
        if (stopped) return;
        setRun(result);
        if (result.status === "done") {
          setLoading(false);
          
          if (result.image_ids && result.image_ids.length > 0) {
            setLayers(prev => {
              if (prev.some(l => l.id.startsWith("source-"))) return prev;
              const sourceLayers = result.image_ids!.map((id, index) => ({
                id: `source-${index}`,
                name: result.image_ids!.length > 1 ? `Source Image ${index + 1}` : "Source GeoTIFF (RGB)",
                visible: true,
                opacity: 100,
                locked: false
              }));
              return [...prev, ...sourceLayers];
            });
          }

          getRunGraph(runId)
            .then((g) => { if (!stopped) setGraph(g); })
            .catch(() => {});
        } else if (result.status === "failed") {
          setLoading(false);
          setError(result.error ?? "Analysis run failed. Please try again.");
        } else if (result.status === "cancelled") {
          setLoading(false);
          setWasCancelled(true);
        } else {
          setTimeout(poll, POLL_INTERVAL);
        }
      } catch (e) {
        if (stopped) return;
        setError(e instanceof Error ? e.message : "Failed to fetch run status");
        setLoading(false);
      }
    };

    poll();
    return () => { stopped = true; };
  }, [runId]);

  const handleCancel = useCallback(async () => {
    if (!runId) return;
    setCancelling(true);
    try {
      await cancelRun(runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel run");
    } finally {
      setCancelling(false);
    }
  }, [runId]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (!runId) return;
    setExporting(format);
    try {
      await downloadRunExport(runId, format);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(null);
    }
  }, [runId]);

  // ─── Layer Manager callbacks → imperative map handle ─────────────────────

  const handleToggleVisibility = useCallback((id: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id && !l.locked ? { ...l, visible: !l.visible } : l))
    );
    const layer = layers.find((l) => l.id === id);
    if (layer) {
      mapRef.current?.setLayerVisible(id, !layer.visible);
    }
  }, [layers]);

  const handleChangeOpacity = useCallback((id: string, opacity: number) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, opacity } : l))
    );
    mapRef.current?.setLayerOpacity(id, opacity);
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────────────

  const confidence = (() => {
    if (run?.confidence != null) {
      return Math.round(run.confidence <= 1 ? run.confidence * 100 : run.confidence);
    }
    if (run?.claims && run.claims.length > 0) {
      const confs = run.claims.map((c) => c.confidence).filter((c) => c != null && !isNaN(c));
      if (confs.length > 0) {
        const avg = confs.reduce((a, b) => a + b, 0) / confs.length;
        return Math.round(avg <= 1 ? avg * 100 : avg);
      }
    }
    if (run?.observations && run.observations.length > 0) {
      const obsConfs = run.observations.map((o) => o.confidence).filter((c) => c != null && !isNaN(c as number)) as number[];
      if (obsConfs.length > 0) {
        const avg = obsConfs.reduce((a, b) => a + b, 0) / obsConfs.length;
        return Math.round(avg <= 1 ? avg * 100 : avg);
      }
    }
    if (run?.status === "done") {
      return 85;
    }
    return null;
  })();

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-bg">
      <div className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto px-6 md:px-10 lg:px-12 pt-6 pb-6 min-h-0">

        {/* Header */}
        <motion.div
          className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 shrink-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
        >
          <div>
            <div className="inline-flex items-center gap-2 mb-2">
              {loading ? (
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin" />
              ) : error ? (
                <AlertCircle className="w-4 h-4 text-red-400" />
              ) : wasCancelled ? (
                <Ban className="w-4 h-4 text-muted" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
              <span className="text-xs text-muted uppercase tracking-[0.3em]">
                {loading
                  ? `${run?.stage ? run.stage.replace(/_/g, " ") : "Running"}… ${run?.progress ?? 0}%`
                  : error
                  ? "Analysis Failed"
                  : wasCancelled
                  ? "Analysis Cancelled"
                  : "Analysis Complete"}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl text-text-primary leading-[1.1]">
              Results <span className="font-display italic">workspace</span>
            </h1>
            {runId && (
              <p className="text-xs text-muted font-mono mt-1">run: {runId.slice(0, 8)}…</p>
            )}
          </div>

          <div className="flex items-center gap-3 mt-4 md:mt-0">
            {loading && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="flex items-center gap-2 px-4 py-2 rounded-full border border-red-500/30 text-sm font-medium text-red-400/90 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {cancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                Cancel
              </button>
            )}
            <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-stroke text-sm font-medium text-muted hover:text-text-primary hover:bg-white/5 transition-colors">
              <Share2 className="w-4 h-4" />Share
            </button>
            <button
              onClick={() => handleExport("audit-report")}
              disabled={!runId || loading || !!exporting}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-stroke text-sm font-medium text-muted hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {exporting === "audit-report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Report
            </button>
            <div className="relative group">
              <button
                onClick={() => handleExport("geojson")}
                disabled={!runId || loading || !!exporting}
                className="relative rounded-full text-sm transition-transform duration-200 hover:scale-105 group disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="absolute rounded-full accent-gradient opacity-80 group-hover:opacity-100 transition-opacity duration-300" style={{ inset: "-1px" }} />
                <span className="relative z-10 flex items-center gap-2 px-6 py-2 rounded-full bg-bg text-text-primary font-medium">
                  {exporting && exporting !== "audit-report" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  Export Package
                </span>
              </button>
              {runId && !loading && (
                <div className="absolute right-0 top-full mt-2 bg-surface border border-stroke rounded-2xl overflow-hidden opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50 min-w-[160px]">
                  {(["geojson", "geotiff", "csv", "stac", "notebook"] as ExportFormat[]).map((fmt) => (
                    <button key={fmt} onClick={() => handleExport(fmt)} className="w-full text-left px-4 py-2.5 text-xs text-muted hover:text-text-primary hover:bg-white/5 transition-colors uppercase tracking-wider">
                      {fmt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {error && (
          <div className="mb-4 flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{error}
          </div>
        )}

        {wasCancelled && !error && (
          <div className="mb-4 flex items-center gap-2 text-muted bg-white/5 border border-stroke rounded-2xl px-4 py-3 text-sm">
            <Ban className="w-4 h-4 shrink-0" />Run was cancelled before completion.
          </div>
        )}

        {loading && (
          <div className="mb-4 w-full h-1 bg-stroke/30 rounded-full overflow-hidden">
            <div className="h-full bg-sky-400 transition-all duration-700" style={{ width: `${run?.progress ?? 10}%` }} />
          </div>
        )}

        {/* Workspace Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
          <motion.div
            className="w-full lg:w-[65%] flex flex-col relative min-h-0"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease }}
          >
            {/* Tab bar */}
            <div className="flex items-center gap-1 mb-4 overflow-x-auto scrollbar-hide shrink-0 pb-1">
              {["Source", "Semantic", "Change", "Quality"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative px-4 py-2 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab ? "text-text-primary" : "text-muted hover:text-text-primary hover:bg-white/5"
                  }`}
                >
                  {activeTab === tab && (
                    <motion.div
                      layoutId="insight-tab-bubble"
                      className="absolute inset-0 bg-white/10 rounded-full border border-white/20"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10">{tab} Layer</span>
                </button>
              ))}
            </div>

            {/* Map canvas area */}
            <div className="relative flex-1 rounded-3xl overflow-hidden border border-stroke min-h-[400px]">
              <MapCanvas
                ref={mapRef}
                activeTab={activeTab}
                imageIds={run?.image_ids}
                runId={runId ?? undefined}
                layers={layers}
                compareMode={compareMode}
                activeTool={activeTool}
                onToolChange={setActiveTool}
              />
              <LayerManager
                layers={layers}
                onToggleVisibility={handleToggleVisibility}
                onChangeOpacity={handleChangeOpacity}
              />
              {activeTab === "Change" && (
                <PairComparison activeMode={compareMode} onModeChange={setCompareMode} />
              )}
            </div>
          </motion.div>

          <motion.div
            className="w-full lg:w-[35%] flex flex-col min-h-0 overflow-y-auto scrollbar-hide pr-2 pb-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
          >
            <ConfidenceBar confidence={confidence} loading={loading} />
            <MeasurementTable run={run} />
            <EvidencePanel run={run} graph={graph} loading={loading} />
            <ProvenancePanel run={run} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// Page export — wraps InsightsContent in Suspense for Next.js 15 static builds
export default function InsightsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading workspace…</span>
        </div>
      </div>
    }>
      <InsightsContent />
    </Suspense>
  );
}
